import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  exportBookingsCsv,
  getAnalyticsSummary,
  getBookingsByDay,
  getBookingsByOperator,
  getPassengerTypeSplit,
  getPeakTravelDays,
  updatePeakThreshold,
} from '../controllers/analyticsController.js';
import { login, logout, me, register } from '../controllers/authController.js';
import {
  cancelBooking,
  createBooking,
  getBookingById,
  getMyBookings,
  getOperatorBookings,
} from '../controllers/bookingsController.js';
import {
  addBoat,
  createAnnouncement,
  createFeedback,
  createSafetyGuideline,
  deleteAnnouncement,
  deleteSafetyGuideline,
  listAnnouncements,
  listFeedback,
  listOperators,
  listSafetyGuidelines,
  toggleAnnouncement,
  verifyOperator,
} from '../controllers/communityController.js';
import {
  createTrip,
  deleteTrip,
  getTripById,
  listMyOperatorTrips,
  listTrips,
  updateTrip,
} from '../controllers/tripsController.js';
import { optionalAuth, requireAuth, requireRole } from '../middleware/auth.js';

export const apiRouter = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please wait a few minutes and try again.' },
});

// Auth routes
apiRouter.post('/auth/register', authLimiter, register);
apiRouter.post('/auth/login', authLimiter, login);
apiRouter.post('/auth/logout', logout);
apiRouter.get('/auth/me', requireAuth, me);

// Trips routes
apiRouter.get('/trips', listTrips);
apiRouter.get('/trips/mine', requireAuth, requireRole('operator', 'admin'), listMyOperatorTrips);
apiRouter.get('/trips/:id', getTripById);
apiRouter.post('/trips', requireAuth, requireRole('operator', 'admin'), createTrip);
apiRouter.put('/trips/:id', requireAuth, requireRole('operator', 'admin'), updateTrip);
apiRouter.delete('/trips/:id', requireAuth, requireRole('operator', 'admin'), deleteTrip);

// Bookings routes
apiRouter.post('/bookings', requireAuth, createBooking);
apiRouter.get('/bookings/mine', requireAuth, getMyBookings);
apiRouter.get('/bookings/operator', requireAuth, requireRole('operator', 'admin'), getOperatorBookings);
apiRouter.get('/bookings/:id', requireAuth, getBookingById);
apiRouter.patch('/bookings/:id/cancel', requireAuth, cancelBooking);

// Operators & Fleet routes
apiRouter.get('/operators', optionalAuth, listOperators);
apiRouter.post('/operators/boats', requireAuth, requireRole('operator', 'admin'), addBoat);
apiRouter.patch('/operators/:id/verify', requireAuth, requireRole('admin'), verifyOperator);

// Announcements & Sea Status routes
apiRouter.get('/announcements', listAnnouncements);
apiRouter.post('/announcements', requireAuth, requireRole('operator', 'admin'), createAnnouncement);
apiRouter.patch('/announcements/:id/toggle', requireAuth, requireRole('operator', 'admin'), toggleAnnouncement);
apiRouter.delete('/announcements/:id', requireAuth, requireRole('operator', 'admin'), deleteAnnouncement);

// Safety Guidelines routes
apiRouter.get('/safety-guidelines', listSafetyGuidelines);
apiRouter.post('/safety-guidelines', requireAuth, requireRole('admin'), createSafetyGuideline);
apiRouter.delete('/safety-guidelines/:id', requireAuth, requireRole('admin'), deleteSafetyGuideline);

// Feedback routes
apiRouter.get('/feedback', listFeedback);
apiRouter.post('/feedback', requireAuth, createFeedback);

// Analytics & CSV Reports (Admin only)
apiRouter.get('/analytics/summary', requireAuth, requireRole('admin'), getAnalyticsSummary);
apiRouter.patch('/analytics/threshold', requireAuth, requireRole('admin'), updatePeakThreshold);
apiRouter.get('/analytics/bookings-by-day', requireAuth, requireRole('admin'), getBookingsByDay);
apiRouter.get('/analytics/bookings-by-operator', requireAuth, requireRole('admin'), getBookingsByOperator);
apiRouter.get('/analytics/passenger-split', requireAuth, requireRole('admin'), getPassengerTypeSplit);
apiRouter.get('/analytics/peak-days', requireAuth, requireRole('admin'), getPeakTravelDays);
apiRouter.get('/reports/bookings.csv', requireAuth, requireRole('admin'), exportBookingsCsv);
