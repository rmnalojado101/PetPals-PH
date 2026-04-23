import type {
  User,
  Veterinarian,
  Pet,
  Appointment,
  AppointmentAvailability,
  MedicalRecord,
  Vaccination,
  Notification,
  ClinicSettings,
  VaccineInventory,
  PaginatedResponse,
  DashboardStats,
  AppointmentStats,
  SpeciesDistributionItem,
  VeterinarianActivityItem,
} from '@/types';

// Mock session hook header identifier
let sessionUser: User | null = null;
let backendUserId: string | null = null;

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
}

function toSnakeCase(str: string): string {
  return str.replace(/([A-Z])/g, (letter) => `_${letter.toLowerCase()}`);
}

function convertKeysToCamelCase(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(v => convertKeysToCamelCase(v));
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = toCamelCase(key);
      result[camelKey] = convertKeysToCamelCase((obj as Record<string, unknown>)[key]);
      return result;
    }, {} as Record<string, unknown>);
  }
  return obj;
}

function convertKeysToSnakeCase(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(v => convertKeysToSnakeCase(v));
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((result, key) => {
      const snakeKey = toSnakeCase(key);
      result[snakeKey] = convertKeysToSnakeCase((obj as Record<string, unknown>)[key]);
      return result;
    }, {} as Record<string, unknown>);
  }
  return obj;
}

function parseApiResponse<T>(json: unknown): T {
  const converted = convertKeysToCamelCase(json);

  if (
    converted &&
    typeof converted === 'object' &&
    'data' in converted &&
    Array.isArray((converted as Record<string, unknown>).data)
  ) {
    const paginated = converted as PaginatedResponse<unknown>;
    if (
      paginated.currentPage !== undefined ||
      paginated.lastPage !== undefined ||
      paginated.total !== undefined ||
      paginated.perPage !== undefined
    ) {
      return converted as T;
    }

    return paginated.data as T;
  }

  return converted as T;
}

function extractDataArray<T>(response: T[] | PaginatedResponse<T>): T[] {
  return Array.isArray(response) ? response : response.data ?? [];
}

type JsonRequestInit = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

// Standard API generic getter
async function fetchFromApi<T>(endpoint: string, options: JsonRequestInit = {}): Promise<T> {
  const token = localStorage.getItem('auth_token');
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  });

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (backendUserId && !endpoint.includes('/login') && !endpoint.includes('/register')) {
    headers.set('X-Mock-User-Id', backendUserId.toString());
  }

  const requestHeaders = new Headers(headers);
  if (options.headers) {
    new Headers(options.headers).forEach((value, key) => requestHeaders.set(key, value));
  }

  const requestOptions: RequestInit = { ...options, headers: requestHeaders, body: options.body as BodyInit | null | undefined };

  if (requestOptions.body && typeof requestOptions.body !== 'string') {
    requestOptions.body = JSON.stringify(convertKeysToSnakeCase(requestOptions.body));
  }

  const response = await fetch(`/api${endpoint}`, requestOptions);

  if (response.status === 401) {
    localStorage.removeItem('auth_token');
    window.location.href = '/auth';
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API Error: ${response.statusText}`);
  }

  const json = await response.json();
  return parseApiResponse<T>(json);
}

async function fetchBlobFromApi(endpoint: string): Promise<Blob> {
  const token = localStorage.getItem('auth_token');
  const headers = new Headers({
    'Accept': 'text/csv,application/octet-stream,*/*',
  });

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`/api${endpoint}`, {
    method: 'GET',
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem('auth_token');
    window.location.href = '/auth';
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API Error: ${response.statusText}`);
  }

  return response.blob();
}

export const api = {
  // Auth Handlers
  login: async (credentials: Record<string, string>) => {
    const data = await fetchFromApi<{user: User, token: string}>('/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
    localStorage.setItem('auth_token', data.token);
    return data;
  },
  register: async (data: Record<string, unknown>) => {
    const body = { ...data } as Record<string, unknown>;
    if (!body.passwordConfirmation && typeof body.password === 'string') {
      body.passwordConfirmation = body.password;
    }
    const responseData = await fetchFromApi<{user: User, token: string}>('/register', {
      method: 'POST',
      body
    });
    localStorage.setItem('auth_token', responseData.token);
    return responseData;
  },
  logout: async () => {
    await fetchFromApi('/logout', { method: 'POST' });
    localStorage.removeItem('auth_token');
  },
  getCurrentUser: () => fetchFromApi<User>('/user'),
  updateProfile: (data: Partial<User>) => fetchFromApi<{user: User}>('/profile', {
    method: 'PUT',
    body: data
  }),
  setSessionUser: (user: User | null, backendId?: string | number) => {
    sessionUser = user;
    backendUserId = backendId ? backendId.toString() : user?.id?.toString() ?? null;
  },
  getSessionUser: () => sessionUser,
  getBackendUserId: () => backendUserId,
  findUserByEmail: async (email: string) => {
    const users = await api.getUsers({ search: email, per_page: 100 });
    return extractDataArray(users).find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  // Users
  getUsers: (params: Record<string, string | number | undefined> = {}) => {
    const query = '?' + new URLSearchParams({ per_page: '100', ...params }).toString();
    return fetchFromApi<User[] | PaginatedResponse<User>>(`/users${query}`);
  },
  getUserById: (id: string | number) => fetchFromApi<User>(`/users/${id}`),
  createUser: (data: Record<string, unknown>) => fetchFromApi<User>('/users', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateUser: (id: string | number, data: Record<string, unknown>) => fetchFromApi<User>(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteUser: (id: string | number) => fetchFromApi<void>(`/users/${id}`, {
    method: 'DELETE'
  }),
  getOwners: () => fetchFromApi<User[]>('/owners'),
  getVeterinarians: () => fetchFromApi<Veterinarian[]>('/veterinarians'),
  createVeterinarian: (data: Record<string, unknown>) => fetchFromApi<Veterinarian>('/veterinarians', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateVeterinarian: (id: string | number, data: Record<string, unknown>) => fetchFromApi<Veterinarian>(`/veterinarians/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteVeterinarian: (id: string | number) => fetchFromApi<void>(`/veterinarians/${id}`, {
    method: 'DELETE'
  }),

  // Pets
  getPets: (params: Record<string, string | number | undefined> = {}) => {
    const query = '?' + new URLSearchParams({ per_page: '100', ...params }).toString();
    return fetchFromApi<Pet[] | PaginatedResponse<Pet>>(`/pets${query}`);
  },
  getPetById: (id: string | number) => fetchFromApi<Pet>(`/pets/${id}`),
  createPet: (data: Record<string, unknown>) => fetchFromApi<Pet>('/pets', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updatePet: (id: string | number, data: Record<string, unknown>) => fetchFromApi<Pet>(`/pets/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deletePet: (id: string | number) => fetchFromApi<void>(`/pets/${id}`, {
    method: 'DELETE'
  }),

  // Appointments
  getAppointments: (params: Record<string, string | number | undefined> = {}) => {
    const query = '?' + new URLSearchParams({ per_page: '100', ...params }).toString();
    return fetchFromApi<Appointment[] | PaginatedResponse<Appointment>>(`/appointments${query}`);
  },
  getAppointmentsToday: () => fetchFromApi<Appointment[] | PaginatedResponse<Appointment>>('/appointments-today'),
  getAppointmentsUpcoming: () => fetchFromApi<Appointment[] | PaginatedResponse<Appointment>>('/appointments-upcoming'),
  getAppointmentAvailability: (params: Record<string, string | number | undefined>) => {
    const query = '?' + new URLSearchParams(Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== undefined && value !== '')
        .map(([key, value]) => [key, String(value)])
    )).toString();
    return fetchFromApi<AppointmentAvailability[]>(`/appointments-availability${query}`);
  },
  createAppointment: (data: Record<string, unknown>) => fetchFromApi<Appointment>('/appointments', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateAppointment: (id: string | number, data: Record<string, unknown>) => fetchFromApi<Appointment>(`/appointments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteAppointment: (id: string | number) => fetchFromApi<void>(`/appointments/${id}`, {
    method: 'DELETE'
  }),

  // Medical Records
  getMedicalRecords: (params: Record<string, string | number | undefined> = {}) => {
    const query = '?' + new URLSearchParams({ per_page: '100', ...params }).toString();
    return fetchFromApi<MedicalRecord[] | PaginatedResponse<MedicalRecord>>(`/medical-records${query}`);
  },
  getPetHistory: (petId: string | number) => fetchFromApi<MedicalRecord[]>(`/pets/${petId}/medical-history`),
  createMedicalRecord: (data: Record<string, unknown>) => fetchFromApi<MedicalRecord>('/medical-records', {
    method: 'POST',
    body: data
  }),
  updateMedicalRecord: (id: string | number, data: Record<string, unknown>) => fetchFromApi<MedicalRecord>(`/medical-records/${id}`, {
    method: 'PUT',
    body: data
  }),
  deleteMedicalRecord: (id: string | number) => fetchFromApi<void>(`/medical-records/${id}`, {
    method: 'DELETE'
  }),

  // Dashboard & Reports
  getDashboardData: () => fetchFromApi<DashboardStats>('/reports/dashboard'),
  getAppointmentStats: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchFromApi<AppointmentStats>(`/reports/appointments${query}`);
  },
  getSpeciesDistribution: () => fetchFromApi<SpeciesDistributionItem[]>('/reports/species'),
  getVeterinarianActivity: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchFromApi<VeterinarianActivityItem[]>(`/reports/veterinarians${query}`);
  },
  exportAppointmentsCsv: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchBlobFromApi(`/reports/export/appointments${query}`);
  },

  // Auth & Profile
  changePassword: (data: Record<string, string>) => fetchFromApi<{message: string}>('/password', {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  // Settings
  getSettings: () => fetchFromApi<ClinicSettings>('/settings'),
  updateSettings: (data: Partial<ClinicSettings>) => fetchFromApi<ClinicSettings>('/settings', {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  // Vaccinations
  getVaccinations: (params: Record<string, string | number | undefined> = {}) => {
    const query = '?' + new URLSearchParams({ per_page: '100', ...params }).toString();
    return fetchFromApi<Vaccination[] | PaginatedResponse<Vaccination>>(`/vaccinations${query}`);
  },
  getVaccinationsDueSoon: () => fetchFromApi<Vaccination[]>('/vaccinations-due-soon'),
  getVaccinationsOverdue: () => fetchFromApi<Vaccination[]>('/vaccinations-overdue'),
  createVaccination: (data: Record<string, unknown>) => fetchFromApi<Vaccination>('/vaccinations', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateVaccination: (id: string | number, data: Record<string, unknown>) => fetchFromApi<Vaccination>(`/vaccinations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteVaccination: (id: string | number) => fetchFromApi<void>(`/vaccinations/${id}`, {
    method: 'DELETE'
  }),

  // Vaccine Inventory
  getInventory: () => fetchFromApi<VaccineInventory[]>('/inventory'),
  createInventory: (data: Record<string, unknown>) => fetchFromApi<VaccineInventory>('/inventory', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  upsertInventory: (name: string, delta: number) => fetchFromApi<VaccineInventory>('/inventory/upsert', {
    method: 'POST',
    body: JSON.stringify({ name, stock_delta: delta })
  }),
  updateInventory: (id: string | number, data: Record<string, unknown>) => fetchFromApi<VaccineInventory>(`/inventory/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  // Notifications
  getNotifications: () => fetchFromApi<Notification[] | PaginatedResponse<Notification>>('/notifications'),
  getUnreadNotificationsCount: () => fetchFromApi<{count: number}>('/notifications/unread-count'),
  markNotificationAsRead: (id: string | number) => fetchFromApi<Notification>(`/notifications/${id}/read`, {
    method: 'PUT'
  }),
  markAllNotificationsAsRead: () => fetchFromApi<void>('/notifications/read-all', {
    method: 'PUT'
  }),
  deleteNotification: (id: string | number) => fetchFromApi<void>(`/notifications/${id}`, {
    method: 'DELETE'
  }),
};
