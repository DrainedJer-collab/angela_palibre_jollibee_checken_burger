import { Anchor, MapPin, MessageSquarePlus, Phone, ShieldCheck, Star } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import type { Operator } from '../types';

export function OperatorsPage() {
  const { navigate } = useApp();
  const { user } = useAuth();
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reviewOpId, setReviewOpId] = useState<number | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [feedbackErr, setFeedbackErr] = useState<string | null>(null);

  const loadOperators = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ operators: Operator[] }>('/api/operators');
      setOperators(res.operators);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load operators directory.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOperators();
  }, [loadOperators]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewOpId) return;
    setSubmitting(true);
    setFeedbackErr(null);
    setFeedbackMsg(null);
    try {
      await apiRequest('/api/feedback', {
        method: 'POST',
        body: JSON.stringify({ operator_id: reviewOpId, rating, comment }),
      });
      setFeedbackMsg('Thank you! Your review has been published.');
      setComment('');
      setReviewOpId(null);
      await loadOperators();
    } catch (err) {
      setFeedbackErr(err instanceof Error ? err.message : 'Could not submit feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <section className="page-banner">
        <div className="container">
          <h1>Verified Boat Operators Directory</h1>
          <p>
            Official directory of authorized Mabini Port &amp; Tingloy passenger boat operators,
            registered vessels, life jacket compliance, and visitor satisfaction ratings.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {feedbackMsg && (
            <div className="alert alert-success" style={{ marginBottom: 20 }}>
              <span>{feedbackMsg}</span>
            </div>
          )}
          {error && (
            <div className="alert alert-error" style={{ marginBottom: 20 }}>
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="grid-2">
              {[1, 2].map((i) => (
                <div key={i} className="card">
                  <div className="skeleton-line" style={{ width: '55%', marginBottom: 12 }} />
                  <div className="skeleton-line" style={{ width: '90%', marginBottom: 8 }} />
                  <div className="skeleton-line" style={{ width: '75%' }} />
                </div>
              ))}
            </div>
          ) : operators.length === 0 ? (
            <div className="empty-state">
              <Anchor size={34} color="var(--ocean-sky)" aria-hidden="true" />
              <h3>No verified operators listed yet</h3>
              <p>Operators approved by the Municipal Tourism Office will appear here.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {operators.map((op) => (
                <article key={op.id} className="card">
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 16,
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <h2 style={{ fontSize: '1.3rem' }}>{op.business_name}</h2>
                        <span className="status-tag status-good">
                          <ShieldCheck size={14} aria-hidden="true" />
                          <span>Verified Operator</span>
                        </span>
                      </div>
                      <div className="meta-line" style={{ marginTop: 6 }}>
                        <span>Owner: {op.owner_name}</span>
                        <span>&middot;</span>
                        <span className="tabular-nums">Permit: {op.permit_number}</span>
                        <span>&middot;</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Star size={14} color="#D97706" fill="#FFC93C" aria-hidden="true" />
                          <strong className="tabular-nums">{op.avg_rating || 'New'}</strong>
                          <span>({op.review_count} reviews)</span>
                        </span>
                      </div>
                      <div className="meta-line" style={{ marginTop: 4 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={14} aria-hidden="true" />
                          {op.port_location}
                        </span>
                        <span>&middot;</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Phone size={14} aria-hidden="true" />
                          <span className="tabular-nums">{op.contact_number}</span>
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => navigate('/schedules')}
                      >
                        Book Trip
                      </button>
                      {user ? (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setReviewOpId(op.id);
                            setFeedbackErr(null);
                          }}
                        >
                          <MessageSquarePlus size={15} aria-hidden="true" />
                          <span>Rate Operator</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => navigate('/login')}
                        >
                          Sign In to Rate
                        </button>
                      )}
                    </div>
                  </div>

                  <p style={{ marginTop: 12, color: 'var(--text-secondary)', fontSize: '0.94rem' }}>
                    {op.description}
                  </p>

                  {/* Fleet Table */}
                  <div style={{ marginTop: 18 }}>
                    <h3 style={{ fontSize: '0.95rem', marginBottom: 8 }}>
                      Registered Boats ({op.boats.length})
                    </h3>
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
                          {op.boats.map((b) => (
                            <tr key={b.id}>
                              <td style={{ fontWeight: 600 }}>{b.boat_name}</td>
                              <td className="tabular-nums">{b.registration_code}</td>
                              <td>{b.boat_type}</td>
                              <td className="text-right tabular-nums">{b.capacity} pax</td>
                              <td className="text-right tabular-nums">{b.life_jackets_count}</td>
                              <td>
                                <span
                                  className={`status-tag ${
                                    b.status === 'active' ? 'status-good' : 'status-caution'
                                  }`}
                                >
                                  {b.status === 'active' ? 'Active' : 'Maintenance'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Recent Reviews */}
                  {op.recent_reviews.length > 0 && (
                    <div style={{ marginTop: 18 }}>
                      <h3 style={{ fontSize: '0.95rem', marginBottom: 8 }}>Recent Visitor Reviews</h3>
                      <div className="grid-2">
                        {op.recent_reviews.slice(0, 2).map((rev) => (
                          <div key={rev.id} className="card-flat" style={{ padding: 14 }}>
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <strong style={{ fontSize: '0.88rem' }}>{rev.visitor_name}</strong>
                              <span
                                className="tabular-nums"
                                style={{ fontSize: '0.82rem', fontWeight: 600, color: '#B45309' }}
                              >
                                {rev.rating}/5 ★
                              </span>
                            </div>
                            <p
                              style={{
                                marginTop: 6,
                                fontSize: '0.85rem',
                                color: 'var(--text-secondary)',
                              }}
                            >
                              {rev.comment}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}

          {reviewOpId !== null && (
            <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Submit operator feedback">
              <div className="modal-dialog" style={{ maxWidth: 480 }}>
                <h2 style={{ fontSize: '1.2rem', marginBottom: 14 }}>Rate Boat Operator</h2>
                {feedbackErr && (
                  <div className="alert alert-error" style={{ marginBottom: 14 }}>
                    <span>{feedbackErr}</span>
                  </div>
                )}
                <form
                  onSubmit={(e) => void handleSubmitReview(e)}
                  style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
                >
                  <div className="field-group">
                    <label className="field-label" htmlFor="rev-rating">
                      Satisfaction Rating (1–5)
                    </label>
                    <select
                      id="rev-rating"
                      className="field-select"
                      value={rating}
                      onChange={(e) => setRating(Number(e.target.value))}
                    >
                      <option value={5}>5 — Excellent safety &amp; service</option>
                      <option value={4}>4 — Good &amp; punctual</option>
                      <option value={3}>3 — Satisfactory</option>
                      <option value={2}>2 — Needs improvement</option>
                      <option value={1}>1 — Poor experience</option>
                    </select>
                  </div>

                  <div className="field-group">
                    <label className="field-label" htmlFor="rev-comment">
                      Your Feedback
                    </label>
                    <textarea
                      id="rev-comment"
                      className="field-textarea"
                      required
                      minLength={5}
                      placeholder="Share your experience with boarding, life jackets, punctuality, and crew..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setReviewOpId(null)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                      {submitting ? 'Submitting...' : 'Submit Review'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
