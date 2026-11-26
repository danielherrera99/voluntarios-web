export type UserRole =
  | 'admin_diocesano'
  | 'coordinador_pastoral'
  | 'secretario_tesorero'
  | 'miembro';

export type PastoralStatus = 'Activa' | 'En Formación' | 'Pausa';

export type ProspectStage =
  | 'Nuevo Prospecto'
  | 'Contactado'
  | 'En Acogida'
  | 'Integrado a Parroquia'
  | 'Archivado';

export type MemberStatus = 'Activo' | 'En Formación' | 'Inactivo';

export type EventStatus = 'Programado' | 'En Curso' | 'Realizado' | 'Cancelado';

export type FinanceType = 'Ingreso' | 'Egreso';

export interface AuthUser {
  id: string;
  name: string;
  username?: string;
  email: string;
  phone?: string;
  parishOrigin?: string;
  parroquia?: string;
  pastoralNombre?: string;
  telefono?: string;
  estado?: string;
  role: UserRole;
  pastoralId: string | null;
  createdAt?: string;
}

export type CommunityKind =
  | 'Pastoral Parroquial'
  | 'Movimiento'
  | 'Pastoral Especializada'
  | 'Pastoral Universitaria';

export interface Parish {
  id: string;
  name: string;
  locality: string;
  zonaArciprestal: string;
  pastorName: string;
}

export interface Pastoral {
  id: string;
  code: string;
  name: string;
  shortName: string;
  zonaArciprestal: string;
  communityKind?: CommunityKind;
  parishId?: string | null;
  coordinatorName: string;
  adviserName: string;
  parishCount: number;
  focusArea: string;
  status: PastoralStatus;
  accentColor: string;
  description: string;
  createdAt: string;
}

export const ZONAS_ARCIPRESTALES = [
  'Centro-Este',
  'Centro-Oeste',
  'Norte',
  'Litoral',
  'Este',
  'Sierra',
  'Movimientos',
  'Pastoral Universitaria',
] as const;

export const ZONAS_PARROQUIALES = [
  'Centro-Este',
  'Centro-Oeste',
  'Norte',
  'Litoral',
  'Este',
  'Sierra',
] as const;

export interface Member {
  id: string;
  fullName: string;
  roleTitle: string;
  pastoralId: string;
  parish: string;
  zonaArciprestal: string;
  decanato?: string;
  zona?: string;
  phone: string;
  email: string;
  birthDate: string; // YYYY-MM-DD
  joinedDate: string; // YYYY-MM-DD
  status: MemberStatus;
}

export interface Prospect {
  id: string;
  fullName: string;
  parish: string;
  zonaArciprestal: string;
  decanato?: string;
  zona?: string;
  phone: string;
  email: string;
  pastoralId: string;
  source: 'Web Pública' | 'Parroquia' | 'Jornada Diocesana' | 'Referido';
  stage: ProspectStage;
  notes: string;
  assignedTo: string;
  createdAt: string;
  updatedAt: string;
}

export interface DiocesanEvent {
  id: string;
  title: string;
  pastoralId: string;
  parishHost: string;
  eventType: 'Jornada' | 'Formación' | 'Retiro' | 'Misión' | 'Aniversario' | 'Asamblea';
  date: string; // YYYY-MM-DD
  time: string;
  location: string;
  capacity: number;
  registeredCount: number;
  rsvpUserIds?: string[];
  isPublic: boolean;
  status: EventStatus;
  description: string;
}

export interface FinanceEntry {
  id: string;
  date: string;
  type: FinanceType;
  pastoralId: string;
  concept: string;
  category: string;
  amountPen: number;
  reference: string;
  recordedBy: string;
}

export interface PastoralDocument {
  id: string;
  title: string;
  docType: 'Prospecto' | 'Acta' | 'Plan Pastoral' | 'Comunicado';
  pastoralId: string;
  summary: string;
  date: string;
  author: string;
}

export interface PublicOverviewResponse {
  stats: {
    activePastorals: number;
    registeredMembers: number;
    upcomingEvents: number;
    parishesReached: number;
  };
  pastorals: Pastoral[];
  parishes: Parish[];
  events: DiocesanEvent[];
  celebrations: Array<{
    id: string;
    kind: 'birthday' | 'anniversary';
    title: string;
    subtitle: string;
    dateLabel: string;
    parishOrRole: string;
  }>;
}
