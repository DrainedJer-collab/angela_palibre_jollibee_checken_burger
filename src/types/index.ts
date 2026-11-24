export type UserRole = 'visitor' | 'operator' | 'admin';

export type TripStatus = 'scheduled' | 'full' | 'delayed' | 'cancelled';
export type BookingStatus = 'confirmed' | 'cancelled';
export type TripType = 'one-way' | 'round-trip';
export type PassengerType = 'adult' | 'child' | 'infant';
export type AdvisorySeverity = 'info' | 'caution' | 'suspended';
export type SeaCondition = 'Good' | 'Caution' | 'Suspended';

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  created_at: string;
  operator_id?: number | null;
  operator_verified?: number | null;
  business_name?: string | null;
}

export interface Boat {
  id: number;
  operator_id: number;
  boat_name: string;
  registration_code: string;
  boat_type: string;
  capacity: number;
  life_jackets_count: number;
  status: 'active' | 'maintenance';
}

export interface Trip {
  id: number;
  operator_id: number;
  boat_id: number;
  origin: string;
  destination: string;
  departure_date: string;
  departure_time: string;
  arrival_time: string;
  adult_fare: number;
  child_fare: number;
  infant_fare: number;
  total_capacity: number;
  seats_available: number;
  status: TripStatus;
  notes: string;
  operator_name: string;
  operator_verified: number;
  contact_number: string;
  boat_name: string;
  boat_type: string;
  registration_code: string;
  life_jackets_count: number;
  avg_rating: number;
  review_count: number;
}

export interface Passenger {
  id?: number;
  booking_id?: number;
  full_name: string;
  age: number;
  passenger_type: PassengerType;
  emergency_contact: string;
}

export interface TripSummaryRef {
  id: number;
  origin: string;
  destination: string;
  departure_date: string;
  departure_time: string;
  arrival_time: string;
  status: TripStatus;
  operator_name: string;
  contact_number: string;
  boat_name: string;
  registration_code: string;
}

export interface Booking {
  id: number;
  booking_ref: string;
  user_id: number;
  trip_id: number;
  return_trip_id: number | null;
  trip_type: TripType;
  adults: number;
  children: number;
  infants: number;
  total_passengers: number;
  total_fare: number;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  status: BookingStatus;
  created_at: string;
  cancelled_at: string | null;
  passengers: Passenger[];
  outbound_trip: TripSummaryRef;
  return_trip: TripSummaryRef | null;
}

export interface Feedback {
  id: number;
  user_id: number | null;
  operator_id: number;
  booking_id: number | null;
  rating: number;
  comment: string;
  visitor_name: string;
  created_at: string;
  operator_name?: string;
}

export interface Operator {
  id: number;
  user_id: number;
  business_name: string;
  owner_name: string;
  contact_number: string;
  port_location: string;
  permit_number: string;
  description: string;
  verified: number;
  created_at: string;
  account_email?: string;
  avg_rating: number;
  review_count: number;
  upcoming_trips_count: number;
  boats: Boat[];
  recent_reviews: Feedback[];
}

export interface Announcement {
  id: number;
  author_id: number;
  operator_id: number | null;
  title: string;
  message: string;
  severity: AdvisorySeverity;
  sea_condition: SeaCondition;
  is_active: number;
  created_at: string;
  author_name?: string;
  operator_name?: string | null;
}

export interface SafetyGuideline {
  id: number;
  category: string;
  title: string;
  description: string;
  sort_order: number;
  updated_at: string;
}

export interface SearchDraft {
  tripType: TripType;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  adults: number;
  children: number;
  infants: number;
}

export interface BookingSelection {
  outboundTripId: number;
  returnTripId: number | null;
  tripType: TripType;
  adults: number;
  children: number;
  infants: number;
}

export interface AnalyticsSummary {
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  totalPassengers: number;
  totalRevenue: number;
  activeOperators: number;
  pendingOperators: number;
  totalTrips: number;
  cancelledTrips: number;
  peakDayThreshold: number;
  overcrowdedDays: Array<{ travel_date: string; passengers: number; bookings: number }>;
}
