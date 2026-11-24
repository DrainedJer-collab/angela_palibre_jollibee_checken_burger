import type { Response } from 'express';
import { db } from '../db/connection.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { escapeCsvCell, toPositiveInt } from '../utils/validation.js';

function getPeakThreshold(): number {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'peak_day_threshold'").get() as
    | { value: string }
    | undefined;
  const parsed = Number(row?.value ?? 65);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 65;
}

export function getAnalyticsSummary(req: AuthenticatedRequest, res: Response): void {
  if (!req.user || req.user.role !== 'admin') {
    throw new AppError(403, 'Admin privileges required.');
  }

  const bookingStats = db
    .prepare(
      `SELECT
        COUNT(*) AS total_bookings,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed_bookings,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_bookings,
        COALESCE(SUM(CASE WHEN status = 'confirmed' THEN total_passengers ELSE 0 END), 0) AS total_passengers,
        COALESCE(SUM(CASE WHEN status = 'confirmed' THEN total_fare ELSE 0 END), 0) AS total_revenue
       FROM bookings`
    )
    .get() as {
    total_bookings: number;
    confirmed_bookings: number;
    cancelled_bookings: number;
    total_passengers: number;
    total_revenue: number;
  };

  const opStats = db
    .prepare(
      `SELECT
        SUM(CASE WHEN verified = 1 THEN 1 ELSE 0 END) AS active_operators,
        SUM(CASE WHEN verified = 0 THEN 1 ELSE 0 END) AS pending_operators
       FROM operators`
    )
    .get() as { active_operators: number; pending_operators: number };

  const tripStats = db
    .prepare(
      `SELECT
        COUNT(*) AS total_trips,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_trips
       FROM trips`
    )
    .get() as { total_trips: number; cancelled_trips: number };

  const threshold = getPeakThreshold();

  const overcrowdedDays = db
    .prepare(
      `SELECT t.departure_date AS travel_date,
              SUM(b.total_passengers) AS passengers,
              COUNT(b.id) AS bookings
       FROM bookings b
       JOIN trips t ON t.id = b.trip_id
       WHERE b.status = 'confirmed'
       GROUP BY t.departure_date
       HAVING passengers >= ?
       ORDER BY t.departure_date ASC`
    )
    .all(threshold);

  res.status(200).json({
    summary: {
      totalBookings: bookingStats.total_bookings ?? 0,
      confirmedBookings: bookingStats.confirmed_bookings ?? 0,
      cancelledBookings: bookingStats.cancelled_bookings ?? 0,
      totalPassengers: bookingStats.total_passengers ?? 0,
      totalRevenue: bookingStats.total_revenue ?? 0,
      activeOperators: opStats.active_operators ?? 0,
      pendingOperators: opStats.pending_operators ?? 0,
      totalTrips: tripStats.total_trips ?? 0,
      cancelledTrips: tripStats.cancelled_trips ?? 0,
      peakDayThreshold: threshold,
      overcrowdedDays,
    },
  });
}

export function updatePeakThreshold(req: AuthenticatedRequest, res: Response): void {
  if (!req.user || req.user.role !== 'admin') {
    throw new AppError(403, 'Admin privileges required.');
  }
  const threshold = toPositiveInt(req.body?.threshold);
  if (!threshold || threshold < 5 || threshold > 5000) {
    throw new AppError(400, 'Threshold must be between 5 and 5000 passengers.');
  }
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('peak_day_threshold', ?)").run(
    String(threshold)
  );
  res.status(200).json({ peakDayThreshold: threshold });
}

export function getBookingsByDay(req: AuthenticatedRequest, res: Response): void {
  if (!req.user || req.user.role !== 'admin') {
    throw new AppError(403, 'Admin privileges required.');
  }
  const rows = db
    .prepare(
      `SELECT t.departure_date AS date,
              COUNT(b.id) AS bookings,
              COALESCE(SUM(b.total_passengers), 0) AS passengers,
              COALESCE(SUM(b.total_fare), 0) AS revenue
       FROM bookings b
       JOIN trips t ON t.id = b.trip_id
       WHERE b.status = 'confirmed'
       GROUP BY t.departure_date
       ORDER BY t.departure_date ASC`
    )
    .all();
  res.status(200).json({ data: rows });
}

export function getBookingsByOperator(req: AuthenticatedRequest, res: Response): void {
  if (!req.user || req.user.role !== 'admin') {
    throw new AppError(403, 'Admin privileges required.');
  }
  const rows = db
    .prepare(
      `SELECT o.business_name AS operator_name,
              COUNT(b.id) AS bookings,
              COALESCE(SUM(b.total_passengers), 0) AS passengers,
              COALESCE(SUM(b.total_fare), 0) AS revenue
       FROM operators o
       LEFT JOIN trips t ON t.operator_id = o.id
       LEFT JOIN bookings b ON b.trip_id = t.id AND b.status = 'confirmed'
       WHERE o.verified = 1
       GROUP BY o.id
       ORDER BY bookings DESC`
    )
    .all();
  res.status(200).json({ data: rows });
}

export function getPassengerTypeSplit(req: AuthenticatedRequest, res: Response): void {
  if (!req.user || req.user.role !== 'admin') {
    throw new AppError(403, 'Admin privileges required.');
  }
  const row = db
    .prepare(
      `SELECT
        COALESCE(SUM(adults), 0) AS adults,
        COALESCE(SUM(children), 0) AS children,
        COALESCE(SUM(infants), 0) AS infants
       FROM bookings
       WHERE status = 'confirmed'`
    )
    .get() as { adults: number; children: number; infants: number };

  res.status(200).json({
    data: [
      { label: 'Adults', count: row.adults },
      { label: 'Children', count: row.children },
      { label: 'Infants', count: row.infants },
    ],
  });
}

export function getPeakTravelDays(req: AuthenticatedRequest, res: Response): void {
  if (!req.user || req.user.role !== 'admin') {
    throw new AppError(403, 'Admin privileges required.');
  }
  const rows = db
    .prepare(
      `SELECT
        CASE CAST(strftime('%w', t.departure_date) AS INTEGER)
          WHEN 0 THEN 'Sun'
          WHEN 1 THEN 'Mon'
          WHEN 2 THEN 'Tue'
          WHEN 3 THEN 'Wed'
          WHEN 4 THEN 'Thu'
          WHEN 5 THEN 'Fri'
          WHEN 6 THEN 'Sat'
        END AS day_name,
        CAST(strftime('%w', t.departure_date) AS INTEGER) AS day_index,
        COUNT(b.id) AS bookings,
        COALESCE(SUM(b.total_passengers), 0) AS passengers
       FROM bookings b
       JOIN trips t ON t.id = b.trip_id
       WHERE b.status = 'confirmed'
       GROUP BY day_index
       ORDER BY day_index ASC`
    )
    .all();
  res.status(200).json({ data: rows });
}

export function exportBookingsCsv(req: AuthenticatedRequest, res: Response): void {
  if (!req.user || req.user.role !== 'admin') {
    throw new AppError(403, 'Admin privileges required.');
  }

  const rows = db
    .prepare(
      `SELECT
        b.booking_ref,
        b.status,
        b.trip_type,
        t.departure_date,
        t.departure_time,
        t.origin,
        t.destination,
        o.business_name AS operator_name,
        bt.boat_name,
        b.contact_name,
        b.contact_phone,
        b.contact_email,
        b.adults,
        b.children,
        b.infants,
        b.total_passengers,
        b.total_fare,
        b.created_at
       FROM bookings b
       JOIN trips t ON t.id = b.trip_id
       JOIN operators o ON o.id = t.operator_id
       JOIN boats bt ON bt.id = t.boat_id
       ORDER BY t.departure_date DESC, b.id DESC`
    )
    .all() as Array<Record<string, unknown>>;

  const headers = [
    'Booking Reference',
    'Status',
    'Trip Type',
    'Departure Date',
    'Departure Time',
    'Origin',
    'Destination',
    'Operator',
    'Boat',
    'Contact Name',
    'Contact Phone',
    'Contact Email',
    'Adults',
    'Children',
    'Infants',
    'Total Passengers',
    'Total Fare (PHP)',
    'Created At',
  ];

  const lines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((r) =>
      [
        r.booking_ref,
        r.status,
        r.trip_type,
        r.departure_date,
        r.departure_time,
        r.origin,
        r.destination,
        r.operator_name,
        r.boat_name,
        r.contact_name,
        r.contact_phone,
        r.contact_email,
        r.adults,
        r.children,
        r.infants,
        r.total_passengers,
        r.total_fare,
        r.created_at,
      ]
        .map(escapeCsvCell)
        .join(',')
    ),
  ];

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="tingloy-sea-connect-bookings.csv"');
  res.status(200).send(lines.join('\r\n'));
}
