import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Printer,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import Chart from 'chart.js/auto';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { apiRequest, downloadCsvReport } from '../lib/api';
import type {
  AnalyticsSummary,
  Announcement,
  Feedback,
  Operator,
  SafetyGuideline,
} from '../types';

export function AdminDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { announcements, refreshAnnouncements, navigate } = useApp();

  const [tab, setTab] = useState<'analytics' | 'operators' | 'content' | 'feedback'>('analytics');
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [byDay, setByDay] = useState<Array<{ date: string; bookings: number; passengers: number }>>([]);
  const [byOperator, setByOperator] = useState<Array<{ operator_name: string; bookings: number; passengers: number }>>([]);
  const [paxSplit, setPaxSplit] = useState<Array<{ label: string; count: number }>>([]);
  const [peakDays, setPeakDays] = useState<Array<{ day_name: string; passengers: number }>>([]);

  const [operators, setOperators] = useState<Operator[]>([]);
  const [guidelines, setGuidelines] = useState<SafetyGuideline[]>([]);
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [feedbackSummary, setFeedbackSummary] = useState<
    Array<{ operator_id: number; business_name: string; avg_rating: number; total_reviews: number }>
  >([]);

  const [thresholdInput, setThresholdInput] = useState<number>(65);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Announcement & Safety forms
  const [annTitle, setAnnTitle] = useState('');
  const [annMessage, setAnnMessage] = useState('');
  const [annSeverity, setAnnSeverity] = useState<'info' | 'caution' | 'suspended'>('info');

  const [safeCat, setSafeCat] = useState('Maritime Safety');
  const [safeTitle, setSafeTitle] = useState('');
  const [safeDesc, setSafeDesc] = useState('');

  // Chart canvas refs
  const dayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const opCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const splitCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const peakCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const loadAdminData = useCallback(async () => {
    if (!user || user.role !== 'admin') {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [sumRes, dayRes, opChartRes, splitRes, peakRes, opsRes, safeRes, fbRes] =
        await Promise.all([
          apiRequest<{ summary: AnalyticsSummary }>('/api/analytics/summary'),
          apiRequest<{ data: Array<{ date: string; bookings: number; passengers: number }> }>(
            '/api/analytics/bookings-by-day'
          ),
          apiRequest<{
            data: Array<{ operator_name: string; bookings: number; passengers: number }>;
          }>('/api/analytics/bookings-by-operator'),
          apiRequest<{ data: Array<{ label: string; count: number }> }>(
            '/api/analytics/passenger-split'
          ),
          apiRequest<{ data: Array<{ day_name: string; passengers: number }> }>(
            '/api/analytics/peak-days'
          ),
          apiRequest<{ operators: Operator[] }>('/api/operators?all=1'),
          apiRequest<{ guidelines: SafetyGuideline[] }>('/api/safety-guidelines'),
          apiRequest<{
            feedback: Feedback[];
            summaryByOperator: Array<{
              operator_id: number;
              business_name: string;
              avg_rating: number;
              total_reviews: number;
            }>;
          }>('/api/feedback'),
        ]);

      setSummary(sumRes.summary);
      setThresholdInput(sumRes.summary.peakDayThreshold);
      setByDay(dayRes.data);
      setByOperator(opChartRes.data);
      setPaxSplit(splitRes.data);
      setPeakDays(peakRes.data);
      setOperators(opsRes.operators);
      setGuidelines(safeRes.guidelines);
      setFeedbackList(fbRes.feedback);
      setFeedbackSummary(fbRes.summaryByOperator);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load admin analytics.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      void loadAdminData();
    }
  }, [authLoading, loadAdminData]);

  // Render Chart.js visualizations
  useEffect(() => {
    if (tab !== 'analytics' || loading) return;
    const instances: Chart[] = [];

    if (dayCanvasRef.current && byDay.length > 0) {
      instances.push(
        new Chart(dayCanvasRef.current, {
          type: 'line',
          data: {
            labels: byDay.map((d) => d.date),
            datasets: [
              {
                label: 'Passengers',
                data: byDay.map((d) => d.passengers),
                borderColor: '#0B3C6F',
                backgroundColor: 'rgba(46, 156, 202, 0.18)',
                fill: true,
                tension: 0.3,
              },
              {
                label: 'Bookings',
                data: byDay.map((d) => d.bookings),
                borderColor: '#FFC93C',
                backgroundColor: '#FFC93C',
                tension: 0.3,
              },
            ],
          },
          options: { responsive: true, maintainAspectRatio: false },
        })
      );
    }

    if (opCanvasRef.current && byOperator.length > 0) {
      instances.push(
        new Chart(opCanvasRef.current, {
          type: 'bar',
          data: {
            labels: byOperator.map((o) => o.operator_name),
            datasets: [
              {
                label: 'Confirmed Bookings',
                data: byOperator.map((o) => o.bookings),
                backgroundColor: '#2E9CCA',
              },
            ],
          },
          options: { responsive: true, maintainAspectRatio: false },
        })
      );
    }

    if (splitCanvasRef.current && paxSplit.length > 0) {
      instances.push(
        new Chart(splitCanvasRef.current, {
          type: 'doughnut',
          data: {
            labels: paxSplit.map((s) => s.label),
            datasets: [
              {
                data: paxSplit.map((s) => s.count),
                backgroundColor: ['#0B3C6F', '#2E9CCA', '#FFC93C'],
              },
            ],
          },
          options: { responsive: true, maintainAspectRatio: false },
        })
      );
    }

    if (peakCanvasRef.current && peakDays.length > 0) {
      instances.push(
        new Chart(peakCanvasRef.current, {
          type: 'bar',
          data: {
            labels: peakDays.map((p) => p.day_name),
            datasets: [
              {
                label: 'Total Passengers',
                data: peakDays.map((p) => p.passengers),
                backgroundColor: '#0B3C6F',
              },
            ],
          },
          options: { responsive: true, maintainAspectRatio: false },
        })
      );
    }

    return () => {
      instances.forEach((c) => c.destroy());
    };
  }, [tab, loading, byDay, byOperator, paxSplit, peakDays]);

  if (!authLoading && (!user || user.role !== 'admin')) {
    return (
      <section className="section">
        <div className="container">
          <div className="empty-state">
            <AlertTriangle size={34} color="var(--status-caution-text)" aria-hidden="true" />
            <h3>Tourism Office Admin Access Required</h3>
            <p>Sign in with an authorized Barangay San Juan / Municipal Tourism Office admin account.</p>
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

  const handleUpdateThreshold = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    try {
      await apiRequest('/api/analytics/threshold', {
        method: 'PATCH',
        body: JSON.stringify({ threshold: thresholdInput }),
      });
      setNotice(`Peak-day overcrowding threshold updated to ${thresholdInput} passengers/day.`);
      await loadAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update threshold.');
    }
  };

  const handleVerifyOperator = async (opId: number, verified: number) => {
    setError(null);
    setNotice(null);
    try {
      await apiRequest(`/api/operators/${opId}/verify`, {
        method: 'PATCH',
        body: JSON.stringify({ verified }),
      });
      setNotice('Operator verification status updated.');
      await loadAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update operator.');
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    try {
      await apiRequest('/api/announcements', {
        method: 'POST',
        body: JSON.stringify({ title: annTitle, message: annMessage, severity: annSeverity }),
      });
      setAnnTitle('');
      setAnnMessage('');
      setNotice('Official announcement posted.');
      await refreshAnnouncements();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post announcement.');
    }
  };

  const handleToggleAnn = async (a: Announcement) => {
    await apiRequest(`/api/announcements/${a.id}/toggle`, { method: 'PATCH' });
    await refreshAnnouncements();
  };

  const handleDeleteAnn = async (id: number) => {
    await apiRequest(`/api/announcements/${id}`, { method: 'DELETE' });
    await refreshAnnouncements();
  };

  const handleCreateGuideline = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    try {
      await apiRequest('/api/safety-guidelines', {
        method: 'POST',
        body: JSON.stringify({
          category: safeCat,
          title: safeTitle,
          description: safeDesc,
          sort_order: guidelines.length + 1,
        }),
      });
      setSafeTitle('');
      setSafeDesc('');
      setNotice('Safety guideline added.');
      await loadAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add guideline.');
    }
  };

  const handleDeleteGuideline = async (id: number) => {
    await apiRequest(`/api/safety-guidelines/${id}`, { method: 'DELETE' });
    await loadAdminData();
  };

  return (
    <div>
      <section className="page-banner no-print">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1>Tourism Office Analytics &amp; Administration</h1>
              <p>
                Barangay San Juan &amp; Tingloy Municipal Tourism Office &mdash; monitor capacity,
                verify boat operators, manage advisories, and export reports.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-yellow btn-sm"
                onClick={() =>
                  void downloadCsvReport('/api/reports/bookings.csv', 'tingloy-bookings-report.csv')
                }
              >
                <Download size={16} aria-hidden="true" />
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => window.print()}
              >
                <Printer size={16} aria-hidden="true" />
                <span>Print Report</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
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
              className={`tab-btn${tab === 'analytics' ? ' active' : ''}`}
              onClick={() => setTab('analytics')}
            >
              Analytics &amp; Charts
            </button>
            <button
              type="button"
              className={`tab-btn${tab === 'operators' ? ' active' : ''}`}
              onClick={() => setTab('operators')}
            >
              Operators Verification ({operators.length})
            </button>
            <button
              type="button"
              className={`tab-btn${tab === 'content' ? ' active' : ''}`}
              onClick={() => setTab('content')}
            >
              Announcements &amp; Safety
            </button>
            <button
              type="button"
              className={`tab-btn${tab === 'feedback' ? ' active' : ''}`}
              onClick={() => setTab('feedback')}
            >
              Visitor Satisfaction ({feedbackList.length})
            </button>
          </div>

          {loading ? (
            <div className="card">
              <div className="skeleton-line" style={{ width: '50%', marginBottom: 12 }} />
              <div className="skeleton-line" style={{ width: '85%' }} />
            </div>
          ) : tab === 'analytics' && summary ? (
            <div>
              {/* Overcrowding Alert */}
              {summary.overcrowdedDays.length > 0 && (
                <div className="alert alert-warning" style={{ marginBottom: 20 }}>
                  <AlertTriangle size={20} aria-hidden="true" />
                  <div>
                    <strong>Peak-Day Overcrowding Alert:</strong> The following travel date(s)
                    exceed the Barangay San Juan daily threshold of{' '}
                    <span className="tabular-nums">{summary.peakDayThreshold}</span> passengers:{' '}
                    {summary.overcrowdedDays
                      .map((d) => `${d.travel_date} (${d.passengers} pax)`)
                      .join(', ')}
                    . Consider coordinating waste bins, pier marshals, and boat spacing.
                  </div>
                </div>
              )}

              {/* KPI Cards */}
              <div className="kpi-grid">
                <div className="kpi-card">
                  <div className="kpi-label">Total Bookings</div>
                  <div className="kpi-value tabular-nums">{summary.totalBookings}</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-label">Total Passengers</div>
                  <div className="kpi-value tabular-nums">{summary.totalPassengers}</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-label">Confirmed Revenue</div>
                  <div className="kpi-value tabular-nums">
                    ₱{Number(summary.totalRevenue).toLocaleString()}
                  </div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-label">Active Operators</div>
                  <div className="kpi-value tabular-nums">
                    {summary.activeOperators}
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                      {' '}
                      ({summary.pendingOperators} pending)
                    </span>
                  </div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-label">Cancelled Trips</div>
                  <div className="kpi-value tabular-nums">{summary.cancelledTrips}</div>
                </div>
              </div>

              {/* Peak Threshold Configurator */}
              <form
                onSubmit={(e) => void handleUpdateThreshold(e)}
                className="card-flat no-print"
                style={{
                  marginBottom: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <strong>Masasa Beach Daily Overcrowding Threshold</strong>
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                    Triggers an alert whenever confirmed passengers on a single date reach this
                    limit.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input
                    type="number"
                    min={5}
                    max={5000}
                    aria-label="Peak day passenger threshold"
                    className="field-input tabular-nums"
                    style={{ width: 110, minHeight: 38 }}
                    value={thresholdInput}
                    onChange={(e) => setThresholdInput(Number(e.target.value))}
                  />
                  <button type="submit" className="btn btn-primary btn-sm">
                    Update Limit
                  </button>
                </div>
              </form>

              {/* 4 Chart.js Charts */}
              <div className="charts-grid">
                <div className="chart-card">
                  <h3 style={{ fontSize: '1rem' }}>Bookings &amp; Passengers per Day</h3>
                  <div className="chart-canvas-wrap">
                    <canvas ref={dayCanvasRef} />
                  </div>
                </div>
                <div className="chart-card">
                  <h3 style={{ fontSize: '1rem' }}>Confirmed Bookings per Operator</h3>
                  <div className="chart-canvas-wrap">
                    <canvas ref={opCanvasRef} />
                  </div>
                </div>
                <div className="chart-card">
                  <h3 style={{ fontSize: '1rem' }}>Passenger Type Distribution</h3>
                  <div className="chart-canvas-wrap">
                    <canvas ref={splitCanvasRef} />
                  </div>
                </div>
                <div className="chart-card">
                  <h3 style={{ fontSize: '1rem' }}>Peak Travel Days of Week</h3>
                  <div className="chart-canvas-wrap">
                    <canvas ref={peakCanvasRef} />
                  </div>
                </div>
              </div>
            </div>
          ) : tab === 'operators' ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Operator Name</th>
                    <th>Owner &amp; Contact</th>
                    <th>Permit #</th>
                    <th className="text-right">Boats</th>
                    <th>Status</th>
                    <th>Verification Action</th>
                  </tr>
                </thead>
                <tbody>
                  {operators.map((op) => (
                    <tr key={op.id}>
                      <td>
                        <strong>{op.business_name}</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {op.port_location}
                        </div>
                      </td>
                      <td>
                        <div>{op.owner_name}</div>
                        <div className="tabular-nums" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {op.contact_number}
                        </div>
                      </td>
                      <td className="tabular-nums">{op.permit_number}</td>
                      <td className="text-right tabular-nums">{op.boats.length}</td>
                      <td>
                        <span
                          className={`status-tag ${
                            op.verified === 1
                              ? 'status-good'
                              : op.verified === 0
                              ? 'status-caution'
                              : 'status-suspended'
                          }`}
                        >
                          {op.verified === 1
                            ? 'Verified'
                            : op.verified === 0
                            ? 'Pending'
                            : 'Suspended'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {op.verified !== 1 && (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => void handleVerifyOperator(op.id, 1)}
                            >
                              <ShieldCheck size={14} aria-hidden="true" />
                              <span>Approve</span>
                            </button>
                          )}
                          {op.verified !== -1 && (
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => void handleVerifyOperator(op.id, -1)}
                            >
                              Suspend
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : tab === 'content' ? (
            <div className="grid-2" style={{ alignItems: 'start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <form className="card" onSubmit={(e) => void handleCreateAnnouncement(e)}>
                  <h2 style={{ fontSize: '1.15rem', marginBottom: 12 }}>
                    Post Official Announcement
                  </h2>
                  <div className="field-group" style={{ marginBottom: 12 }}>
                    <label className="field-label" htmlFor="adm-ann-title">
                      Title
                    </label>
                    <input
                      id="adm-ann-title"
                      type="text"
                      required
                      className="field-input"
                      value={annTitle}
                      onChange={(e) => setAnnTitle(e.target.value)}
                    />
                  </div>
                  <div className="field-group" style={{ marginBottom: 12 }}>
                    <label className="field-label" htmlFor="adm-ann-sev">
                      Severity / Sea Condition
                    </label>
                    <select
                      id="adm-ann-sev"
                      className="field-select"
                      value={annSeverity}
                      onChange={(e) =>
                        setAnnSeverity(e.target.value as 'info' | 'caution' | 'suspended')
                      }
                    >
                      <option value="info">Info (Good)</option>
                      <option value="caution">Caution</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                  <div className="field-group" style={{ marginBottom: 14 }}>
                    <label className="field-label" htmlFor="adm-ann-msg">
                      Message
                    </label>
                    <textarea
                      id="adm-ann-msg"
                      required
                      className="field-textarea"
                      value={annMessage}
                      onChange={(e) => setAnnMessage(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm">
                    Publish Announcement
                  </button>
                </form>

                {announcements.map((a) => (
                  <div key={a.id} className="card-flat">
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <strong>{a.title}</strong>
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
                    </div>
                    <p style={{ marginTop: 6, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                      {a.message}
                    </p>
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => void handleToggleAnn(a)}
                      >
                        {a.is_active === 1 ? 'Archive' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => void handleDeleteAnn(a.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <form className="card" onSubmit={(e) => void handleCreateGuideline(e)}>
                  <h2 style={{ fontSize: '1.15rem', marginBottom: 12 }}>
                    Add Safety / Tourism Guideline
                  </h2>
                  <div className="field-group" style={{ marginBottom: 12 }}>
                    <label className="field-label" htmlFor="safe-cat">
                      Category
                    </label>
                    <select
                      id="safe-cat"
                      className="field-select"
                      value={safeCat}
                      onChange={(e) => setSafeCat(e.target.value)}
                    >
                      <option value="Maritime Safety">Maritime Safety</option>
                      <option value="Weather & Sea Conditions">Weather &amp; Sea Conditions</option>
                      <option value="Environmental Stewardship">Environmental Stewardship</option>
                      <option value="Community & Cultural Respect">
                        Community &amp; Cultural Respect
                      </option>
                    </select>
                  </div>
                  <div className="field-group" style={{ marginBottom: 12 }}>
                    <label className="field-label" htmlFor="safe-title">
                      Rule Title
                    </label>
                    <input
                      id="safe-title"
                      type="text"
                      required
                      className="field-input"
                      value={safeTitle}
                      onChange={(e) => setSafeTitle(e.target.value)}
                    />
                  </div>
                  <div className="field-group" style={{ marginBottom: 14 }}>
                    <label className="field-label" htmlFor="safe-desc">
                      Description
                    </label>
                    <textarea
                      id="safe-desc"
                      required
                      className="field-textarea"
                      value={safeDesc}
                      onChange={(e) => setSafeDesc(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm">
                    Add Guideline
                  </button>
                </form>

                {guidelines.map((g) => (
                  <div key={g.id} className="card-flat">
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {g.category}
                        </div>
                        <strong>{g.title}</strong>
                      </div>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        aria-label={`Delete guideline ${g.title}`}
                        onClick={() => void handleDeleteGuideline(g.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <p style={{ marginTop: 6, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                      {g.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="grid-3">
                {feedbackSummary.map((item) => (
                  <div key={item.operator_id} className="kpi-card">
                    <div className="kpi-label">{item.business_name}</div>
                    <div className="kpi-value tabular-nums">
                      {item.avg_rating} / 5.0
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                        {' '}
                        ({item.total_reviews} reviews)
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Operator</th>
                      <th>Visitor</th>
                      <th className="text-right">Rating</th>
                      <th>Comment</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feedbackList.map((f) => (
                      <tr key={f.id}>
                        <td style={{ fontWeight: 600 }}>{f.operator_name}</td>
                        <td>{f.visitor_name}</td>
                        <td className="text-right tabular-nums">
                          <span className="status-tag status-good">
                            <CheckCircle2 size={13} aria-hidden="true" />
                            <span>{f.rating} / 5</span>
                          </span>
                        </td>
                        <td>{f.comment}</td>
                        <td className="tabular-nums">{f.created_at.slice(0, 10)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
