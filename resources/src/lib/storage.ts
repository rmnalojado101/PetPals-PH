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

const STORAGE_KEYS = {
  USERS: 'petpals_users',
  VETERINARIANS: 'petpals_veterinarians',
  PETS: 'petpals_pets',
  APPOINTMENTS: 'petpals_appointments',
  MEDICAL_RECORDS: 'petpals_medical_records',
  VACCINATIONS: 'petpals_vaccinations',
  VACCINE_INVENTORY: 'petpals_vaccine_inventory',
  NOTIFICATIONS: 'petpals_notifications',
  SETTINGS: 'petpals_settings',
  CURRENT_USER: 'petpals_current_user',
  SYNC_MAP: 'petpals_sync_id_map',
} as const;

type SyncMap = Record<string, Record<string, string | number>>;

function getItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getSyncMap(): SyncMap {
  return getItem(STORAGE_KEYS.SYNC_MAP, {} as SyncMap);
}

function setSyncMap(map: SyncMap): void {
  setItem(STORAGE_KEYS.SYNC_MAP, map);
}

function getSyncedId(resource: string, localId: string): string | number | undefined {
  return getSyncMap()[resource]?.[localId];
}

function setSyncedId(resource: string, localId: string, backendId: string | number): void {
  const map = getSyncMap();
  map[resource] = map[resource] || {};
  map[resource][localId] = backendId;
  setSyncMap(map);
}

function convertDbIds<T extends object>(item: T): T {
  const converted = { ...item } as Record<string, unknown>;

  const idKeys = ['id', 'petId', 'ownerId', 'veterinarianId', 'appointmentId', 'administeredBy', 'clinicId', 'userId'];
  idKeys.forEach((key) => {
    if (converted[key] !== undefined && converted[key] !== null) {
      converted[key] = converted[key].toString();
    }
  });

  return converted as T;
}

function mapForeignKeysForApi<T extends object>(payload: T): T {
  const mapped = { ...payload } as Record<string, unknown>;

  const remaps: Record<string, string> = {
    ownerId: 'users',
    veterinarianId: 'users',
    administeredBy: 'users',
    clinicId: 'users',
    userId: 'users',
    petId: 'pets',
    appointmentId: 'appointments',
  };

  Object.entries(remaps).forEach(([key, resource]) => {
    if (mapped[key]) {
      const mappedId = getSyncedId(resource, String(mapped[key]));
      if (mappedId) {
        mapped[key] = mappedId;
      }
    }
  });

  return mapped as T;
}

function extractList<T>(response: T[] | PaginatedResponse<T>): T[] {
  return Array.isArray(response) ? response : response.data;
}

async function syncUserToBackend(user: User): Promise<string | null> {
  try {
    const existing = await api.findUserByEmail(user.email);
    if (existing) {
      setSyncedId('users', user.id, existing.id);
      return existing.id;
    }

    const backendUser = await api.createUser({
      name: user.name,
      email: user.email,
      password: user.password,
      passwordConfirmation: user.password,
      role: user.role,
      phone: user.phone,
      address: user.address,
    });

    if (backendUser?.id) {
      setSyncedId('users', user.id, backendUser.id);
      return backendUser.id;
    }
  } catch (error) {
    console.error('Failed to sync user to backend', error);
  }
  return null;
}

export async function synchronizeCurrentUserToBackend(user: User): Promise<string | null> {
  return syncUserToBackend(user);
}

export async function initializeDataFromApi(): Promise<void> {
  try {
    const users = await api.getUsers({ per_page: 100 });
    const veterinarians = await api.getVeterinarians();
    const pets = await api.getPets({ per_page: 100 });
    const appointments = await api.getAppointments({ per_page: 100 });
    const medicalRecords = await api.getMedicalRecords({ per_page: 100 });
    const vaccinations = await api.getVaccinations({ per_page: 100 });

    setItem(STORAGE_KEYS.USERS, extractList(users).map(convertDbIds));
    setItem(STORAGE_KEYS.VETERINARIANS, veterinarians.map(convertDbIds));
    setItem(STORAGE_KEYS.PETS, extractList(pets).map(convertDbIds));
    setItem(STORAGE_KEYS.APPOINTMENTS, extractList(appointments).map(convertDbIds));
    setItem(STORAGE_KEYS.MEDICAL_RECORDS, extractList(medicalRecords).map(convertDbIds));
    setItem(STORAGE_KEYS.VACCINATIONS, extractList(vaccinations).map(convertDbIds));
  } catch (error) {
    console.error('Failed to initialize data from backend API', error);
  }
}

export function initializeSeedData(): void {
  const users = getItem<User[]>(STORAGE_KEYS.USERS, []);
  if (users.length > 0) {
    return;
  }

  const admin: User = {
    id: generateId(),
    name: 'System Administrator',
    email: 'admin@petpalsph.com',
    password: 'admin123',
    role: 'admin',
    phone: '+63 917 123 4567',
    address: '',
    createdAt: new Date().toISOString(),
  };

  const clinic: User = {
    id: generateId(),
    name: 'PetPals Vet Clinic',
    email: 'clinic@petpalsph.com',
    password: 'clinic123',
    role: 'vet_clinic',
    phone: '+63 900 123 4567',
    address: '',
    createdAt: new Date().toISOString(),
  };

  const owner: User = {
    id: generateId(),
    name: 'Carlo Mendoza',
    email: 'owner@petpalsph.com',
    password: 'owner123',
    role: 'owner',
    phone: '+63 921 567 8901',
    address: '456 Pet Lover Lane, Quezon City',
    createdAt: new Date().toISOString(),
  };

  setItem(STORAGE_KEYS.USERS, [admin, clinic, owner]);
  setItem(STORAGE_KEYS.VETERINARIANS, []);
  setItem(STORAGE_KEYS.PETS, []);
  setItem(STORAGE_KEYS.APPOINTMENTS, []);
  setItem(STORAGE_KEYS.MEDICAL_RECORDS, []);
  setItem(STORAGE_KEYS.VACCINATIONS, []);
  setItem(STORAGE_KEYS.VACCINE_INVENTORY, []);
  setItem(STORAGE_KEYS.NOTIFICATIONS, []);
  setItem(STORAGE_KEYS.SETTINGS, {
    name: 'PetPals PH',
    address: '123 Veterinary Street, Makati City, Philippines',
    phone: '+63 2 8888 1234',
    email: 'info@petpalsph.com',
    openingHours: [
      { day: 'Monday', open: '08:00', close: '18:00', isOpen: true },
      { day: 'Tuesday', open: '08:00', close: '18:00', isOpen: true },
      { day: 'Wednesday', open: '08:00', close: '18:00', isOpen: true },
      { day: 'Thursday', open: '08:00', close: '18:00', isOpen: true },
      { day: 'Friday', open: '08:00', close: '18:00', isOpen: true },
      { day: 'Saturday', open: '09:00', close: '14:00', isOpen: true },
      { day: 'Sunday', open: '00:00', close: '00:00', isOpen: false },
    ],
  } as ClinicSettings);
}

export const usersStorage = {
  getAll: (): User[] => getItem(STORAGE_KEYS.USERS, []),
  getById: (id: string): User | undefined =>
    usersStorage.getAll().find(u => u.id === id),
  getByEmail: (email: string): User | undefined =>
    usersStorage.getAll().find(u => u.email.toLowerCase() === email.toLowerCase()),
  getByRole: (role: User['role']): User[] =>
    usersStorage.getAll().filter(u => u.role === role),
  create: (user: Omit<User, 'id' | 'createdAt'>): User => {
    const users = usersStorage.getAll();
    const newUser: User = {
      ...user,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    setItem(STORAGE_KEYS.USERS, [...users, newUser]);
    syncUserToBackend(newUser).then((backendId) => {
      if (backendId) {
        api.setSessionUser(newUser, backendId);
      }
    });
    return newUser;
  },
  update: (id: string, data: Partial<User>): User | undefined => {
    const users = usersStorage.getAll();
    const index = users.findIndex(u => u.id === id);
    if (index === -1) return undefined;
    users[index] = { ...users[index], ...data };
    setItem(STORAGE_KEYS.USERS, users);
    const backendId = getSyncedId('users', id);
    if (backendId) {
      api.updateUser(backendId, users[index] as unknown as Record<string, unknown>).catch(console.error);
    }
    return users[index];
  },
  delete: (id: string): boolean => {
    const users = usersStorage.getAll();
    const filtered = users.filter(u => u.id !== id);
    if (filtered.length === users.length) return false;
    setItem(STORAGE_KEYS.USERS, filtered);
    const backendId = getSyncedId('users', id);
    if (backendId) {
      api.deleteUser(backendId).catch(console.error);
    }
    return true;
  },
};

export const veterinariansStorage = {
  getAll: (): Veterinarian[] => getItem(STORAGE_KEYS.VETERINARIANS, []),
  getById: (id: string): Veterinarian | undefined =>
    veterinariansStorage.getAll().find(v => v.id === id),
  getByClinic: (clinicId: string): Veterinarian[] =>
    veterinariansStorage.getAll().filter(v => v.clinicId === clinicId),
  create: (vet: Omit<Veterinarian, 'id' | 'createdAt'>): Veterinarian => {
    const vets = veterinariansStorage.getAll();
    const newVet: Veterinarian = {
      ...vet,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    setItem(STORAGE_KEYS.VETERINARIANS, [...vets, newVet]);
    return newVet;
  },
  update: (id: string, data: Partial<Veterinarian>): Veterinarian | undefined => {
    const vets = veterinariansStorage.getAll();
    const index = vets.findIndex(v => v.id === id);
    if (index === -1) return undefined;
    vets[index] = { ...vets[index], ...data };
    setItem(STORAGE_KEYS.VETERINARIANS, vets);
    return vets[index];
  },
  delete: (id: string): boolean => {
    const vets = veterinariansStorage.getAll();
    const filtered = vets.filter(v => v.id !== id);
    if (filtered.length === vets.length) return false;
    setItem(STORAGE_KEYS.VETERINARIANS, filtered);
    return true;
  },
};

export const petsStorage = {
  getAll: (): Pet[] => getItem(STORAGE_KEYS.PETS, []),
  getById: (id: string): Pet | undefined =>
    petsStorage.getAll().find(p => p.id === id),
  getByOwner: (ownerId: string): Pet[] =>
    petsStorage.getAll().filter(p => p.ownerId === ownerId),
  create: (pet: Omit<Pet, 'id' | 'createdAt'>): Pet => {
    const pets = petsStorage.getAll();
    const newPet: Pet = {
      ...pet,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    setItem(STORAGE_KEYS.PETS, [...pets, newPet]);
    const payload = mapForeignKeysForApi(newPet);
    api.createPet(payload as unknown as Record<string, unknown>)
      .then((dbPet) => setSyncedId('pets', newPet.id, dbPet.id))
      .catch(console.error);
    return newPet;
  },
  update: (id: string, data: Partial<Pet>): Pet | undefined => {
    const pets = petsStorage.getAll();
    const index = pets.findIndex(p => p.id === id);
    if (index === -1) return undefined;
    pets[index] = { ...pets[index], ...data };
    setItem(STORAGE_KEYS.PETS, pets);
    const backendId = getSyncedId('pets', id);
    if (backendId) {
      api.updatePet(backendId, mapForeignKeysForApi(pets[index]) as unknown as Record<string, unknown>).catch(console.error);
    }
    return pets[index];
  },
  delete: (id: string): boolean => {
    const pets = petsStorage.getAll();
    const filtered = pets.filter(p => p.id !== id);
    if (filtered.length === pets.length) return false;
    setItem(STORAGE_KEYS.PETS, filtered);
    const backendId = getSyncedId('pets', id);
    if (backendId) {
      api.deletePet(backendId).catch(console.error);
    }
    return true;
  },
};

export const appointmentsStorage = {
  getAll: (): Appointment[] => getItem(STORAGE_KEYS.APPOINTMENTS, []),
  getById: (id: string): Appointment | undefined =>
    appointmentsStorage.getAll().find(a => a.id === id),
  getByOwner: (ownerId: string): Appointment[] =>
    appointmentsStorage.getAll().filter(a => a.ownerId === ownerId),
  getByVet: (vetId: string): Appointment[] =>
    appointmentsStorage.getAll().filter(a => a.veterinarianId === vetId),
  getByPet: (petId: string): Appointment[] =>
    appointmentsStorage.getAll().filter(a => a.petId === petId),
  getByDate: (date: string): Appointment[] =>
    appointmentsStorage.getAll().filter(a => a.date === date || a.appointmentDate === date),
  create: (appointment: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>): Appointment => {
    const appointments = appointmentsStorage.getAll();
    const newAppointment: Appointment = {
      ...appointment,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setItem(STORAGE_KEYS.APPOINTMENTS, [...appointments, newAppointment]);
    const payload = mapForeignKeysForApi(newAppointment);
    api.createAppointment(payload as unknown as Record<string, unknown>)
      .then((dbApt) => setSyncedId('appointments', newAppointment.id, dbApt.id))
      .catch(console.error);
    return newAppointment;
  },
  update: (id: string, data: Partial<Appointment>): Appointment | undefined => {
    const appointments = appointmentsStorage.getAll();
    const index = appointments.findIndex(a => a.id === id);
    if (index === -1) return undefined;
    appointments[index] = { ...appointments[index], ...data, updatedAt: new Date().toISOString() };
    setItem(STORAGE_KEYS.APPOINTMENTS, appointments);
    const backendId = getSyncedId('appointments', id);
    if (backendId) {
      api.updateAppointment(backendId, mapForeignKeysForApi(appointments[index]) as unknown as Record<string, unknown>).catch(console.error);
    }
    return appointments[index];
  },
  delete: (id: string): boolean => {
    const appointments = appointmentsStorage.getAll();
    const filtered = appointments.filter(a => a.id !== id);
    if (filtered.length === appointments.length) return false;
    setItem(STORAGE_KEYS.APPOINTMENTS, filtered);
    const backendId = getSyncedId('appointments', id);
    if (backendId) {
      api.deleteAppointment(backendId).catch(console.error);
    }
    return true;
  },
  checkConflict: (vetId: string, date: string, time: string, excludeId?: string): boolean => {
    return appointmentsStorage.getAll().some(a => {
      if (excludeId && a.id === excludeId) return false;
      return (a.veterinarianId === vetId || a.ownerId === vetId) && (a.date === date || a.appointmentDate === date) && (a.time === time || a.appointmentTime === time);
    });
  },
};

export const medicalRecordsStorage = {
  getAll: (): MedicalRecord[] => getItem(STORAGE_KEYS.MEDICAL_RECORDS, []),
  getById: (id: string): MedicalRecord | undefined =>
    medicalRecordsStorage.getAll().find(r => r.id === id),
  getByPet: (petId: string): MedicalRecord[] =>
    medicalRecordsStorage.getAll().filter(r => r.petId === petId),
  getByVet: (vetId: string): MedicalRecord[] =>
    medicalRecordsStorage.getAll().filter(r => r.veterinarianId === vetId),
  getByAppointment: (appointmentId: string): MedicalRecord | undefined =>
    medicalRecordsStorage.getAll().find(r => r.appointmentId === appointmentId),
  create: (record: Omit<MedicalRecord, 'id' | 'createdAt'>): MedicalRecord => {
    const records = medicalRecordsStorage.getAll();
    const newRecord: MedicalRecord = {
      ...record,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    setItem(STORAGE_KEYS.MEDICAL_RECORDS, [...records, newRecord]);
    const payload = mapForeignKeysForApi(newRecord);
    api.createMedicalRecord(payload as unknown as Record<string, unknown>)
      .then((dbRecord) => setSyncedId('medical_records', newRecord.id, dbRecord.id))
      .catch(console.error);
    return newRecord;
  },
  update: (id: string, data: Partial<MedicalRecord>): MedicalRecord | undefined => {
    const records = medicalRecordsStorage.getAll();
    const index = records.findIndex(r => r.id === id);
    if (index === -1) return undefined;
    records[index] = { ...records[index], ...data };
    setItem(STORAGE_KEYS.MEDICAL_RECORDS, records);
    const backendId = getSyncedId('medical_records', id);
    if (backendId) {
      api.updateMedicalRecord(backendId, mapForeignKeysForApi(records[index]) as unknown as Record<string, unknown>).catch(console.error);
    }
    return records[index];
  },
  delete: (id: string): boolean => {
    const records = medicalRecordsStorage.getAll();
    const filtered = records.filter(r => r.id !== id);
    if (filtered.length === records.length) return false;
    setItem(STORAGE_KEYS.MEDICAL_RECORDS, filtered);
    return true;
  },
};

export const vaccinationsStorage = {
  getAll: (): Vaccination[] => getItem(STORAGE_KEYS.VACCINATIONS, []),
  getById: (id: string): Vaccination | undefined =>
    vaccinationsStorage.getAll().find(v => v.id === id),
  getByPet: (petId: string): Vaccination[] =>
    vaccinationsStorage.getAll().filter(v => v.petId === petId),
  getDue: (): Vaccination[] => {
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return vaccinationsStorage.getAll().filter(v => 
      v.nextDueDate && v.nextDueDate >= today && v.nextDueDate <= nextWeek
    );
  },
  create: (vaccination: Omit<Vaccination, 'id'>): Vaccination => {
    const vaccinations = vaccinationsStorage.getAll();
    const newVaccination: Vaccination = {
      ...vaccination,
      id: generateId(),
    };
    setItem(STORAGE_KEYS.VACCINATIONS, [...vaccinations, newVaccination]);
    const payload = mapForeignKeysForApi(newVaccination);
    api.createVaccination(payload as unknown as Record<string, unknown>)
      .then((dbVax) => setSyncedId('vaccinations', newVaccination.id, dbVax.id))
      .catch(console.error);
    return newVaccination;
  },
  update: (id: string, data: Partial<Vaccination>): Vaccination | undefined => {
    const vaccinations = vaccinationsStorage.getAll();
    const index = vaccinations.findIndex(v => v.id === id);
    if (index === -1) return undefined;
    vaccinations[index] = { ...vaccinations[index], ...data };
    setItem(STORAGE_KEYS.VACCINATIONS, vaccinations);
    const backendId = getSyncedId('vaccinations', id);
    if (backendId) {
      api.updateVaccination(backendId, mapForeignKeysForApi(vaccinations[index]) as unknown as Record<string, unknown>).catch(console.error);
    }
    return vaccinations[index];
  },
  delete: (id: string): boolean => {
    const vaccinations = vaccinationsStorage.getAll();
    const filtered = vaccinations.filter(v => v.id !== id);
    if (filtered.length === vaccinations.length) return false;
    setItem(STORAGE_KEYS.VACCINATIONS, filtered);
    const backendId = getSyncedId('vaccinations', id);
    if (backendId) {
      api.deleteVaccination(backendId).catch(console.error);
    }
    return true;
  },
};

export const vaccineInventoryStorage = {
  getAll: (): VaccineInventory[] => getItem(STORAGE_KEYS.VACCINE_INVENTORY, []),
  getByClinic: (clinicId: string): VaccineInventory[] =>
    vaccineInventoryStorage.getAll().filter(i => i.clinicId === clinicId),
  getByClinicAndName: (clinicId: string, name: string) =>
    vaccineInventoryStorage.getAll().find(i => i.clinicId === clinicId && i.name === name),
  upsert: (clinicId: string, name: string, delta: number): VaccineInventory => {
    const inventory = vaccineInventoryStorage.getAll();
    const existing = inventory.find(item => item.clinicId === clinicId && item.name === name);
    if (existing) {
      existing.stock = Math.max(0, existing.stock + delta);
      existing.lastUpdated = new Date().toISOString();
      setItem(STORAGE_KEYS.VACCINE_INVENTORY, inventory);
      return existing;
    }
    const newInventory: VaccineInventory = {
      id: generateId(),
      clinicId,
      name,
      stock: Math.max(0, delta),
      batchNumber: undefined,
      origin: undefined,
      expirationDate: undefined,
      description: undefined,
      lastUpdated: new Date().toISOString(),
    };
    setItem(STORAGE_KEYS.VACCINE_INVENTORY, [...inventory, newInventory]);
    return newInventory;
  },
  update: (clinicId: string, name: string, data: Partial<Omit<VaccineInventory, 'id' | 'clinicId' | 'name'>>): VaccineInventory | undefined => {
    const inventory = vaccineInventoryStorage.getAll();
    const existing = inventory.find(item => item.clinicId === clinicId && item.name === name);
    if (!existing) return undefined;
    Object.assign(existing, data, { lastUpdated: new Date().toISOString() });
    setItem(STORAGE_KEYS.VACCINE_INVENTORY, inventory);
    return existing;
  },
};

export const notificationsStorage = {
  getAll: (): Notification[] => getItem(STORAGE_KEYS.NOTIFICATIONS, []),
  getById: (id: string): Notification | undefined =>
    notificationsStorage.getAll().find(n => n.id === id),
  create: (notification: Omit<Notification, 'id'>): Notification => {
    const notifications = notificationsStorage.getAll();
    const newNotification: Notification = {
      ...notification,
      id: generateId(),
    };
    setItem(STORAGE_KEYS.NOTIFICATIONS, [...notifications, newNotification]);
    return newNotification;
  },
  update: (id: string, data: Partial<Notification>): Notification | undefined => {
    const notifications = notificationsStorage.getAll();
    const index = notifications.findIndex(n => n.id === id);
    if (index === -1) return undefined;
    notifications[index] = { ...notifications[index], ...data };
    setItem(STORAGE_KEYS.NOTIFICATIONS, notifications);
    return notifications[index];
  },
  delete: (id: string): boolean => {
    const notifications = notificationsStorage.getAll();
    const filtered = notifications.filter(n => n.id !== id);
    if (filtered.length === notifications.length) return false;
    setItem(STORAGE_KEYS.NOTIFICATIONS, filtered);
    return true;
  },
};

export const settingsStorage = {
  get: (): ClinicSettings => getItem(STORAGE_KEYS.SETTINGS, {
    name: 'PetPals PH',
    address: '123 Veterinary Street, Makati City, Philippines',
    phone: '+63 2 8888 1234',
    email: 'info@petpalsph.com',
    openingHours: [
      { day: 'Monday', open: '08:00', close: '18:00', isOpen: true },
      { day: 'Tuesday', open: '08:00', close: '18:00', isOpen: true },
      { day: 'Wednesday', open: '08:00', close: '18:00', isOpen: true },
      { day: 'Thursday', open: '08:00', close: '18:00', isOpen: true },
      { day: 'Friday', open: '08:00', close: '18:00', isOpen: true },
      { day: 'Saturday', open: '09:00', close: '14:00', isOpen: true },
      { day: 'Sunday', open: '00:00', close: '00:00', isOpen: false },
    ],
  } as ClinicSettings),
  update: (data: Partial<ClinicSettings>): ClinicSettings => {
    const updated = { ...settingsStorage.get(), ...data };
    setItem(STORAGE_KEYS.SETTINGS, updated);
    api.updateSettings(updated).catch(console.error);
    return updated;
  },
};

export const sessionStorage = {
  get: (): User | null => getItem(STORAGE_KEYS.CURRENT_USER, null),
  set: (user: User): void => setItem(STORAGE_KEYS.CURRENT_USER, user),
  clear: (): void => localStorage.removeItem(STORAGE_KEYS.CURRENT_USER),
};
