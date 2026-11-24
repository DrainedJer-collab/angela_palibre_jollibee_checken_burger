import crypto from 'crypto';
import type { Response } from 'express';
import { db } from '../db/connection.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import type { PassengerInput, TripType } from '../types/index.js';
import { cleanText, isValidEmail, isValidPhone, toPositiveInt } from '../utils/validation.js';

interface TripRow {
  id: number;
  operator_id: number;
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
  status: string;
  operator_verified: number;
  operator_name: string;
  boat_name: string;
}

function getTripWithOperator(tripId: number): TripRow | undefined {
  return db
    .prepare(
      `SELECT t.*, o.verified AS operator_verified, o.business_name AS operator_name, b.boat_name
       FROM trips t
       JOIN operators o ON o.id = t.operator_id
       JOIN boats b ON b.id = t.boat_id
       WHERE t.id = ?`
    )
    .get(tripId) as TripRow | undefined;
}

function generateBookingRef(): string {
  const year = new Date().getFullYear();
  for (let attempt = 0; attempt < 8; attempt++) {
    const num = crypto.randomInt(100000, 999999);
    const ref = `TSC-${year}-${num}`;
    const exists = db.prepare('SELECT id FROM bookings WHERE booking_ref = ?').get(ref);
    if (!exists) return ref;
  }
  return `TSC-${year}-${Date.now().toString().slice(-6)}`;
}

function enrichBookings(rows: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  const getPax = db.prepare('SELECT * FROM passengers WHERE booking_id = ? ORDER BY id ASC');
  const getTripDetails = db.prepare(
    `SELECT t.id, t.origin, t.destination, t.departure_date, t.departure_time, t.arrival_time,
            t.status, o.business_name AS operator_name, o.contact_number, b.boat_name, b.registration_code
     FROM trips t
     JOIN operators o ON o.id = t.operator_id
     JOIN boats b ON b.id = t.boat_id
     WHERE t.id = ?`
  );

  return rows.map((b) => ({
    ...b,
    passengers: getPax.all(b.id),
    outbound_trip: getTripDetails.get(b.trip_id),
    return_trip: b.return_trip_id ? getTripDetails.get(b.return_trip_id) : null,
  }));
}

export function createBooking(req: AuthenticatedRequest, res: Response): void {
  if (!req.user) {
    throw new AppError(401, 'Please sign in to confirm your boat booking.');
  }

  const tripId = toPositiveInt(req.body?.trip_id);
  const returnTripId = req.body?.return_trip_id ? toPositiveInt(req.body.return_trip_id) : null;
  const tripType: TripType = req.body?.trip_type === 'round-trip' ? 'round-trip' : 'one-way';

  const adults = Number(req.body?.adults ?? 0);
  const children = Number(req.body?.children ?? 0);
  const infants = Number(req.body?.infants ?? 0);
  const contactName = cleanText(req.body?.contact_name, 100);
  const contactPhone = cleanText(req.body?.contact_phone, 30);
  const contactEmail = cleanText(req.body?.contact_email, 140).toLowerCase();
  const rawPassengers = Array.isArray(req.body?.passengers) ? req.body.passengers : [];

  if (!tripId) throw new AppError(400, 'Please select a departure trip.');
  if (tripType === 'round-trip' && !returnTripId) {
    throw new AppError(400, 'Please select a return trip for round-trip bookings.');
  }
  if (returnTripId && returnTripId === tripId) {
    throw new AppError(400, 'Return trip cannot be the same as the departure trip.');
  }
  if (
    !Number.isInteger(adults) ||
    !Number.isInteger(children) ||
    !Number.isInteger(infants) ||
    adults < 1 ||
    children < 0 ||
    infants < 0
  ) {
    throw new AppError(400, 'At least 1 adult passenger is required.');
  }

  const totalPassengers = adults + children + infants;
  if (rawPassengers.length !== totalPassengers) {
    throw new AppError(
      400,
      `Please enter details for all ${totalPassengers} passenger(s).`
    );
  }
  if (contactName.length < 2 || !isValidPhone(contactPhone) || !isValidEmail(contactEmail)) {
    throw new AppError(400, 'Please enter valid primary contact name, phone number, and email.');
  }

  const passengers: PassengerInput[] = rawPassengers.map((p: Record<string, unknown>, idx: number) => {
    const fullName = cleanText(p?.full_name, 100);
    const age = Number(p?.age);
    const pType = p?.passenger_type;
    const emergencyContact = cleanText(p?.emergency_contact, 60) || contactPhone;
    if (fullName.length < 2) {
      throw new AppError(400, `Passenger #${idx + 1} must have a valid full name.`);
    }
    if (!Number.isInteger(age) || age < 0 || age > 120) {
      throw new AppError(400, `Passenger "${fullName}" must have a valid age.`);
    }
    if (pType !== 'adult' && pType !== 'child' && pType !== 'infant') {
      throw new AppError(400, `Invalid passenger type for "${fullName}".`);
    }
    if (!isValidPhone(emergencyContact)) {
      throw new AppError(400, `Please enter a valid emergency contact number for "${fullName}".`);
    }
    return {
      full_name: fullName,
      age,
      passenger_type: pType,
      emergency_contact: emergencyContact,
    };
  });

  // Check duplicate names within the same submission
  const normalizedSubmitted = new Set<string>();
  for (const p of passengers) {
    const key = p.full_name.toLowerCase().replace(/\s+/g, ' ').trim();
    if (normalizedSubmitted.has(key)) {
      throw new AppError(400, `Duplicate passenger name "${p.full_name}" in this booking.`);
    }
    normalizedSubmitted.add(key);
  }

  const bookingId = db.transaction(() => {
    const outbound = getTripWithOperator(tripId);
    if (!outbound) {
      throw new AppError(404, 'Selected departure trip could not be found.');
    }
    if (outbound.operator_verified !== 1) {
      throw new AppError(403, 'Selected operator is not currently verified.');
    }
    if (outbound.status === 'cancelled') {
      throw new AppError(409, 'This trip has been cancelled due to service or weather conditions.');
    }
    if (outbound.status === 'full' || outbound.seats_available < totalPassengers) {
      throw new AppError(
        409,
        `Not enough seats available on ${outbound.boat_name}. Only ${outbound.seats_available} seat(s) remaining.`
      );
    }

    let returnTrip: TripRow | undefined;
    if (returnTripId) {
      returnTrip = getTripWithOperator(returnTripId);
      if (!returnTrip) {
        throw new AppError(404, 'Selected return trip could not be found.');
      }
      if (returnTrip.operator_verified !== 1) {
        throw new AppError(403, 'Selected return operator is not currently verified.');
      }
      if (returnTrip.status === 'cancelled') {
        throw new AppError(409, 'The selected return trip has been cancelled.');
      }
      if (returnTrip.status === 'full' || returnTrip.seats_available < totalPassengers) {
        throw new AppError(
          409,
          `Not enough seats available on return trip (${returnTrip.boat_name}). Only ${returnTrip.seats_available} seat(s) remaining.`
        );
      }
    }

    // Prevent duplicate booking for the same passenger on the same trip
    const checkDuplicateStmt = db.prepare(`
      SELECT p.full_name
      FROM passengers p
      JOIN bookings b ON b.id = p.booking_id
      WHERE b.status = 'confirmed'
        AND (b.trip_id = ? OR b.return_trip_id = ?)
        AND LOWER(TRIM(p.full_name)) = ?
      LIMIT 1
    `);

    for (const pax of passengers) {
      const normName = pax.full_name.toLowerCase().replace(/\s+/g, ' ').trim();
      const dupOut = checkDuplicateStmt.get(tripId, tripId, normName) as
        | { full_name: string }
        | undefined;
      if (dupOut) {
        throw new AppError(
          409,
          `Passenger "${pax.full_name}" already has a confirmed booking on this departure trip.`
        );
      }
      if (returnTripId) {
        const dupRet = checkDuplicateStmt.get(returnTripId, returnTripId, normName) as
          | { full_name: string }
          | undefined;
        if (dupRet) {
          throw new AppError(
            409,
            `Passenger "${pax.full_name}" already has a confirmed booking on the selected return trip.`
          );
        }
      }
    }

    // Server-side fare calculation
    let totalFare =
      adults * outbound.adult_fare +
      children * outbound.child_fare +
      infants * outbound.infant_fare;

    if (returnTrip) {
      totalFare +=
        adults * returnTrip.adult_fare +
        children * returnTrip.child_fare +
        infants * returnTrip.infant_fare;
    }

    const bookingRef = generateBookingRef();
    const resInsert = db
      .prepare(
        `INSERT INTO bookings (
          booking_ref, user_id, trip_id, return_trip_id, trip_type,
          adults, children, infants, total_passengers, total_fare,
          contact_name, contact_phone, contact_email, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')`
      )
      .run(
        bookingRef,
        req.user!.userId,
        tripId,
        returnTripId,
        tripType,
        adults,
        children,
        infants,
        totalPassengers,
        totalFare,
        contactName,
        contactPhone,
        contactEmail
      );

    const newBookingId = Number(resInsert.lastInsertRowid);

    const insertPax = db.prepare(
      `INSERT INTO passengers (booking_id, full_name, age, passenger_type, emergency_contact)
       VALUES (?, ?, ?, ?, ?)`
    );
    for (const pax of passengers) {
      insertPax.run(newBookingId, pax.full_name, pax.age, pax.passenger_type, pax.emergency_contact);
    }

    const decrementSeats = db.prepare(`
      UPDATE trips
      SET seats_available = seats_available - ?,
          status = CASE WHEN (seats_available - ?) <= 0 THEN 'full' ELSE status END
      WHERE id = ? AND seats_available >= ?
    `);

    const outUpdate = decrementSeats.run(totalPassengers, totalPassengers, tripId, totalPassengers);
    if (outUpdate.changes === 0) {
      throw new AppError(409, 'Seats ran out while processing your booking. Please select another trip.');
    }

    if (returnTripId) {
      const retUpdate = decrementSeats.run(
        totalPassengers,
        totalPassengers,
        returnTripId,
        totalPassengers
      );
      if (retUpdate.changes === 0) {
        throw new AppError(409, 'Return trip seats ran out while processing your booking.');
      }
    }

    return newBookingId;
  })();

  const bookingRow = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId) as Record<
    string,
    unknown
  >;
  const [enriched] = enrichBookings([bookingRow]);
  res.status(201).json({ booking: enriched });
}

export function getMyBookings(req: AuthenticatedRequest, res: Response): void {
  if (!req.user) throw new AppError(401, 'Authentication required.');

  const rows = db
    .prepare('SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC, id DESC')
    .all(req.user.userId) as Array<Record<string, unknown>>;

  res.status(200).json({ bookings: enrichBookings(rows) });
}

export function getBookingById(req: AuthenticatedRequest, res: Response): void {
  if (!req.user) throw new AppError(401, 'Authentication required.');
  const bookingId = toPositiveInt(req.params.id);
  if (!bookingId) throw new AppError(400, 'Invalid booking ID.');

  const row = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId) as
    | Record<string, unknown>
    | undefined;
  if (!row) throw new AppError(404, 'Booking not found.');

  if (req.user.role !== 'admin' && row.user_id !== req.user.userId) {
    if (req.user.role === 'operator') {
      const op = db.prepare('SELECT id FROM operators WHERE user_id = ?').get(req.user.userId) as
        | { id: number }
        | undefined;
      const trip = db
        .prepare('SELECT operator_id FROM trips WHERE id = ?')
        .get(row.trip_id) as { operator_id: number } | undefined;
      if (!op || !trip || op.id !== trip.operator_id) {
        throw new AppError(403, 'Access denied.');
      }
    } else {
      throw new AppError(403, 'Access denied.');
    }
  }

  const [enriched] = enrichBookings([row]);
  res.status(200).json({ booking: enriched });
}

export function cancelBooking(req: AuthenticatedRequest, res: Response): void {
  if (!req.user) throw new AppError(401, 'Authentication required.');
  const bookingId = toPositiveInt(req.params.id);
  if (!bookingId) throw new AppError(400, 'Invalid booking ID.');

  db.transaction(() => {
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId) as
      | {
          id: number;
          user_id: number;
          trip_id: number;
          return_trip_id: number | null;
          total_passengers: number;
          status: string;
        }
      | undefined;

    if (!booking) throw new AppError(404, 'Booking not found.');
    if (req.user!.role !== 'admin' && booking.user_id !== req.user!.userId) {
      throw new AppError(403, 'You can only cancel your own bookings.');
    }
    if (booking.status === 'cancelled') {
      throw new AppError(409, 'This booking has already been cancelled.');
    }

    db.prepare(
      `UPDATE bookings SET status = 'cancelled', cancelled_at = datetime('now') WHERE id = ?`
    ).run(bookingId);

    const restoreSeats = db.prepare(`
      UPDATE trips
      SET seats_available = MIN(total_capacity, seats_available + ?),
          status = CASE WHEN status = 'full' THEN 'scheduled' ELSE status END
      WHERE id = ?
    `);

    restoreSeats.run(booking.total_passengers, booking.trip_id);
    if (booking.return_trip_id) {
      restoreSeats.run(booking.total_passengers, booking.return_trip_id);
    }
  })();

  const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId) as Record<
    string,
    unknown
  >;
  const [enriched] = enrichBookings([updated]);
  res.status(200).json({ booking: enriched, message: 'Booking cancelled and seats restored.' });
}

export function getOperatorBookings(req: AuthenticatedRequest, res: Response): void {
  if (!req.user) throw new AppError(401, 'Authentication required.');

  const tripFilter = req.query.tripId ? toPositiveInt(req.query.tripId) : null;
  let operatorId: number | null = null;

  if (req.user.role !== 'admin') {
    const op = db.prepare('SELECT id FROM operators WHERE user_id = ?').get(req.user.userId) as
      | { id: number }
      | undefined;
    if (!op) throw new AppError(404, 'Operator profile not found.');
    operatorId = op.id;
  }

  let sql = `
    SELECT DISTINCT b.*
    FROM bookings b
    JOIN trips t1 ON t1.id = b.trip_id
    LEFT JOIN trips t2 ON t2.id = b.return_trip_id
    WHERE 1=1
  `;
  const params: unknown[] = [];

  if (operatorId !== null) {
    sql += ' AND (t1.operator_id = ? OR t2.operator_id = ?)';
    params.push(operatorId, operatorId);
  }
  if (tripFilter) {
    sql += ' AND (b.trip_id = ? OR b.return_trip_id = ?)';
    params.push(tripFilter, tripFilter);
  }
  sql += ' ORDER BY b.created_at DESC, b.id DESC';

  const rows = db.prepare(sql).all(...params) as Array<Record<string, unknown>>;
  res.status(200).json({ bookings: enrichBookings(rows) });
}
