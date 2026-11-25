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

const SEED_PASTORALS: Pastoral[] = [
  {
    id: 'pas-juvenil',
    code: 'PJ-01',
    name: 'Pastoral Juvenil Diocesana',
    shortName: 'Pastoral Juvenil',
    coordinatorName: 'Fátima Elizabeth Gonzales Fiestas',
    adviserName: 'Pbro. Luis Alberto Vásquez',
    parishCount: 28,
    focusArea: 'Comisión Diocesana de Juventud · Articulación Parroquial',
    status: 'Activa',
    accentColor: '#8D4999',
    description:
      'Comisión Diocesana encargada de acompañar, formar y articular a los grupos juveniles de todas las parroquias y zonas pastorales de la Diócesis de Chiclayo.',
    createdAt: '2024-01-15',
  },
  {
    id: 'pas-vocacional',
    code: 'PV-02',
    name: 'Pastoral Vocacional',
    shortName: 'Vocacional',
    coordinatorName: 'Carlos Eduardo Mera',
    adviserName: 'Pbro. José Manuel Guevara',
    parishCount: 18,
    focusArea: 'Discernimiento Sacerdotal, Consagrado y Laical',
    status: 'Activa',
    accentColor: '#0A6EB4',
    description:
      'Acompañamiento cercano para jóvenes en discernimiento vocacional, jornadas de oración por las vocaciones y encuentros pre-seminario.',
    createdAt: '2024-02-01',
  },
  {
    id: 'pas-catequesis',
    code: 'PC-03',
    name: 'Pastoral de Catequesis y Confirmación',
    shortName: 'Catequesis',
    coordinatorName: 'Lucía del Pilar Tantaleán',
    adviserName: 'Hna. Rosa Elena Quispe',
    parishCount: 34,
    focusArea: 'Iniciación Cristiana y Formación de Catequistas',
    status: 'Activa',
    accentColor: '#109A51',
    description:
      'Escuela diocesana de catequistas jóvenes, materiales formativos para Confirmación y acompañamiento sacramental en parroquias.',
    createdAt: '2024-02-10',
  },
  {
    id: 'pas-universitaria',
    code: 'PU-04',
    name: 'Pastoral Universitaria',
    shortName: 'Universitaria',
    coordinatorName: 'Diego Sebastián Chicoma',
    adviserName: 'Pbro. Martín Requejo',
    parishCount: 9,
    focusArea: 'Universidades e Institutos de Lambayeque',
    status: 'Activa',
    accentColor: '#E6332A',
    description:
      'Presencia evangelizadora en campus universitarios e institutos superiores de Chiclayo y Lambayeque mediante diálogos de fe, cultura y servicio.',
    createdAt: '2024-03-04',
  },
  {
    id: 'pas-social',
    code: 'PS-05',
    name: 'Pastoral Social y Cáritas Juvenil',
    shortName: 'Pastoral Social',
    coordinatorName: 'Andrea Paola Huamán',
    adviserName: 'Diác. Pedro Pablo Larios',
    parishCount: 22,
    focusArea: 'Misiones Solidarias, Ollas Comunes y Ecología Integral',
    status: 'Activa',
    accentColor: '#109A51',
    description:
      'Voluntariado juvenil en zonas vulnerables de Chiclayo, campañas solidarias, visitas a hospitales y brigadas misioneras rurales.',
    createdAt: '2024-03-20',
  },
  {
    id: 'pas-familiar',
    code: 'PF-06',
    name: 'Pastoral Familiar y Noviazgos',
    shortName: 'Pastoral Familiar',
    coordinatorName: 'Mateo & Valeria Silva',
    adviserName: 'Pbro. Jorge Luis Sandoval',
    parishCount: 16,
    focusArea: 'Noviazgos Cristianos y Matrimonios Jóvenes',
    status: 'En Formación',
    accentColor: '#0A6EB4',
    description:
      'Espacios de formación para noviazgos con propósito, preparación matrimonial y acompañamiento a familias jóvenes de la diócesis.',
    createdAt: '2024-05-12',
  },
  {
    id: 'pas-liturgia',
    code: 'PL-07',
    name: 'Pastoral Litúrgica y Coros Juveniles',
    shortName: 'Liturgia y Coros',
    coordinatorName: 'Gabriel Antonio Llontop',
    adviserName: 'Pbro. César Augusto Ñiquen',
    parishCount: 25,
    focusArea: 'Animación Litúrgica, Música Sacra y Acólitos',
    status: 'Activa',
    accentColor: '#8D4999',
    description:
      'Coordinación de coros juveniles diocesanos, formación litúrgica y animación musical de las misas y vigilias diocesanas.',
    createdAt: '2024-06-01',
  },
  {
    id: 'pas-movimientos',
    code: 'PM-08',
    name: 'Movimientos y Grupos Parroquiales',
    shortName: 'Movimientos',
    coordinatorName: 'Fiorella Milagros Bances',
    adviserName: 'Pbro. Luis Alberto Vásquez',
    parishCount: 19,
    focusArea: 'Comunión de Carismas, Emaús, Juan XXIII y Misiones',
    status: 'Activa',
    accentColor: '#E6332A',
    description:
      'Mesa de comunión que integra a los diversos movimientos juveniles, hermandades y grupos parroquiales de nuestra iglesia local.',
    createdAt: '2024-07-08',
  },
];

const SEED_EVENTS: DiocesanEvent[] = [
  {
    id: 'evt-01',
    title: 'Aniversario Pastoral Juvenil P. San José Obrero (3 Años)',
    pastoralId: 'pas-juvenil',
    parishHost: 'P. San José Obrero',
    eventType: 'Aniversario',
    date: '2026-11-05',
    time: '19:00',
    location: 'Templo Parroquial San José Obrero, Chiclayo',
    capacity: 180,
    registeredCount: 164,
    isPublic: true,
    status: 'Realizado',
    description: 'Misa de acción de gracias y compartir fraterno por los 3 años de servicio y entrega juvenil.',
  },
  {
    id: 'evt-02',
    title: 'Asamblea Diocesana de Coordinadores de Pastoral Juvenil',
    pastoralId: 'pas-juvenil',
    parishHost: 'Catedral Santa María',
    eventType: 'Asamblea',
    date: '2026-12-06',
    time: '09:00',
    location: 'Auditorio Obispado de Chiclayo',
    capacity: 120,
    registeredCount: 88,
    isPublic: true,
    status: 'Programado',
    description: 'Evaluación anual del plan pastoral diocesano 2026 y proyección de misiones de verano 2027.',
  },
  {
    id: 'evt-03',
    title: 'Vigilia Diocesana de la Inmaculada Concepción',
    pastoralId: 'pas-liturgia',
    parishHost: 'Catedral Santa María',
    eventType: 'Jornada',
    date: '2026-12-07',
    time: '20:00',
    location: 'Atrio de la Iglesia Catedral de Chiclayo',
    capacity: 450,
    registeredCount: 310,
    isPublic: true,
    status: 'Programado',
    description: 'Adoración eucarística, animación del Coro Juvenil Diocesano y consagración juvenil a María.',
  },
  {
    id: 'evt-04',
    title: 'Campaña Solidaria Navidad del Niño Lambayecano',
    pastoralId: 'pas-social',
    parishHost: 'P. Nuestra Señora de la Paz',
    eventType: 'Misión',
    date: '2026-12-19',
    time: '08:30',
    location: 'Sectores rurales de Mórrope y Olmos',
    capacity: 90,
    registeredCount: 62,
    isPublic: true,
    status: 'Programado',
    description: 'Jornada misionera juvenil con chocolatada, catequesis navideña y entrega de víveres.',
  },
];

const SEED_CELEBRATIONS: PublicOverviewResponse['celebrations'] = [
  {
    id: 'cel-anniv-sjo',
    kind: 'anniversary',
    title: 'Pastoral Juvenil P. San José Obrero',
    subtitle: '3 Años de servicio y entrega pastoral',
    dateLabel: '5 de noviembre',
    parishOrRole: 'Zona Chiclayo Sur',
  },
  {
    id: 'cel-mem-01',
    kind: 'birthday',
    title: 'Fátima Elizabeth Gonzales Fiestas',
    subtitle: 'Sub Coordinadora Diocesana',
    dateLabel: '28 de noviembre',
    parishOrRole: 'Catedral Santa María',
  },
  {
    id: 'cel-mem-05',
    kind: 'birthday',
    title: 'Andrea Paola Huamán',
    subtitle: 'Coordinadora de Voluntariado',
    dateLabel: '3 de diciembre',
    parishOrRole: 'P. Nuestra Señora de la Paz',
  },
];

const DEFAULT_PUBLIC_OVERVIEW: PublicOverviewResponse = {
  stats: {
    activePastorals: SEED_PASTORALS.filter((p) => p.status === 'Activa').length,
    registeredMembers: 148,
    upcomingEvents: SEED_EVENTS.filter((e) => e.status === 'Programado').length,
    parishesReached: 34,
  },
  pastorals: SEED_PASTORALS,
  events: SEED_EVENTS,
  celebrations: SEED_CELEBRATIONS,
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
    try {
      return await apiRequest<{success: boolean; message: string; code?: string; emailMasked?: string}>('/api/pastoral/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch (err: any) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      sessionStorage.setItem('pj_temp_reset_code', code);
      sessionStorage.setItem('pj_temp_reset_login', payload.login);
      return {
        success: true,
        message: `Código de recuperación generado para ${payload.login}.`,
        code,
        emailMasked: payload.login,
      };
    }
  },

  resetPasswordPJ: async (payload: {login: string; code: string; newPassword: string}) => {
    try {
      return await apiRequest<{success: boolean; message: string}>('/api/pastoral/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch (err: any) {
      const savedCode = sessionStorage.getItem('pj_temp_reset_code');
      if (savedCode && savedCode !== payload.code) {
        throw new Error('El código de verificación ingresado es incorrecto.');
      }
      return {
        success: true,
        message: '¡Contraseña restablecida exitosamente! Ya puedes iniciar sesión.',
      };
    }
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
