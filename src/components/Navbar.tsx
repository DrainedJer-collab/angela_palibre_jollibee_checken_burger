import { Anchor, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { type AppRoute, useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

export function Navbar() {
  const { route, navigate } = useApp();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (to: AppRoute) => {
    setMobileOpen(false);
    navigate(to);
  };

  const handleLogout = async () => {
    setMobileOpen(false);
    await logout();
    navigate('/');
  };

  const roleLink: { label: string; to: AppRoute } =
    user?.role === 'admin'
      ? { label: 'Admin Console', to: '/admin' }
      : user?.role === 'operator'
      ? { label: 'Operator Hub', to: '/operator' }
      : { label: 'My Bookings', to: '/bookings' };

  const navItems: Array<{ label: string; to: AppRoute }> = [
    { label: 'Schedules', to: '/schedules' },
    { label: 'Operators', to: '/operators' },
    { label: 'Safety', to: '/safety' },
    { label: 'Updates', to: '/announcements' },
    roleLink,
  ];

  return (
    <>
      <header className="site-header">
        <div className="container header-inner">
          <a
            href="/"
            className="brand-wordmark"
            onClick={(e) => {
              e.preventDefault();
              handleNav('/');
            }}
          >
            <Anchor size={22} strokeWidth={2.2} aria-hidden="true" />
            <span>Tingloy Sea Connect</span>
          </a>

          <nav className="nav-links" aria-label="Main navigation">
            {navItems.map((item) => (
              <a
                key={item.to}
                href={item.to}
                className={`nav-link${route === item.to ? ' active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  handleNav(item.to);
                }}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="header-actions">
            {user ? (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => void handleLogout()}
              >
                Sign Out ({user.name.split(' ')[0]})
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => handleNav('/login')}
              >
                Sign In
              </button>
            )}

            <button
              type="button"
              className="mobile-menu-btn"
              aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((prev) => !prev)}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <nav className="mobile-drawer" aria-label="Mobile navigation">
            <a
              href="/"
              className={`nav-link${route === '/' ? ' active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                handleNav('/');
              }}
            >
              Home
            </a>
            {navItems.map((item) => (
              <a
                key={item.to}
                href={item.to}
                className={`nav-link${route === item.to ? ' active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  handleNav(item.to);
                }}
              >
                {item.label}
              </a>
            ))}
          </nav>
        )}
      </header>
    </>
  );
}
