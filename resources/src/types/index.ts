export type UserRole = 'admin' | 'vet_clinic' | 'owner' | 'veterinarian' | 'receptionist';

export interface User {
  id: string;
  email: string;
  password?: string;
  name: string;
  role: UserRole;
  phone?: string;
  address?: string;
  avatar?: string;
  pets?: Pet[];
  createdAt?: string;
}

export interface Veterinarian {
  id: string;
  clinicId?: string;
  clinic?: User;
  name: string;
  email: string;
  phone?: string;
  specialty?: string;
  background?: string;
  avatar?: string;
  appointmentsCount?: number;
  recordsCount?: number;
  createdAt?: string;
}

export interface Pet {
  id: string;
  ownerId: string;
  name: string;
  species: 'dog' | 'cat' | 'bird' | 'rabbit' | 'hamster' | 'fish' | 'reptile' | 'other';
  breed: string;
  age: number;
  sex: 'male' | 'female';
  weight?: number;
  color?: string;
  microchipId?: string;
  allergies: string[];
  medicalNotes?: string;
  photo?: string;
  owner?: User;
  createdAt: string;
}

export interface Vaccination {
  id: string;
  petId: string;
  name: string;
  dateAdministered: string;
  nextDueDate?: string;
  administeredBy?: string;
  batchNumber?: string;
  notes?: string;
  pet?: Pet;
  administeredByUser?: User | Veterinarian;
}

export interface VaccineInventory {
  id: string;
  clinicId: string;
  name: string;
  stock: number;
  batchNumber?: string;
  origin?: string;
  expirationDate?: string;
  description?: string;
  lastUpdated: string;
}

export type AppointmentStatus = 'pending' | 'approved' | 'completed' | 'cancelled';

export interface Appointment {
  id: string;
  petId: string;
  ownerId: string;
  veterinarianId: string;
  date?: string;
  time?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  reason: string;
  status: AppointmentStatus;
  notes?: string;
  pet?: Pet;
  owner?: User;
  veterinarian?: User | Veterinarian;
  createdAt?: string;
  updatedAt?: string;
}

export interface AppointmentAvailability {
  id: string;
  veterinarianId: string;
  appointmentDate?: string;
  appointmentTime?: string;
  status: AppointmentStatus;
}

export interface MedicalRecord {
  id: string;
  petId: string;
  appointmentId?: string;
  veterinarianId: string;
  date?: string;
  recordDate?: string;
  diagnosis?: string;
  treatment?: string;
  prescription?: string;
  labResults?: string;
  notes?: string;
  weight?: number;
  temperature?: number;
  followUpDate?: string;
  attachmentPath?: string;
  attachmentName?: string;
  attachmentData?: string;
  attachmentUrl?: string;
  clinicalDetails?: Record<string, unknown>;
  pet?: Pet;
  owner?: User;
  veterinarian?: User | Veterinarian;
  appointment?: Appointment;
  createdAt?: string;
}

export interface ClinicPaymentMethod {
  id: string;
  label: string;
  qrCodePath?: string;
  qrCodeData?: string;
  qrCodeUrl?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'appointment' | 'reminder' | 'system' | 'medical';
  read?: boolean;
  isRead?: boolean;
  createdAt: string;
}

export interface ClinicSettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  openingHours: {
    day: string;
    open: string;
    close: string;
    isOpen: boolean;
  }[];
  logo?: string;
  vaccineTypes?: string[];
  paymentQrCodePath?: string;
  paymentQrCodeData?: string;
  paymentQrCodeUrl?: string;
  paymentMethods?: ClinicPaymentMethod[];
  paymentMethodsWithUrls?: ClinicPaymentMethod[];
  medicalRecordTemplates?: Record<string, unknown>[] | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  currentPage?: number;
  lastPage?: number;
  total?: number;
  perPage?: number;
}

export interface DashboardStats {
  userStats?: {
    total: number;
    clinics: number;
    owners: number;
    vets: number;
    newUsersLast30Days: number;
  };
  engagement?: {
    activeAppointments: number;
    totalMedicalRecords: number;
    totalVaccinations: number;
  };
  systemPerformance?: {
    databaseSize: string;
    serverUptime: string;
    responseTime: string;
    errorRate: string;
  };
  recentEvents?: any[];
  todaysAppointments?: number;
  totalPets?: number;
  myPets?: number;
  pendingAppointments?: number;
  completedAppointments?: number;
  upcomingVaccinations?: number;
  myUpcomingAppointments?: number;
  totalRecords?: number;
  myTotalRecords?: number;
  totalOwners?: number;
  totalAppointments?: number;
  totalVaccinations?: number;
}

export interface AppointmentStats {
  byStatus?: Partial<Record<AppointmentStatus, number>>;
  daily?: Array<{
    date: string;
    count: number;
  }>;
}

export interface SpeciesDistributionItem {
  species: string;
  count: number;
}

export interface VeterinarianActivityItem {
  id: string;
  name: string;
  specialty?: string;
  role?: string;
  appointmentsCount: number;
  recordsCount: number;
}

export type BillingStatus = 'pending' | 'paid' | 'partially_paid' | 'cancelled';

export interface BillingItem {
  description: string;
  quantity: number;
  price: number;
}

export interface Billing {
  id: string;
  invoiceNumber: string;
  petId: string;
  ownerId: string;
  medicalRecordId?: string;
  vaccinationId?: string;
  totalAmount: number;
  status: BillingStatus;
  paymentMethod?: string;
  items: BillingItem[];
  billingDate: string;
  notes?: string;
  proofOfPaymentPath?: string;
  proofOfPaymentName?: string;
  proofOfPaymentUrl?: string;
  pet?: Pet;
  owner?: User;
  medicalRecord?: MedicalRecord;
  vaccination?: Vaccination;
  createdAt?: string;
  updatedAt?: string;
}
