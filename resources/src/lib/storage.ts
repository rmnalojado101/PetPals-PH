import { api } from '@/lib/api';
import type { 
  User, 
  Veterinarian,
  Pet, 
  Appointment, 
  MedicalRecord, 
  Vaccination, 
  VaccineInventory,
  Notification,
  ClinicSettings,
  PaginatedResponse,
} from '@/types';

// Helper function to extract data from paginated or direct responses
function extractList<T>(response: T[] | PaginatedResponse<T>): T[] {
  return Array.isArray(response) ? response : response.data;
}

// Cache for data (in-memory only, no persistence)
const dataCache = {
  users: null as User[] | null,
  veterinarians: null as Veterinarian[] | null,
  pets: null as Pet[] | null,
  appointments: null as Appointment[] | null,
  medicalRecords: null as MedicalRecord[] | null,
  vaccinations: null as Vaccination[] | null,
  vaccineInventory: null as VaccineInventory[] | null,
  notifications: null as Notification[] | null,
  settings: null as ClinicSettings | null,
};

// Initialize data from API on app load
export async function initializeDataFromApi(): Promise<void> {
  try {
    const [users, veterinarians, pets, appointments, medicalRecords, vaccinations, notifications, settings] = await Promise.all([
      api.getUsers({ per_page: 100 }).then(extractList),
      api.getVeterinarians(),
      api.getPets({ per_page: 100 }).then(extractList),
      api.getAppointments({ per_page: 100 }).then(extractList),
      api.getMedicalRecords({ per_page: 100 }).then(extractList),
      api.getVaccinations({ per_page: 100 }).then(extractList),
      api.getNotifications().then(extractList),
      api.getSettings(),
    ]);

    dataCache.users = users;
    dataCache.veterinarians = veterinarians;
    dataCache.pets = pets;
    dataCache.appointments = appointments;
    dataCache.medicalRecords = medicalRecords;
    dataCache.vaccinations = vaccinations;
    dataCache.notifications = notifications;
    dataCache.settings = settings;
  } catch (error) {
    console.error('Failed to initialize data from backend API', error);
  }
}

// No-op function for backward compatibility
export function initializeSeedData(): void {
  // All data is now server-side only
  console.log('Seed data is managed on the server - no local initialization needed');
}


// Users Storage - Now directly using API
export const usersStorage = {
  getAll: async (): Promise<User[]> => {
    if (dataCache.users) return dataCache.users;
    const users = await api.getUsers({ per_page: 100 });
    dataCache.users = extractList(users);
    return dataCache.users;
  },
  getById: async (id: string): Promise<User | undefined> => {
    try {
      return await api.getUserById(id);
    } catch {
      return undefined;
    }
  },
  getByEmail: async (email: string): Promise<User | undefined> => {
    try {
      return await api.findUserByEmail(email);
    } catch {
      return undefined;
    }
  },
  getByRole: async (role: User['role']): Promise<User[]> => {
    const users = await usersStorage.getAll();
    return users.filter(u => u.role === role);
  },
  create: async (user: Omit<User, 'id' | 'createdAt'>): Promise<User> => {
    const newUser = await api.createUser({
      name: user.name,
      email: user.email,
      password: user.password,
      passwordConfirmation: user.password,
      role: user.role,
      phone: user.phone,
      address: user.address,
    });
    // Invalidate cache
    dataCache.users = null;
    return newUser;
  },
  update: async (id: string, data: Partial<User>): Promise<User | undefined> => {
    try {
      const updated = await api.updateUser(id, data as Record<string, unknown>);
      dataCache.users = null; // Invalidate cache
      return updated;
    } catch {
      return undefined;
    }
  },
  delete: async (id: string): Promise<boolean> => {
    try {
      await api.deleteUser(id);
      dataCache.users = null; // Invalidate cache
      return true;
    } catch {
      return false;
    }
  },
};

// Veterinarians Storage - Now directly using API
export const veterinariansStorage = {
  getAll: async (): Promise<Veterinarian[]> => {
    if (dataCache.veterinarians) return dataCache.veterinarians;
    dataCache.veterinarians = await api.getVeterinarians();
    return dataCache.veterinarians;
  },
  getById: async (id: string): Promise<Veterinarian | undefined> => {
    const vets = await veterinariansStorage.getAll();
    return vets.find(v => v.id === id);
  },
  getByClinic: async (clinicId: string): Promise<Veterinarian[]> => {
    const vets = await veterinariansStorage.getAll();
    return vets.filter(v => v.clinicId === clinicId);
  },
  create: async (vet: Omit<Veterinarian, 'id' | 'createdAt'>): Promise<Veterinarian> => {
    const newVet = await api.createVeterinarian(vet as Record<string, unknown>);
    dataCache.veterinarians = null; // Invalidate cache
    return newVet;
  },
  update: async (id: string, data: Partial<Veterinarian>): Promise<Veterinarian | undefined> => {
    try {
      const updated = await api.updateVeterinarian(id, data as Record<string, unknown>);
      dataCache.veterinarians = null; // Invalidate cache
      return updated;
    } catch {
      return undefined;
    }
  },
  delete: async (id: string): Promise<boolean> => {
    try {
      await api.deleteVeterinarian(id);
      dataCache.veterinarians = null; // Invalidate cache
      return true;
    } catch {
      return false;
    }
  },
};

// Pets Storage - Now directly using API
export const petsStorage = {
  getAll: async (): Promise<Pet[]> => {
    if (dataCache.pets) return dataCache.pets;
    const pets = await api.getPets({ per_page: 100 });
    dataCache.pets = extractList(pets);
    return dataCache.pets;
  },
  getById: async (id: string): Promise<Pet | undefined> => {
    try {
      return await api.getPetById(id);
    } catch {
      return undefined;
    }
  },
  getByOwner: async (ownerId: string): Promise<Pet[]> => {
    const pets = await petsStorage.getAll();
    return pets.filter(p => p.ownerId === ownerId);
  },
  create: async (pet: Omit<Pet, 'id' | 'createdAt'>): Promise<Pet> => {
    const newPet = await api.createPet(pet as unknown as Record<string, unknown>);
    dataCache.pets = null; // Invalidate cache
    return newPet;
  },
  update: async (id: string, data: Partial<Pet>): Promise<Pet | undefined> => {
    try {
      const updated = await api.updatePet(id, data as unknown as Record<string, unknown>);
      dataCache.pets = null; // Invalidate cache
      return updated;
    } catch {
      return undefined;
    }
  },
  delete: async (id: string): Promise<boolean> => {
    try {
      await api.deletePet(id);
      dataCache.pets = null; // Invalidate cache
      return true;
    } catch {
      return false;
    }
  },
};

// Appointments Storage - Now directly using API
export const appointmentsStorage = {
  getAll: async (): Promise<Appointment[]> => {
    if (dataCache.appointments) return dataCache.appointments;
    const appointments = await api.getAppointments({ per_page: 100 });
    dataCache.appointments = extractList(appointments);
    return dataCache.appointments;
  },
  getById: async (id: string): Promise<Appointment | undefined> => {
    const appointments = await appointmentsStorage.getAll();
    return appointments.find(a => a.id === id);
  },
  getByOwner: async (ownerId: string): Promise<Appointment[]> => {
    const appointments = await appointmentsStorage.getAll();
    return appointments.filter(a => a.ownerId === ownerId);
  },
  getByVet: async (vetId: string): Promise<Appointment[]> => {
    const appointments = await appointmentsStorage.getAll();
    return appointments.filter(a => a.veterinarianId === vetId);
  },
  getByPet: async (petId: string): Promise<Appointment[]> => {
    const appointments = await appointmentsStorage.getAll();
    return appointments.filter(a => a.petId === petId);
  },
  getByDate: async (date: string): Promise<Appointment[]> => {
    const appointments = await appointmentsStorage.getAll();
    return appointments.filter(a => a.date === date || a.appointmentDate === date);
  },
  create: async (appointment: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Appointment> => {
    const newAppointment = await api.createAppointment(appointment as unknown as Record<string, unknown>);
    dataCache.appointments = null; // Invalidate cache
    return newAppointment;
  },
  update: async (id: string, data: Partial<Appointment>): Promise<Appointment | undefined> => {
    try {
      const updated = await api.updateAppointment(id, data as unknown as Record<string, unknown>);
      dataCache.appointments = null; // Invalidate cache
      return updated;
    } catch {
      return undefined;
    }
  },
  delete: async (id: string): Promise<boolean> => {
    try {
      await api.deleteAppointment(id);
      dataCache.appointments = null; // Invalidate cache
      return true;
    } catch {
      return false;
    }
  },
  checkConflict: async (vetId: string, date: string, time: string, excludeId?: string): Promise<boolean> => {
    const appointments = await appointmentsStorage.getAll();
    return appointments.some(a => {
      if (excludeId && a.id === excludeId) return false;
      return (a.veterinarianId === vetId || a.ownerId === vetId) && 
             (a.date === date || a.appointmentDate === date) && 
             (a.time === time || a.appointmentTime === time);
    });
  },
};

// Medical Records Storage - Now directly using API
export const medicalRecordsStorage = {
  getAll: async (): Promise<MedicalRecord[]> => {
    if (dataCache.medicalRecords) return dataCache.medicalRecords;
    const records = await api.getMedicalRecords({ per_page: 100 });
    dataCache.medicalRecords = extractList(records);
    return dataCache.medicalRecords;
  },
  getById: async (id: string): Promise<MedicalRecord | undefined> => {
    try {
      const records = await medicalRecordsStorage.getAll();
      return records.find(r => r.id === id);
    } catch {
      return undefined;
    }
  },
  getByPet: async (petId: string): Promise<MedicalRecord[]> => {
    try {
      return await api.getPetHistory(petId);
    } catch {
      const records = await medicalRecordsStorage.getAll();
      return records.filter(r => r.petId === petId);
    }
  },
  getByVet: async (vetId: string): Promise<MedicalRecord[]> => {
    const records = await medicalRecordsStorage.getAll();
    return records.filter(r => r.veterinarianId === vetId);
  },
  getByAppointment: async (appointmentId: string): Promise<MedicalRecord | undefined> => {
    const records = await medicalRecordsStorage.getAll();
    return records.find(r => r.appointmentId === appointmentId);
  },
  create: async (record: Omit<MedicalRecord, 'id' | 'createdAt'>): Promise<MedicalRecord> => {
    const newRecord = await api.createMedicalRecord(record as unknown as Record<string, unknown>);
    dataCache.medicalRecords = null; // Invalidate cache
    return newRecord;
  },
  update: async (id: string, data: Partial<MedicalRecord>): Promise<MedicalRecord | undefined> => {
    try {
      const updated = await api.updateMedicalRecord(id, data as unknown as Record<string, unknown>);
      dataCache.medicalRecords = null; // Invalidate cache
      return updated;
    } catch {
      return undefined;
    }
  },
  delete: async (id: string): Promise<boolean> => {
    try {
      await api.deleteMedicalRecord(id);
      dataCache.medicalRecords = null; // Invalidate cache
      return true;
    } catch {
      return false;
    }
  },
};

// Vaccinations Storage - Now directly using API
export const vaccinationsStorage = {
  getAll: async (): Promise<Vaccination[]> => {
    if (dataCache.vaccinations) return dataCache.vaccinations;
    const vaccinations = await api.getVaccinations({ per_page: 100 });
    dataCache.vaccinations = extractList(vaccinations);
    return dataCache.vaccinations;
  },
  getById: async (id: string): Promise<Vaccination | undefined> => {
    const vaccinations = await vaccinationsStorage.getAll();
    return vaccinations.find(v => v.id === id);
  },
  getByPet: async (petId: string): Promise<Vaccination[]> => {
    const vaccinations = await vaccinationsStorage.getAll();
    return vaccinations.filter(v => v.petId === petId);
  },
  getDue: async (): Promise<Vaccination[]> => {
    try {
      return await api.getVaccinationsDueSoon();
    } catch {
      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const vaccinations = await vaccinationsStorage.getAll();
      return vaccinations.filter(v => 
        v.nextDueDate && v.nextDueDate >= today && v.nextDueDate <= nextWeek
      );
    }
  },
  create: async (vaccination: Omit<Vaccination, 'id'>): Promise<Vaccination> => {
    const newVaccination = await api.createVaccination(vaccination as unknown as Record<string, unknown>);
    dataCache.vaccinations = null; // Invalidate cache
    return newVaccination;
  },
  update: async (id: string, data: Partial<Vaccination>): Promise<Vaccination | undefined> => {
    try {
      const updated = await api.updateVaccination(id, data as unknown as Record<string, unknown>);
      dataCache.vaccinations = null; // Invalidate cache
      return updated;
    } catch {
      return undefined;
    }
  },
  delete: async (id: string): Promise<boolean> => {
    try {
      await api.deleteVaccination(id);
      dataCache.vaccinations = null; // Invalidate cache
      return true;
    } catch {
      return false;
    }
  },
};

// Vaccine Inventory Storage - Now directly using API
export const vaccineInventoryStorage = {
  getAll: async (): Promise<VaccineInventory[]> => {
    if (dataCache.vaccineInventory) return dataCache.vaccineInventory;
    dataCache.vaccineInventory = await api.getInventory();
    return dataCache.vaccineInventory;
  },
  getByClinic: async (clinicId: string): Promise<VaccineInventory[]> => {
    const inventory = await vaccineInventoryStorage.getAll();
    return inventory.filter(i => i.clinicId === clinicId);
  },
  getByClinicAndName: async (clinicId: string, name: string): Promise<VaccineInventory | undefined> => {
    const inventory = await vaccineInventoryStorage.getAll();
    return inventory.find(i => i.clinicId === clinicId && i.name === name);
  },
  upsert: async (clinicId: string, name: string, delta: number): Promise<VaccineInventory> => {
    const updated = await api.upsertInventory(name, delta);
    dataCache.vaccineInventory = null; // Invalidate cache
    return updated;
  },
  update: async (clinicId: string, name: string, data: Partial<Omit<VaccineInventory, 'id' | 'clinicId' | 'name'>>): Promise<VaccineInventory | undefined> => {
    try {
      const inventory = await vaccineInventoryStorage.getAll();
      const existing = inventory.find(item => item.clinicId === clinicId && item.name === name);
      if (!existing) return undefined;
      const updated = await api.updateInventory(existing.id, data as Record<string, unknown>);
      dataCache.vaccineInventory = null; // Invalidate cache
      return updated;
    } catch {
      return undefined;
    }
  },
};

// Notifications Storage - Now directly using API
export const notificationsStorage = {
  getAll: async (): Promise<Notification[]> => {
    if (dataCache.notifications) return dataCache.notifications;
    const notifications = await api.getNotifications();
    dataCache.notifications = extractList(notifications);
    return dataCache.notifications;
  },
  getById: async (id: string): Promise<Notification | undefined> => {
    const notifications = await notificationsStorage.getAll();
    return notifications.find(n => n.id === id);
  },
  create: async (notification: Omit<Notification, 'id'>): Promise<Notification> => {
    // Notifications are typically created by the backend
    // This is here for completeness
    dataCache.notifications = null; // Invalidate cache
    return notification as Notification;
  },
  update: async (id: string, data: Partial<Notification>): Promise<Notification | undefined> => {
    try {
      const updated = await api.markNotificationAsRead(id);
      dataCache.notifications = null; // Invalidate cache
      return updated;
    } catch {
      return undefined;
    }
  },
  delete: async (id: string): Promise<boolean> => {
    try {
      await api.deleteNotification(id);
      dataCache.notifications = null; // Invalidate cache
      return true;
    } catch {
      return false;
    }
  },
};

// Settings Storage - Now directly using API
export const settingsStorage = {
  get: async (): Promise<ClinicSettings> => {
    if (dataCache.settings) return dataCache.settings;
    dataCache.settings = await api.getSettings();
    return dataCache.settings;
  },
  update: async (data: Partial<ClinicSettings>): Promise<ClinicSettings> => {
    const updated = await api.updateSettings(data);
    dataCache.settings = updated;
    return updated;
  },
};

// Session Storage - Uses API to get current user
export const sessionStorage = {
  get: async (): Promise<User | null> => {
    try {
      return await api.getCurrentUser();
    } catch {
      return null;
    }
  },
  set: (): void => {
    // Session is managed server-side via auth token
  },
  clear: (): void => {
    // Session cleared by logout
  },
};
