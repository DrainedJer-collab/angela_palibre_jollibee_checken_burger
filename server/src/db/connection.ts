import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const configuredPath = process.env.DB_PATH || './data/tingloy.db';
const resolvedDbPath = path.resolve(process.cwd(), configuredPath);
const dbDir = path.dirname(resolvedDbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(resolvedDbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initializeSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('visitor', 'operator', 'admin')) DEFAULT 'visitor',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS operators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      business_name TEXT NOT NULL,
      owner_name TEXT NOT NULL,
      contact_number TEXT NOT NULL,
      port_location TEXT NOT NULL,
      permit_number TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS boats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operator_id INTEGER NOT NULL,
      boat_name TEXT NOT NULL,
      registration_code TEXT NOT NULL UNIQUE,
      boat_type TEXT NOT NULL,
      capacity INTEGER NOT NULL CHECK(capacity > 0),
      life_jackets_count INTEGER NOT NULL CHECK(life_jackets_count >= 0),
      status TEXT NOT NULL CHECK(status IN ('active', 'maintenance')) DEFAULT 'active',
      FOREIGN KEY (operator_id) REFERENCES operators(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operator_id INTEGER NOT NULL,
      boat_id INTEGER NOT NULL,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      departure_date TEXT NOT NULL,
      departure_time TEXT NOT NULL,
      arrival_time TEXT NOT NULL,
      adult_fare REAL NOT NULL CHECK(adult_fare >= 0),
      child_fare REAL NOT NULL CHECK(child_fare >= 0),
      infant_fare REAL NOT NULL CHECK(infant_fare >= 0),
      total_capacity INTEGER NOT NULL CHECK(total_capacity > 0),
      seats_available INTEGER NOT NULL CHECK(seats_available >= 0),
      status TEXT NOT NULL CHECK(status IN ('scheduled', 'full', 'delayed', 'cancelled')) DEFAULT 'scheduled',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (operator_id) REFERENCES operators(id) ON DELETE CASCADE,
      FOREIGN KEY (boat_id) REFERENCES boats(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_ref TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      trip_id INTEGER NOT NULL,
      return_trip_id INTEGER,
      trip_type TEXT NOT NULL CHECK(trip_type IN ('one-way', 'round-trip')) DEFAULT 'one-way',
      adults INTEGER NOT NULL CHECK(adults >= 0),
      children INTEGER NOT NULL CHECK(children >= 0),
      infants INTEGER NOT NULL CHECK(infants >= 0),
      total_passengers INTEGER NOT NULL CHECK(total_passengers > 0),
      total_fare REAL NOT NULL CHECK(total_fare >= 0),
      contact_name TEXT NOT NULL,
      contact_phone TEXT NOT NULL,
      contact_email TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('confirmed', 'cancelled')) DEFAULT 'confirmed',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      cancelled_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE RESTRICT,
      FOREIGN KEY (return_trip_id) REFERENCES trips(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS passengers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER NOT NULL,
      full_name TEXT NOT NULL,
      age INTEGER NOT NULL CHECK(age >= 0 AND age <= 120),
      passenger_type TEXT NOT NULL CHECK(passenger_type IN ('adult', 'child', 'infant')),
      emergency_contact TEXT NOT NULL,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author_id INTEGER NOT NULL,
      operator_id INTEGER,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      severity TEXT NOT NULL CHECK(severity IN ('info', 'caution', 'suspended')) DEFAULT 'info',
      sea_condition TEXT NOT NULL CHECK(sea_condition IN ('Good', 'Caution', 'Suspended')) DEFAULT 'Good',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (operator_id) REFERENCES operators(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      operator_id INTEGER NOT NULL,
      booking_id INTEGER,
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      comment TEXT NOT NULL,
      visitor_name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (operator_id) REFERENCES operators(id) ON DELETE CASCADE,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS safety_guidelines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_trips_date_status ON trips(departure_date, status);
    CREATE INDEX IF NOT EXISTS idx_trips_operator ON trips(operator_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_trip ON bookings(trip_id);
    CREATE INDEX IF NOT EXISTS idx_passengers_booking ON passengers(booking_id);
    CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active, created_at);
  `);
}
