import type { 
  User, 
  Pet, 
  Appointment, 
  MedicalRecord, 
  Vaccination, 
  Notification,
  ClinicSettings 
} from '@/types';

const STORAGE_KEYS = {
  USERS: 'petpals_users',
  PETS: 'petpals_pets',
  APPOINTMENTS: 'petpals_appointments',
  MEDICAL_RECORDS: 'petpals_medical_records',
  VACCINATIONS: 'petpals_vaccinations',
  NOTIFICATIONS: 'petpals_notifications',
  SETTINGS: 'petpals_settings',
  CURRENT_USER: 'petpals_current_user',
} as const;

// Generic storage functions
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

// Generate unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Users
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
    return newUser;
  },
  update: (id: string, data: Partial<User>): User | undefined => {
    const users = usersStorage.getAll();
    const index = users.findIndex(u => u.id === id);
    if (index === -1) return undefined;
    users[index] = { ...users[index], ...data };
    setItem(STORAGE_KEYS.USERS, users);
    return users[index];
  },
  delete: (id: string): boolean => {
    const users = usersStorage.getAll();
    const filtered = users.filter(u => u.id !== id);
    if (filtered.length === users.length) return false;
    setItem(STORAGE_KEYS.USERS, filtered);
    return true;
  },
};

// Pets
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
    return newPet;
  },
  update: (id: string, data: Partial<Pet>): Pet | undefined => {
    const pets = petsStorage.getAll();
    const index = pets.findIndex(p => p.id === id);
    if (index === -1) return undefined;
    pets[index] = { ...pets[index], ...data };
    setItem(STORAGE_KEYS.PETS, pets);
    return pets[index];
  },
  delete: (id: string): boolean => {
    const pets = petsStorage.getAll();
    const filtered = pets.filter(p => p.id !== id);
    if (filtered.length === pets.length) return false;
    setItem(STORAGE_KEYS.PETS, filtered);
    return true;
  },
};

// Appointments
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
    appointmentsStorage.getAll().filter(a => a.date === date),
  getByStatus: (status: Appointment['status']): Appointment[] =>
    appointmentsStorage.getAll().filter(a => a.status === status),
  create: (appointment: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>): Appointment => {
    const appointments = appointmentsStorage.getAll();
    const now = new Date().toISOString();
    const newAppointment: Appointment = {
      ...appointment,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    setItem(STORAGE_KEYS.APPOINTMENTS, [...appointments, newAppointment]);
    return newAppointment;
  },
  update: (id: string, data: Partial<Appointment>): Appointment | undefined => {
    const appointments = appointmentsStorage.getAll();
    const index = appointments.findIndex(a => a.id === id);
    if (index === -1) return undefined;
    appointments[index] = { 
      ...appointments[index], 
      ...data, 
      updatedAt: new Date().toISOString() 
    };
    setItem(STORAGE_KEYS.APPOINTMENTS, appointments);
    return appointments[index];
  },
  delete: (id: string): boolean => {
    const appointments = appointmentsStorage.getAll();
    const filtered = appointments.filter(a => a.id !== id);
    if (filtered.length === appointments.length) return false;
    setItem(STORAGE_KEYS.APPOINTMENTS, filtered);
    return true;
  },
  checkConflict: (vetId: string, date: string, time: string, excludeId?: string): boolean => {
    return appointmentsStorage.getAll().some(a => 
      a.veterinarianId === vetId && 
      a.date === date && 
      a.time === time &&
      a.status !== 'cancelled' &&
      a.id !== excludeId
    );
  },
};

// Medical Records
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
    return newRecord;
  },
  update: (id: string, data: Partial<MedicalRecord>): MedicalRecord | undefined => {
    const records = medicalRecordsStorage.getAll();
    const index = records.findIndex(r => r.id === id);
    if (index === -1) return undefined;
    records[index] = { ...records[index], ...data };
    setItem(STORAGE_KEYS.MEDICAL_RECORDS, records);
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

// Vaccinations
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
    return newVaccination;
  },
  update: (id: string, data: Partial<Vaccination>): Vaccination | undefined => {
    const vaccinations = vaccinationsStorage.getAll();
    const index = vaccinations.findIndex(v => v.id === id);
    if (index === -1) return undefined;
    vaccinations[index] = { ...vaccinations[index], ...data };
    setItem(STORAGE_KEYS.VACCINATIONS, vaccinations);
    return vaccinations[index];
  },
  delete: (id: string): boolean => {
    const vaccinations = vaccinationsStorage.getAll();
    const filtered = vaccinations.filter(v => v.id !== id);
    if (filtered.length === vaccinations.length) return false;
    setItem(STORAGE_KEYS.VACCINATIONS, filtered);
    return true;
  },
};

// Notifications
export const notificationsStorage = {
  getAll: (): Notification[] => getItem(STORAGE_KEYS.NOTIFICATIONS, []),
  getByUser: (userId: string): Notification[] =>
    notificationsStorage.getAll()
      .filter(n => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  getUnread: (userId: string): Notification[] =>
    notificationsStorage.getByUser(userId).filter(n => !n.read),
  create: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>): Notification => {
    const notifications = notificationsStorage.getAll();
    const newNotification: Notification = {
      ...notification,
      id: generateId(),
      read: false,
      createdAt: new Date().toISOString(),
    };
    setItem(STORAGE_KEYS.NOTIFICATIONS, [...notifications, newNotification]);
    return newNotification;
  },
  markAsRead: (id: string): boolean => {
    const notifications = notificationsStorage.getAll();
    const index = notifications.findIndex(n => n.id === id);
    if (index === -1) return false;
    notifications[index].read = true;
    setItem(STORAGE_KEYS.NOTIFICATIONS, notifications);
    return true;
  },
  markAllAsRead: (userId: string): void => {
    const notifications = notificationsStorage.getAll();
    notifications.forEach(n => {
      if (n.userId === userId) n.read = true;
    });
    setItem(STORAGE_KEYS.NOTIFICATIONS, notifications);
  },
  delete: (id: string): boolean => {
    const notifications = notificationsStorage.getAll();
    const filtered = notifications.filter(n => n.id !== id);
    if (filtered.length === notifications.length) return false;
    setItem(STORAGE_KEYS.NOTIFICATIONS, filtered);
    return true;
  },
};

// Settings
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
  }),
  update: (data: Partial<ClinicSettings>): ClinicSettings => {
    const settings = settingsStorage.get();
    const updated = { ...settings, ...data };
    setItem(STORAGE_KEYS.SETTINGS, updated);
    return updated;
  },
};

// Current User Session
export const sessionStorage = {
  get: (): User | null => getItem(STORAGE_KEYS.CURRENT_USER, null),
  set: (user: User): void => setItem(STORAGE_KEYS.CURRENT_USER, user),
  clear: (): void => localStorage.removeItem(STORAGE_KEYS.CURRENT_USER),
};

// Initialize with seed data if empty
export function initializeSeedData(): void {
  // Check if already initialized
  if (usersStorage.getAll().length > 0) return;

  // Create default users
  const adminUser = usersStorage.create({
    email: 'admin@petpalsph.com',
    password: 'admin123',
    name: 'System Administrator',
    role: 'admin',
    phone: '+63 917 123 4567',
  });

  const vet1 = usersStorage.create({
    email: 'drcruz@petpalsph.com',
    password: 'vet123',
    name: 'Dr. Maria Cruz',
    role: 'veterinarian',
    phone: '+63 918 234 5678',
  });

  const vet2 = usersStorage.create({
    email: 'drsantos@petpalsph.com',
    password: 'vet123',
    name: 'Dr. Juan Santos',
    role: 'veterinarian',
    phone: '+63 919 345 6789',
  });

  const receptionist = usersStorage.create({
    email: 'reception@petpalsph.com',
    password: 'reception123',
    name: 'Ana Reyes',
    role: 'receptionist',
    phone: '+63 920 456 7890',
  });

  const owner1 = usersStorage.create({
    email: 'owner@petpalsph.com',
    password: 'owner123',
    name: 'Carlo Mendoza',
    role: 'owner',
    phone: '+63 921 567 8901',
    address: '456 Pet Lover Lane, Quezon City',
  });

  // Create sample pets
  const pet1 = petsStorage.create({
    ownerId: owner1.id,
    name: 'Bantay',
    species: 'dog',
    breed: 'Aspin',
    age: 3,
    sex: 'male',
    weight: 15,
    color: 'Brown',
    allergies: [],
    medicalNotes: 'Healthy and active',
  });

  const pet2 = petsStorage.create({
    ownerId: owner1.id,
    name: 'Mingming',
    species: 'cat',
    breed: 'Puspin',
    age: 2,
    sex: 'female',
    weight: 4,
    color: 'Orange tabby',
    allergies: ['Seafood'],
    medicalNotes: 'Indoor cat, very friendly',
  });

  // Create sample appointments
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  appointmentsStorage.create({
    petId: pet1.id,
    ownerId: owner1.id,
    veterinarianId: vet1.id,
    date: today,
    time: '10:00',
    reason: 'Annual checkup',
    status: 'approved',
  });

  appointmentsStorage.create({
    petId: pet2.id,
    ownerId: owner1.id,
    veterinarianId: vet2.id,
    date: tomorrow,
    time: '14:00',
    reason: 'Vaccination',
    status: 'pending',
  });

  // Create sample vaccination records
  vaccinationsStorage.create({
    petId: pet1.id,
    name: 'Rabies',
    dateAdministered: '2024-01-15',
    nextDueDate: '2025-01-15',
    administeredBy: vet1.id,
    notes: 'Annual rabies vaccination',
  });

  vaccinationsStorage.create({
    petId: pet1.id,
    name: '5-in-1 (DHPP)',
    dateAdministered: '2024-01-15',
    nextDueDate: '2025-01-15',
    administeredBy: vet1.id,
  });

  // Create sample medical record
  medicalRecordsStorage.create({
    petId: pet1.id,
    veterinarianId: vet1.id,
    date: '2024-06-15',
    diagnosis: 'Mild skin allergy',
    treatment: 'Prescribed antihistamines and medicated shampoo',
    prescription: 'Cetirizine 5mg once daily for 7 days',
    weight: 15,
    temperature: 38.5,
    notes: 'Follow up in 2 weeks if symptoms persist',
  });

  // Create welcome notification
  notificationsStorage.create({
    userId: owner1.id,
    title: 'Welcome to PetPals PH!',
    message: 'Thank you for registering. You can now book appointments for your pets.',
    type: 'system',
  });

  console.log('Seed data initialized successfully');
}
