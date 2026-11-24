import { AlertTriangle, CheckCircle2, Clock, Phone, ShieldCheck, Ship, Star } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { apiRequest } from '../lib/api';
import type { Operator, Trip } from '../types';

export function SchedulesPage() {
  const { searchDraft, setSearchDraft, setBookingSelection, navigate } = useApp();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [returnTrips, setReturnTrips] = useState<Trip[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedOperator, setSelectedOperator] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('time_asc');
  const [selectedOutbound, setSelectedOutbound] = useState<Trip | null>(null);

  const totalPassengers = searchDraft.adults + searchDraft.children + searchDraft.infants;

  useEffect(() => {
    apiRequest<{ operators: Operator[] }>('/api/operators')
      .then((res) => setOperators(res.operators))
      .catch(() => setOperators([]));
  }, []);

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchDraft.departureDate) params.set('date', searchDraft.departureDate);
      if (searchDraft.origin) params.set('origin', searchDraft.origin);
      if (searchDraft.destination) params.set('destination', searchDraft.destination);
      if (selectedOperator) params.set('operator', selectedOperator);
      if (maxPrice) params.set('maxPrice', maxPrice);
      params.set('sort', sortBy);

      const outRes = await apiRequest<{ trips: Trip[] }>(`/api/trips?${params.toString()}`);
      setTrips(outRes.trips);

      if (searchDraft.tripType === 'round-trip') {
        const retParams = new URLSearchParams();
        if (searchDraft.returnDate) retParams.set('date', searchDraft.returnDate);
        if (searchDraft.destination) retParams.set('origin', searchDraft.destination);
        if (searchDraft.origin) retParams.set('destination', searchDraft.origin);
        if (selectedOperator) retParams.set('operator', selectedOperator);
        if (maxPrice) retParams.set('maxPrice', maxPrice);
        retParams.set('sort', sortBy);

        const retRes = await apiRequest<{ trips: Trip[] }>(`/api/trips?${retParams.toString()}`);
        setReturnTrips(retRes.trips);
      } else {
        setReturnTrips([]);
        setSelectedOutbound(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load boat schedules.');
    } finally {
      setLoading(false);
    }
  }, [searchDraft, selectedOperator, maxPrice, sortBy]);

  useEffect(() => {
    void fetchSchedules();
  }, [fetchSchedules]);

  const handleBookOneWay = (trip: Trip) => {
    setBookingSelection({
      outboundTripId: trip.id,
      returnTripId: null,
      tripType: 'one-way',
      adults: searchDraft.adults,
      children: searchDraft.children,
      infants: searchDraft.infants,
    });
    navigate('/book');
  };

  const handleSelectReturn = (retTrip: Trip) => {
    if (!selectedOutbound) return;
    setBookingSelection({
      outboundTripId: selectedOutbound.id,
      returnTripId: retTrip.id,
      tripType: 'round-trip',
      adults: searchDraft.adults,
      children: searchDraft.children,
      infants: searchDraft.infants,
    });
    navigate('/book');
  };

  const resetFilters = () => {
    setSelectedOperator('');
    setMaxPrice('');
    setSortBy('time_asc');
    setSearchDraft((p) => ({
      ...p,
      origin: '',
      destination: '',
      departureDate: '',
    }));
  };

  const renderStatus = (trip: Trip) => {
    if (trip.status === 'cancelled') {
      return <span className="status-tag status-suspended">Cancelled</span>;
    }
    if (trip.status === 'delayed') {
      return <span className="status-tag status-caution">Delayed</span>;
    }
    if (trip.status === 'full' || trip.seats_available < totalPassengers) {
      return (
        <span className="status-tag status-neutral">
          {trip.seats_available === 0 ? 'Full' : `${trip.seats_available} left`}
        </span>
      );
    }
    return <span className="status-tag status-good">Scheduled</span>;
  };

  const renderTripList = (list: Trip[], mode: 'outbound' | 'return') => {
    if (loading) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="card-flat">
              <div className="skeleton-line" style={{ width: '45%', marginBottom: 10 }} />
              <div className="skeleton-line" style={{ width: '80%' }} />
            </div>
          ))}
        </div>
      );
    }

    if (list.length === 0) {
      return (
        <div className="empty-state">
          <Ship size={36} color="var(--ocean-sky)" aria-hidden="true" />
          <h3>No matching verified boat trips found</h3>
          <p>
            Try clearing the date or route filters to view all upcoming verified departures across the
            next 14 days.
          </p>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            style={{ marginTop: 16 }}
            onClick={resetFilters}
          >
            Show All Upcoming Trips
          </button>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {list.map((trip) => {
          const canBook =
            trip.status !== 'cancelled' &&
            trip.status !== 'full' &&
            trip.seats_available >= totalPassengers;
          const isSelectedOutbound = selectedOutbound?.id === trip.id;

          return (
            <article
              key={trip.id}
              className="card-flat"
              style={{
                borderColor: isSelectedOutbound ? 'var(--ocean-sky)' : undefined,
                boxShadow: isSelectedOutbound ? '0 0 0 2px rgba(46, 156, 202, 0.25)' : undefined,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 16,
                }}
              >
                <div style={{ flex: '1 1 320px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '1.1rem' }}>{trip.operator_name}</h3>
                    <span className="status-tag status-good">
                      <ShieldCheck size={14} aria-hidden="true" />
                      <span>Verified</span>
                    </span>
                    {renderStatus(trip)}
                  </div>

                  <div className="meta-line" style={{ marginTop: 8 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>{trip.origin}</strong>
                    <span>&rarr;</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{trip.destination}</strong>
                  </div>

                  <div className="meta-line" style={{ marginTop: 6 }}>
                    <span className="tabular-nums" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={14} aria-hidden="true" />
                      {trip.departure_date} &middot; {trip.departure_time} &ndash; {trip.arrival_time}
                    </span>
                    <span>&middot;</span>
                    <span>
                      {trip.boat_name} ({trip.boat_type})
                    </span>
                    <span>&middot;</span>
                    <span className="tabular-nums">
                      {trip.seats_available} / {trip.total_capacity} seats left
                    </span>
                  </div>

                  <div className="meta-line" style={{ marginTop: 6 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Star size={14} color="#D97706" fill="#FFC93C" aria-hidden="true" />
                      <span className="tabular-nums">{trip.avg_rating}</span>
                    </span>
                    <span>&middot;</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Phone size={13} aria-hidden="true" />
                      <span className="tabular-nums">{trip.contact_number}</span>
                    </span>
                    {trip.notes && (
                      <>
                        <span>&middot;</span>
                        <span>{trip.notes}</span>
                      </>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: 8,
                    minWidth: 200,
                  }}
                >
                  <div style={{ textAlign: 'right' }}>
                    <div
                      className="tabular-nums"
                      style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--ocean-deep)' }}
                    >
                      ₱{trip.adult_fare}
                      <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                        {' '}
                        / adult
                      </span>
                    </div>
                    <div className="tabular-nums" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Child: ₱{trip.child_fare} &middot; Infant: ₱{trip.infant_fare}
                    </div>
                  </div>

                  {searchDraft.tripType === 'one-way' ? (
                    <button
                      type="button"
                      className="btn btn-yellow btn-sm"
                      disabled={!canBook}
                      onClick={() => handleBookOneWay(trip)}
                    >
                      {canBook ? 'Select & Book' : 'Unavailable'}
                    </button>
                  ) : mode === 'outbound' ? (
                    <button
                      type="button"
                      className={`btn btn-sm ${isSelectedOutbound ? 'btn-primary' : 'btn-yellow'}`}
                      disabled={!canBook}
                      onClick={() => setSelectedOutbound(trip)}
                    >
                      {isSelectedOutbound ? 'Outbound Selected' : canBook ? 'Select Outbound' : 'Unavailable'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-yellow btn-sm"
                      disabled={!canBook || !selectedOutbound}
                      onClick={() => handleSelectReturn(trip)}
                    >
                      {!selectedOutbound
                        ? 'Select Outbound First'
                        : canBook
                        ? 'Select Return & Book'
                        : 'Unavailable'}
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      <section className="page-banner">
        <div className="container">
          <h1>Boat Schedules &amp; Fares</h1>
          <p>
            Verified departures between Mabini Port and Barangay San Juan / Masasa Beach. Only
            approved, licensed operators appear in public schedules.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="filter-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
              <div className="trip-type-tabs" style={{ marginBottom: 0 }}>
                <button
                  type="button"
                  className={`trip-type-tab${searchDraft.tripType === 'one-way' ? ' active' : ''}`}
                  onClick={() => setSearchDraft((p) => ({ ...p, tripType: 'one-way' }))}
                >
                  One-way
                </button>
                <button
                  type="button"
                  className={`trip-type-tab${searchDraft.tripType === 'round-trip' ? ' active' : ''}`}
                  onClick={() => setSearchDraft((p) => ({ ...p, tripType: 'round-trip' }))}
                >
                  Round trip
                </button>
              </div>
              <div className="meta-line">
                <span>Searching for</span>
                <strong className="tabular-nums">
                  {totalPassengers} passenger(s) ({searchDraft.adults}A, {searchDraft.children}C,{' '}
                  {searchDraft.infants}I)
                </strong>
              </div>
            </div>

            <div className="filter-grid">
              <div className="field-group">
                <label className="field-label" htmlFor="filter-date">
                  Departure Date
                </label>
                <input
                  id="filter-date"
                  type="date"
                  className="field-input tabular-nums"
                  value={searchDraft.departureDate}
                  onChange={(e) => setSearchDraft((p) => ({ ...p, departureDate: e.target.value }))}
                />
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="filter-origin">
                  Origin Port
                </label>
                <select
                  id="filter-origin"
                  className="field-select"
                  value={searchDraft.origin}
                  onChange={(e) => setSearchDraft((p) => ({ ...p, origin: e.target.value }))}
                >
                  <option value="">All Origins</option>
                  <option value="Mabini Port">Mabini Port (All)</option>
                  <option value="Mabini Port (Anilao)">Mabini Port (Anilao)</option>
                  <option value="Mabini Port (Talaga)">Mabini Port (Talaga)</option>
                  <option value="Tingloy">Tingloy / Masasa Beach</option>
                </select>
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="filter-operator">
                  Operator
                </label>
                <select
                  id="filter-operator"
                  className="field-select"
                  value={selectedOperator}
                  onChange={(e) => setSelectedOperator(e.target.value)}
                >
                  <option value="">All Verified Operators</option>
                  {operators.map((op) => (
                    <option key={op.id} value={String(op.id)}>
                      {op.business_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="filter-price">
                  Max Adult Fare (₱)
                </label>
                <input
                  id="filter-price"
                  type="number"
                  min={0}
                  placeholder="e.g. 200"
                  className="field-input tabular-nums"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="filter-sort">
                  Sort By
                </label>
                <select
                  id="filter-sort"
                  className="field-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="time_asc">Earliest Departure</option>
                  <option value="price_asc">Lowest Fare</option>
                  <option value="price_desc">Highest Fare</option>
                  <option value="seats_desc">Most Seats Available</option>
                </select>
              </div>
            </div>
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: 20 }}>
              <AlertTriangle size={18} aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {searchDraft.tripType === 'round-trip' && (
            <div className="alert alert-info" style={{ marginBottom: 20 }}>
              <CheckCircle2 size={18} aria-hidden="true" />
              <div>
                <strong>Round-Trip Booking:</strong> Step 1 — Select an outbound trip below. Step 2 —
                Choose your return trip for{' '}
                <input
                  type="date"
                  aria-label="Return date"
                  className="tabular-nums"
                  style={{
                    marginLeft: 6,
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: '1px solid var(--border-strong)',
                  }}
                  value={searchDraft.returnDate}
                  onChange={(e) => setSearchDraft((p) => ({ ...p, returnDate: e.target.value }))}
                />
              </div>
            </div>
          )}

          <h2 style={{ fontSize: '1.25rem', marginBottom: 14 }}>
            {searchDraft.tripType === 'round-trip' ? '1. Outbound Crossings' : 'Available Crossings'}
          </h2>
          {renderTripList(trips, 'outbound')}

          {searchDraft.tripType === 'round-trip' && (
            <div style={{ marginTop: 36 }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: 14 }}>2. Return Crossings</h2>
              {renderTripList(returnTrips, 'return')}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
