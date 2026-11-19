export type UserRole = 'SuperAdmin' | 'Doctor' | 'Receptionist' | 'Patient';

export interface Permission {
  id: string;
  name: string;
  code: string; // e.g. 'CAN_VIEW_FINANCE'
  category: 'Moliya' | 'Bemorlar' | 'Tibbiy' | 'Tizim';
}

export interface RolePermissionMapping {
  role: UserRole;
  permissions: string[]; // Permission codes
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: UserRole;
  action: string;
  resource: string;
  ipAddress: string;
  status: 'Success' | 'Warning' | 'Blocked';
}

export type AppointmentStatus = 
  | 'Pending'       // Kutmoqda
  | 'Confirmed'     // Tasdiqlangan
  | 'InProgress'    // Qabulda
  | 'Completed'     // Yakunlandi
  | 'Cancelled'     // Bekor qilindi
  | 'NoShow';       // Kelmadi

export type ToothCondition = 
  | 'Healthy'       // Sog'lom
  | 'Caries'        // Karies
  | 'Filling'       // Plomba
  | 'Crown'         // Qoplama (Koronka)
  | 'Endodontic'    // Ildiz kanali davolangan
  | 'Implant'       // Implant
  | 'Extracted';    // Olingan

export type ToothSurface = 'Occlusal' | 'Mesial' | 'Distal' | 'Buccal' | 'Lingual';

export interface ToothData {
  number: number; // 11 - 48
  condition: ToothCondition;
  surfaces: ToothSurface[];
  diagnosis?: string;
  treatmentPlan?: string;
  cost?: number;
  lastUpdated?: string;
}

export interface Doctor {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  specialty: string;
  colorCode: string;
  avatarUrl: string;
  experienceYears: number;
  rating: number;
  startHour: string; // "09:00"
  endHour: string;   // "18:00"
  lunchStart: string; // "13:00"
  lunchEnd: string;   // "14:00"
  workingDays: number[]; // [1,2,3,4,5,6]
}

export interface ServiceItem {
  id: string;
  name: string;
  category: 'Terapiya' | 'Ortodontiya' | 'Xirurgiya' | 'Implantatsiya' | 'Gigiyena';
  price: number;
  durationMinutes: number;
  description: string;
}

export interface Patient {
  id: string;
  fullName: string;
  phoneNumber: string;
  birthDate?: string;
  gender: 'Erkak' | 'Ayol';
  totalDebt: number;
  notes?: string;
  createdAt: string;
  lastVisit?: string;
}

export interface Appointment {
  id: string;
  doctorId: string;
  doctorName: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  serviceId?: string;
  serviceName?: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "09:00"
  endTime: string;   // "09:30"
  status: AppointmentStatus;
  source: 'Online' | 'CRM';
  notes?: string;
  bookingCode?: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  appointmentId?: string;
  patientId: string;
  patientName: string;
  totalAmount: number;
  discountAmount: number;
  paidAmount: number;
  debtAmount: number;
  status: 'Unpaid' | 'PartiallyPaid' | 'Paid' | 'Cancelled';
  createdAt: string;
  items: {
    serviceName: string;
    quantity: number;
    unitPrice: number;
  }[];
}

export interface PaymentRecord {
  id: string;
  invoiceId: string;
  patientName: string;
  amount: number;
  method: 'Cash' | 'UzcardHumo' | 'Click' | 'Payme';
  timestamp: string;
  referenceCode: string;
}

export interface SignalREvent {
  id: string;
  type: 'AppointmentStatusChanged' | 'NewOnlineBookingCreated' | 'SlotInvalidated';
  title: string;
  message: string;
  timestamp: string;
  severity: 'info' | 'success' | 'warning' | 'danger';
}
