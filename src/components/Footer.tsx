import { useApp } from '../context/AppContext';

export function Footer() {
  const { navigate } = useApp();

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <div className="footer-heading">Tingloy Sea Connect</div>
            <p style={{ fontSize: '0.88rem', lineHeight: 1.65 }}>
              Official boat transportation coordination, schedules, and e-ticket portal connecting
              Mabini Port to Barangay San Juan and Masasa Beach, Tingloy, Batangas.
            </p>
          </div>

          <div>
            <div className="footer-heading">Traveler Links</div>
            <div className="footer-links">
              <a
                href="/schedules"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/schedules');
                }}
              >
                Boat Schedules &amp; Fares
              </a>
              <a
                href="/operators"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/operators');
                }}
              >
                Verified Operators
              </a>
              <a
                href="/safety"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/safety');
                }}
              >
                Safety &amp; Travel Guidelines
              </a>
              <a
                href="/announcements"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/announcements');
                }}
              >
                Sea Weather Advisories
              </a>
            </div>
          </div>

          <div>
            <div className="footer-heading">Portals</div>
            <div className="footer-links">
              <a
                href="/bookings"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/bookings');
                }}
              >
                My E-Tickets
              </a>
              <a
                href="/operator"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/operator');
                }}
              >
                Operator Dashboard
              </a>
              <a
                href="/admin"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/admin');
                }}
              >
                Tourism Office Analytics
              </a>
              <a
                href="/login"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/login');
                }}
              >
                Sign In / Register
              </a>
            </div>
          </div>

          <div>
            <div className="footer-heading">Emergency Hotlines</div>
            <div className="footer-links">
              <span>PCG Sub-Station Mabini: (043) 487-0112</span>
              <span>Tingloy MDRRMO: 0917-555-8900</span>
              <span>Brgy. San Juan Hall: (043) 406-8800</span>
              <span>Tourism Desk: tourism@tingloy.gov.ph</span>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>
            &copy; {new Date().getFullYear()} Tingloy Sea Connect — Barangay San Juan &amp; Masasa
            Beach Sustainable Tourism Initiative
          </span>
          <span>Mabini Port &harr; Tingloy, Batangas</span>
        </div>
      </div>
    </footer>
  );
}
