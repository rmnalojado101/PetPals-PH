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
  Billing,
} from '@/types';

// Session state (in-memory only)
let sessionUser: User | null = null;
let backendUserId: string | null = null;

// Clear auth session (called on logout or 401)
export function clearAuthSession(): void {
  sessionUser = null;
  backendUserId = null;
}

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

function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return undefined;
}

// Standard API generic getter - uses httpOnly cookies for authentication
async function fetchFromApi<T>(endpoint: string, options: JsonRequestInit = {}): Promise<T> {
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  });

  const requestHeaders = new Headers(headers);
  if (options.headers) {
    new Headers(options.headers).forEach((value, key) => requestHeaders.set(key, value));
  }

  // CSRF protection for non-GET requests (Sanctum)
  const method = (options.method || 'GET').toUpperCase();
  if (method !== 'GET') {
    let xsrfToken = getCookie('XSRF-TOKEN');
    
    // If token is missing, try to fetch it from Sanctum
    if (!xsrfToken) {
      try {
        await fetch('/sanctum/csrf-cookie', { credentials: 'include' });
        xsrfToken = getCookie('XSRF-TOKEN');
      } catch (e) {
        console.error('Failed to fetch CSRF cookie', e);
      }
    }

    if (xsrfToken) {
      requestHeaders.set('X-XSRF-TOKEN', decodeURIComponent(xsrfToken));
    }
  }

  const requestOptions: RequestInit = { 
    ...options, 
    headers: requestHeaders, 
    body: options.body as BodyInit | null | undefined,
    credentials: 'include', // Include httpOnly cookies
  };

  if (requestOptions.body instanceof FormData) {
    requestHeaders.delete('Content-Type');
  } else if (requestOptions.body && typeof requestOptions.body !== 'string') {
    requestOptions.body = JSON.stringify(convertKeysToSnakeCase(requestOptions.body));
  }

  const response = await fetch(`/api${endpoint}`, requestOptions);

  if (response.status === 401) {
    // Cookies will be cleared by backend; let the UI handle redirection
    throw new Error(`Unauthorized (401)`);
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API Error (${response.status}): ${response.statusText}`);
  }

  // Handle 204 No Content responses
  if (response.status === 204) {
    return undefined as T;
  }

  const json = await response.json();
  return parseApiResponse<T>(json);
}

async function fetchBlobFromApi(endpoint: string): Promise<Blob> {
  const headers = new Headers({
    'Accept': 'text/csv,application/octet-stream,*/*',
  });

  if (backendUserId) {
    headers.set('X-Mock-User-Id', backendUserId.toString());
  }

  const response = await fetch(`/api${endpoint}`, {
    method: 'GET',
    headers,
    credentials: 'include', // Include httpOnly cookies
  });

  if (response.status === 401) {
    window.location.href = '/auth';
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API Error: ${response.statusText}`);
  }

  return response.blob();
}

export interface JsonRequestInit extends Omit<RequestInit, 'body'> {
  body?: any;
}

export const api = {
  // Auth Handlers
  login: async (credentials: Record<string, string>) => {
    const data = await fetchFromApi<{user: User, token: string}>('/login', {
      method: 'POST',
      body: credentials
    });
    // Token is now stored in httpOnly cookie automatically by backend
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
    // Token is now stored in httpOnly cookie automatically by backend
    return responseData;
  },
  logout: async () => {
    await fetchFromApi('/logout', { method: 'POST' });
    // Token/cookies will be cleared by backend
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
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    );
    const query = '?' + new URLSearchParams({ per_page: '100', ...cleanParams }).toString();
    return fetchFromApi<User[] | PaginatedResponse<User>>(`/users${query}`);
  },
  getUserById: (id: string | number) => fetchFromApi<User>(`/users/${id}`),
  createUser: (data: Record<string, unknown>) => fetchFromApi<User>('/users', {
    method: 'POST',
    body: data
  }),
  updateUser: (id: string | number, data: Record<string, unknown>) => fetchFromApi<User>(`/users/${id}`, {
    method: 'PUT',
    body: data
  }),
  deleteUser: (id: string | number) => fetchFromApi<void>(`/users/${id}`, {
    method: 'DELETE'
  }),
  getOwners: () => fetchFromApi<User[] | PaginatedResponse<User>>('/owners'),
  getVeterinarians: () => fetchFromApi<Veterinarian[] | PaginatedResponse<Veterinarian>>('/veterinarians'),
  createVeterinarian: (data: Record<string, unknown>) => fetchFromApi<Veterinarian>('/veterinarians', {
    method: 'POST',
    body: data
  }),
  updateVeterinarian: (id: string | number, data: Record<string, unknown>) => fetchFromApi<Veterinarian>(`/veterinarians/${id}`, {
    method: 'PUT',
    body: data
  }),
  deleteVeterinarian: (id: string | number) => fetchFromApi<void>(`/veterinarians/${id}`, {
    method: 'DELETE'
  }),

  // Pets
  getPets: (params: Record<string, string | number | undefined> = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    );
    const query = '?' + new URLSearchParams({ per_page: '100', ...cleanParams }).toString();
    return fetchFromApi<Pet[] | PaginatedResponse<Pet>>(`/pets${query}`);
  },
  getPetById: (id: string | number) => fetchFromApi<Pet>(`/pets/${id}`),
  createPet: (data: Record<string, unknown>) => fetchFromApi<Pet>('/pets', {
    method: 'POST',
    body: data
  }),
  updatePet: (id: string | number, data: Record<string, unknown>) => fetchFromApi<Pet>(`/pets/${id}`, {
    method: 'PUT',
    body: data
  }),
  deletePet: (id: string | number) => fetchFromApi<void>(`/pets/${id}`, {
    method: 'DELETE'
  }),

  // Appointments
  getAppointments: (params: Record<string, string | number | undefined> = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    );
    const query = '?' + new URLSearchParams({ per_page: '100', ...cleanParams }).toString();
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
    body: data
  }),
  updateAppointment: (id: string | number, data: Record<string, unknown>) => fetchFromApi<Appointment>(`/appointments/${id}`, {
    method: 'PUT',
    body: data
  }),
  deleteAppointment: (id: string | number) => fetchFromApi<void>(`/appointments/${id}`, {
    method: 'DELETE'
  }),

  // Medical Records
  getMedicalRecords: (params: Record<string, string | number | undefined> = {}) => {
    const filteredParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== '')
    );
    const query = '?' + new URLSearchParams({ per_page: '100', ...filteredParams }).toString();
    return fetchFromApi<MedicalRecord[] | PaginatedResponse<MedicalRecord>>(`/medical-records${query}`);
  },
  getPetHistory: (petId: string | number, params: Record<string, string | number | undefined> = {}) => {
    const query = Object.keys(params).length > 0 ? '?' + new URLSearchParams(Object.entries(params).filter(([_, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString() : '';
    return fetchFromApi<MedicalRecord[] | PaginatedResponse<MedicalRecord>>(`/pets/${petId}/medical-history${query}`);
  },
  createMedicalRecord: (data: Record<string, unknown> | FormData) => fetchFromApi<MedicalRecord>('/medical-records', {
    method: 'POST',
    body: data
  }),
  updateMedicalRecord: (id: string | number, data: Record<string, unknown> | FormData) => fetchFromApi<MedicalRecord>(`/medical-records/${id}`, {
    method: 'POST', // Laravel uses POST with _method=PUT for FormData
    body: data instanceof FormData ? (() => { data.append('_method', 'PUT'); return data; })() : { ...data, _method: 'PUT' }
  }),
  deleteMedicalRecord: (id: string | number) => fetchFromApi<void>(`/medical-records/${id}`, {
    method: 'DELETE'
  }),
  downloadMedicalRecordPdf: (id: string | number) => fetchBlobFromApi(`/medical-records/${id}/pdf`),
  downloadMedicalRecordAttachment: (id: string | number) => fetchBlobFromApi(`/medical-records/${id}/download-attachment`),

  // Dashboard & Reports
  getDashboardData: () => fetchFromApi<DashboardStats>('/reports/dashboard'),
  getReportSummary: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchFromApi<any>(`/reports/summary${query}`);
  },
  getAppointmentStats: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchFromApi<AppointmentStats>(`/reports/appointments${query}`);
  },
  getSpeciesDistribution: () => fetchFromApi<SpeciesDistributionItem[]>('/reports/species'),
  getVeterinarianActivity: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchFromApi<VeterinarianActivityItem[]>(`/reports/veterinarians${query}`);
  },
  getBillingStats: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchFromApi<any>(`/reports/billings${query}`);
  },
  getVaccinationStats: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchFromApi<any>(`/reports/vaccinations${query}`);
  },
  getMedicalRecordStats: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchFromApi<any>(`/reports/medical-records${query}`);
  },
  getGlobalActivity: (limit: number = 50) => fetchFromApi<any[]>(`/reports/activity?limit=${limit}`),
  exportAppointmentsCsv: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchBlobFromApi(`/reports/export/appointments${query}`);
  },

  // Auth & Profile
  changePassword: (data: Record<string, string>) => fetchFromApi<{message: string}>('/password', {
    method: 'PUT',
    body: data
  }),

  // Settings
  getSettings: () => fetchFromApi<ClinicSettings>('/settings'),
  getClinicSettings: (clinicId: string | number) => fetchFromApi<ClinicSettings>(`/clinics/${clinicId}/settings`),
  updateSettings: (data: Partial<ClinicSettings>) => fetchFromApi<ClinicSettings>('/settings', {
    method: 'PUT',
    body: data
  }),
  addPaymentMethod: (data: FormData) => fetchFromApi<ClinicSettings>('/settings/payment-methods', {
    method: 'POST',
    body: data
  }),
  deletePaymentMethod: (id: string | number) => fetchFromApi<ClinicSettings>(`/settings/payment-methods/${id}`, {
    method: 'DELETE'
  }),

  // Vaccinations
  getVaccinations: (params: Record<string, string | number | undefined> = {}) => {
    const filteredParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== '')
    );
    const query = '?' + new URLSearchParams({ per_page: '100', ...filteredParams }).toString();
    return fetchFromApi<Vaccination[] | PaginatedResponse<Vaccination>>(`/vaccinations${query}`);
  },
  getVaccinationsDueSoon: () => fetchFromApi<Vaccination[] | PaginatedResponse<Vaccination>>('/vaccinations-due-soon'),
  getVaccinationsOverdue: () => fetchFromApi<Vaccination[] | PaginatedResponse<Vaccination>>('/vaccinations-overdue'),
  createVaccination: (data: Record<string, unknown>) => fetchFromApi<Vaccination>('/vaccinations', {
    method: 'POST',
    body: data
  }),
  updateVaccination: (id: string | number, data: Record<string, unknown>) => fetchFromApi<Vaccination>(`/vaccinations/${id}`, {
    method: 'PUT',
    body: data
  }),
  deleteVaccination: (id: string | number) => fetchFromApi<void>(`/vaccinations/${id}`, {
    method: 'DELETE'
  }),

  // Vaccine Inventory
  getInventory: () => fetchFromApi<VaccineInventory[] | PaginatedResponse<VaccineInventory>>('/inventory'),
  createInventory: (data: Record<string, unknown>) => fetchFromApi<VaccineInventory>('/inventory', {
    method: 'POST',
    body: data
  }),
  upsertInventory: (name: string, delta: number) => fetchFromApi<VaccineInventory>('/inventory/upsert', {
    method: 'POST',
    body: { name, stock_delta: delta }
  }),
  updateInventory: (id: string | number, data: Record<string, unknown>) => fetchFromApi<VaccineInventory>(`/inventory/${id}`, {
    method: 'PUT',
    body: data
  }),
  deleteInventory: (id: string | number) => fetchFromApi<void>(`/inventory/${id}`, {
    method: 'DELETE'
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
  
  // Billings
  getBillings: (params: Record<string, string | number | undefined> = {}) => {
    const filteredParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== '')
    );
    const query = '?' + new URLSearchParams({ per_page: '100', ...filteredParams }).toString();
    return fetchFromApi<Billing[] | PaginatedResponse<Billing>>(`/billings${query}`);
  },
  getBillingById: (id: string | number) => fetchFromApi<Billing>(`/billings/${id}`),
  createBilling: (data: Record<string, unknown>) => fetchFromApi<Billing>('/billings', {
    method: 'POST',
    body: data
  }),
  updateBilling: (id: string | number, data: any) => {
    if (data instanceof FormData) {
      data.append('_method', 'PUT');
      return fetchFromApi<Billing>(`/billings/${id}`, {
        method: 'POST',
        body: data
      });
    }
    return fetchFromApi<Billing>(`/billings/${id}`, {
      method: 'PUT',
      body: data
    });
  },
  deleteBilling: (id: string | number) => fetchFromApi<void>(`/billings/${id}`, {
    method: 'DELETE'
  }),
  downloadBillingProof: (id: string | number) => fetchBlobFromApi(`/billings/${id}/download-proof`),
};
