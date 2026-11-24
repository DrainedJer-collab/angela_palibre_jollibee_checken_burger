import { ChevronDown, Minus, Plus, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';

export function SearchCard() {
  const { searchDraft, setSearchDraft, navigate } = useApp();
  const [paxOpen, setPaxOpen] = useState(false);
  const paxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (paxRef.current && !paxRef.current.contains(e.target as Node)) {
        setPaxOpen(false);
      }
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  const totalPax = searchDraft.adults + searchDraft.children + searchDraft.infants;

  const updateCount = (field: 'adults' | 'children' | 'infants', delta: number) => {
    setSearchDraft((prev) => {
      const min = field === 'adults' ? 1 : 0;
      const next = Math.max(min, Math.min(20, prev[field] + delta));
      return { ...prev, [field]: next };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPaxOpen(false);
    navigate('/schedules');
  };

  return (
    <div className="search-card-wrapper">
      <div className="container">
        <form className="search-card" onSubmit={handleSubmit} aria-label="Search boat trips">
          <div className="trip-type-tabs" role="tablist" aria-label="Trip type">
            <button
              type="button"
              role="tab"
              aria-selected={searchDraft.tripType === 'one-way'}
              className={`trip-type-tab${searchDraft.tripType === 'one-way' ? ' active' : ''}`}
              onClick={() => setSearchDraft((p) => ({ ...p, tripType: 'one-way' }))}
            >
              One-way
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={searchDraft.tripType === 'round-trip'}
              className={`trip-type-tab${searchDraft.tripType === 'round-trip' ? ' active' : ''}`}
              onClick={() => setSearchDraft((p) => ({ ...p, tripType: 'round-trip' }))}
            >
              Round trip
            </button>
          </div>

          <div
            className={`search-fields-grid${
              searchDraft.tripType === 'round-trip' ? ' round-trip' : ''
            }`}
          >
            <div className="field-group">
              <label className="field-label" htmlFor="search-origin">
                From
              </label>
              <select
                id="search-origin"
                className="field-select"
                value={searchDraft.origin}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchDraft((p) => ({
                    ...p,
                    origin: val,
                    destination: val.startsWith('Tingloy')
                      ? 'Mabini Port'
                      : 'Tingloy / Masasa Beach',
                  }));
                }}
              >
                <option value="Mabini Port">Mabini Port (Anilao / Talaga)</option>
                <option value="Mabini Port (Anilao)">Mabini Port (Anilao)</option>
                <option value="Mabini Port (Talaga)">Mabini Port (Talaga)</option>
                <option value="Tingloy">Tingloy / Masasa Beach</option>
              </select>
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="search-dest">
                To
              </label>
              <select
                id="search-dest"
                className="field-select"
                value={searchDraft.destination}
                onChange={(e) => setSearchDraft((p) => ({ ...p, destination: e.target.value }))}
              >
                <option value="Tingloy / Masasa Beach">Tingloy / Masasa Beach (San Juan)</option>
                <option value="Mabini Port">Mabini Port (Anilao / Talaga)</option>
              </select>
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="search-dep-date">
                Departure Date
              </label>
              <input
                id="search-dep-date"
                type="date"
                className="field-input tabular-nums"
                value={searchDraft.departureDate}
                onChange={(e) => setSearchDraft((p) => ({ ...p, departureDate: e.target.value }))}
              />
            </div>

            {searchDraft.tripType === 'round-trip' && (
              <div className="field-group">
                <label className="field-label" htmlFor="search-ret-date">
                  Return Date
                </label>
                <input
                  id="search-ret-date"
                  type="date"
                  className="field-input tabular-nums"
                  min={searchDraft.departureDate}
                  value={searchDraft.returnDate}
                  onChange={(e) => setSearchDraft((p) => ({ ...p, returnDate: e.target.value }))}
                />
              </div>
            )}

            <div className="field-group" ref={paxRef}>
              <span className="field-label" id="pax-label">
                Passengers
              </span>
              <button
                type="button"
                className="pax-trigger"
                aria-labelledby="pax-label"
                aria-expanded={paxOpen}
                onClick={() => setPaxOpen((o) => !o)}
              >
                <span className="tabular-nums">
                  {totalPax} {totalPax === 1 ? 'Passenger' : 'Passengers'}
                </span>
                <ChevronDown size={16} aria-hidden="true" />
              </button>

              {paxOpen && (
                <div className="pax-popover" role="dialog" aria-label="Passenger counts">
                  <div className="pax-row">
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Adults</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        12+ years
                      </div>
                    </div>
                    <div className="pax-stepper">
                      <button
                        type="button"
                        className="stepper-btn"
                        aria-label="Decrease adults"
                        disabled={searchDraft.adults <= 1}
                        onClick={() => updateCount('adults', -1)}
                      >
                        <Minus size={14} />
                      </button>
                      <span className="tabular-nums" style={{ minWidth: 20, textAlign: 'center' }}>
                        {searchDraft.adults}
                      </span>
                      <button
                        type="button"
                        className="stepper-btn"
                        aria-label="Increase adults"
                        onClick={() => updateCount('adults', 1)}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="pax-row">
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Children</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        3–11 years
                      </div>
                    </div>
                    <div className="pax-stepper">
                      <button
                        type="button"
                        className="stepper-btn"
                        aria-label="Decrease children"
                        disabled={searchDraft.children <= 0}
                        onClick={() => updateCount('children', -1)}
                      >
                        <Minus size={14} />
                      </button>
                      <span className="tabular-nums" style={{ minWidth: 20, textAlign: 'center' }}>
                        {searchDraft.children}
                      </span>
                      <button
                        type="button"
                        className="stepper-btn"
                        aria-label="Increase children"
                        onClick={() => updateCount('children', 1)}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="pax-row">
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Infants</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Under 3 years
                      </div>
                    </div>
                    <div className="pax-stepper">
                      <button
                        type="button"
                        className="stepper-btn"
                        aria-label="Decrease infants"
                        disabled={searchDraft.infants <= 0}
                        onClick={() => updateCount('infants', -1)}
                      >
                        <Minus size={14} />
                      </button>
                      <span className="tabular-nums" style={{ minWidth: 20, textAlign: 'center' }}>
                        {searchDraft.infants}
                      </span>
                      <button
                        type="button"
                        className="stepper-btn"
                        aria-label="Increase infants"
                        onClick={() => updateCount('infants', 1)}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => setPaxOpen(false)}
                  >
                    Done
                  </button>
                </div>
              )}
            </div>

            <button type="submit" className="btn btn-yellow">
              <Search size={18} aria-hidden="true" />
              <span>Search</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
