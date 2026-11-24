import { LifeBuoy, PhoneCall, ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';
import type { SafetyGuideline } from '../types';

export function SafetyPage() {
  const [guidelines, setGuidelines] = useState<SafetyGuideline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<{ guidelines: SafetyGuideline[] }>('/api/safety-guidelines')
      .then((res) => setGuidelines(res.guidelines))
      .catch(() => setGuidelines([]))
      .finally(() => setLoading(false));
  }, []);

  const grouped = guidelines.reduce<Record<string, SafetyGuideline[]>>((acc, g) => {
    if (!acc[g.category]) acc[g.category] = [];
    acc[g.category].push(g);
    return acc;
  }, {});

  return (
    <div>
      <section className="page-banner">
        <div className="container">
          <h1>Safety &amp; Travel Guidelines</h1>
          <p>
            Mandatory maritime passenger protocols, weather reminders, and Barangay San Juan
            responsible tourism rules for Masasa Beach visitors.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="alert alert-info" style={{ marginBottom: 28 }}>
            <LifeBuoy size={20} aria-hidden="true" />
            <div>
              <strong>Key Reminder:</strong> Always follow your boat captain&rsquo;s and crew&rsquo;s
              safety instructions during boarding, crossing, and landing at Masasa Beach.
            </div>
          </div>

          {loading ? (
            <div className="grid-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="card-flat">
                  <div className="skeleton-line" style={{ width: '50%', marginBottom: 10 }} />
                  <div className="skeleton-line" style={{ width: '90%' }} />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              {Object.entries(grouped).map(([category, items]) => (
                <div key={category}>
                  <h2 style={{ fontSize: '1.3rem', color: 'var(--ocean-deep)', marginBottom: 14 }}>
                    {category}
                  </h2>
                  <div className="grid-2">
                    {items.map((item, index) => (
                      <article key={item.id} className="card-flat">
                        <div style={{ fontWeight: 700, fontSize: '1.02rem', color: 'var(--text-primary)' }}>
                          {String(index + 1).padStart(2, '0')}. {item.title}
                        </div>
                        <p style={{ marginTop: 8, color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
                          {item.description}
                        </p>
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Emergency Contacts */}
          <div style={{ marginTop: 44 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <PhoneCall size={20} color="var(--ocean-deep)" aria-hidden="true" />
              <h2 style={{ fontSize: '1.3rem', color: 'var(--ocean-deep)' }}>
                Emergency &amp; Maritime Contacts
              </h2>
            </div>

            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Office / Agency</th>
                    <th>Jurisdiction</th>
                    <th>Contact Number</th>
                    <th>Hours</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Philippine Coast Guard Sub-Station Mabini</td>
                    <td>Mabini Port Clearance &amp; Sea Rescue</td>
                    <td className="tabular-nums">(043) 487-0112 / 0917-842-8810</td>
                    <td>24/7 Operations</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Tingloy MDRRMO</td>
                    <td>Municipality of Tingloy Emergency Response</td>
                    <td className="tabular-nums">0917-555-8900</td>
                    <td>24/7 Operations</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Barangay San Juan Hall &amp; Tourism Desk</td>
                    <td>Masasa Beach &amp; Brgy. San Juan Assistance</td>
                    <td className="tabular-nums">(043) 406-8800</td>
                    <td>6:00 AM &ndash; 6:00 PM</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Tingloy Municipal Police Station</td>
                    <td>Public Safety &amp; Port Security</td>
                    <td className="tabular-nums">0998-598-5714</td>
                    <td>24/7 Operations</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="card section-sand" style={{ marginTop: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ShieldAlert size={20} color="var(--ocean-deep)" aria-hidden="true" />
              <h3 style={{ fontSize: '1.1rem' }}>Masasa Beach Coastal Clean-Up Reminder</h3>
            </div>
            <p style={{ marginTop: 8, color: 'var(--text-secondary)', fontSize: '0.94rem' }}>
              Based on Barangay San Juan&rsquo;s Sustainable Tourism Development Plan, visitors are
              asked to bring reusable water bottles, avoid leaving trash on shorelines, and segregate
              recyclables, biodegradable, and residual waste at designated coastal bins.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
