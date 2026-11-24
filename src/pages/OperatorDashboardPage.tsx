import { AlertTriangle, Plus, Printer, ShieldCheck, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import type { Announcement, Boat, Booking, Trip, TripStatus } from '../types';

export function OperatorDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { announcements, refreshAnnouncements, navigate } = useApp();

  const [tab, setTab] = useState<'trips' | 'manifest' | 'boats' | 'advisories'>('trips');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [boats, setBoats] = useState<Boat[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [operatorInfo, setOperatorInfo] = useState<{
    id: number;
    verified: number;
    business_name: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Add/Edit trip state
  const [editingTripId, setEditingTripId] = useState<number | null>(null);
  const [boatId, setBoatId] = useState<number>(0);
  const [origin, setOrigin] = useState('Mabini Port (Anilao)');
  const [destination, setDestination] = useState('Tingloy / Masasa Beach (Brgy. San Juan)');
  const [depDate, setDepDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [depTime, setDepTime] = useState('08:00');
  const [arrTime, setArrTime] = useState('08:50');
  const [adultFare, setAdultFare] = useState(180);
  const [childFare, setChildFare] = useState(135);
  const [infantFare, setInfantFare] = useState(0);
  const [notes, setNotes] = useState('');

  // Boat form state
  const [newBoatName, setNewBoatName] = useState('');
  const [newRegCode, setNewRegCode] = useState('');
  const [newBoatType, setNewBoatType] = useState('Outrigger Passenger Banca');
  const [newBoatCap, setNewBoatCap] = useState(24);
  const [newLifeJackets, setNewLifeJackets] = useState(28);

  // Advisory form state
  const [advTitle, setAdvTitle] = useState('');
  const [advMessage, setAdvMessage] = useState('');
  const [advSeverity, setAdvSeverity] = useState<'info' | 'caution' | 'suspended'>('caution');

  // Manifest trip filter
  const [manifestTripId, setManifestTripId] = useState<string>('');

  const loadData = useCallback(async () => {
    if (!user || (user.role !== 'operator' && user.role !== 'admin')) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [tripsRes, bookingsRes] = await Promise.all([
        apiRequest<{
          trips: Trip[];
          boats: Boat[];
          operator: { id: number; verified: number; business_name: string } | null;
        }>('/api/trips/mine'),
        apiRequest<{ bookings: Booking[] }>('/api/bookings/operator'),
      ]);
      setTrips(tripsRes.trips);
      setBoats(tripsRes.boats);
      setOperatorInfo(tripsRes.operator);
      setBookings(bookingsRes.bookings);
      if (tripsRes.boats.length > 0 && boatId === 0) {
        setBoatId(tripsRes.boats[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load operator workspace.');
    } finally {
      setLoading(false);
    }
  }, [user, boatId]);

  useEffect(() => {
    if (!authLoading) {
      void loadData();
    }
  }, [authLoading, loadData]);

  if (!authLoading && (!user || (user.role !== 'operator' && user.role !== 'admin'))) {
    return (
      <section className="section">
        <div className="container">
          <div className="empty-state">
            <AlertTriangle size={34} color="var(--status-caution-text)" aria-hidden="true" />
            <h3>Operator Access Required</h3>
            <p>Sign in with an authorized boat operator account to manage trips and manifests.</p>
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

  const resetTripForm = () => {
    setEditingTripId(null);
    setOrigin('Mabini Port (Anilao)');
    setDestination('Tingloy / Masasa Beach (Brgy. San Juan)');
    setDepTime('08:00');
    setArrTime('08:50');
    setAdultFare(180);
    setChildFare(135);
    setInfantFare(0);
    setNotes('');
  };

  const handleSaveTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    try {
      if (editingTripId) {
        await apiRequest(`/api/trips/${editingTripId}`, {
          method: 'PUT',
          body: JSON.stringify({
            origin,
            destination,
            departure_date: depDate,
            departure_time: depTime,
            arrival_time: arrTime,
            adult_fare: adultFare,
            child_fare: childFare,
            infant_fare: infantFare,
            notes,
          }),
        });
        setNotice('Trip schedule updated.');
      } else {
        await apiRequest('/api/trips', {
          method: 'POST',
          body: JSON.stringify({
            boat_id: boatId,
            origin,
            destination,
            departure_date: depDate,
            departure_time: depTime,
            arrival_time: arrTime,
            adult_fare: adultFare,
            child_fare: childFare,
            infant_fare: infantFare,
            notes,
          }),
        });
        setNotice('New boat trip published.');
      }
      resetTripForm();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save trip.');
    }
  };

  const startEditTrip = (t: Trip) => {
    setEditingTripId(t.id);
    setBoatId(t.boat_id);
    setOrigin(t.origin);
    setDestination(t.destination);
    setDepDate(t.departure_date);
    setDepTime(t.departure_time);
    setArrTime(t.arrival_time);
    setAdultFare(t.adult_fare);
    setChildFare(t.child_fare);
    setInfantFare(t.infant_fare);
    setNotes(t.notes);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTripStatus = async (tripId: number, status: TripStatus) => {
    setError(null);
    setNotice(null);
    try {
      await apiRequest(`/api/trips/${tripId}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      setNotice(`Trip status updated to ${status}.`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update trip status.');
    }
  };

  const handleDeleteTrip = async (tripId: number) => {
    setError(null);
    setNotice(null);
    try {
      await apiRequest(`/api/trips/${tripId}`, { method: 'DELETE' });
      setNotice('Trip deleted.');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete trip.');
    }
  };

  const handleAddBoat = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    try {
      await apiRequest('/api/operators/boats', {
        method: 'POST',
        body: JSON.stringify({
          boat_name: newBoatName,
          registration_code: newRegCode,
          boat_type: newBoatType,
          capacity: newBoatCap,
          life_jackets_count: newLifeJackets,
        }),
      });
      setNewBoatName('');
      setNewRegCode('');
      setNotice('Vessel added to fleet.');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add boat.');
    }
  };

  const handlePostAdvisory = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    try {
      await apiRequest('/api/announcements', {
        method: 'POST',
        body: JSON.stringify({
          title: advTitle,
          message: advMessage,
          severity: advSeverity,
        }),
      });
      setAdvTitle('');
      setAdvMessage('');
      setNotice('Service advisory published.');
      await refreshAnnouncements();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to post advisory.');
    }
  };

  const handleToggleAdvisory = async (a: Announcement) => {
    try {
      await apiRequest(`/api/announcements/${a.id}/toggle`, { method: 'PATCH' });
      await refreshAnnouncements();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update advisory.');
    }
  };

  const filteredBookings = manifestTripId
    ? bookings.filter(
        (b) =>
          String(b.trip_id) === manifestTripId || String(b.return_trip_id) === manifestTripId
      )
    : bookings;

  const myAdvisories = operatorInfo
    ? announcements.filter((a) => a.operator_id === operatorInfo.id)
    : announcements;

  return (
    <div>
      <section className="page-banner no-print">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1>Operator Operations Console</h1>
              <p>
                {operatorInfo ? operatorInfo.business_name : 'Fleet & Trip Management'} &mdash;
                Schedule trips, manage service advisories, and print Coast Guard manifests.
              </p>
            </div>
            {operatorInfo && (
              <span
                className={`status-tag ${
                  operatorInfo.verified === 1
                    ? 'status-good'
                    : operatorInfo.verified === 0
                    ? 'status-caution'
                    : 'status-suspended'
                }`}
              >
                <ShieldCheck size={15} aria-hidden="true" />
                <span>
                  {operatorInfo.verified === 1
                    ? 'Verified Operator'
                    : operatorInfo.verified === 0
                    ? 'Pending Verification'
                    : 'Suspended'}
                </span>
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {operatorInfo && operatorInfo.verified !== 1 && (
            <div className="alert alert-warning no-print" style={{ marginBottom: 20 }}>
              <AlertTriangle size={18} aria-hidden="true" />
              <span>
                Your operator account is currently{' '}
                <strong>{operatorInfo.verified === 0 ? 'pending approval' : 'suspended'}</strong>.
                Trips will appear publicly once verified by the Tourism Office Admin.
              </span>
            </div>
          )}

          {error && (
            <div className="alert alert-error no-print" style={{ marginBottom: 16 }}>
              <span>{error}</span>
            </div>
          )}
          {notice && (
            <div className="alert alert-success no-print" style={{ marginBottom: 16 }}>
              <span>{notice}</span>
            </div>
          )}

          <div className="tabs-bar no-print">
            <button
              type="button"
              className={`tab-btn${tab === 'trips' ? ' active' : ''}`}
              onClick={() => setTab('trips')}
            >
              Trips &amp; Schedules ({trips.length})
            </button>
            <button
              type="button"
              className={`tab-btn${tab === 'manifest' ? ' active' : ''}`}
              onClick={() => setTab('manifest')}
            >
              Bookings &amp; Manifest ({bookings.length})
            </button>
            <button
              type="button"
              className={`tab-btn${tab === 'boats' ? ' active' : ''}`}
              onClick={() => setTab('boats')}
            >
              Fleet Vessels ({boats.length})
            </button>
            <button
              type="button"
              className={`tab-btn${tab === 'advisories' ? ' active' : ''}`}
              onClick={() => setTab('advisories')}
            >
              Service Advisories
            </button>
          </div>

          {loading ? (
            <div className="card">
              <div className="skeleton-line" style={{ width: '50%', marginBottom: 12 }} />
              <div className="skeleton-line" style={{ width: '85%' }} />
            </div>
          ) : tab === 'trips' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Create / Edit Trip Form */}
              <form className="card" onSubmit={(e) => void handleSaveTrip(e)}>
                <h2 style={{ fontSize: '1.15rem', marginBottom: 14 }}>
                  {editingTripId ? 'Edit Trip Schedule' : 'Add New Boat Trip'}
                </h2>
                <div className="filter-grid">
                  {!editingTripId && (
                    <div className="field-group">
                      <label className="field-label" htmlFor="op-boat">
                        Vessel
                      </label>
                      <select
                        id="op-boat"
                        className="field-select"
                        value={boatId}
                        onChange={(e) => setBoatId(Number(e.target.value))}
                      >
                        {boats
                          .filter((b) => b.status === 'active')
                          .map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.boat_name} ({b.capacity} pax)
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  <div className="field-group">
                    <label className="field-label" htmlFor="op-origin">
                      Origin
                    </label>
                    <select
                      id="op-origin"
                      className="field-select"
                      value={origin}
                      onChange={(e) => setOrigin(e.target.value)}
                    >
                      <option value="Mabini Port (Anilao)">Mabini Port (Anilao)</option>
                      <option value="Mabini Port (Talaga)">Mabini Port (Talaga)</option>
                      <option value="Tingloy / Masasa Beach (Brgy. San Juan)">
                        Tingloy / Masasa Beach (Brgy. San Juan)
                      </option>
                    </select>
                  </div>

                  <div className="field-group">
                    <label className="field-label" htmlFor="op-dest">
                      Destination
                    </label>
                    <select
                      id="op-dest"
                      className="field-select"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                    >
                      <option value="Tingloy / Masasa Beach (Brgy. San Juan)">
                        Tingloy / Masasa Beach (Brgy. San Juan)
                      </option>
                      <option value="Mabini Port (Anilao)">Mabini Port (Anilao)</option>
                      <option value="Mabini Port (Talaga)">Mabini Port (Talaga)</option>
                    </select>
                  </div>

                  <div className="field-group">
                    <label className="field-label" htmlFor="op-date">
                      Departure Date
                    </label>
                    <input
                      id="op-date"
                      type="date"
                      required
                      className="field-input tabular-nums"
                      value={depDate}
                      onChange={(e) => setDepDate(e.target.value)}
                    />
                  </div>

                  <div className="field-group">
                    <label className="field-label" htmlFor="op-dep-time">
                      Departure Time
                    </label>
                    <input
                      id="op-dep-time"
                      type="time"
                      required
                      className="field-input tabular-nums"
                      value={depTime}
                      onChange={(e) => setDepTime(e.target.value)}
                    />
                  </div>

                  <div className="field-group">
                    <label className="field-label" htmlFor="op-arr-time">
                      Arrival Time
                    </label>
                    <input
                      id="op-arr-time"
                      type="time"
                      required
                      className="field-input tabular-nums"
                      value={arrTime}
                      onChange={(e) => setArrTime(e.target.value)}
                    />
                  </div>

                  <div className="field-group">
                    <label className="field-label" htmlFor="op-adult-fare">
                      Adult Fare (₱)
                    </label>
                    <input
                      id="op-adult-fare"
                      type="number"
                      min={0}
                      required
                      className="field-input tabular-nums"
                      value={adultFare}
                      onChange={(e) => setAdultFare(Number(e.target.value))}
                    />
                  </div>

                  <div className="field-group">
                    <label className="field-label" htmlFor="op-child-fare">
                      Child Fare (₱)
                    </label>
                    <input
                      id="op-child-fare"
                      type="number"
                      min={0}
                      required
                      className="field-input tabular-nums"
                      value={childFare}
                      onChange={(e) => setChildFare(Number(e.target.value))}
                    />
                  </div>

                  <div className="field-group">
                    <label className="field-label" htmlFor="op-infant-fare">
                      Infant Fare (₱)
                    </label>
                    <input
                      id="op-infant-fare"
                      type="number"
                      min={0}
                      required
                      className="field-input tabular-nums"
                      value={infantFare}
                      onChange={(e) => setInfantFare(Number(e.target.value))}
                    />
                  </div>

                  <div className="field-group">
                    <label className="field-label" htmlFor="op-notes">
                      Boarding Notes
                    </label>
                    <input
                      id="op-notes"
                      type="text"
                      placeholder="e.g. Pier 1 boarding"
                      className="field-input"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <button type="submit" className="btn btn-primary btn-sm">
                    <Plus size={16} aria-hidden="true" />
                    <span>{editingTripId ? 'Save Changes' : 'Publish Trip'}</span>
                  </button>
                  {editingTripId && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={resetTripForm}
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </form>

              {/* Trips Table */}
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date &amp; Time</th>
                      <th>Route</th>
                      <th>Boat</th>
                      <th className="text-right">Fares (A/C)</th>
                      <th className="text-right">Seats Left</th>
                      <th>Status</th>
                      <th>Quick Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trips.map((t) => (
                      <tr key={t.id}>
                        <td className="tabular-nums">
                          <div style={{ fontWeight: 600 }}>{t.departure_date}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {t.departure_time} &ndash; {t.arrival_time}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{t.origin}</div>
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            &rarr; {t.destination}
                          </div>
                        </td>
                        <td>{t.boat_name}</td>
                        <td className="text-right tabular-nums">
                          ₱{t.adult_fare} / ₱{t.child_fare}
                        </td>
                        <td className="text-right tabular-nums">
                          {t.seats_available} / {t.total_capacity}
                        </td>
                        <td>
                          <select
                            aria-label={`Change status for trip ${t.id}`}
                            className="field-select"
                            style={{ minHeight: 34, padding: '4px 8px', fontSize: '0.82rem' }}
                            value={t.status}
                            onChange={(e) =>
                              void handleTripStatus(t.id, e.target.value as TripStatus)
                            }
                          >
                            <option value="scheduled">Scheduled</option>
                            <option value="delayed">Delayed</option>
                            <option value="full">Full</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => startEditTrip(t)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              aria-label={`Delete trip ${t.id}`}
                              onClick={() => void handleDeleteTrip(t.id)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : tab === 'manifest' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div
                className="filter-panel no-print"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                  gap: 16,
                  flexWrap: 'wrap',
                  marginBottom: 0,
                }}
              >
                <div className="field-group" style={{ minWidth: 280, flex: '1 1 320px' }}>
                  <label className="field-label" htmlFor="manifest-trip">
                    Filter Passenger Manifest by Trip
                  </label>
                  <select
                    id="manifest-trip"
                    className="field-select"
                    value={manifestTripId}
                    onChange={(e) => setManifestTripId(e.target.value)}
                  >
                    <option value="">All My Trips</option>
                    {trips.map((t) => (
                      <option key={t.id} value={String(t.id)}>
                        {t.departure_date} {t.departure_time} &mdash; {t.boat_name} ({t.origin})
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => window.print()}
                >
                  <Printer size={16} aria-hidden="true" />
                  <span>Print Passenger Manifest</span>
                </button>
              </div>

              <div className="card">
                <h2 style={{ fontSize: '1.15rem', marginBottom: 4 }}>
                  Philippine Coast Guard Passenger Manifest
                </h2>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                  {operatorInfo?.business_name} &middot; {filteredBookings.length} booking record(s)
                </p>

                {filteredBookings.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)' }}>No bookings recorded for this selection.</p>
                ) : (
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Ref #</th>
                          <th>Trip &amp; Boat</th>
                          <th>Passenger Names</th>
                          <th>Contact</th>
                          <th className="text-right">Pax</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBookings.map((b) => (
                          <tr key={b.id}>
                            <td className="tabular-nums" style={{ fontWeight: 600 }}>
                              {b.booking_ref}
                            </td>
                            <td>
                              <div className="tabular-nums" style={{ fontWeight: 600 }}>
                                {b.outbound_trip?.departure_date} {b.outbound_trip?.departure_time}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                {b.outbound_trip?.boat_name}
                              </div>
                            </td>
                            <td>
                              {b.passengers.map((p, i) => (
                                <div key={p.id ?? i} style={{ fontSize: '0.85rem' }}>
                                  <strong>{p.full_name}</strong> ({p.passenger_type}, {p.age}y) &middot;{' '}
                                  <span className="tabular-nums">{p.emergency_contact}</span>
                                </div>
                              ))}
                            </td>
                            <td>
                              <div>{b.contact_name}</div>
                              <div className="tabular-nums" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                {b.contact_phone}
                              </div>
                            </td>
                            <td className="text-right tabular-nums">{b.total_passengers}</td>
                            <td>
                              <span
                                className={`status-tag ${
                                  b.status === 'confirmed' ? 'status-good' : 'status-suspended'
                                }`}
                              >
                                {b.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : tab === 'boats' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <form className="card" onSubmit={(e) => void handleAddBoat(e)}>
                <h2 style={{ fontSize: '1.15rem', marginBottom: 14 }}>Register New Vessel</h2>
                <div className="filter-grid">
                  <div className="field-group">
                    <label className="field-label" htmlFor="b-name">
                      Boat Name
                    </label>
                    <input
                      id="b-name"
                      type="text"
                      required
                      placeholder="M/B Masasa II"
                      className="field-input"
                      value={newBoatName}
                      onChange={(e) => setNewBoatName(e.target.value)}
                    />
                  </div>
                  <div className="field-group">
                    <label className="field-label" htmlFor="b-reg">
                      MARINA Reg. Code
                    </label>
                    <input
                      id="b-reg"
                      type="text"
                      required
                      placeholder="BTG-TIN-109"
                      className="field-input tabular-nums"
                      value={newRegCode}
                      onChange={(e) => setNewRegCode(e.target.value)}
                    />
                  </div>
                  <div className="field-group">
                    <label className="field-label" htmlFor="b-type">
                      Boat Type
                    </label>
                    <input
                      id="b-type"
                      type="text"
                      required
                      className="field-input"
                      value={newBoatType}
                      onChange={(e) => setNewBoatType(e.target.value)}
                    />
                  </div>
                  <div className="field-group">
                    <label className="field-label" htmlFor="b-cap">
                      Capacity
                    </label>
                    <input
                      id="b-cap"
                      type="number"
                      min={4}
                      max={100}
                      required
                      className="field-input tabular-nums"
                      value={newBoatCap}
                      onChange={(e) => setNewBoatCap(Number(e.target.value))}
                    />
                  </div>
                  <div className="field-group">
                    <label className="field-label" htmlFor="b-jackets">
                      Life Jackets
                    </label>
                    <input
                      id="b-jackets"
                      type="number"
                      min={4}
                      max={150}
                      required
                      className="field-input tabular-nums"
                      value={newLifeJackets}
                      onChange={(e) => setNewLifeJackets(Number(e.target.value))}
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary btn-sm" style={{ marginTop: 16 }}>
                  Add Vessel
                </button>
              </form>

              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Vessel Name</th>
                      <th>Registration</th>
                      <th>Type</th>
                      <th className="text-right">Capacity</th>
                      <th className="text-right">Life Jackets</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {boats.map((b) => (
                      <tr key={b.id}>
                        <td style={{ fontWeight: 600 }}>{b.boat_name}</td>
                        <td className="tabular-nums">{b.registration_code}</td>
                        <td>{b.boat_type}</td>
                        <td className="text-right tabular-nums">{b.capacity}</td>
                        <td className="text-right tabular-nums">{b.life_jackets_count}</td>
                        <td>
                          <span className="status-tag status-good">{b.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <form className="card" onSubmit={(e) => void handlePostAdvisory(e)}>
                <h2 style={{ fontSize: '1.15rem', marginBottom: 14 }}>
                  Post Service or Weather Advisory
                </h2>
                <div className="grid-2">
                  <div className="field-group">
                    <label className="field-label" htmlFor="adv-title">
                      Advisory Title
                    </label>
                    <input
                      id="adv-title"
                      type="text"
                      required
                      placeholder="e.g. Afternoon Trip Delayed due to Strong Winds"
                      className="field-input"
                      value={advTitle}
                      onChange={(e) => setAdvTitle(e.target.value)}
                    />
                  </div>
                  <div className="field-group">
                    <label className="field-label" htmlFor="adv-sev">
                      Severity Level
                    </label>
                    <select
                      id="adv-sev"
                      className="field-select"
                      value={advSeverity}
                      onChange={(e) =>
                        setAdvSeverity(e.target.value as 'info' | 'caution' | 'suspended')
                      }
                    >
                      <option value="info">Info (Good Sea Condition)</option>
                      <option value="caution">Caution (Moderate Swell / Delay)</option>
                      <option value="suspended">Suspended (Trips Halted)</option>
                    </select>
                  </div>
                </div>
                <div className="field-group" style={{ marginTop: 12 }}>
                  <label className="field-label" htmlFor="adv-msg">
                    Advisory Details
                  </label>
                  <textarea
                    id="adv-msg"
                    className="field-textarea"
                    required
                    minLength={10}
                    placeholder="Provide clear schedule guidance for affected passengers..."
                    value={advMessage}
                    onChange={(e) => setAdvMessage(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-sm" style={{ marginTop: 14 }}>
                  Publish Advisory
                </button>
              </form>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {myAdvisories.map((a) => (
                  <div key={a.id} className="card-flat">
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 10,
                        flexWrap: 'wrap',
                      }}
                    >
                      <strong>{a.title}</strong>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span
                          className={`status-tag ${
                            a.severity === 'suspended'
                              ? 'status-suspended'
                              : a.severity === 'caution'
                              ? 'status-caution'
                              : 'status-good'
                          }`}
                        >
                          {a.sea_condition}
                        </span>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => void handleToggleAdvisory(a)}
                        >
                          {a.is_active === 1 ? 'Mark Resolved' : 'Re-activate'}
                        </button>
                      </div>
                    </div>
                    <p style={{ marginTop: 6, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      {a.message}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
