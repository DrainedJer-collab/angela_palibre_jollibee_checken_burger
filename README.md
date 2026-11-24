# Tingloy Sea Connect

Boat Transportation Coordination, Schedules, Safety Guidelines, and E-Ticket Booking Website for **Mabini Port &harr; Barangay San Juan / Masasa Beach, Tingloy, Batangas**.

Built as a full-stack web system for **IT 314 Web System and Technologies** (Batangas State University) and aligned with the Barangay San Juan Sustainable Tourism Development Plan.

## Tech Stack
- **Frontend**: HTML5, Custom CSS3 (CSS variables, Flexbox, Grid, responsive media queries, print stylesheets), TypeScript + React (bundled by Vite), Chart.js, QRCode
- **Backend**: Node.js, Express.js, TypeScript, JWT + HttpOnly Cookie Auth, bcryptjs, express-rate-limit
- **Database**: SQLite (`better-sqlite3`) with automatic schema creation and realistic seed data

## Demo Credentials
| Role | Email | Password |
| :--- | :--- | :--- |
| Visitor / Tourist | `visitor@tingloy.ph` | `Visitor123!` |
| Verified Boat Operator | `operator@tingloy.ph` | `Operator123!` |
| Tourism Office Admin | `admin@tingloy.ph` | `Admin123!` |

## Setup & Commands
```bash
npm install
npm run seed
npm run dev
```
Open `http://localhost:3000`.

For production:
```bash
npm run build
npm start
```

## Key REST API Endpoints
- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET /api/trips`, `GET /api/trips/mine`, `GET /api/trips/:id`, `POST /api/trips`, `PUT /api/trips/:id`, `DELETE /api/trips/:id`
- `POST /api/bookings`, `GET /api/bookings/mine`, `GET /api/bookings/operator`, `PATCH /api/bookings/:id/cancel`
- `GET /api/operators`, `POST /api/operators/boats`, `PATCH /api/operators/:id/verify`
- `GET /api/announcements`, `POST /api/announcements`, `PATCH /api/announcements/:id/toggle`, `DELETE /api/announcements/:id`
- `GET /api/safety-guidelines`, `POST /api/safety-guidelines`, `DELETE /api/safety-guidelines/:id`
- `GET /api/feedback`, `POST /api/feedback`
- `GET /api/analytics/summary`, `PATCH /api/analytics/threshold`, `GET /api/analytics/bookings-by-day`, `GET /api/analytics/bookings-by-operator`, `GET /api/analytics/passenger-split`, `GET /api/analytics/peak-days`, `GET /api/reports/bookings.csv`
