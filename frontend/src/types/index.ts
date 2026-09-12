export type UserRole = 'ADMIN' | 'STAFF';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface Bed {
  id: number;
  room_id: number;
  bed_number: string;
  is_occupied: boolean;
  status: 'Available' | 'Occupied' | 'Reserved' | 'Maintenance';
  notes?: string;
  current_guest_name?: string;
  current_guest_contact?: string;
  admission_date?: string;
  package_name?: string;
  monthly_fee?: number;
  reserved_guest_name?: string;
}

export interface Room {
  id: number;
  room_number: string;
  floor: number;
  capacity: number;
  room_type: string;
  status: 'Available' | 'Full' | 'Maintenance';
  notes?: string;
  created_at: string;
  beds: Bed[];
  occupied_count: number;
  vacant_count: number;
}

export interface Package {
  id: number;
  name: string;
  monthly_fee: number;
  security_deposit: number;
  description?: string;
  amenities?: string;
  is_active: boolean;
  created_at: string;
}

export interface Enquiry {
  id: number;
  date: string;
  name: string;
  mode: 'Call' | 'Walk-in';
  occupation: 'Working' | 'Studying';
  approx_coming_date?: string;
  package_id?: number;
  contact_no: string;
  current_status: 'Open' | 'Converted' | 'Closed';
  notes?: string;
  created_at: string;
  package?: Package;
}

export interface Guest {
  id: number;
  name: string;
  contact_no: string;
  email?: string;
  occupation: string;
  guardian_name?: string;
  guardian_phone?: string;
  address?: string;
  id_proof_type?: string;
  id_proof_number?: string;
  status: 'Active' | 'Vacated';
  created_at: string;
  room_number?: string;
  bed_number?: string;
}

export interface Admission {
  id: number;
  guest_id: number;
  room_id: number;
  bed_id: number;
  package_id?: number;
  admission_date: string;
  security_deposit: number;
  monthly_fee: number;
  status: 'Active' | 'CheckedOut';
  checkout_date?: string;
  notes?: string;
  created_at: string;
  guest?: Guest;
  room?: Room;
  bed?: Bed;
  package?: Package;
}

export interface Booking {
  id: number;
  guest_name: string;
  contact_no: string;
  email?: string;
  room_id: number;
  bed_id: number;
  package_id?: number;
  booking_date: string;
  check_in_date: string;
  expected_check_out_date?: string;
  advance_amount: number;
  status: 'Confirmed' | 'CheckedIn' | 'Cancelled';
  notes?: string;
  created_at: string;
  room?: Room;
  bed?: Bed;
  package?: Package;
}

export interface Attendance {
  id: number;
  guest_id: number;
  date: string;
  status: 'Present' | 'Absent' | 'Leave' | 'Out';
  remarks?: string;
  created_at: string;
  guest?: Guest;
}

export interface AttendanceSummary {
  date: string;
  total_active_guests: number;
  present_count: number;
  absent_count: number;
  leave_count: number;
  out_count: number;
  not_marked_count: number;
}

export interface FeeReceipt {
  id: number;
  receipt_no: string;
  guest_id: number;
  admission_id?: number;
  date: string;
  fee_type?: string;
  billing_period?: string;
  period_start?: string;
  period_end?: string;
  amount: number;
  discount?: number;
  previous_balance?: number;
  paid_amount?: number;
  balance_amount?: number;
  payment_mode: 'Cash' | 'Bank' | 'UPI' | 'Card' | 'Other';
  payment_reference?: string;
  remarks?: string;
  created_at: string;
  guest?: Guest;
  room_number?: string;
  package_name?: string;
}

export interface AccountTransaction {
  id: number;
  date: string;
  transaction_type: 'Guest' | 'Plain';
  guest_id?: number;
  particulars: string;
  amount: number;
  payment_channel: 'Cash' | 'Bank';
  entry_type: 'Dr' | 'Cr';
  reference_no?: string;
  running_balance?: number;
  created_at: string;
  guest?: Guest;
}

export interface AccountSummary {
  total_debit: number;
  total_credit: number;
  net_balance: number;
  cash_balance: number;
  bank_balance: number;
}

export interface DashboardMetrics {
  total_guests: number;
  total_rooms: number;
  total_beds: number;
  vacancies: number;
  occupied_beds: number;
  occupancy_rate: number;
  active_bookings: number;
  today_attendance_marked: number;
  today_present: number;
  pending_enquiries: number;
  total_income_this_month: number;
  total_expense_this_month: number;
  net_profit_this_month: number;
  floor_stats: {
    floor: number;
    total_beds: number;
    occupied_beds: number;
    vacant_beds: number;
    occupancy_percentage: number;
  }[];
  recent_admissions: any[];
  recent_enquiries: any[];
  recent_transactions: any[];
}
