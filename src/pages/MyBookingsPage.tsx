import { AlertTriangle, CheckCircle2, QrCode, Ship, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { ETicketModal } from '../components/ETicketModal';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import type { Booking } from '../types';

export function MyBookingsPage() {
  const { user, loading: authLoading } = useAuth();
  const { navigate } = useApp();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'cancelled'>('all');

  const [ticketModalBooking, setTicketModalBooking] = useState<Booking | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const loadBookings = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ bookings: Booking[] }>('/api/bookings/mine');
      setBookings(res.bookings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your bookings.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      void loadBookings();
    }
  }, [authLoading, loadBookings]);

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await apiRequest(`/api/bookings/${cancelTarget.id}/cancel`, { method: 'PATCH' });
      setCancelTarget(null);
      await loadBookings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to cancel booking.');
      setCancelTarget(null);
    } finally {
      setCancelling(false);
    }
  };

  if (!authLoading && !user) {
    return (
      <section className="section">
        <div className="container">
          <div className="empty-state">
            <QrCode size={36} color="var(--ocean-sky)" aria-hidden="true" />
            <h3>Sign in to view your bookings &amp; e-tickets</h3>
            <p>Access your confirmed boat passes, print QR tickets, or manage cancellations.</p>
            <button
              type="button"
              className="btn btn-primary"
              style={{ marginTop: 16 }}
              onClick={() => navigate('/login')}
            >
              Sign In
            </button>
          </div>
        </div>
      </section>
    );
  }

  const filtered =
    filter === 'all' ? bookings : bookings.filter((b) => b.status === filter);

  return (
    <div>
      <section className="page-banner">
        <div className="container">
          <h1>My Boat Bookings &amp; E-Tickets</h1>
          <p>View, print QR boarding passes, or cancel upcoming crossings with automatic seat restoration.</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="tabs-bar">
            {(['all', 'confirmed', 'cancelled'] as const).map((t) => (
              <button
                key={t}
                type="button"
                className={`tab-btn${filter === t ? ' active' : ''}`}
                onClick={() => setFilter(t)}
              >
                {t === 'all' ? 'All Bookings' : t === 'confirmed' ? 'Confirmed' : 'Cancelled'}
              </button>
            ))}
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: 20 }}>
              <AlertTriangle size={18} aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[1, 2].map((i) => (
                <div key={i} className="card-flat">
                  <div className="skeleton-line" style={{ width: '40%', marginBottom: 10 }} />
                  <div className="skeleton-line" style={{ width: '75%' }} />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <Ship size={36} color="var(--ocean-sky)" aria-hidden="true" />
              <h3>No bookings found</h3>
              <p>You have no {filter === 'all' ? '' : filter} boat reservations yet.</p>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ marginTop: 16 }}
                onClick={() => navigate('/schedules')}
              >
                Search Boat Schedules
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {filtered.map((b) => (
                <article key={b.id} className="card-flat">
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 16,
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span className="tabular-nums" style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--ocean-deep)' }}>
                          {b.booking_ref}
                        </span>
                        <span
                          className={`status-tag ${
                            b.status === 'confirmed' ? 'status-good' : 'status-suspended'
                          }`}
                        >
                          {b.status === 'confirmed' ? (
                            <CheckCircle2 size={14} aria-hidden="true" />
                          ) : (
                            <XCircle size={14} aria-hidden="true" />
                          )}
                          <span>{b.status === 'confirmed' ? 'Confirmed' : 'Cancelled'}</span>
                        </span>
                        <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                          {b.trip_type}
                        </span>
                      </div>

                      <div style={{ fontWeight: 600, marginTop: 8 }}>
                        {b.outbound_trip?.origin} &rarr; {b.outbound_trip?.destination}
                      </div>
                      <div className="meta-line" style={{ marginTop: 4 }}>
                        <span className="tabular-nums">{b.outbound_trip?.departure_date}</span>
                        <span>&middot;</span>
                        <span className="tabular-nums">
                          {b.outbound_trip?.departure_time} &ndash; {b.outbound_trip?.arrival_time}
                        </span>
                        <span>&middot;</span>
                        <span>{b.outbound_trip?.operator_name}</span>
                        <span>&middot;</span>
                        <span className="tabular-nums">{b.total_passengers} passenger(s)</span>
                      </div>
                      {b.return_trip && (
                        <div className="meta-line" style={{ marginTop: 4 }}>
                          <span>Return:</span>
                          <span className="tabular-nums">{b.return_trip.departure_date}</span>
                          <span>&middot;</span>
                          <span className="tabular-nums">{b.return_trip.departure_time}</span>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
                      <div className="tabular-nums" style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--ocean-deep)' }}>
                        ₱{Number(b.total_fare).toLocaleString()}
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => setTicketModalBooking(b)}
                        >
                          <QrCode size={15} aria-hidden="true" />
                          <span>View / Print E-Ticket</span>
                        </button>
                        {b.status === 'confirmed' && (
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => setCancelTarget(b)}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {ticketModalBooking && (
        <ETicketModal booking={ticketModalBooking} onClose={() => setTicketModalBooking(null)} />
      )}

      {cancelTarget && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Confirm cancellation">
          <div className="modal-dialog" style={{ maxWidth: 460 }}>
            <h2 style={{ fontSize: '1.2rem' }}>Cancel Booking {cancelTarget.booking_ref}?</h2>
            <p style={{ marginTop: 10, color: 'var(--text-secondary)', fontSize: '0.94rem' }}>
              Cancelling this reservation will immediately release {cancelTarget.total_passengers}{' '}
              seat(s) back to {cancelTarget.outbound_trip?.boat_name} for other travelers.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setCancelTarget(null)}
              >
                Keep Booking
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                disabled={cancelling}
                onClick={() => void confirmCancel()}
              >
                {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
