import type { Request, Response } from 'express';
import { db } from '../db/connection.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import type { TripStatus, TripWithDetails } from '../types/index.js';
import {
  cleanText,
  isValidDate,
  isValidTime,
  toNonNegativeNumber,
  toPositiveInt,
} from '../utils/validation.js';

const BASE_TRIP_SELECT = `
  SELECT
    t.*,
    o.business_name AS operator_name,
    o.verified AS operator_verified,
    o.contact_number,
    b.boat_name,
    b.boat_type,
    b.registration_code,
    b.life_jackets_count,
    COALESCE((SELECT ROUND(AVG(f.rating), 1) FROM feedback f WHERE f.operator_id = o.id), 4.8) AS avg_rating,
    COALESCE((SELECT COUNT(*) FROM feedback f WHERE f.operator_id = o.id), 0) AS review_count
  FROM trips t
  JOIN operators o ON o.id = t.operator_id
  JOIN boats b ON b.id = t.boat_id
`;

export function listTrips(req: Request, res: Response): void {
  const date = cleanText(req.query.date, 20);
  const origin = cleanText(req.query.origin, 120);
  const destination = cleanText(req.query.destination, 120);
  const operator = cleanText(req.query.operator, 120);
  const minPrice = req.query.minPrice !== undefined && req.query.minPrice !== '' ? Number(req.query.minPrice) : null;
  const maxPrice = req.query.maxPrice !== undefined && req.query.maxPrice !== '' ? Number(req.query.maxPrice) : null;
  const passengers = req.query.passengers !== undefined && req.query.passengers !== '' ? Number(req.query.passengers) : null;
  const sort = cleanText(req.query.sort, 30);

  const conditions: string[] = ['o.verified = 1'];
  const params: unknown[] = [];

  if (date && isValidDate(date)) {
    conditions.push('t.departure_date = ?');
    params.push(date);
  } else {
    conditions.push("t.departure_date >= date('now', '-1 day')");
  }

  if (origin) {
    conditions.push('LOWER(t.origin) LIKE ?');
    params.push(`%${origin.toLowerCase()}%`);
  }

  if (destination) {
    conditions.push('LOWER(t.destination) LIKE ?');
    params.push(`%${destination.toLowerCase()}%`);
  }

  if (operator) {
    const asId = toPositiveInt(operator);
    if (asId) {
      conditions.push('t.operator_id = ?');
      params.push(asId);
    } else {
      conditions.push('LOWER(o.business_name) LIKE ?');
      params.push(`%${operator.toLowerCase()}%`);
    }
  }

  if (minPrice !== null && Number.isFinite(minPrice) && minPrice >= 0) {
    conditions.push('t.adult_fare >= ?');
    params.push(minPrice);
  }

  if (maxPrice !== null && Number.isFinite(maxPrice) && maxPrice >= 0) {
    conditions.push('t.adult_fare <= ?');
    params.push(maxPrice);
  }

  if (passengers !== null && Number.isInteger(passengers) && passengers > 0) {
    conditions.push('t.seats_available >= ?');
    params.push(passengers);
  }

  let orderBy = 'ORDER BY t.departure_date ASC, t.departure_time ASC';
  if (sort === 'price_asc') orderBy = 'ORDER BY t.adult_fare ASC, t.departure_time ASC';
  else if (sort === 'price_desc') orderBy = 'ORDER BY t.adult_fare DESC, t.departure_time ASC';
  else if (sort === 'seats_desc') orderBy = 'ORDER BY t.seats_available DESC, t.departure_time ASC';
  else if (sort === 'time_desc') orderBy = 'ORDER BY t.departure_date DESC, t.departure_time DESC';

  const sql = `${BASE_TRIP_SELECT} WHERE ${conditions.join(' AND ')} ${orderBy}`;
  const trips = db.prepare(sql).all(...params) as TripWithDetails[];

  res.status(200).json({ trips });
}

export function getTripById(req: Request, res: Response): void {
  const tripId = toPositiveInt(req.params.id);
  if (!tripId) {
    throw new AppError(400, 'Invalid trip ID.');
  }

  const trip = db
    .prepare(`${BASE_TRIP_SELECT} WHERE t.id = ? AND o.verified = 1`)
    .get(tripId) as TripWithDetails | undefined;

  if (!trip) {
    throw new AppError(404, 'Trip not found or operator is not currently verified.');
  }

  res.status(200).json({ trip });
}

export function listMyOperatorTrips(req: AuthenticatedRequest, res: Response): void {
  if (!req.user) throw new AppError(401, 'Authentication required.');

  const operator = db
    .prepare('SELECT * FROM operators WHERE user_id = ?')
    .get(req.user.userId) as { id: number; verified: number; business_name: string } | undefined;

  if (!operator && req.user.role !== 'admin') {
    throw new AppError(404, 'Operator profile not found.');
  }

  if (req.user.role === 'admin' && !operator) {
    const trips = db
      .prepare(`${BASE_TRIP_SELECT} ORDER BY t.departure_date ASC, t.departure_time ASC`)
      .all() as TripWithDetails[];
    const boats = db.prepare('SELECT * FROM boats ORDER BY boat_name ASC').all();
    res.status(200).json({ trips, boats, operator: null });
    return;
  }

  const trips = db
    .prepare(`${BASE_TRIP_SELECT} WHERE t.operator_id = ? ORDER BY t.departure_date ASC, t.departure_time ASC`)
    .all(operator!.id) as TripWithDetails[];

  const boats = db
    .prepare('SELECT * FROM boats WHERE operator_id = ? ORDER BY boat_name ASC')
    .all(operator!.id);

  res.status(200).json({ trips, boats, operator });
}

export function createTrip(req: AuthenticatedRequest, res: Response): void {
  if (!req.user) throw new AppError(401, 'Authentication required.');

  let operatorId: number;
  if (req.user.role === 'admin' && toPositiveInt(req.body?.operator_id)) {
    operatorId = toPositiveInt(req.body?.operator_id)!;
  } else {
    const op = db
      .prepare('SELECT id, verified FROM operators WHERE user_id = ?')
      .get(req.user.userId) as { id: number; verified: number } | undefined;
    if (!op) {
      throw new AppError(403, 'Only registered boat operators or admins can create trips.');
    }
    operatorId = op.id;
  }

  const boatId = toPositiveInt(req.body?.boat_id);
  const origin = cleanText(req.body?.origin, 120);
  const destination = cleanText(req.body?.destination, 120);
  const departureDate = cleanText(req.body?.departure_date, 20);
  const departureTime = cleanText(req.body?.departure_time, 10);
  const arrivalTime = cleanText(req.body?.arrival_time, 10);
  const adultFare = toNonNegativeNumber(req.body?.adult_fare);
  const childFare = toNonNegativeNumber(req.body?.child_fare);
  const infantFare = toNonNegativeNumber(req.body?.infant_fare) ?? 0;
  const requestedCapacity = toPositiveInt(req.body?.total_capacity);
  const notes = cleanText(req.body?.notes, 250);

  if (!boatId) throw new AppError(400, 'Please select a vessel/boat.');
  if (!origin || !destination || origin === destination) {
    throw new AppError(400, 'Origin and destination must be specified and different.');
  }
  if (!isValidDate(departureDate)) throw new AppError(400, 'Valid departure date (YYYY-MM-DD) is required.');
  if (!isValidTime(departureTime) || !isValidTime(arrivalTime)) {
    throw new AppError(400, 'Valid departure and arrival times (HH:MM) are required.');
  }
  if (adultFare === null || childFare === null) {
    throw new AppError(400, 'Valid adult and child fares are required.');
  }

  const boat = db
    .prepare('SELECT * FROM boats WHERE id = ? AND operator_id = ?')
    .get(boatId, operatorId) as { id: number; capacity: number; status: string } | undefined;
  if (!boat) {
    throw new AppError(404, 'Selected boat was not found under this operator.');
  }
  if (boat.status !== 'active') {
    throw new AppError(400, 'Selected boat is currently marked as maintenance.');
  }

  const totalCapacity = Math.min(requestedCapacity ?? boat.capacity, boat.capacity);

  const result = db
    .prepare(
      `INSERT INTO trips (
        operator_id, boat_id, origin, destination, departure_date,
        departure_time, arrival_time, adult_fare, child_fare, infant_fare,
        total_capacity, seats_available, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?)`
    )
    .run(
      operatorId,
      boatId,
      origin,
      destination,
      departureDate,
      departureTime,
      arrivalTime,
      adultFare,
      childFare,
      infantFare,
      totalCapacity,
      totalCapacity,
      notes
    );

  const created = db
    .prepare(`${BASE_TRIP_SELECT} WHERE t.id = ?`)
    .get(Number(result.lastInsertRowid)) as TripWithDetails;

  res.status(201).json({ trip: created });
}

export function updateTrip(req: AuthenticatedRequest, res: Response): void {
  if (!req.user) throw new AppError(401, 'Authentication required.');
  const tripId = toPositiveInt(req.params.id);
  if (!tripId) throw new AppError(400, 'Invalid trip ID.');

  const existing = db.prepare('SELECT * FROM trips WHERE id = ?').get(tripId) as
    | {
        id: number;
        operator_id: number;
        boat_id: number;
        origin: string;
        destination: string;
        departure_date: string;
        departure_time: string;
        arrival_time: string;
        adult_fare: number;
        child_fare: number;
        infant_fare: number;
        total_capacity: number;
        seats_available: number;
        status: TripStatus;
        notes: string;
      }
    | undefined;

  if (!existing) throw new AppError(404, 'Trip not found.');

  if (req.user.role !== 'admin') {
    const op = db.prepare('SELECT id FROM operators WHERE user_id = ?').get(req.user.userId) as
      | { id: number }
      | undefined;
    if (!op || op.id !== existing.operator_id) {
      throw new AppError(403, 'You can only modify trips belonging to your own operator account.');
    }
  }

  const origin = cleanText(req.body?.origin, 120) || existing.origin;
  const destination = cleanText(req.body?.destination, 120) || existing.destination;
  const departureDate = cleanText(req.body?.departure_date, 20) || existing.departure_date;
  const departureTime = cleanText(req.body?.departure_time, 10) || existing.departure_time;
  const arrivalTime = cleanText(req.body?.arrival_time, 10) || existing.arrival_time;
  const adultFare =
    req.body?.adult_fare !== undefined ? toNonNegativeNumber(req.body.adult_fare) : existing.adult_fare;
  const childFare =
    req.body?.child_fare !== undefined ? toNonNegativeNumber(req.body.child_fare) : existing.child_fare;
  const infantFare =
    req.body?.infant_fare !== undefined ? toNonNegativeNumber(req.body.infant_fare) : existing.infant_fare;
  const notes = req.body?.notes !== undefined ? cleanText(req.body.notes, 250) : existing.notes;
  const statusInput = cleanText(req.body?.status, 20) as TripStatus;
  const allowedStatuses: TripStatus[] = ['scheduled', 'full', 'delayed', 'cancelled'];
  const status = allowedStatuses.includes(statusInput) ? statusInput : existing.status;

  if (!isValidDate(departureDate) || !isValidTime(departureTime) || !isValidTime(arrivalTime)) {
    throw new AppError(400, 'Invalid date or time format.');
  }
  if (adultFare === null || childFare === null || infantFare === null) {
    throw new AppError(400, 'Invalid fare values.');
  }

  let totalCapacity = existing.total_capacity;
  let seatsAvailable = existing.seats_available;

  if (req.body?.total_capacity !== undefined) {
    const newCap = toPositiveInt(req.body.total_capacity);
    if (!newCap) throw new AppError(400, 'Capacity must be a positive integer.');
    const bookedSeats = existing.total_capacity - existing.seats_available;
    if (newCap < bookedSeats) {
      throw new AppError(409, `Cannot reduce capacity below already booked seats (${bookedSeats}).`);
    }
    totalCapacity = newCap;
    seatsAvailable = newCap - bookedSeats;
  }

  db.prepare(
    `UPDATE trips
     SET origin = ?, destination = ?, departure_date = ?, departure_time = ?, arrival_time = ?,
         adult_fare = ?, child_fare = ?, infant_fare = ?, total_capacity = ?, seats_available = ?,
         status = ?, notes = ?
     WHERE id = ?`
  ).run(
    origin,
    destination,
    departureDate,
    departureTime,
    arrivalTime,
    adultFare,
    childFare,
    infantFare,
    totalCapacity,
    seatsAvailable,
    status,
    notes,
    tripId
  );

  const updated = db
    .prepare(`${BASE_TRIP_SELECT} WHERE t.id = ?`)
    .get(tripId) as TripWithDetails;

  res.status(200).json({ trip: updated });
}

export function deleteTrip(req: AuthenticatedRequest, res: Response): void {
  if (!req.user) throw new AppError(401, 'Authentication required.');
  const tripId = toPositiveInt(req.params.id);
  if (!tripId) throw new AppError(400, 'Invalid trip ID.');

  const existing = db.prepare('SELECT id, operator_id FROM trips WHERE id = ?').get(tripId) as
    | { id: number; operator_id: number }
    | undefined;
  if (!existing) throw new AppError(404, 'Trip not found.');

  if (req.user.role !== 'admin') {
    const op = db.prepare('SELECT id FROM operators WHERE user_id = ?').get(req.user.userId) as
      | { id: number }
      | undefined;
    if (!op || op.id !== existing.operator_id) {
      throw new AppError(403, 'You can only delete your own trips.');
    }
  }

  const activeBookings = db
    .prepare(
      `SELECT COUNT(*) as count FROM bookings
       WHERE (trip_id = ? OR return_trip_id = ?) AND status = 'confirmed'`
    )
    .get(tripId, tripId) as { count: number };

  if (activeBookings.count > 0) {
    throw new AppError(
      409,
      'This trip has confirmed bookings. Please mark it as "cancelled" instead of deleting it.'
    );
  }

  db.prepare('DELETE FROM bookings WHERE trip_id = ? OR return_trip_id = ?').run(tripId, tripId);
  db.prepare('DELETE FROM trips WHERE id = ?').run(tripId);
  res.status(200).json({ message: 'Trip removed successfully.' });
}
