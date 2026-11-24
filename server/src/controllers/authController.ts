import bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';
import { db } from '../db/connection.js';
import {
  type AuthenticatedRequest,
  clearAuthCookie,
  setAuthCookie,
  signToken,
} from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import type { SafeUser, User } from '../types/index.js';
import { cleanText, isValidEmail, isValidPhone, toPositiveInt } from '../utils/validation.js';

function getSafeUserById(userId: number): SafeUser | null {
  const row = db
    .prepare(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.created_at,
              o.id as operator_id, o.verified as operator_verified, o.business_name
       FROM users u
       LEFT JOIN operators o ON o.user_id = u.id
       WHERE u.id = ?`
    )
    .get(userId) as SafeUser | undefined;
  return row ?? null;
}

export function register(req: Request, res: Response): void {
  const name = cleanText(req.body?.name, 100);
  const email = cleanText(req.body?.email, 140).toLowerCase();
  const phone = cleanText(req.body?.phone, 30);
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const requestedRole = req.body?.role === 'operator' ? 'operator' : 'visitor';

  if (name.length < 2) {
    throw new AppError(400, 'Please enter your full name (at least 2 characters).');
  }
  if (!isValidEmail(email)) {
    throw new AppError(400, 'Please enter a valid email address.');
  }
  if (!isValidPhone(phone)) {
    throw new AppError(400, 'Please enter a valid Philippine mobile or landline number.');
  }
  if (password.length < 8) {
    throw new AppError(400, 'Password must be at least 8 characters long.');
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    throw new AppError(409, 'An account with this email address already exists.');
  }

  const businessName = cleanText(req.body?.business_name, 140);
  const portLocation = cleanText(req.body?.port_location, 140) || 'Mabini Port (Anilao)';
  const permitNumber = cleanText(req.body?.permit_number, 60);
  const boatName = cleanText(req.body?.boat_name, 100);
  const boatCapacity = toPositiveInt(req.body?.boat_capacity) ?? 24;

  if (requestedRole === 'operator') {
    if (businessName.length < 3 || permitNumber.length < 3 || boatName.length < 2) {
      throw new AppError(
        400,
        'Operator registration requires business name, MARINA permit number, and primary boat name.'
      );
    }
  }

  const passwordHash = bcrypt.hashSync(password, 10);

  const createdUserId = db.transaction(() => {
    const userRes = db
      .prepare('INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)')
      .run(name, email, phone, passwordHash, requestedRole);
    const userId = Number(userRes.lastInsertRowid);

    if (requestedRole === 'operator') {
      const opRes = db
        .prepare(
          `INSERT INTO operators (user_id, business_name, owner_name, contact_number, port_location, permit_number, description, verified)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0)`
        )
        .run(
          userId,
          businessName,
          name,
          phone,
          portLocation,
          permitNumber,
          'Registered passenger sea transport operator serving Mabini Port and Tingloy, Batangas.'
        );
      const operatorId = Number(opRes.lastInsertRowid);
      const regCode = `BTG-NEW-${String(operatorId).padStart(3, '0')}`;
      db.prepare(
        `INSERT INTO boats (operator_id, boat_name, registration_code, boat_type, capacity, life_jackets_count, status)
         VALUES (?, ?, ?, 'Outrigger Passenger Banca', ?, ?, 'active')`
      ).run(operatorId, boatName, regCode, boatCapacity, boatCapacity + 4);
    }

    return userId;
  })();

  const safeUser = getSafeUserById(createdUserId);
  if (!safeUser) {
    throw new AppError(500, 'Failed to load newly created user.');
  }

  const token = signToken({
    userId: safeUser.id,
    email: safeUser.email,
    role: safeUser.role,
    name: safeUser.name,
  });

  setAuthCookie(res, token);
  res.status(201).json({ user: safeUser, token });
}

export function login(req: Request, res: Response): void {
  const email = cleanText(req.body?.email, 140).toLowerCase();
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!isValidEmail(email) || !password) {
    throw new AppError(400, 'Please enter both your email address and password.');
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    throw new AppError(401, 'Invalid email address or password.');
  }

  const safeUser = getSafeUserById(user.id);
  if (!safeUser) {
    throw new AppError(500, 'Unable to load account details.');
  }

  const token = signToken({
    userId: safeUser.id,
    email: safeUser.email,
    role: safeUser.role,
    name: safeUser.name,
  });

  setAuthCookie(res, token);
  res.status(200).json({ user: safeUser, token });
}

export function logout(_req: Request, res: Response): void {
  clearAuthCookie(res);
  res.status(200).json({ message: 'Signed out successfully.' });
}

export function me(req: AuthenticatedRequest, res: Response): void {
  if (!req.user) {
    throw new AppError(401, 'Not authenticated.');
  }
  const safeUser = getSafeUserById(req.user.userId);
  if (!safeUser) {
    throw new AppError(404, 'Account not found.');
  }
  res.status(200).json({ user: safeUser });
}
