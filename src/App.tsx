import { Footer } from './components/Footer';
import { Navbar } from './components/Navbar';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AnnouncementsPage } from './pages/AnnouncementsPage';
import { BookingPage } from './pages/BookingPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { MyBookingsPage } from './pages/MyBookingsPage';
import { OperatorDashboardPage } from './pages/OperatorDashboardPage';
import { OperatorsPage } from './pages/OperatorsPage';
import { SafetyPage } from './pages/SafetyPage';
import { SchedulesPage } from './pages/SchedulesPage';

function AppRoutes() {
  const { route } = useApp();

  switch (route) {
    case '/schedules':
      return <SchedulesPage />;
    case '/operators':
      return <OperatorsPage />;
    case '/safety':
      return <SafetyPage />;
    case '/announcements':
      return <AnnouncementsPage />;
    case '/book':
      return <BookingPage />;
    case '/bookings':
      return <MyBookingsPage />;
    case '/login':
      return <LoginPage />;
    case '/operator':
      return <OperatorDashboardPage />;
    case '/admin':
      return <AdminDashboardPage />;
    case '/':
    default:
      return <HomePage />;
  }
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <div className="app-shell">
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <Navbar />
          <main id="main-content" className="main-content">
            <AppRoutes />
          </main>
          <Footer />
        </div>
      </AppProvider>
    </AuthProvider>
  );
}
