export type UserRole = 'admin_diocesano' | 'coordinador_pastoral' | 'secretario_tesorero';

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
  email: string;
  role: UserRole;
  pastoralId: string | null;
  createdAt: string;
}

export interface Pastoral {
  id: string;
  code: string;
  name: string;
  shortName: string;
  coordinatorName: string;
  adviserName: string;
  parishCount: number;
  focusArea: string;
  status: PastoralStatus;
  accentColor: string;
  description: string;
  createdAt: string;
}

export interface Member {
  id: string;
  fullName: string;
  roleTitle: string;
  pastoralId: string;
  parish: string;
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
