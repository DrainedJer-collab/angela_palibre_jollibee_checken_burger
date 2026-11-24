import type { Request, Response } from 'express';
import { db } from '../db/connection.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import type { AdvisorySeverity, SeaCondition } from '../types/index.js';
import { cleanText, toPositiveInt } from '../utils/validation.js';

export function listOperators(req: AuthenticatedRequest, res: Response): void {
  const includeAll = req.user?.role === 'admin' && req.query.all === '1';

  const operators = db
    .prepare(
      `SELECT o.*,
              u.email AS account_email,
              COALESCE((SELECT ROUND(AVG(f.rating), 1) FROM feedback f WHERE f.operator_id = o.id), 0) AS avg_rating,
              COALESCE((SELECT COUNT(*) FROM feedback f WHERE f.operator_id = o.id), 0) AS review_count,
              COALESCE((SELECT COUNT(*) FROM trips t WHERE t.operator_id = o.id AND t.status = 'scheduled' AND t.departure_date >= date('now')), 0) AS upcoming_trips_count
       FROM operators o
       JOIN users u ON u.id = o.user_id
       ${includeAll ? '' : 'WHERE o.verified = 1'}
       ORDER BY o.verified DESC, o.business_name ASC`
    )
    .all() as Array<Record<string, unknown>>;

  const getBoats = db.prepare('SELECT * FROM boats WHERE operator_id = ? ORDER BY boat_name ASC');
  const getReviews = db.prepare(
    'SELECT * FROM feedback WHERE operator_id = ? ORDER BY created_at DESC LIMIT 5'
  );

  const enriched = operators.map((op) => ({
    ...op,
    boats: getBoats.all(op.id),
    recent_reviews: getReviews.all(op.id),
  }));

  res.status(200).json({ operators: enriched });
}

export function verifyOperator(req: AuthenticatedRequest, res: Response): void {
  if (!req.user || req.user.role !== 'admin') {
    throw new AppError(403, 'Admin privileges required.');
  }
  const operatorId = toPositiveInt(req.params.id);
  if (!operatorId) throw new AppError(400, 'Invalid operator ID.');

  const verifiedVal = Number(req.body?.verified);
  if (verifiedVal !== 1 && verifiedVal !== 0 && verifiedVal !== -1) {
    throw new AppError(400, 'Verified status must be 1 (verified), 0 (pending), or -1 (suspended).');
  }

  const existing = db.prepare('SELECT id FROM operators WHERE id = ?').get(operatorId);
  if (!existing) throw new AppError(404, 'Operator not found.');

  db.prepare('UPDATE operators SET verified = ? WHERE id = ?').run(verifiedVal, operatorId);
  const updated = db.prepare('SELECT * FROM operators WHERE id = ?').get(operatorId);
  res.status(200).json({ operator: updated });
}

export function addBoat(req: AuthenticatedRequest, res: Response): void {
  if (!req.user) throw new AppError(401, 'Authentication required.');

  const op = db.prepare('SELECT id FROM operators WHERE user_id = ?').get(req.user.userId) as
    | { id: number }
    | undefined;
  if (!op) throw new AppError(403, 'Operator profile not found.');

  const boatName = cleanText(req.body?.boat_name, 100);
  const regCode = cleanText(req.body?.registration_code, 40).toUpperCase();
  const boatType = cleanText(req.body?.boat_type, 80) || 'Outrigger Passenger Banca';
  const capacity = toPositiveInt(req.body?.capacity);
  const lifeJackets = toPositiveInt(req.body?.life_jackets_count);

  if (boatName.length < 2 || regCode.length < 3 || !capacity || !lifeJackets) {
    throw new AppError(400, 'Please provide boat name, registration code, capacity, and life jacket count.');
  }
  if (lifeJackets < capacity) {
    throw new AppError(400, 'Life jackets count must be at least equal to vessel passenger capacity.');
  }

  const result = db
    .prepare(
      `INSERT INTO boats (operator_id, boat_name, registration_code, boat_type, capacity, life_jackets_count, status)
       VALUES (?, ?, ?, ?, ?, ?, 'active')`
    )
    .run(op.id, boatName, regCode, boatType, capacity, lifeJackets);

  const boat = db.prepare('SELECT * FROM boats WHERE id = ?').get(Number(result.lastInsertRowid));
  res.status(201).json({ boat });
}

export function listAnnouncements(_req: Request, res: Response): void {
  const announcements = db
    .prepare(
      `SELECT a.*, u.name AS author_name, o.business_name AS operator_name
       FROM announcements a
       JOIN users u ON u.id = a.author_id
       LEFT JOIN operators o ON o.id = a.operator_id
       ORDER BY a.is_active DESC, a.created_at DESC, a.id DESC`
    )
    .all() as Array<{ severity: AdvisorySeverity; sea_condition: SeaCondition; is_active: number }>;

  let seaStatus: SeaCondition = 'Good';
  for (const a of announcements) {
    if (a.is_active === 1 && (a.severity === 'suspended' || a.sea_condition === 'Suspended')) {
      seaStatus = 'Suspended';
      break;
    }
    if (a.is_active === 1 && (a.severity === 'caution' || a.sea_condition === 'Caution')) {
      seaStatus = 'Caution';
    }
  }

  res.status(200).json({ announcements, seaStatus });
}

export function createAnnouncement(req: AuthenticatedRequest, res: Response): void {
  if (!req.user) throw new AppError(401, 'Authentication required.');
  if (req.user.role !== 'operator' && req.user.role !== 'admin') {
    throw new AppError(403, 'Only operators or tourism office admins can post announcements.');
  }

  const title = cleanText(req.body?.title, 160);
  const message = cleanText(req.body?.message, 1000);
  const severityInput = cleanText(req.body?.severity, 20) as AdvisorySeverity;
  const severity: AdvisorySeverity =
    severityInput === 'caution' || severityInput === 'suspended' ? severityInput : 'info';

  const seaCondition: SeaCondition =
    severity === 'suspended' ? 'Suspended' : severity === 'caution' ? 'Caution' : 'Good';

  if (title.length < 4 || message.length < 10) {
    throw new AppError(400, 'Announcement title and detailed message are required.');
  }

  let operatorId: number | null = null;
  if (req.user.role === 'operator') {
    const op = db.prepare('SELECT id FROM operators WHERE user_id = ?').get(req.user.userId) as
      | { id: number }
      | undefined;
    operatorId = op?.id ?? null;
  }

  const result = db
    .prepare(
      `INSERT INTO announcements (author_id, operator_id, title, message, severity, sea_condition, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`
    )
    .run(req.user.userId, operatorId, title, message, severity, seaCondition);

  const created = db
    .prepare(
      `SELECT a.*, u.name AS author_name, o.business_name AS operator_name
       FROM announcements a
       JOIN users u ON u.id = a.author_id
       LEFT JOIN operators o ON o.id = a.operator_id
       WHERE a.id = ?`
    )
    .get(Number(result.lastInsertRowid));

  res.status(201).json({ announcement: created });
}

export function toggleAnnouncement(req: AuthenticatedRequest, res: Response): void {
  if (!req.user) throw new AppError(401, 'Authentication required.');
  const id = toPositiveInt(req.params.id);
  if (!id) throw new AppError(400, 'Invalid announcement ID.');

  const existing = db.prepare('SELECT * FROM announcements WHERE id = ?').get(id) as
    | { id: number; author_id: number; is_active: number }
    | undefined;
  if (!existing) throw new AppError(404, 'Announcement not found.');

  if (req.user.role !== 'admin' && existing.author_id !== req.user.userId) {
    throw new AppError(403, 'You can only manage your own advisories.');
  }

  const nextActive = existing.is_active === 1 ? 0 : 1;
  db.prepare('UPDATE announcements SET is_active = ? WHERE id = ?').run(nextActive, id);
  const updated = db.prepare('SELECT * FROM announcements WHERE id = ?').get(id);
  res.status(200).json({ announcement: updated });
}

export function deleteAnnouncement(req: AuthenticatedRequest, res: Response): void {
  if (!req.user) throw new AppError(401, 'Authentication required.');
  const id = toPositiveInt(req.params.id);
  if (!id) throw new AppError(400, 'Invalid announcement ID.');

  const existing = db.prepare('SELECT id, author_id FROM announcements WHERE id = ?').get(id) as
    | { id: number; author_id: number }
    | undefined;
  if (!existing) throw new AppError(404, 'Announcement not found.');

  if (req.user.role !== 'admin' && existing.author_id !== req.user.userId) {
    throw new AppError(403, 'Permission denied.');
  }

  db.prepare('DELETE FROM announcements WHERE id = ?').run(id);
  res.status(200).json({ message: 'Announcement removed.' });
}

export function listSafetyGuidelines(_req: Request, res: Response): void {
  const guidelines = db
    .prepare('SELECT * FROM safety_guidelines ORDER BY sort_order ASC, id ASC')
    .all();
  res.status(200).json({ guidelines });
}

export function createSafetyGuideline(req: AuthenticatedRequest, res: Response): void {
  if (!req.user || req.user.role !== 'admin') {
    throw new AppError(403, 'Admin privileges required.');
  }
  const category = cleanText(req.body?.category, 80) || 'Maritime Safety';
  const title = cleanText(req.body?.title, 140);
  const description = cleanText(req.body?.description, 800);
  const sortOrder = Number.isInteger(Number(req.body?.sort_order)) ? Number(req.body.sort_order) : 10;

  if (title.length < 3 || description.length < 10) {
    throw new AppError(400, 'Guideline title and description are required.');
  }

  const result = db
    .prepare(
      'INSERT INTO safety_guidelines (category, title, description, sort_order) VALUES (?, ?, ?, ?)'
    )
    .run(category, title, description, sortOrder);

  const created = db
    .prepare('SELECT * FROM safety_guidelines WHERE id = ?')
    .get(Number(result.lastInsertRowid));
  res.status(201).json({ guideline: created });
}

export function deleteSafetyGuideline(req: AuthenticatedRequest, res: Response): void {
  if (!req.user || req.user.role !== 'admin') {
    throw new AppError(403, 'Admin privileges required.');
  }
  const id = toPositiveInt(req.params.id);
  if (!id) throw new AppError(400, 'Invalid guideline ID.');
  db.prepare('DELETE FROM safety_guidelines WHERE id = ?').run(id);
  res.status(200).json({ message: 'Safety guideline deleted.' });
}

export function listFeedback(_req: Request, res: Response): void {
  const feedback = db
    .prepare(
      `SELECT f.*, o.business_name AS operator_name
       FROM feedback f
       JOIN operators o ON o.id = f.operator_id
       ORDER BY f.created_at DESC, f.id DESC`
    )
    .all();

  const summaryByOperator = db
    .prepare(
      `SELECT o.id AS operator_id, o.business_name,
              ROUND(COALESCE(AVG(f.rating), 0), 2) AS avg_rating,
              COUNT(f.id) AS total_reviews
       FROM operators o
       LEFT JOIN feedback f ON f.operator_id = o.id
       WHERE o.verified = 1
       GROUP BY o.id
       ORDER BY avg_rating DESC`
    )
    .all();

  res.status(200).json({ feedback, summaryByOperator });
}

export function createFeedback(req: AuthenticatedRequest, res: Response): void {
  if (!req.user) {
    throw new AppError(401, 'Please sign in to submit visitor feedback.');
  }

  const operatorId = toPositiveInt(req.body?.operator_id);
  const bookingId = req.body?.booking_id ? toPositiveInt(req.body.booking_id) : null;
  const rating = Number(req.body?.rating);
  const comment = cleanText(req.body?.comment, 600);

  if (!operatorId) throw new AppError(400, 'Please select an operator.');
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new AppError(400, 'Rating must be between 1 and 5 stars.');
  }
  if (comment.length < 5) {
    throw new AppError(400, 'Please enter a brief review comment (at least 5 characters).');
  }

  const op = db.prepare('SELECT id, verified FROM operators WHERE id = ?').get(operatorId) as
    | { id: number; verified: number }
    | undefined;
  if (!op || op.verified !== 1) {
    throw new AppError(404, 'Verified operator not found.');
  }

  const result = db
    .prepare(
      `INSERT INTO feedback (user_id, operator_id, booking_id, rating, comment, visitor_name)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(req.user.userId, operatorId, bookingId, rating, comment, req.user.name);

  const created = db
    .prepare(
      `SELECT f.*, o.business_name AS operator_name
       FROM feedback f
       JOIN operators o ON o.id = f.operator_id
       WHERE f.id = ?`
    )
    .get(Number(result.lastInsertRowid));

  res.status(201).json({ feedback: created });
}
