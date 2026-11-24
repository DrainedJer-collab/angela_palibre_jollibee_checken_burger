import {
  AlertTriangle,
  Anchor,
  ArrowRight,
  CheckCircle2,
  OctagonAlert,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { HeroIllustration } from '../components/HeroIllustration';
import { SearchCard } from '../components/SearchCard';
import { useApp } from '../context/AppContext';
import { apiRequest } from '../lib/api';
import type { Operator } from '../types';

export function HomePage() {
  const { navigate, announcements, seaStatus } = useApp();
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loadingOps, setLoadingOps] = useState(true);

  useEffect(() => {
    apiRequest<{ operators: Operator[] }>('/api/operators')
      .then((res) => setOperators(res.operators))
      .catch(() => setOperators([]))
      .finally(() => setLoadingOps(false));
  }, []);

  const topAnnouncements = announcements.slice(0, 3);

  const renderSeaStatusBadge = () => {
    if (seaStatus === 'Suspended') {
      return (
        <span className="status-tag status-suspended">
          <OctagonAlert size={15} aria-hidden="true" />
          <span>Suspended</span>
        </span>
      );
    }
    if (seaStatus === 'Caution') {
      return (
        <span className="status-tag status-caution">
          <AlertTriangle size={15} aria-hidden="true" />
          <span>Caution</span>
        </span>
      );
    }
    return (
      <span className="status-tag status-good">
        <CheckCircle2 size={15} aria-hidden="true" />
        <span>Good</span>
      </span>
    );
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="hero-section">
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="hero-kicker">
              Mabini Port &harr; Barangay San Juan &amp; Masasa Beach, Tingloy
            </div>
            <h1 className="hero-title">Book Your Boat to Tingloy</h1>
            <p className="hero-subtitle">
              Compare verified passenger boat schedules, transparent fares, and live sea advisories
              in one official portal—replacing scattered messages and port uncertainty with instant
              QR e-tickets.
            </p>
          </div>
          <div className="hero-visual">
            <HeroIllustration />
          </div>
        </div>
      </section>

      {/* Overlapping Search Card */}
      <SearchCard />

      {/* Trust Bar */}
      <section className="container" aria-label="Service guarantees">
        <div className="trust-bar">
          <div className="trust-item">
            <div>
              <div className="trust-title">Verified Operators</div>
              <div className="trust-desc">MARINA-licensed &amp; approved</div>
            </div>
          </div>

          <div className="trust-item">
            <div>
              <div className="trust-title">Live Weather Advisories</div>
              <div className="trust-desc">Real-time Coast Guard updates</div>
            </div>
          </div>

          <div className="trust-item">
            <div>
              <div className="trust-title">Instant E-Ticket</div>
              <div className="trust-desc">QR code manifest check-in</div>
            </div>
          </div>

          <div className="trust-item">
            <div>
              <div className="trust-title">Easy Cancellation</div>
              <div className="trust-desc">Automatic seat restoration</div>
            </div>
          </div>
        </div>
      </section>

      {/* Today's Sea Status & Latest Announcements */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <div>
              <h2 className="section-title">Today&rsquo;s Sea Status &amp; Updates</h2>
              <p className="section-subtitle">
                Official crossing advisories posted by Barangay San Juan, Municipal Tourism Office,
                and verified boat operators.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => navigate('/announcements')}
            >
              <span>All Advisories</span>
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          </div>

          <div className="grid-2">
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h3 style={{ fontSize: '1.15rem' }}>Maricaban Strait Sea Status</h3>
                </div>
                {renderSeaStatusBadge()}
              </div>

              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                {seaStatus === 'Suspended'
                  ? 'Trips are currently suspended due to hazardous sea conditions or Coast Guard gale advisories. Please check updates before traveling to Mabini Port.'
                  : seaStatus === 'Caution'
                  ? 'Trips are operating with sea caution. Expect moderate swells along the strait; arrive 20 minutes early and keep life jackets fastened.'
                  : 'Sea conditions are calm and favorable for crossings between Mabini Port and Barangay San Juan / Masasa Beach.'}
              </p>

              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  flexWrap: 'wrap',
                  paddingTop: 12,
                  borderTop: '1px solid var(--border-hairline)',
                }}
              >
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => navigate('/schedules')}
                >
                  Check Today&rsquo;s Trips
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => navigate('/safety')}
                >
                  Read Safety Rules
                </button>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <h3 style={{ fontSize: '1.15rem' }}>Latest Port Announcements</h3>
              {topAnnouncements.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No announcements posted yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {topAnnouncements.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        paddingBottom: 12,
                        borderBottom: '1px solid var(--border-hairline)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <strong style={{ fontSize: '0.94rem' }}>{item.title}</strong>
                        <span
                          className={`status-tag ${
                            item.severity === 'suspended'
                              ? 'status-suspended'
                              : item.severity === 'caution'
                              ? 'status-caution'
                              : 'status-good'
                          }`}
                        >
                          {item.sea_condition}
                        </span>
                      </div>
                      <p
                        style={{
                          fontSize: '0.86rem',
                          color: 'var(--text-secondary)',
                          marginTop: 4,
                        }}
                      >
                        {item.message}
                      </p>
                      <div className="meta-line" style={{ marginTop: 6 }}>
                        <span>{item.operator_name || 'Municipal Tourism Office'}</span>
                        <span>&middot;</span>
                        <span className="tabular-nums">{item.created_at.slice(0, 16)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Verified Operators */}
      <section className="section section-alt">
        <div className="container">
          <div className="section-header">
            <div>
              <h2 className="section-title">Featured Verified Operators</h2>
              <p className="section-subtitle">
                Every boat service listed below is verified by the Barangay San Juan &amp; Tingloy
                Tourism Office with inspected life jackets and registered MARINA permits.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => navigate('/operators')}
            >
              <span>View Directory</span>
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          </div>

          {loadingOps ? (
            <div className="grid-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card-flat">
                  <div className="skeleton-line" style={{ width: '65%', marginBottom: 10 }} />
                  <div className="skeleton-line" style={{ width: '90%', marginBottom: 8 }} />
                  <div className="skeleton-line" style={{ width: '45%' }} />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid-3">
              {operators.slice(0, 3).map((op) => (
                <article
                  key={op.id}
                  className="card-flat"
                  style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 16 }}
                >
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: 8,
                      }}
                    >
                      <h3 style={{ fontSize: '1.08rem' }}>{op.business_name}</h3>
                      <span className="status-tag status-good">
                        <ShieldCheck size={14} aria-hidden="true" />
                        <span>Verified</span>
                      </span>
                    </div>
                    <div className="meta-line" style={{ marginTop: 6 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Star size={14} color="#D97706" fill="#FFC93C" aria-hidden="true" />
                        <strong className="tabular-nums">{op.avg_rating || 'New'}</strong>
                        <span>({op.review_count})</span>
                      </span>
                      <span>&middot;</span>
                      <span className="tabular-nums">{op.boats.length} boats</span>
                      <span>&middot;</span>
                      <span className="tabular-nums">{op.upcoming_trips_count} upcoming trips</span>
                    </div>
                    <p
                      style={{
                        marginTop: 10,
                        fontSize: '0.88rem',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {op.description}
                    </p>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: 12,
                      borderTop: '1px solid var(--border-hairline)',
                    }}
                  >
                    <span className="tabular-nums" style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {op.contact_number}
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => navigate('/schedules')}
                    >
                      View Trips
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* About Masasa Beach & Tingloy */}
      <section className="section section-sand">
        <div className="container">
          <div className="grid-2" style={{ alignItems: 'center' }}>
            <div>
              <h2 className="section-title">About Masasa Beach &amp; Barangay San Juan</h2>
              <p style={{ marginTop: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                Located in the island municipality of Tingloy, Batangas, Barangay San Juan is home
                to Masasa Beach—renowned for its clear turquoise waters, white shoreline, vibrant
                coral reefs, and peaceful coastal hospitality.
              </p>
              <p style={{ marginTop: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                To protect marine ecosystems, prevent port overcrowding, and ensure fair livelihoods
                for local boat operators, Tingloy Sea Connect provides one centralized platform for
                verified boat schedules, manifest tracking, and coastal stewardship reminders.
              </p>
              <div style={{ marginTop: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => navigate('/schedules')}
                >
                  Browse Boat Schedules
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => navigate('/safety')}
                >
                  Responsible Tourism Rules
                </button>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Anchor size={20} color="var(--ocean-deep)" aria-hidden="true" />
                <h3 style={{ fontSize: '1.1rem' }}>Sustainable Island Travel Commitments</h3>
              </div>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: 20,
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  fontSize: '0.92rem',
                }}
              >
                <li>Pre-book verified boats to eliminate double bookings and port congestion.</li>
                <li>Wear Philippine Coast Guard-approved life jackets on every crossing.</li>
                <li>
                  Practice <strong>Basura Mo, Bitbitin Mo</strong>—avoid single-use plastics and use
                  segregated waste bins in Barangay San Juan.
                </li>
                <li>Respect local homestays, fisherfolk livelihoods, and coral reef zones.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
