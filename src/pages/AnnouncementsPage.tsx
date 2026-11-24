import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { AdvisorySeverity } from '../types';

export function AnnouncementsPage() {
  const { announcements, seaStatus } = useApp();
  const [filter, setFilter] = useState<'all' | AdvisorySeverity>('all');

  const filtered =
    filter === 'all' ? announcements : announcements.filter((a) => a.severity === filter);

  return (
    <div>
      <section className="page-banner">
        <div className="container">
          <h1>Announcements &amp; Service Updates</h1>
          <p>
            Weather-related cancellations, sea condition bulletins, and port notices from authorized
            boat operators and the Tingloy Tourism Office.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 16,
              marginBottom: 24,
            }}
          >
            <div className="tabs-bar" style={{ marginBottom: 0 }}>
              {(['all', 'suspended', 'caution', 'info'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={`tab-btn${filter === tab ? ' active' : ''}`}
                  onClick={() => setFilter(tab)}
                >
                  {tab === 'all'
                    ? 'All Updates'
                    : tab === 'suspended'
                    ? 'Suspended'
                    : tab === 'caution'
                    ? 'Caution'
                    : 'Info'}
                </button>
              ))}
            </div>

            <div className="meta-line">
              <span>Current Overall Sea Status:</span>
              <span
                className={`status-tag ${
                  seaStatus === 'Suspended'
                    ? 'status-suspended'
                    : seaStatus === 'Caution'
                    ? 'status-caution'
                    : 'status-good'
                }`}
              >
                {seaStatus}
              </span>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <Info size={32} color="var(--ocean-sky)" aria-hidden="true" />
              <h3>No announcements match this filter</h3>
              <p>Switch back to All Updates to see every active and archived port notice.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {filtered.map((item) => (
                <article key={item.id} className="card-flat">
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <h2 style={{ fontSize: '1.15rem' }}>{item.title}</h2>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span
                        className={`status-tag ${
                          item.severity === 'suspended'
                            ? 'status-suspended'
                            : item.severity === 'caution'
                            ? 'status-caution'
                            : 'status-good'
                        }`}
                      >
                        {item.severity === 'suspended' ? (
                          <OctagonAlert size={14} aria-hidden="true" />
                        ) : item.severity === 'caution' ? (
                          <AlertTriangle size={14} aria-hidden="true" />
                        ) : (
                          <CheckCircle2 size={14} aria-hidden="true" />
                        )}
                        <span>{item.sea_condition}</span>
                      </span>
                      <span className="status-tag status-neutral">
                        {item.is_active === 1 ? 'Active' : 'Archived'}
                      </span>
                    </div>
                  </div>

                  <p style={{ marginTop: 10, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                    {item.message}
                  </p>

                  <div className="meta-line" style={{ marginTop: 10 }}>
                    <span>Posted by {item.operator_name || item.author_name || 'Tourism Office'}</span>
                    <span>&middot;</span>
                    <span className="tabular-nums">{item.created_at}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
