import { AlertTriangle, KeyRound, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { login, register } = useAuth();
  const { navigate, bookingSelection } = useApp();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [regRole, setRegRole] = useState<'visitor' | 'operator'>('visitor');
  const [businessName, setBusinessName] = useState('');
  const [portLocation, setPortLocation] = useState('Mabini Port (Anilao)');
  const [permitNumber, setPermitNumber] = useState('');
  const [boatName, setBoatName] = useState('');
  const [boatCapacity, setBoatCapacity] = useState(24);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const routeAfterAuth = (role: string) => {
    if (bookingSelection && role === 'visitor') {
      navigate('/book');
    } else if (role === 'admin') {
      navigate('/admin');
    } else if (role === 'operator') {
      navigate('/operator');
    } else {
      navigate('/bookings');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const user = await login(email, password);
      routeAfterAuth(user.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const user = await register({
        name,
        email,
        phone,
        password,
        role: regRole,
        ...(regRole === 'operator'
          ? {
              business_name: businessName,
              port_location: portLocation,
              permit_number: permitNumber,
              boat_name: boatName,
              boat_capacity: boatCapacity,
            }
          : {}),
      });
      routeAfterAuth(user.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (demoEmail: string, demoPassword: string) => {
    setMode('login');
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError(null);
  };

  return (
    <div>
      <section className="page-banner">
        <div className="container">
          <h1>Account Sign In &amp; Registration</h1>
          <p>
            Sign in to book Tingloy boat tickets, manage your operator fleet, or open the Tourism
            Office analytics console.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid-2" style={{ alignItems: 'start' }}>
            <div className="card">
              <div className="tabs-bar">
                <button
                  type="button"
                  className={`tab-btn${mode === 'login' ? ' active' : ''}`}
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                >
                  <KeyRound size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                  Sign In
                </button>
                <button
                  type="button"
                  className={`tab-btn${mode === 'register' ? ' active' : ''}`}
                  onClick={() => {
                    setMode('register');
                    setError(null);
                  }}
                >
                  <UserPlus size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                  Create Account
                </button>
              </div>

              {error && (
                <div className="alert alert-error" role="alert" style={{ marginBottom: 16 }}>
                  <AlertTriangle size={18} aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}

              {mode === 'login' ? (
                <form
                  onSubmit={(e) => void handleLogin(e)}
                  style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
                >
                  <div className="field-group">
                    <label className="field-label" htmlFor="login-email">
                      Email Address
                    </label>
                    <input
                      id="login-email"
                      type="email"
                      required
                      className="field-input"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div className="field-group">
                    <label className="field-label" htmlFor="login-password">
                      Password
                    </label>
                    <input
                      id="login-password"
                      type="password"
                      required
                      className="field-input"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Signing In...' : 'Sign In'}
                  </button>
                </form>
              ) : (
                <form
                  onSubmit={(e) => void handleRegister(e)}
                  style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
                >
                  <div className="field-group">
                    <label className="field-label" htmlFor="reg-role">
                      Account Type
                    </label>
                    <select
                      id="reg-role"
                      className="field-select"
                      value={regRole}
                      onChange={(e) => setRegRole(e.target.value as 'visitor' | 'operator')}
                    >
                      <option value="visitor">Visitor / Tourist</option>
                      <option value="operator">Boat Operator (requires admin verification)</option>
                    </select>
                  </div>

                  <div className="field-group">
                    <label className="field-label" htmlFor="reg-name">
                      Full Name
                    </label>
                    <input
                      id="reg-name"
                      type="text"
                      required
                      minLength={2}
                      className="field-input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div className="grid-2">
                    <div className="field-group">
                      <label className="field-label" htmlFor="reg-email">
                        Email Address
                      </label>
                      <input
                        id="reg-email"
                        type="email"
                        required
                        className="field-input"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="field-group">
                      <label className="field-label" htmlFor="reg-phone">
                        Mobile Number
                      </label>
                      <input
                        id="reg-phone"
                        type="tel"
                        required
                        placeholder="0917-555-0199"
                        className="field-input tabular-nums"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="field-group">
                    <label className="field-label" htmlFor="reg-password">
                      Password (minimum 8 characters)
                    </label>
                    <input
                      id="reg-password"
                      type="password"
                      required
                      minLength={8}
                      className="field-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  {regRole === 'operator' && (
                    <div
                      className="card-flat"
                      style={{
                        background: 'var(--bg-canvas)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                      }}
                    >
                      <strong style={{ fontSize: '0.9rem', color: 'var(--ocean-deep)' }}>
                        Boat Operator Details
                      </strong>
                      <div className="field-group">
                        <label className="field-label" htmlFor="reg-biz">
                          Operator / Cooperative Name
                        </label>
                        <input
                          id="reg-biz"
                          type="text"
                          required
                          className="field-input"
                          value={businessName}
                          onChange={(e) => setBusinessName(e.target.value)}
                        />
                      </div>
                      <div className="grid-2">
                        <div className="field-group">
                          <label className="field-label" htmlFor="reg-permit">
                            MARINA Permit Number
                          </label>
                          <input
                            id="reg-permit"
                            type="text"
                            required
                            placeholder="MARINA-BTG-2026-..."
                            className="field-input tabular-nums"
                            value={permitNumber}
                            onChange={(e) => setPermitNumber(e.target.value)}
                          />
                        </div>
                        <div className="field-group">
                          <label className="field-label" htmlFor="reg-port">
                            Primary Port
                          </label>
                          <input
                            id="reg-port"
                            type="text"
                            required
                            className="field-input"
                            value={portLocation}
                            onChange={(e) => setPortLocation(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="grid-2">
                        <div className="field-group">
                          <label className="field-label" htmlFor="reg-boat">
                            Primary Boat Name
                          </label>
                          <input
                            id="reg-boat"
                            type="text"
                            required
                            placeholder="M/B San Juan Star"
                            className="field-input"
                            value={boatName}
                            onChange={(e) => setBoatName(e.target.value)}
                          />
                        </div>
                        <div className="field-group">
                          <label className="field-label" htmlFor="reg-cap">
                            Passenger Capacity
                          </label>
                          <input
                            id="reg-cap"
                            type="number"
                            min={4}
                            max={100}
                            required
                            className="field-input tabular-nums"
                            value={boatCapacity}
                            onChange={(e) => setBoatCapacity(Number(e.target.value))}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Creating Account...' : 'Create Account'}
                  </button>
                </form>
              )}
            </div>

            {/* Demo Accounts Panel for Project Evaluation */}
            <aside className="card section-sand">
              <h2 style={{ fontSize: '1.15rem', color: 'var(--ocean-deep)' }}>
                Demo Accounts
              </h2>
              <p style={{ marginTop: 6, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Use any of the seeded roles below to test booking, operator manifests, and tourism
                office analytics.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 18 }}>
                <div className="card-flat" style={{ padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                    <div>
                      <strong>Visitor / Tourist</strong>
                      <div className="tabular-nums" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        visitor@tingloy.ph &middot; Visitor123!
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => fillDemo('visitor@tingloy.ph', 'Visitor123!')}
                    >
                      Fill
                    </button>
                  </div>
                </div>

                <div className="card-flat" style={{ padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                    <div>
                      <strong>Verified Boat Operator</strong>
                      <div className="tabular-nums" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        operator@tingloy.ph &middot; Operator123!
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => fillDemo('operator@tingloy.ph', 'Operator123!')}
                    >
                      Fill
                    </button>
                  </div>
                </div>

                <div className="card-flat" style={{ padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                    <div>
                      <strong>Tourism Office Admin</strong>
                      <div className="tabular-nums" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        admin@tingloy.ph &middot; Admin123!
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => fillDemo('admin@tingloy.ph', 'Admin123!')}
                    >
                      Fill
                    </button>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}
