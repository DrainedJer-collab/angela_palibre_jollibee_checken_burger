import { AlertTriangle, ArrowLeft, CheckCircle2, Ship } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ETicketModal } from '../components/ETicketModal';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import type { Booking, Passenger, PassengerType, Trip } from '../types';

function buildPassengerRows(adults: number, children: number, infants: number, defaultPhone: string): Passenger[] {
  const rows: Passenger[] = [];
  for (let i = 0; i < adults; i++) {
    rows.push({ full_name: '', age: 25, passenger_type: 'adult', emergency_contact: defaultPhone });
  }
  for (let i = 0; i < children; i++) {
    rows.push({ full_name: '', age: 8, passenger_type: 'child', emergency_contact: defaultPhone });
  }
  for (let i = 0; i < infants; i++) {
    rows.push({ full_name: '', age: 1, passenger_type: 'infant', emergency_contact: defaultPhone });
  }
  return rows;
}

export function BookingPage() {
  const { bookingSelection, setBookingSelection, navigate } = useApp();
  const { user } = useAuth();

  const [outboundTrip, setOutboundTrip] = useState<Trip | null>(null);
  const [returnTrip, setReturnTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [contactName, setContactName] = useState(user?.name || '');
  const [contactPhone, setContactPhone] = useState(user?.phone || '');
  const [contactEmail, setContactEmail] = useState(user?.email || '');
  const [passengers, setPassengers] = useState<Passenger[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    if (user) {
      setContactName((prev) => prev || user.name);
      setContactPhone((prev) => prev || user.phone);
      setContactEmail((prev) => prev || user.email);
    }
  }, [user]);

  useEffect(() => {
    if (!bookingSelection) {
      setLoading(false);
      return;
    }

    setPassengers(
      buildPassengerRows(
        bookingSelection.adults,
        bookingSelection.children,
        bookingSelection.infants,
        user?.phone || ''
      )
    );

    setLoading(true);
    setError(null);
    const promises = [
      apiRequest<{ trip: Trip }>(`/api/trips/${bookingSelection.outboundTripId}`),
      bookingSelection.returnTripId
        ? apiRequest<{ trip: Trip }>(`/api/trips/${bookingSelection.returnTripId}`)
        : Promise.resolve(null),
    ];

    Promise.all(promises)
      .then(([outRes, retRes]) => {
        setOutboundTrip(outRes ? outRes.trip : null);
        setReturnTrip(retRes ? retRes.trip : null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Unable to load selected trip details.');
      })
      .finally(() => setLoading(false));
  }, [bookingSelection, user?.phone]);

  if (!bookingSelection && !confirmedBooking) {
    return (
      <section className="section">
        <div className="container">
          <div className="empty-state">
            <Ship size={36} color="var(--ocean-sky)" aria-hidden="true" />
            <h3>No boat trip selected yet</h3>
            <p>Browse verified Mabini Port &ndash; Tingloy boat schedules to choose your crossing.</p>
            <button
              type="button"
              className="btn btn-primary"
              style={{ marginTop: 16 }}
              onClick={() => navigate('/schedules')}
            >
              Browse Boat Schedules
            </button>
          </div>
        </div>
      </section>
    );
  }

  const updatePassenger = (idx: number, field: keyof Passenger, val: string | number) => {
    setPassengers((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: val } : row))
    );
  };

  const outboundSubtotal = outboundTrip
    ? (bookingSelection?.adults || 0) * outboundTrip.adult_fare +
      (bookingSelection?.children || 0) * outboundTrip.child_fare +
      (bookingSelection?.infants || 0) * outboundTrip.infant_fare
    : 0;

  const returnSubtotal = returnTrip
    ? (bookingSelection?.adults || 0) * returnTrip.adult_fare +
      (bookingSelection?.children || 0) * returnTrip.child_fare +
      (bookingSelection?.infants || 0) * returnTrip.infant_fare
    : 0;

  const totalFare = outboundSubtotal + returnSubtotal;

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingSelection) return;
    if (!user) {
      navigate('/login');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await apiRequest<{ booking: Booking }>('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          trip_id: bookingSelection.outboundTripId,
          return_trip_id: bookingSelection.returnTripId,
          trip_type: bookingSelection.tripType,
          adults: bookingSelection.adults,
          children: bookingSelection.children,
          infants: bookingSelection.infants,
          contact_name: contactName,
          contact_phone: contactPhone,
          contact_email: contactEmail,
          passengers,
        }),
      });
      setConfirmedBooking(res.booking);
      setBookingSelection(null);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unable to complete booking.');
    } finally {
      setSubmitting(false);
    }
  };

  const labelForType = (type: PassengerType) =>
    type === 'adult' ? 'Adult (12+ yrs)' : type === 'child' ? 'Child (3–11 yrs)' : 'Infant (<3 yrs)';

  return (
    <div>
      <section className="page-banner">
        <div className="container">
          <h1>Passenger Details &amp; Booking Confirmation</h1>
          <p>
            Enter accurate passenger names for Philippine Coast Guard manifest verification and
            generate your instant QR e-ticket.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {!confirmedBooking && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ marginBottom: 20 }}
              onClick={() => navigate('/schedules')}
            >
              <ArrowLeft size={16} aria-hidden="true" />
              <span>Back to Schedules</span>
            </button>
          )}

          {loading ? (
            <div className="card">
              <div className="skeleton-line" style={{ width: '50%', marginBottom: 12 }} />
              <div className="skeleton-line" style={{ width: '80%' }} />
            </div>
          ) : error ? (
            <div className="alert alert-error">
              <AlertTriangle size={18} aria-hidden="true" />
              <span>{error}</span>
            </div>
          ) : confirmedBooking ? (
            <div className="card" style={{ textAlign: 'center', padding: 36 }}>
              <CheckCircle2 size={44} color="var(--status-good-text)" style={{ margin: '0 auto' }} />
              <h2 style={{ marginTop: 12, color: 'var(--ocean-deep)' }}>
                Booking Confirmed! Reference:{' '}
                <span className="tabular-nums">{confirmedBooking.booking_ref}</span>
              </h2>
              <p style={{ marginTop: 8, color: 'var(--text-secondary)' }}>
                Your QR e-ticket is ready. You can view or print it now or anytime under My
                Bookings.
              </p>
              <div
                style={{
                  marginTop: 20,
                  display: 'flex',
                  gap: 12,
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => navigate('/bookings')}
                >
                  Go to My Bookings
                </button>
              </div>
              <ETicketModal
                booking={confirmedBooking}
                onClose={() => navigate('/bookings')}
              />
            </div>
          ) : (
            <div className="grid-2" style={{ alignItems: 'start' }}>
              <form
                className="card"
                onSubmit={(e) => void handleConfirm(e)}
                style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
              >
                {!user && (
                  <div className="alert alert-warning">
                    <AlertTriangle size={18} aria-hidden="true" />
                    <div>
                      <strong>Sign in required to confirm:</strong> Please{' '}
                      <a
                        href="/login"
                        style={{ textDecoration: 'underline', fontWeight: 700 }}
                        onClick={(e) => {
                          e.preventDefault();
                          navigate('/login');
                        }}
                      >
                        sign in or register
                      </a>{' '}
                      first. Your selected boat trip will remain saved.
                    </div>
                  </div>
                )}

                {submitError && (
                  <div className="alert alert-error" role="alert">
                    <AlertTriangle size={18} aria-hidden="true" />
                    <span>{submitError}</span>
                  </div>
                )}

                <div>
                  <h2 style={{ fontSize: '1.15rem', marginBottom: 12 }}>Primary Contact</h2>
                  <div className="grid-2">
                    <div className="field-group">
                      <label className="field-label" htmlFor="c-name">
                        Contact Full Name
                      </label>
                      <input
                        id="c-name"
                        type="text"
                        required
                        className="field-input"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                      />
                    </div>
                    <div className="field-group">
                      <label className="field-label" htmlFor="c-phone">
                        Mobile Number
                      </label>
                      <input
                        id="c-phone"
                        type="tel"
                        required
                        placeholder="0917-123-4567"
                        className="field-input tabular-nums"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="field-group" style={{ marginTop: 12 }}>
                    <label className="field-label" htmlFor="c-email">
                      Email Address (for E-Ticket copy)
                    </label>
                    <input
                      id="c-email"
                      type="email"
                      required
                      className="field-input"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <h2 style={{ fontSize: '1.15rem', marginBottom: 12 }}>
                    Passenger Manifest ({passengers.length})
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {passengers.map((pax, idx) => (
                      <div
                        key={idx}
                        className="card-flat"
                        style={{ padding: 16, background: 'var(--bg-canvas)' }}
                      >
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: '0.88rem',
                            color: 'var(--ocean-deep)',
                            marginBottom: 10,
                          }}
                        >
                          Passenger {idx + 1} &middot; {labelForType(pax.passenger_type)}
                        </div>
                        <div className="grid-2">
                          <div className="field-group">
                            <label className="field-label" htmlFor={`p-name-${idx}`}>
                              Full Name
                            </label>
                            <input
                              id={`p-name-${idx}`}
                              type="text"
                              required
                              placeholder="First and Last Name"
                              className="field-input"
                              value={pax.full_name}
                              onChange={(e) => updatePassenger(idx, 'full_name', e.target.value)}
                            />
                          </div>
                          <div className="field-group">
                            <label className="field-label" htmlFor={`p-age-${idx}`}>
                              Age
                            </label>
                            <input
                              id={`p-age-${idx}`}
                              type="number"
                              min={0}
                              max={120}
                              required
                              className="field-input tabular-nums"
                              value={pax.age}
                              onChange={(e) => updatePassenger(idx, 'age', Number(e.target.value))}
                            />
                          </div>
                        </div>
                        <div className="field-group" style={{ marginTop: 10 }}>
                          <label className="field-label" htmlFor={`p-emerg-${idx}`}>
                            Emergency Contact Number
                          </label>
                          <input
                            id={`p-emerg-${idx}`}
                            type="tel"
                            required
                            placeholder="0917-000-0000"
                            className="field-input tabular-nums"
                            value={pax.emergency_contact}
                            onChange={(e) =>
                              updatePassenger(idx, 'emergency_contact', e.target.value)
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-yellow"
                  disabled={submitting}
                  style={{ width: '100%' }}
                >
                  {submitting
                    ? 'Confirming Reservation...'
                    : user
                    ? `Confirm Booking · ₱${totalFare.toLocaleString()}`
                    : 'Sign In to Confirm Booking'}
                </button>
              </form>

              {/* Fare & Trip Summary */}
              <aside className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <h2 style={{ fontSize: '1.15rem' }}>Trip &amp; Fare Summary</h2>

                {outboundTrip && (
                  <div style={{ paddingBottom: 14, borderBottom: '1px solid var(--border-hairline)' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      Outbound Crossing
                    </div>
                    <div style={{ fontWeight: 700, marginTop: 2 }}>
                      {outboundTrip.origin} &rarr; {outboundTrip.destination}
                    </div>
                    <div className="meta-line" style={{ marginTop: 4 }}>
                      <span className="tabular-nums">{outboundTrip.departure_date}</span>
                      <span>&middot;</span>
                      <span className="tabular-nums">
                        {outboundTrip.departure_time} &ndash; {outboundTrip.arrival_time}
                      </span>
                    </div>
                    <div className="meta-line" style={{ marginTop: 2 }}>
                      <span>{outboundTrip.operator_name}</span>
                      <span>&middot;</span>
                      <span>{outboundTrip.boat_name}</span>
                    </div>
                    <div className="tabular-nums" style={{ marginTop: 8, fontWeight: 600 }}>
                      Subtotal: ₱{outboundSubtotal.toLocaleString()}
                    </div>
                  </div>
                )}

                {returnTrip && (
                  <div style={{ paddingBottom: 14, borderBottom: '1px solid var(--border-hairline)' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      Return Crossing
                    </div>
                    <div style={{ fontWeight: 700, marginTop: 2 }}>
                      {returnTrip.origin} &rarr; {returnTrip.destination}
                    </div>
                    <div className="meta-line" style={{ marginTop: 4 }}>
                      <span className="tabular-nums">{returnTrip.departure_date}</span>
                      <span>&middot;</span>
                      <span className="tabular-nums">
                        {returnTrip.departure_time} &ndash; {returnTrip.arrival_time}
                      </span>
                    </div>
                    <div className="meta-line" style={{ marginTop: 2 }}>
                      <span>{returnTrip.operator_name}</span>
                      <span>&middot;</span>
                      <span>{returnTrip.boat_name}</span>
                    </div>
                    <div className="tabular-nums" style={{ marginTop: 8, fontWeight: 600 }}>
                      Subtotal: ₱{returnSubtotal.toLocaleString()}
                    </div>
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '1.15rem',
                    fontWeight: 700,
                    color: 'var(--ocean-deep)',
                  }}
                >
                  <span>Total Fare</span>
                  <span className="tabular-nums">₱{totalFare.toLocaleString()}</span>
                </div>

                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Fares are set transparently by verified operators. Pay at the Mabini or Tingloy
                  pier check-in counter when presenting your QR e-ticket.
                </p>
              </aside>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
