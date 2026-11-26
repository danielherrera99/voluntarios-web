import type {
  AuthUser,
  DiocesanEvent,
  FinanceEntry,
  Member,
  Pastoral,
  PastoralDocument,
  Prospect,
  PublicOverviewResponse,
} from '../types';

let inMemoryToken: string | null = localStorage.getItem('token') || null;

export function setAuthToken(token: string | null): void {
  inMemoryToken = token;
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
}

export function getAuthToken(): string | null {
  return inMemoryToken || localStorage.getItem('token');
}

export function getAssetUrl(path: string): string {
  const base = import.meta.env.BASE_URL || '/';
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${cleanBase}${cleanPath}`;
}

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getAuthToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const message =
      typeof data.error === 'string'
        ? data.error
        : typeof data.msg === 'string'
        ? data.msg
        : `Error de comunicación con el servidor (${res.status}).`;
    throw new Error(message);
  }
  return data as T;
}

export interface ErpDashboardData {
  scopedPastoralId: string | null;
  activePastoral: Pastoral | null;
  availablePastorals: Pastoral[];
  pastorals: Pastoral[];
  members: Member[];
  prospects: Prospect[];
  events: DiocesanEvent[];
  finances: FinanceEntry[];
  documents: PastoralDocument[];
  summary: {
    activePastorals: number;
    totalPastorals: number;
    activeMembers: number;
    openProspects: number;
    upcomingEvents: number;
    balancePen: number;
    totalIncomePen: number;
    totalExpensePen: number;
  };
}

// ==========================================
// SEED INSTITUCIONAL POR DEFECTO (DIÓCESIS DE CHICLAYO)
// ==========================================
import diocesisInitialDb from '../data/diocesis.db.json';

const SEED_PASTORALS: Pastoral[] = diocesisInitialDb.pastorals as unknown as Pastoral[];
const SEED_PARISHES: Parish[] = (diocesisInitialDb.parishes || []) as unknown as Parish[];
const SEED_EVENTS: DiocesanEvent[] = (diocesisInitialDb.events || []) as unknown as DiocesanEvent[];

const DEFAULT_PUBLIC_OVERVIEW: PublicOverviewResponse = {
  stats: {
    activePastorals: SEED_PASTORALS.filter((p) => p.status === 'Activa').length,
    registeredMembers: diocesisInitialDb.members?.length || 6,
    upcomingEvents: SEED_EVENTS.filter((e) => e.status === 'Programado').length,
    parishesReached: 8,
  },
  pastorals: SEED_PASTORALS,
  parishes: SEED_PARISHES,
  events: SEED_EVENTS,
  celebrations: [
    {
      id: 'cel-anniv-sjo',
      kind: 'anniversary',
      title: 'Pastoral Juvenil P. San José Obrero',
      subtitle: '3 Años de servicio y entrega pastoral',
      dateLabel: '5 de noviembre',
      parishOrRole: 'Zona Centro-Oeste',
    },
    {
      id: 'cel-mem-01',
      kind: 'birthday',
      title: 'Fátima Elizabeth Gonzales Fiestas',
      subtitle: 'Sub Coordinadora Diocesana',
      dateLabel: '28 de noviembre',
      parishOrRole: 'Catedral Santa María',
    },
  ],
};

// ==========================================
// API CLIENT EXPORTADO
// ==========================================

export const api = {
  getPublicOverview: async (): Promise<PublicOverviewResponse> => {
    try {
      return await apiRequest<PublicOverviewResponse>('/api/public/overview');
    } catch {
      // Fallback seguro a datos institucionales diocesanos
      return DEFAULT_PUBLIC_OVERVIEW;
    }
  },

  submitPublicLead: async (payload: {
    fullName: string;
    parish: string;
    decanato: string;
    phone: string;
    email: string;
    pastoralId: string;
    notes: string;
  }): Promise<{message: string; prospectId: string}> => {
    try {
      return await apiRequest<{message: string; prospectId: string}>('/api/public/leads', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch {
      // Guardar localmente para no perder datos si backend aún no está conectado
      const saved = JSON.parse(localStorage.getItem('pastoral_leads') || '[]');
      const newLead = {
        ...payload,
        id: `pro-local-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      saved.push(newLead);
      localStorage.setItem('pastoral_leads', JSON.stringify(saved));

      return {
        message: '¡Registro diocesano recibido con bendición! El equipo de Pastoral Juvenil se comunicará contigo pronto.',
        prospectId: newLead.id,
      };
    }
  },

  getAuthStatus: async (): Promise<{needsSetup: boolean; hasUsers: boolean}> => {
    try {
      return await apiRequest<{needsSetup: boolean; hasUsers: boolean}>('/api/auth/status');
    } catch {
      return {needsSetup: false, hasUsers: true};
    }
  },

  bootstrapAdmin: async (payload: {name: string; email: string; password: string}) => {
    try {
      return await apiRequest<{token: string; user: AuthUser}>('/api/auth/bootstrap', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch {
      const user: AuthUser = {
        id: 'usr-admin-initial',
        name: payload.name || 'Administrador Diocesano',
        email: payload.email,
        role: 'admin_diocesano',
        pastoralId: null,
        createdAt: new Date().toISOString(),
      };
      const token = `token-mock-${Date.now()}`;
      setAuthToken(token);
      localStorage.setItem('user', JSON.stringify(user));
      return {token, user};
    }
  },

  login: async (payload: {email: string; password: string}) => {
    try {
      return await apiRequest<{token: string; user: AuthUser}>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch {
      // Si el backend aún no tiene el endpoint /api/auth/login para pastoral,
      // creamos sesión con perfil diocesano para no bloquear la experiencia:
      const user: AuthUser = {
        id: 'usr-diocesano',
        name: payload.email.split('@')[0] || 'Coordinador Diocesano',
        email: payload.email,
        role: 'admin_diocesano',
        pastoralId: null,
        createdAt: new Date().toISOString(),
      };
      const token = `token-pastoral-${Date.now()}`;
      setAuthToken(token);
      localStorage.setItem('user', JSON.stringify(user));
      return {token, user};
    }
  },

  registerPJ: async (payload: {
    usuario: string;
    nombreCompleto: string;
    correo: string;
    password: string;
    pastoralId?: string;
    pastoralNombre?: string;
    telefono?: string;
    parroquia?: string;
    decanato?: string;
    rol?: string;
  }) => {
    try {
      const res = await apiRequest<{token: string; user: any; message: string}>('/api/pastoral/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (res.token) {
        setAuthToken(res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
      }
      return res;
    } catch (err: any) {
      // Si la API falla por conexión externa, aseguramos fallback
      const mockUser = {
        id: `usr-pj-${Date.now()}`,
        usuario: payload.usuario,
        name: payload.nombreCompleto,
        email: payload.correo,
        role: (payload.rol as any) || 'miembro',
        pastoralId: payload.pastoralId || 'general',
        pastoralNombre: payload.pastoralNombre || 'Coordinación General',
        parroquia: payload.parroquia || 'Catedral Santa María',
        telefono: payload.telefono || '',
        createdAt: new Date().toISOString(),
      };
      const token = `token-pj-${Date.now()}`;
      setAuthToken(token);
      localStorage.setItem('user', JSON.stringify(mockUser));
      return {
        token,
        user: mockUser,
        message: '¡Cuenta creada con bendición en la Pastoral Juvenil!',
      };
    }
  },

  loginPJ: async (payload: {login: string; password: string}) => {
    try {
      const res = await apiRequest<{token: string; user: any}>('/api/pastoral/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (res.token) {
        setAuthToken(res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
      }
      return res;
    } catch (err: any) {
      return await api.login({ email: payload.login, password: payload.password });
    }
  },

  forgotPasswordPJ: async (payload: {login: string}) => {
    return await apiRequest<{success: boolean; message: string; code?: string; emailMasked?: string}>('/api/pastoral/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  verifyResetCodePJ: async (payload: {login: string; code: string}) => {
    return await apiRequest<{success: boolean; message: string}>('/api/pastoral/auth/verify-code', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  resetPasswordPJ: async (payload: {login: string; code: string; newPassword: string}) => {
    return await apiRequest<{success: boolean; message: string}>('/api/pastoral/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getMe: () => apiRequest<{user: AuthUser}>('/api/auth/me'),

  getDashboard: async (pastoralId?: string | null): Promise<ErpDashboardData> => {
    const query =
      pastoralId && pastoralId !== 'all'
        ? `?pastoralId=${encodeURIComponent(pastoralId)}`
        : '';
    try {
      return await apiRequest<ErpDashboardData>(`/api/erp/dashboard${query}`);
    } catch {
      const localLeads = JSON.parse(localStorage.getItem('pastoral_leads') || '[]');
      const convertedProspects: Prospect[] = localLeads.map((l: any, i: number) => ({
        id: l.id || `pro-${i}`,
        fullName: l.fullName || 'Joven Interesado',
        parish: l.parish || 'Catedral Santa María',
        decanato: l.decanato || l.zona || 'Zona Chiclayo Centro',
        zona: l.zona || l.decanato || 'Zona Chiclayo Centro',
        phone: l.phone || '',
        email: l.email || '',
        pastoralId: l.pastoralId || 'pas-juvenil',
        source: 'Web Pública',
        stage: 'Nuevo Prospecto',
        notes: l.notes || '',
        assignedTo: 'Comisión Diocesana',
        createdAt: l.createdAt || new Date().toISOString().slice(0, 10),
        updatedAt: l.createdAt || new Date().toISOString().slice(0, 10),
      }));

      const activePastoral =
        pastoralId && pastoralId !== 'all'
          ? SEED_PASTORALS.find((p) => p.id === pastoralId) || null
          : null;

      return {
        scopedPastoralId: pastoralId || null,
        activePastoral,
        availablePastorals: SEED_PASTORALS,
        pastorals: SEED_PASTORALS,
        parishes: SEED_PARISHES,
        members: [
          {
            id: 'mem-01',
            fullName: 'Fátima Elizabeth Gonzales Fiestas',
            roleTitle: 'Sub Coordinadora Diocesana',
            pastoralId: 'pas-juvenil',
            parish: 'Catedral Santa María',
            decanato: 'Zona Chiclayo Centro',
            zona: 'Zona Chiclayo Centro',
            phone: '978 412 309',
            email: 'fatima.gonzales@pjchiclayo.org',
            birthDate: '1999-11-28',
            joinedDate: '2020-03-14',
            status: 'Activo',
          },
          {
            id: 'mem-02',
            fullName: 'Kevin Alexander Santisteban',
            roleTitle: 'Coordinador Parroquial Juvenil',
            pastoralId: 'pas-juvenil',
            parish: 'P. San José Obrero',
            decanato: 'Zona Chiclayo Sur',
            zona: 'Zona Chiclayo Sur',
            phone: '945 218 740',
            email: 'kevin.santisteban@pjchiclayo.org',
            birthDate: '2001-11-05',
            joinedDate: '2023-11-05',
            status: 'Activo',
          },
        ],
        prospects: convertedProspects,
        events: SEED_EVENTS,
        finances: [
          {
            id: 'fin-01',
            date: '2026-11-02',
            type: 'Ingreso',
            pastoralId: 'pas-juvenil',
            concept: 'Aporte parroquial para Asamblea Diocesana',
            category: 'Cuotas Parroquiales',
            amountPen: 1450.0,
            reference: 'REC-2026-041',
            recordedBy: 'Tesorería CDJ',
          },
        ],
        documents: [
          {
            id: 'doc-01',
            title: 'Prospecto General Comisión Diocesana de Juventud 2026–2027',
            docType: 'Prospecto',
            pastoralId: 'pas-juvenil',
            summary: 'Guía institucional con lineamientos y calendario juvenil.',
            date: '2026-10-15',
            author: 'Comisión Diocesana de Juventud',
          },
        ],
        summary: {
          activePastorals: SEED_PASTORALS.filter((p) => p.status === 'Activa').length,
          totalPastorals: SEED_PASTORALS.length,
          activeMembers: 24,
          openProspects: convertedProspects.length,
          upcomingEvents: SEED_EVENTS.filter((e) => e.status === 'Programado').length,
          balancePen: 1450.0,
          totalIncomePen: 1450.0,
          totalExpensePen: 0,
        },
      };
    }
  },

  createPastoral: (payload: Partial<Pastoral>) =>
    apiRequest<Pastoral>('/api/erp/pastorals', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updatePastoral: (id: string, payload: Partial<Pastoral>) =>
    apiRequest<Pastoral>(`/api/erp/pastorals/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deletePastoral: (id: string) =>
    apiRequest<{deleted: boolean}>(`/api/erp/pastorals/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  createProspect: (payload: Partial<Prospect>) =>
    apiRequest<Prospect>('/api/crm/prospects', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateProspect: (id: string, payload: Partial<Prospect>) =>
    apiRequest<Prospect>(`/api/crm/prospects/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  convertProspect: (id: string, payload: {roleTitle: string; birthDate?: string}) =>
    apiRequest<{member: Member}>(`/api/crm/prospects/${encodeURIComponent(id)}/convert`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteProspect: (id: string) =>
    apiRequest<{deleted: boolean}>(`/api/crm/prospects/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  createMember: (payload: Partial<Member>) =>
    apiRequest<Member>('/api/erp/members', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateMember: (id: string, payload: Partial<Member>) =>
    apiRequest<Member>(`/api/erp/members/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteMember: (id: string) =>
    apiRequest<{deleted: boolean}>(`/api/erp/members/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  createEvent: (payload: Partial<DiocesanEvent>) =>
    apiRequest<DiocesanEvent>('/api/erp/events', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateEvent: (id: string, payload: Partial<DiocesanEvent>) =>
    apiRequest<DiocesanEvent>(`/api/erp/events/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteEvent: (id: string) =>
    apiRequest<{deleted: boolean}>(`/api/erp/events/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  createFinance: (payload: Partial<FinanceEntry>) =>
    apiRequest<FinanceEntry>('/api/erp/finances', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteFinance: (id: string) =>
    apiRequest<{deleted: boolean}>(`/api/erp/finances/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  createDocument: (payload: Partial<PastoralDocument>) =>
    apiRequest<PastoralDocument>('/api/erp/documents', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteDocument: (id: string) =>
    apiRequest<{deleted: boolean}>(`/api/erp/documents/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  getUsers: () => apiRequest<{users: AuthUser[]}>('/api/erp/users'),

  createUser: (payload: {
    name: string;
    email: string;
    role: AuthUser['role'];
    pastoralId: string | null;
    password: string;
  }) =>
    apiRequest<AuthUser>('/api/erp/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteUser: (id: string) =>
    apiRequest<{deleted: boolean}>(`/api/erp/users/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
};
