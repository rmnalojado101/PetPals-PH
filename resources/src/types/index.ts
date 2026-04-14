export type UserRole = 'admin' | 'veterinarian' | 'receptionist' | 'owner';

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: UserRole;
  phone?: string;
  address?: string;
  avatar?: string;
  createdAt: string;
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
  createdAt: string;
}

export interface Vaccination {
  id: string;
  petId: string;
  name: string;
  dateAdministered: string;
  nextDueDate?: string;
  administeredBy: string;
  batchNumber?: string;
  notes?: string;
}

export type AppointmentStatus = 'pending' | 'approved' | 'completed' | 'cancelled';

export interface Appointment {
  id: string;
  petId: string;
  ownerId: string;
  veterinarianId: string;
  date: string;
  time: string;
  reason: string;
  status: AppointmentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MedicalRecord {
  id: string;
  petId: string;
  appointmentId?: string;
  veterinarianId: string;
  date: string;
  diagnosis: string;
  treatment: string;
  prescription?: string;
  labResults?: string;
  notes?: string;
  weight?: number;
  temperature?: number;
  followUpDate?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'appointment' | 'reminder' | 'system' | 'medical';
  read: boolean;
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
}
