import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';
import type { Announcement, BookingSelection, SeaCondition, SearchDraft } from '../types';

export type AppRoute =
  | '/'
  | '/schedules'
  | '/operators'
  | '/safety'
  | '/announcements'
  | '/book'
  | '/bookings'
  | '/login'
  | '/operator'
  | '/admin';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function normalizePath(pathname: string): AppRoute {
  const valid: AppRoute[] = [
    '/',
    '/schedules',
    '/operators',
    '/safety',
    '/announcements',
    '/book',
    '/bookings',
    '/login',
    '/operator',
    '/admin',
  ];
  return valid.includes(pathname as AppRoute) ? (pathname as AppRoute) : '/';
}

interface AppContextValue {
  route: AppRoute;
  navigate: (to: AppRoute) => void;
  announcements: Announcement[];
  seaStatus: SeaCondition;
  refreshAnnouncements: () => Promise<void>;
  searchDraft: SearchDraft;
  setSearchDraft: React.Dispatch<React.SetStateAction<SearchDraft>>;
  bookingSelection: BookingSelection | null;
  setBookingSelection: React.Dispatch<React.SetStateAction<BookingSelection | null>>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [route, setRoute] = useState<AppRoute>(() => normalizePath(window.location.pathname));
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [seaStatus, setSeaStatus] = useState<SeaCondition>('Good');

  const [searchDraft, setSearchDraft] = useState<SearchDraft>({
    tripType: 'one-way',
    origin: 'Mabini Port',
    destination: 'Tingloy / Masasa Beach',
    departureDate: todayIso(),
    returnDate: addDaysIso(1),
    adults: 2,
    children: 0,
    infants: 0,
  });

  const [bookingSelection, setBookingSelection] = useState<BookingSelection | null>(null);

  const navigate = useCallback((to: AppRoute) => {
    if (window.location.pathname !== to) {
      window.history.pushState({}, '', to);
    }
    setRoute(to);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setRoute(normalizePath(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const refreshAnnouncements = useCallback(async () => {
    try {
      const data = await apiRequest<{ announcements: Announcement[]; seaStatus: SeaCondition }>(
        '/api/announcements'
      );
      setAnnouncements(data.announcements);
      setSeaStatus(data.seaStatus);
    } catch {
      // keep previous state on transient network errors
    }
  }, []);

  useEffect(() => {
    void refreshAnnouncements();
  }, [refreshAnnouncements]);

  return (
    <AppContext.Provider
      value={{
        route,
        navigate,
        announcements,
        seaStatus,
        refreshAnnouncements,
        searchDraft,
        setSearchDraft,
        bookingSelection,
        setBookingSelection,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
