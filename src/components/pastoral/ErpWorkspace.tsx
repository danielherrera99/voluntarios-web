import {
  ArrowRight,
  BookOpen,
  Building2,
  CalendarDays,
  Check,
  DollarSign,
  ExternalLink,
  FileText,
  Gift,
  LayoutDashboard,
  LogOut,
  Menu,
  Pencil,
  Plus,
  Search,
  Shield,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import {useCallback, useEffect, useState, type FormEvent} from 'react';
import {api, getAssetUrl, type ErpDashboardData} from '../../lib/api';
import {
  ZONAS_ARCIPRESTALES,
  ZONAS_PARROQUIALES,
  type AuthUser,
  type CommunityKind,
  type DiocesanEvent,
  type EventStatus,
  type FinanceEntry,
  type FinanceType,
  type Member,
  type MemberStatus,
  type Parish,
  type Pastoral,
  type PastoralDocument,
  type PastoralStatus,
  type Prospect,
  type ProspectStage,
  type UserRole,
} from '../../types';
import {CelebrationCardModal, type CelebrationCardPreset} from './CelebrationCardModal';

type EditModalState =
  | {
      kind: 'pastoral';
      id: string;
      code: string;
      name: string;
      zonaArciprestal: string;
      communityKind: CommunityKind;
      parishId: string;
      status: PastoralStatus;
      coordinatorName: string;
      adviserName: string;
      parishCount: string;
      focusArea: string;
      accentColor: string;
      description: string;
    }
  | {
      kind: 'parish';
      id: string;
      name: string;
      locality: string;
      zonaArciprestal: string;
      pastorName: string;
    }
  | {
      kind: 'prospect';
      id: string;
      fullName: string;
      parish: string;
      zonaArciprestal: string;
      phone: string;
      email: string;
      pastoralId: string;
      stage: ProspectStage;
      notes: string;
    }
  | {
      kind: 'member';
      id: string;
      fullName: string;
      roleTitle: string;
      pastoralId: string;
      parish: string;
      zonaArciprestal: string;
      phone: string;
      email: string;
      birthDate: string;
      status: MemberStatus;
    }
  | {
      kind: 'event';
      id: string;
      title: string;
      pastoralId: string;
      parishHost: string;
      eventType: DiocesanEvent['eventType'];
      date: string;
      time: string;
      location: string;
      capacity: string;
      status: EventStatus;
      isPublic: boolean;
      description: string;
    }
  | {
      kind: 'finance';
      id: string;
      type: FinanceType;
      pastoralId: string;
      concept: string;
      category: string;
      amountPen: string;
      date: string;
    }
  | {
      kind: 'document';
      id: string;
      title: string;
      docType: PastoralDocument['docType'];
      pastoralId: string;
      summary: string;
    }
  | {
      kind: 'user';
      id: string;
      name: string;
      email: string;
      role: UserRole;
      pastoralId: string;
      password: string;
    };

type ErpSection =
  | 'resumen'
  | 'crm'
  | 'pastorals'
  | 'members'
  | 'events'
  | 'admin';

interface ErpWorkspaceProps {
  user: AuthUser;
  onLogout: () => void;
  onGoPublic: () => void;
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin_diocesano: 'Administrador Diocesano',
  coordinador_pastoral: 'Coordinador de Pastoral',
  secretario_tesorero: 'Secretario / Tesorero',
  miembro: 'Miembro de Pastoral',
};

const PROSPECT_STAGES: ProspectStage[] = [
  'Nuevo Prospecto',
  'Contactado',
  'En Acogida',
  'Integrado a Parroquia',
  'Archivado',
];

const PASTORAL_COLORS = [
  {hex: '#0A6EB4', label: 'Azul Chiclayo'},
  {hex: '#8D4999', label: 'PÃºrpura Cruz'},
  {hex: '#109A51', label: 'Verde Esperanza'},
  {hex: '#E6332A', label: 'Rojo EspÃ­ritu'},
];

function formatPen(amount: number): string {
  return `S/ ${amount.toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function ErpWorkspace({user, onLogout, onGoPublic}: ErpWorkspaceProps) {
  const isAdmin = user.role === 'admin_diocesano';
  const isMember = user.role === 'miembro';
  const canManage = !isMember;
  const [selectedPastoralScope, setSelectedPastoralScope] = useState<string>(
    isAdmin ? 'all' : user.pastoralId ?? 'all',
  );
  const [section, setSection] = useState<ErpSection>('resumen');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [data, setData] = useState<ErpDashboardData | null>(null);
  const [usersList, setUsersList] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{type: 'ok' | 'err'; text: string} | null>(null);

  // Filters & search
  const [crmFilter, setCrmFilter] = useState<'Todos' | ProspectStage>('Todos');
  const [crmSearch, setCrmSearch] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [memberPastoralFilter, setMemberPastoralFilter] = useState('all');
  const [pastoralCatalogTab, setPastoralCatalogTab] = useState<'comunidades' | 'parroquias'>(
    'comunidades',
  );
  const [pastoralZonaFilter, setPastoralZonaFilter] = useState<'Todas' | string>('Todas');
  const [pastoralSearch, setPastoralSearch] = useState('');
  const [adminTab, setAdminTab] = useState<'finances' | 'documents' | 'users'>(
    user.role === 'miembro' ? 'documents' : 'finances',
  );

  // Modals / Drawers
  const [cardPreset, setCardPreset] = useState<CelebrationCardPreset | null>(null);
  const [editModal, setEditModal] = useState<EditModalState | null>(null);
  const [showNewPastoral, setShowNewPastoral] = useState(false);
  const [showNewParish, setShowNewParish] = useState(false);
  const [showNewProspect, setShowNewProspect] = useState(false);
  const [showNewMember, setShowNewMember] = useState(false);
  const [showNewEvent, setShowNewEvent] = useState(false);

  const notify = useCallback((type: 'ok' | 'err', text: string) => {
    setFeedback({type, text});
  }, []);

  const refreshData = useCallback(async () => {
    try {
      const dash = await api.getDashboard(isAdmin ? selectedPastoralScope : null);
      setData(dash);
      if (user.role === 'admin_diocesano' || user.role === 'coordinador_pastoral') {
        const usersRes = await api.getUsers();
        setUsersList(usersRes.users);
      }
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Error al cargar datos del ERP.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, notify, selectedPastoralScope, user.role]);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  const activePastoral = data?.activePastoral ?? null;
  const availablePastorals = data?.availablePastorals ?? [];
  const availableParishes = data?.parishes ?? [];
  const defaultTargetPastoralId =
    activePastoral?.id ?? user.pastoralId ?? availablePastorals[0]?.id ?? 'pas-catedral';

  const pastoralMap = new Map<string, Pastoral>(
    availablePastorals.map((p) => [p.id, p]),
  );
  const parishMap = new Map<string, Parish>(
    availableParishes.map((par) => [par.id, par]),
  );

  // New Parish Form (Admin only)
  const [parName, setParName] = useState('');
  const [parLocality, setParLocality] = useState('');
  const [parZona, setParZona] = useState<string>(ZONAS_PARROQUIALES[0]);
  const [parPastor, setParPastor] = useState('');

  // New Pastoral Form (Admin only)
  const [npName, setNpName] = useState('');
  const [npCode, setNpCode] = useState('');
  const [npZona, setNpZona] = useState<string>(ZONAS_ARCIPRESTALES[0]);
  const [npKind, setNpKind] = useState<CommunityKind>('Movimiento');
  const [npParishId, setNpParishId] = useState('');
  const [npCoordinator, setNpCoordinator] = useState('');
  const [npAdviser, setNpAdviser] = useState('');
  const [npParishes, setNpParishes] = useState('1');
  const [npFocus, setNpFocus] = useState('');
  const [npColor, setNpColor] = useState('#0A6EB4');
  const [npDesc, setNpDesc] = useState('');

  // Edit Own Pastoral Form (PersonalizaciÃ³n)
  const [epName, setEpName] = useState('');
  const [epZona, setEpZona] = useState<string>(ZONAS_ARCIPRESTALES[0]);
  const [epKind, setEpKind] = useState<CommunityKind>('Pastoral Parroquial');
  const [epParishId, setEpParishId] = useState('');
  const [epCoordinator, setEpCoordinator] = useState('');
  const [epAdviser, setEpAdviser] = useState('');
  const [epParishes, setEpParishes] = useState('1');
  const [epFocus, setEpFocus] = useState('');
  const [epColor, setEpColor] = useState('#0A6EB4');
  const [epDesc, setEpDesc] = useState('');

  useEffect(() => {
    if (activePastoral) {
      setEpName(activePastoral.name);
      setEpZona(activePastoral.zonaArciprestal || ZONAS_ARCIPRESTALES[0]);
      setEpKind(activePastoral.communityKind ?? 'Pastoral Parroquial');
      setEpParishId(activePastoral.parishId ?? '');
      setEpCoordinator(activePastoral.coordinatorName);
      setEpAdviser(activePastoral.adviserName);
      setEpParishes(String(activePastoral.parishCount));
      setEpFocus(activePastoral.focusArea);
      setEpColor(activePastoral.accentColor);
      setEpDesc(activePastoral.description);
    }
  }, [activePastoral]);

  async function handleUpdateOwnPastoral(e: FormEvent) {
    e.preventDefault();
    if (!activePastoral) return;
    try {
      await api.updatePastoral(activePastoral.id, {
        name: epName,
        shortName: epName.replace(/^Pastoral\s+/i, '').slice(0, 24),
        zonaArciprestal: epZona,
        communityKind: epKind,
        parishId: epParishId || null,
        coordinatorName: epCoordinator,
        adviserName: epAdviser,
        parishCount: Number(epParishes) || 0,
        focusArea: epFocus,
        accentColor: epColor,
        description: epDesc,
      });
      notify('ok', 'Identidad y datos de tu pastoral actualizados.');
      await refreshData();
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'No se pudo actualizar la pastoral.');
    }
  }

  async function handleCreatePastoral(e: FormEvent) {
    e.preventDefault();
    try {
      await api.createPastoral({
        name: npName,
        shortName: npName.replace(/^Pastoral\s+/i, '').slice(0, 24),
        code: npCode || undefined,
        zonaArciprestal: npZona,
        communityKind: npKind,
        parishId: npParishId || null,
        coordinatorName: npCoordinator,
        adviserName: npAdviser || 'Por asignar',
        parishCount: Number(npParishes) || (npParishId ? 1 : 0),
        focusArea: npFocus,
        accentColor: npColor,
        description: npDesc,
        status: 'Activa',
      });
      setNpName('');
      setNpCode('');
      setNpParishId('');
      setNpCoordinator('');
      setNpAdviser('');
      setNpFocus('');
      setNpDesc('');
      setShowNewPastoral(false);
      notify('ok', 'Comunidad creada en el catÃ¡logo diocesano.');
      await refreshData();
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'No se pudo crear la pastoral.');
    }
  }

  async function handleCreateParish(e: FormEvent) {
    e.preventDefault();
    try {
      await api.createParish({
        name: parName,
        locality: parLocality || 'Chiclayo',
        zonaArciprestal: parZona,
        pastorName: parPastor || 'Por asignar',
      });
      setParName('');
      setParLocality('');
      setParPastor('');
      setShowNewParish(false);
      notify('ok', 'Parroquia agregada al directorio oficial.');
      await refreshData();
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'No se pudo registrar la parroquia.');
    }
  }

  async function handlePastoralStatusChange(id: string, status: PastoralStatus) {
    try {
      await api.updatePastoral(id, {status});
      notify('ok', `Estado actualizado a "${status}".`);
      await refreshData();
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Error al actualizar pastoral.');
    }
  }

  async function handlePastoralZonaChange(id: string, zonaArciprestal: string) {
    try {
      await api.updatePastoral(id, {zonaArciprestal});
      notify('ok', `Zona Arciprestal actualizada a "${zonaArciprestal}".`);
      await refreshData();
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Error al actualizar zona.');
    }
  }

  async function handlePastoralParishChange(id: string, parishId: string) {
    try {
      await api.updatePastoral(id, {parishId: parishId || null});
      const linked = parishId ? parishMap.get(parishId) : undefined;
      notify(
        'ok',
        linked
          ? `Vinculada a Parroquia "${linked.name}" (${linked.locality}).`
          : 'Parroquia dejada en blanco (Ã¡mbito diocesano / independiente).',
      );
      await refreshData();
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Error al vincular parroquia.');
    }
  }

  // Prospect Form
  const [prName, setPrName] = useState('');
  const [prParish, setPrParish] = useState('');
  const [prZona, setPrZona] = useState<string>(ZONAS_ARCIPRESTALES[0]);
  const [prPhone, setPrPhone] = useState('');
  const [prEmail, setPrEmail] = useState('');
  const [prPastoralId, setPrPastoralId] = useState('');
  const [prNotes, setPrNotes] = useState('');

  async function handleCreateProspect(e: FormEvent) {
    e.preventDefault();
    try {
      await api.createProspect({
        fullName: prName,
        parish: prParish,
        zonaArciprestal: prZona,
        phone: prPhone,
        email: prEmail,
        pastoralId: prPastoralId || defaultTargetPastoralId,
        notes: prNotes,
      });
      setPrName('');
      setPrParish('');
      setPrPhone('');
      setPrEmail('');
      setPrNotes('');
      setShowNewProspect(false);
      notify('ok', 'Prospecto agregado al CRM.');
      await refreshData();
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Error al registrar prospecto.');
    }
  }

  async function handleUpdateProspectStage(id: string, stage: ProspectStage) {
    try {
      await api.updateProspect(id, {stage});
      notify('ok', `Prospecto movido a "${stage}".`);
      await refreshData();
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Error al actualizar etapa.');
    }
  }

  async function handleConvertProspect(id: string) {
    try {
      await api.convertProspect(id, {roleTitle: 'Agente Pastoral Juvenil'});
      notify('ok', 'Prospecto integrado al directorio oficial de miembros.');
      await refreshData();
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'No se pudo integrar el prospecto.');
    }
  }

  // Member Form
  const [memName, setMemName] = useState('');
  const [memRole, setMemRole] = useState('Integrante Juvenil');
  const [memPastoral, setMemPastoral] = useState('');
  const [memParish, setMemParish] = useState('');
  const [memZona, setMemZona] = useState<string>(ZONAS_ARCIPRESTALES[0]);
  const [memPhone, setMemPhone] = useState('');
  const [memBirth, setMemBirth] = useState('2001-05-15');

  async function handleCreateMember(e: FormEvent) {
    e.preventDefault();
    try {
      await api.createMember({
        fullName: memName,
        roleTitle: memRole,
        pastoralId: memPastoral || defaultTargetPastoralId,
        parish: memParish,
        zonaArciprestal: memZona,
        phone: memPhone,
        birthDate: memBirth,
      });
      setMemName('');
      setMemParish('');
      setMemPhone('');
      setShowNewMember(false);
      notify('ok', 'Integrante registrado en el directorio.');
      await refreshData();
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Error al registrar miembro.');
    }
  }

  // Event Form
  const [evTitle, setEvTitle] = useState('');
  const [evPastoral, setEvPastoral] = useState('');
  const [evParish, setEvParish] = useState('Catedral Santa MarÃ­a');
  const [evType, setEvType] = useState<DiocesanEvent['eventType']>('Jornada');
  const [evDate, setEvDate] = useState('2026-12-12');
  const [evTime, setEvTime] = useState('18:00');
  const [evLocation, setEvLocation] = useState('');
  const [evCapacity, setEvCapacity] = useState('150');
  const [evPublic, setEvPublic] = useState(true);

  async function handleCreateEvent(e: FormEvent) {
    e.preventDefault();
    try {
      await api.createEvent({
        title: evTitle,
        pastoralId: evPastoral || defaultTargetPastoralId,
        parishHost: evParish,
        eventType: evType,
        date: evDate,
        time: evTime,
        location: evLocation || evParish,
        capacity: Number(evCapacity) || 100,
        isPublic: evPublic,
      });
      setEvTitle('');
      setEvLocation('');
      setShowNewEvent(false);
      notify('ok', 'Actividad creada en la agenda.');
      await refreshData();
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Error al crear actividad.');
    }
  }

  // Finance Form
  const [finType, setFinType] = useState<FinanceType>('Ingreso');
  const [finPastoral, setFinPastoral] = useState('');
  const [finConcept, setFinConcept] = useState('');
  const [finCategory, setFinCategory] = useState('Cuotas Parroquiales');
  const [finAmount, setFinAmount] = useState('');

  async function handleCreateFinance(e: FormEvent) {
    e.preventDefault();
    try {
      await api.createFinance({
        type: finType,
        pastoralId: finPastoral || defaultTargetPastoralId,
        concept: finConcept,
        category: finCategory,
        amountPen: Number(finAmount),
      });
      setFinConcept('');
      setFinAmount('');
      notify('ok', 'Movimiento registrado en la tesorerÃ­a de la pastoral.');
      await refreshData();
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Error al registrar movimiento.');
    }
  }

  // Document Form
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState<'Prospecto' | 'Acta' | 'Plan Pastoral' | 'Comunicado'>('Acta');
  const [docPastoral, setDocPastoral] = useState('');
  const [docSummary, setDocSummary] = useState('');

  async function handleCreateDocument(e: FormEvent) {
    e.preventDefault();
    try {
      await api.createDocument({
        title: docTitle,
        docType,
        pastoralId: docPastoral || defaultTargetPastoralId,
        summary: docSummary,
      });
      setDocTitle('');
      setDocSummary('');
      notify('ok', 'Acta o documento guardado en el archivo de esta pastoral.');
      await refreshData();
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Error al guardar documento.');
    }
  }

  // User Form (Admin assigns any pastoral; Coordinator creates team in their own pastoral)
  const [usrName, setUsrName] = useState('');
  const [usrEmail, setUsrEmail] = useState('');
  const [usrRole, setUsrRole] = useState<UserRole>('coordinador_pastoral');
  const [usrPastoral, setUsrPastoral] = useState('');
  const [usrPassword, setUsrPassword] = useState('');

  async function handleCreateUser(e: FormEvent) {
    e.preventDefault();
    try {
      const assignedPastoral = isAdmin
        ? usrRole === 'admin_diocesano'
          ? null
          : usrPastoral || defaultTargetPastoralId
        : user.pastoralId;

      await api.createUser({
        name: usrName,
        email: usrEmail,
        role: usrRole,
        pastoralId: assignedPastoral,
        password: usrPassword,
      });
      setUsrName('');
      setUsrEmail('');
      setUsrPassword('');
      notify('ok', 'Acceso independiente creado para la pastoral.');
      await refreshData();
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Error al crear usuario.');
    }
  }

  async function handleRsvpEvent(eventId: string) {
    try {
      const updated = await api.rsvpEvent(eventId);
      const isConfirmed = updated.rsvpUserIds?.includes(user.id);
      notify(
        'ok',
        isConfirmed
          ? `Asistencia confirmada para "${updated.title}".`
          : `Asistencia cancelada para "${updated.title}".`,
      );
      await refreshData();
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'No se pudo actualizar tu asistencia.');
    }
  }

  function openEditPastoral(pas: Pastoral) {
    setEditModal({
      kind: 'pastoral',
      id: pas.id,
      code: pas.code,
      name: pas.name,
      zonaArciprestal: pas.zonaArciprestal,
      communityKind: pas.communityKind ?? 'Pastoral Parroquial',
      parishId: pas.parishId ?? '',
      status: pas.status,
      coordinatorName: pas.coordinatorName,
      adviserName: pas.adviserName,
      parishCount: String(pas.parishCount),
      focusArea: pas.focusArea,
      accentColor: pas.accentColor,
      description: pas.description,
    });
  }

  function openEditParish(par: Parish) {
    setEditModal({
      kind: 'parish',
      id: par.id,
      name: par.name,
      locality: par.locality,
      zonaArciprestal: par.zonaArciprestal,
      pastorName: par.pastorName,
    });
  }

  function openEditProspect(pr: Prospect) {
    setEditModal({
      kind: 'prospect',
      id: pr.id,
      fullName: pr.fullName,
      parish: pr.parish,
      zonaArciprestal: pr.zonaArciprestal,
      phone: pr.phone,
      email: pr.email,
      pastoralId: pr.pastoralId,
      stage: pr.stage,
      notes: pr.notes,
    });
  }

  function openEditMember(m: Member) {
    setEditModal({
      kind: 'member',
      id: m.id,
      fullName: m.fullName,
      roleTitle: m.roleTitle,
      pastoralId: m.pastoralId,
      parish: m.parish,
      zonaArciprestal: m.zonaArciprestal,
      phone: m.phone,
      email: m.email,
      birthDate: m.birthDate,
      status: m.status,
    });
  }

  function openEditEvent(ev: DiocesanEvent) {
    setEditModal({
      kind: 'event',
      id: ev.id,
      title: ev.title,
      pastoralId: ev.pastoralId,
      parishHost: ev.parishHost,
      eventType: ev.eventType,
      date: ev.date,
      time: ev.time,
      location: ev.location,
      capacity: String(ev.capacity),
      status: ev.status,
      isPublic: ev.isPublic,
      description: ev.description,
    });
  }

  function openEditFinance(f: FinanceEntry) {
    setEditModal({
      kind: 'finance',
      id: f.id,
      type: f.type,
      pastoralId: f.pastoralId,
      concept: f.concept,
      category: f.category,
      amountPen: String(f.amountPen),
      date: f.date,
    });
  }

  function openEditDocument(doc: PastoralDocument) {
    setEditModal({
      kind: 'document',
      id: doc.id,
      title: doc.title,
      docType: doc.docType,
      pastoralId: doc.pastoralId,
      summary: doc.summary,
    });
  }

  function openEditUser(u: AuthUser) {
    setEditModal({
      kind: 'user',
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      pastoralId: u.pastoralId ?? defaultTargetPastoralId,
      password: '',
    });
  }

  async function handleSubmitEditModal(e: FormEvent) {
    e.preventDefault();
    if (!editModal) return;
    try {
      if (editModal.kind === 'pastoral') {
        await api.updatePastoral(editModal.id, {
          code: editModal.code,
          name: editModal.name,
          shortName: editModal.name.replace(/^Pastoral\s+/i, '').slice(0, 24),
          zonaArciprestal: editModal.zonaArciprestal,
          communityKind: editModal.communityKind,
          parishId: editModal.parishId || null,
          status: editModal.status,
          coordinatorName: editModal.coordinatorName,
          adviserName: editModal.adviserName,
          parishCount: Number(editModal.parishCount) || 0,
          focusArea: editModal.focusArea,
          accentColor: editModal.accentColor,
          description: editModal.description,
        });
        notify('ok', `Comunidad "${editModal.name}" actualizada.`);
      } else if (editModal.kind === 'parish') {
        await api.updateParish(editModal.id, {
          name: editModal.name,
          locality: editModal.locality,
          zonaArciprestal: editModal.zonaArciprestal,
          pastorName: editModal.pastorName,
        });
        notify('ok', `Parroquia "${editModal.name}" actualizada.`);
      } else if (editModal.kind === 'prospect') {
        await api.updateProspect(editModal.id, {
          fullName: editModal.fullName,
          parish: editModal.parish,
          zonaArciprestal: editModal.zonaArciprestal,
          phone: editModal.phone,
          email: editModal.email,
          pastoralId: editModal.pastoralId,
          stage: editModal.stage,
          notes: editModal.notes,
        });
        notify('ok', `Prospecto "${editModal.fullName}" actualizado.`);
      } else if (editModal.kind === 'member') {
        await api.updateMember(editModal.id, {
          fullName: editModal.fullName,
          roleTitle: editModal.roleTitle,
          pastoralId: editModal.pastoralId,
          parish: editModal.parish,
          zonaArciprestal: editModal.zonaArciprestal,
          phone: editModal.phone,
          email: editModal.email,
          birthDate: editModal.birthDate,
          status: editModal.status,
        });
        notify('ok', `Integrante "${editModal.fullName}" actualizado.`);
      } else if (editModal.kind === 'event') {
        await api.updateEvent(editModal.id, {
          title: editModal.title,
          pastoralId: editModal.pastoralId,
          parishHost: editModal.parishHost,
          eventType: editModal.eventType,
          date: editModal.date,
          time: editModal.time,
          location: editModal.location,
          capacity: Number(editModal.capacity) || 100,
          status: editModal.status,
          isPublic: editModal.isPublic,
          description: editModal.description,
        });
        notify('ok', `Actividad "${editModal.title}" actualizada.`);
      } else if (editModal.kind === 'finance') {
        await api.updateFinance(editModal.id, {
          type: editModal.type,
          pastoralId: editModal.pastoralId,
          concept: editModal.concept,
          category: editModal.category,
          amountPen: Number(editModal.amountPen),
          date: editModal.date,
        });
        notify('ok', 'Movimiento contable actualizado.');
      } else if (editModal.kind === 'document') {
        await api.updateDocument(editModal.id, {
          title: editModal.title,
          docType: editModal.docType,
          pastoralId: editModal.pastoralId,
          summary: editModal.summary,
        });
        notify('ok', `Documento "${editModal.title}" actualizado.`);
      } else if (editModal.kind === 'user') {
        await api.updateUser(editModal.id, {
          name: editModal.name,
          email: editModal.email,
          role: editModal.role,
          pastoralId: editModal.role === 'admin_diocesano' ? null : editModal.pastoralId,
          password: editModal.password || undefined,
        });
        notify('ok', `Acceso de "${editModal.name}" actualizado.`);
      }
      setEditModal(null);
      await refreshData();
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'No se pudieron guardar los cambios.');
    }
  }

  const sectionLabels: Record<ErpSection, string> = {
    resumen: activePastoral ? `Panel Â· ${activePastoral.shortName}` : 'Resumen Diocesano',
    crm: 'CRM Prospectos',
    pastorals: activePastoral ? 'Mi Pastoral' : 'Pastorales de la DiÃ³cesis',
    members: 'Directorio y Tarjetas',
    events: 'Agenda y Asistencia',
    admin: isMember ? 'Comunicados y Actas' : 'TesorerÃ­a, Actas y Accesos',
  };

  const navItems: Array<{id: ErpSection; label: string; icon: typeof LayoutDashboard}> = isMember
    ? [
        {id: 'resumen', label: 'Panel Comunitario', icon: LayoutDashboard},
        {id: 'pastorals', label: 'Mi Comunidad', icon: BookOpen},
        {id: 'members', label: 'Directorio y Tarjetas', icon: Users},
        {id: 'events', label: 'Agenda y Asistencia', icon: CalendarDays},
        {id: 'admin', label: 'Comunicados y Actas', icon: FileText},
      ]
    : [
        {id: 'resumen', label: 'Panel General', icon: LayoutDashboard},
        {id: 'crm', label: 'CRM Prospectos', icon: UserCheck},
        {id: 'pastorals', label: activePastoral ? 'Mi Pastoral' : 'Pastorales', icon: BookOpen},
        {id: 'members', label: 'Miembros y Tarjetas', icon: Users},
        {id: 'events', label: 'Agenda y Asistencia', icon: CalendarDays},
        {id: 'admin', label: 'TesorerÃ­a y Actas', icon: DollarSign},
      ];

  const filteredProspects = (data?.prospects ?? []).filter((p) => {
    const matchStage = crmFilter === 'Todos' ? true : p.stage === crmFilter;
    const q = crmSearch.trim().toLowerCase();
    const matchQ =
      !q ||
      p.fullName.toLowerCase().includes(q) ||
      p.parish.toLowerCase().includes(q) ||
      p.zonaArciprestal.toLowerCase().includes(q);
    return matchStage && matchQ;
  });

  const filteredMembers = (data?.members ?? []).filter((m) => {
    const matchPas = memberPastoralFilter === 'all' ? true : m.pastoralId === memberPastoralFilter;
    const q = memberSearch.trim().toLowerCase();
    const matchQ =
      !q ||
      m.fullName.toLowerCase().includes(q) ||
      m.parish.toLowerCase().includes(q) ||
      m.zonaArciprestal.toLowerCase().includes(q) ||
      m.roleTitle.toLowerCase().includes(q);
    return matchPas && matchQ;
  });

  const activeAccent = activePastoral?.accentColor ?? '#0A6EB4';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Sidebar Desktop + Mobile Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-200 bg-white flex flex-col justify-between transition-transform lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Dynamic Pastoral Accent Strip */}
          {activePastoral ? (
            <div className="h-1.5 w-full" style={{backgroundColor: activeAccent}} />
          ) : (
            <div className="h-1.5 w-full flex">
              <div className="flex-1 bg-[#8D4999]" />
              <div className="flex-1 bg-[#E6332A]" />
              <div className="flex-1 bg-[#109A51]" />
            </div>
          )}

          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={getAssetUrl('assets/aistudio/PJ_8x_b40a6c17.png')}
                alt="Pastoral Juvenil Chiclayo"
                className="h-8 w-auto object-contain shrink-0"
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0">
                <p className="text-sm font-bold tracking-tight text-slate-900 truncate">
                  {activePastoral ? activePastoral.shortName : 'ERP Diocesano'}
                </p>
                <p className="text-[11px] font-mono text-slate-400 truncate">
                  {activePastoral ? `${activePastoral.code} Â· Independiente` : 'Vista Global Chiclayo'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900 cursor-pointer"
              aria-label="Cerrar menÃº"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Admin Pastoral Workspace Switcher */}
          {isAdmin && availablePastorals.length > 0 && (
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70">
              <label
                htmlFor="scope-switcher"
                className="block text-[11px] font-medium text-slate-500 mb-1.5"
              >
                Espacio de Pastoral ({availablePastorals.length})
              </label>
              <select
                id="scope-switcher"
                value={selectedPastoralScope}
                onChange={(e) => {
                  setSelectedPastoralScope(e.target.value);
                  setMemberPastoralFilter('all');
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-[#0A6EB4] focus:outline-none"
              >
                <option value="all">Todas (Vista Diocesana)</option>
                {ZONAS_ARCIPRESTALES.map((zona) => {
                  const items = availablePastorals.filter((p) => p.zonaArciprestal === zona);
                  if (items.length === 0) return null;
                  return (
                    <optgroup key={zona} label={`Zona ${zona}`}>
                      {items.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.shortName}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
                {availablePastorals
                  .filter(
                    (p) =>
                      !ZONAS_ARCIPRESTALES.includes(
                        p.zonaArciprestal as (typeof ZONAS_ARCIPRESTALES)[number],
                      ),
                  )
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.shortName}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSection(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                    active
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                  style={active ? {color: activeAccent} : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-slate-200 p-4 space-y-3">
          <div className="text-xs">
            <p className="font-semibold text-slate-900 truncate">{user.name}</p>
            <p className="text-slate-500 truncate">{ROLE_LABELS[user.role]}</p>
            {user.pastoralId && (
              <p className="text-[11px] font-medium mt-0.5 truncate" style={{color: activeAccent}}>
                {pastoralMap.get(user.pastoralId)?.name ?? 'Pastoral asignada'}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onGoPublic}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Portal
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:text-red-700 hover:border-red-200 transition-colors cursor-pointer"
              title="Cerrar sesiÃ³n"
            >
              <LogOut className="h-3.5 w-3.5" />
              Salir
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100 cursor-pointer"
              aria-label="Abrir menÃº"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="text-sm text-slate-500 truncate">
              <span>DiÃ³cesis de Chiclayo</span>
              {activePastoral && (
                <>
                  <span className="mx-2">/</span>
                  <span className="font-medium text-slate-700">{activePastoral.shortName}</span>
                </>
              )}
              <span className="mx-2">/</span>
              <span className="font-semibold text-slate-900">{sectionLabels[section]}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isAdmin && activePastoral && (
              <button
                type="button"
                onClick={() => setSelectedPastoralScope('all')}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
              >
                Volver a Vista Global
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                setCardPreset({
                  mode: 'anniversary',
                  title: activePastoral ? activePastoral.name : 'Pastoral Juvenil P. San JosÃ© Obrero',
                  subtitle: activePastoral
                    ? activePastoral.focusArea
                    : 'Â¡Gracias por su servicio y entrega!',
                  dateLabel: '5 de Noviembre',
                  yearsLabel: '3 AÃ±os',
                  message: 'Sigamos anunciando la alegrÃ­a del Evangelio entre los jÃ³venes de Chiclayo.',
                })
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" style={{color: activeAccent}} />
              DiseÃ±ar Tarjeta
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
          {/* Personalized Pastoral Identity Strip when inside a single Pastoral workspace */}
          {activePastoral && (
            <div className="rounded-xl border border-slate-200 bg-white px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-0.5">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{backgroundColor: activeAccent}}
                  />
                  <span className="font-mono font-semibold tabular-nums">{activePastoral.code}</span>
                  <span>Â·</span>
                  <span>{activePastoral.zonaArciprestal}</span>
                  <span>Â·</span>
                  <span>
                    {activePastoral.parishId
                      ? `Parroquia ${parishMap.get(activePastoral.parishId)?.name ?? ''}`
                      : 'Sin parroquia fija (Ãmbito diocesano)'}
                  </span>
                  <span>Â·</span>
                  <span>
                    {isMember ? 'Espacio de Miembro' : 'ERP y TesorerÃ­a Independiente'}
                  </span>
                </div>
                <h1 className="text-lg font-bold text-slate-900">{activePastoral.name}</h1>
                <p className="text-xs text-slate-600">
                  Coord.: {activePastoral.coordinatorName} Â· Asesor: {activePastoral.adviserName}
                </p>
              </div>
              {canManage && (
                <button
                  type="button"
                  onClick={() => setSection('pastorals')}
                  className="self-start sm:self-auto rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Personalizar Mi Pastoral
                </button>
              )}
            </div>
          )}

          {feedback && (
            <div
              className={`flex items-center justify-between rounded-lg border px-4 py-2.5 text-xs font-medium ${
                feedback.type === 'ok'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              <span>{feedback.text}</span>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="p-1 hover:opacity-70 cursor-pointer"
                aria-label="Cerrar notificaciÃ³n"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {loading || !data ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-24 rounded-xl border border-slate-200 bg-white animate-pulse" />
                ))}
              </div>
              <div className="h-80 rounded-xl border border-slate-200 bg-white animate-pulse" />
            </div>
          ) : (
            <>
              {/* 1. RESUMEN DIOCESANO / DE PASTORAL */}
              {section === 'resumen' && (
                <div className="space-y-6">
                  <div
                    className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${
                      isMember ? 'lg:grid-cols-3' : 'lg:grid-cols-4'
                    }`}
                  >
                    <div className="rounded-xl border border-slate-200 bg-white p-5">
                      <p className="text-xs text-slate-500">
                        {activePastoral ? 'Actividades PrÃ³ximas' : 'Pastorales Activas'}
                      </p>
                      <p className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                        {activePastoral ? (
                          data.summary.upcomingEvents
                        ) : (
                          <>
                            {data.summary.activePastorals}{' '}
                            <span className="text-sm font-normal text-slate-400">
                              / {data.summary.totalPastorals}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                    {canManage && (
                      <div className="rounded-xl border border-slate-200 bg-white p-5">
                        <p className="text-xs text-slate-500">Prospectos CRM Abiertos</p>
                        <p className="mt-2 font-mono text-2xl font-bold text-[#0A6EB4] tabular-nums">
                          {data.summary.openProspects}
                        </p>
                      </div>
                    )}
                    <div className="rounded-xl border border-slate-200 bg-white p-5">
                      <p className="text-xs text-slate-500">Miembros Activos</p>
                      <p className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                        {data.summary.activeMembers}
                      </p>
                    </div>
                    {isMember ? (
                      <div className="rounded-xl border border-slate-200 bg-white p-5">
                        <p className="text-xs text-slate-500">Actas y Comunicados</p>
                        <p className="mt-2 font-mono text-2xl font-bold text-[#8D4999] tabular-nums">
                          {data.documents.length}
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-slate-200 bg-white p-5">
                        <p className="text-xs text-slate-500">
                          {activePastoral ? 'Saldo TesorerÃ­a Propia' : 'Saldo Consolidado DiÃ³cesis'}
                        </p>
                        <p className="mt-2 font-mono text-2xl font-bold text-[#109A51] tabular-nums">
                          {formatPen(data.summary.balancePen)}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    <div className="lg:col-span-8 rounded-xl border border-slate-200 bg-white overflow-hidden">
                      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                        <h2 className="text-sm font-semibold text-slate-900">
                          {activePastoral
                            ? `Ãšltimas Actas y Comunicados Â· ${activePastoral.shortName}`
                            : 'Pastorales de la DiÃ³cesis (Acceso Independiente)'}
                        </h2>
                        <button
                          type="button"
                          onClick={() => setSection(activePastoral ? 'admin' : 'pastorals')}
                          className="text-xs font-medium text-[#0A6EB4] hover:underline cursor-pointer"
                        >
                          {activePastoral
                            ? isMember
                              ? 'Ver documentos'
                              : 'Ir a Actas y TesorerÃ­a'
                            : 'Gestionar catÃ¡logo'}
                        </button>
                      </div>

                      {activePastoral ? (
                        data.documents.length === 0 ? (
                          <div className="p-8 text-center text-xs text-slate-500">
                            AÃºn no hay actas ni comunicados publicados en {activePastoral.shortName}.
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-100">
                            {data.documents.map((doc) => (
                              <div key={doc.id} className="p-5">
                                <div className="flex items-center justify-between text-xs text-slate-500">
                                  <span className="font-medium text-[#0A6EB4]">{doc.docType}</span>
                                  <span className="font-mono tabular-nums">{doc.date}</span>
                                </div>
                                <p className="mt-1 text-sm font-semibold text-slate-900">{doc.title}</p>
                                <p className="mt-1 text-xs text-slate-600">{doc.summary}</p>
                              </div>
                            ))}
                          </div>
                        )
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                              <tr>
                                <th className="px-5 py-3 font-medium">Comunidad / Parroquia</th>
                                <th className="px-5 py-3 font-medium">Zona Arciprestal</th>
                                <th className="px-5 py-3 font-medium">CoordinaciÃ³n</th>
                                {isAdmin && (
                                  <th className="px-5 py-3 font-medium text-right">Espacio ERP</th>
                                )}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {data.pastorals.slice(0, 10).map((p) => (
                                <tr key={p.id} className="hover:bg-slate-50/70">
                                  <td className="px-5 py-3 font-medium text-slate-900">
                                    <span className="font-mono text-slate-400 mr-2 tabular-nums">
                                      {p.code}
                                    </span>
                                    {p.name}
                                  </td>
                                  <td className="px-5 py-3 text-slate-600 whitespace-nowrap">
                                    {p.zonaArciprestal}
                                  </td>
                                  <td className="px-5 py-3 text-slate-600">{p.coordinatorName}</td>
                                  {isAdmin && (
                                    <td className="px-5 py-3 text-right">
                                      <button
                                        type="button"
                                        onClick={() => setSelectedPastoralScope(p.id)}
                                        className="inline-flex items-center gap-1 text-xs font-medium text-[#0A6EB4] hover:underline cursor-pointer whitespace-nowrap"
                                      >
                                        Entrar
                                        <ArrowRight className="h-3 w-3" />
                                      </button>
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {data.pastorals.length > 10 && (
                            <div className="border-t border-slate-100 px-5 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => setSection('pastorals')}
                                className="text-xs font-medium text-[#0A6EB4] hover:underline cursor-pointer"
                              >
                                Ver y clasificar las {data.pastorals.length} comunidades por Zona Arciprestal â†’
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-white p-5 space-y-4">
                      {isMember ? (
                        <>
                          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h2 className="text-sm font-semibold text-slate-900">
                              PrÃ³ximas Actividades
                            </h2>
                            <button
                              type="button"
                              onClick={() => setSection('events')}
                              className="text-xs font-medium text-[#0A6EB4] hover:underline cursor-pointer"
                            >
                              Ver Agenda
                            </button>
                          </div>
                          {data.events.length === 0 ? (
                            <p className="text-xs text-slate-500 py-4">
                              No hay actividades programadas aÃºn en tu comunidad.
                            </p>
                          ) : (
                            <div className="divide-y divide-slate-100">
                              {data.events.slice(0, 5).map((ev) => (
                                <div key={ev.id} className="py-3 first:pt-0 last:pb-0">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-semibold text-slate-900">{ev.title}</span>
                                    <span className="font-mono text-slate-400 tabular-nums">
                                      {ev.date}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    {ev.time} h Â· {ev.location}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h2 className="text-sm font-semibold text-slate-900">
                              Ãšltimos Prospectos CRM
                            </h2>
                            <button
                              type="button"
                              onClick={() => setSection('crm')}
                              className="text-xs font-medium text-[#0A6EB4] hover:underline cursor-pointer"
                            >
                              Ver CRM
                            </button>
                          </div>
                          {data.prospects.length === 0 ? (
                            <p className="text-xs text-slate-500 py-4">
                              No hay prospectos registrados aÃºn en este espacio pastoral.
                            </p>
                          ) : (
                            <div className="divide-y divide-slate-100">
                              {data.prospects.slice(0, 5).map((pr) => (
                                <div key={pr.id} className="py-3 first:pt-0 last:pb-0">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-semibold text-slate-900">{pr.fullName}</span>
                                    <span className="font-mono text-slate-400 tabular-nums">
                                      {pr.createdAt}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    {pr.parish} Â· {pr.stage}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 2. CRM PROSPECTOS */}
              {section === 'crm' && canManage && (
                <div className="space-y-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-200/70 p-1">
                      {(['Todos', ...PROSPECT_STAGES] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setCrmFilter(st)}
                          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            crmFilter === st
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowNewProspect((v) => !v)}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#0A6EB4] px-4 py-2 text-xs font-semibold text-white hover:bg-[#085A94] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Nuevo Prospecto
                    </button>
                  </div>

                  {showNewProspect && (
                    <form
                      onSubmit={handleCreateProspect}
                      className="rounded-xl border border-slate-200 bg-white p-5 grid grid-cols-1 gap-4 sm:grid-cols-3"
                    >
                      <input
                        type="text"
                        required
                        placeholder="Nombre completo *"
                        value={prName}
                        onChange={(e) => setPrName(e.target.value)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-[#0A6EB4] focus:outline-none"
                      />
                      <input
                        type="text"
                        required
                        placeholder="Parroquia *"
                        value={prParish}
                        onChange={(e) => setPrParish(e.target.value)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-[#0A6EB4] focus:outline-none"
                      />
                      <select
                        value={prZona}
                        onChange={(e) => setPrZona(e.target.value)}
                        aria-label="Zona Arciprestal"
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:border-[#0A6EB4] focus:outline-none"
                      >
                        {ZONAS_ARCIPRESTALES.map((z) => (
                          <option key={z} value={z}>
                            Zona: {z}
                          </option>
                        ))}
                      </select>
                      <input
                        type="tel"
                        placeholder="WhatsApp / TelÃ©fono"
                        value={prPhone}
                        onChange={(e) => setPrPhone(e.target.value)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-[#0A6EB4] focus:outline-none"
                      />
                      <input
                        type="email"
                        placeholder="Correo"
                        value={prEmail}
                        onChange={(e) => setPrEmail(e.target.value)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-[#0A6EB4] focus:outline-none"
                      />
                      {isAdmin && !activePastoral ? (
                        <select
                          value={prPastoralId || defaultTargetPastoralId}
                          onChange={(e) => setPrPastoralId(e.target.value)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:border-[#0A6EB4] focus:outline-none"
                        >
                          {availablePastorals.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 flex items-center">
                          {activePastoral?.name ?? 'Pastoral asignada'}
                        </div>
                      )}
                      <input
                        type="text"
                        placeholder="Notas de seguimiento"
                        value={prNotes}
                        onChange={(e) => setPrNotes(e.target.value)}
                        className="sm:col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-[#0A6EB4] focus:outline-none"
                      />
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setShowNewProspect(false)}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="rounded-lg bg-[#0A6EB4] px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                        >
                          Guardar
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                    <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
                      <Search className="h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Buscar prospecto por nombre, parroquia o zona arciprestal..."
                        value={crmSearch}
                        onChange={(e) => setCrmSearch(e.target.value)}
                        className="w-full text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none"
                      />
                    </div>

                    {filteredProspects.length === 0 ? (
                      <div className="p-10 text-center text-xs text-slate-500">
                        No hay prospectos en esta etapa para esta pastoral.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                            <tr>
                              <th className="px-4 py-3 font-medium">Joven / Prospecto</th>
                              <th className="px-4 py-3 font-medium">Parroquia / Zona Arciprestal</th>
                              <th className="px-4 py-3 font-medium">Pastoral</th>
                              <th className="px-4 py-3 font-medium">Contacto</th>
                              <th className="px-4 py-3 font-medium">Etapa CRM</th>
                              <th className="px-4 py-3 font-medium text-right">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredProspects.map((pr) => (
                              <tr key={pr.id} className="hover:bg-slate-50/70">
                                <td className="px-4 py-3">
                                  <p className="font-semibold text-slate-900">{pr.fullName}</p>
                                  <p className="text-slate-500 mt-0.5 max-w-xs truncate">{pr.notes}</p>
                                </td>
                                <td className="px-4 py-3 text-slate-700">
                                  <p>{pr.parish}</p>
                                  <p className="text-slate-400">{pr.zonaArciprestal}</p>
                                </td>
                                <td className="px-4 py-3 text-slate-700">
                                  {pastoralMap.get(pr.pastoralId)?.shortName ?? 'General'}
                                </td>
                                <td className="px-4 py-3 font-mono text-slate-600 tabular-nums">
                                  <p>{pr.phone}</p>
                                  <p className="font-sans text-slate-400">{pr.source}</p>
                                </td>
                                <td className="px-4 py-3">
                                  <select
                                    value={pr.stage}
                                    onChange={(e) =>
                                      void handleUpdateProspectStage(pr.id, e.target.value as ProspectStage)
                                    }
                                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 focus:border-[#0A6EB4] focus:outline-none"
                                  >
                                    {PROSPECT_STAGES.map((st) => (
                                      <option key={st} value={st}>
                                        {st}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="inline-flex items-center gap-1.5">
                                      {pr.stage !== 'Integrado a Parroquia' && (
                                        <button
                                          type="button"
                                          onClick={() => void handleConvertProspect(pr.id)}
                                          className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-[#109A51] hover:bg-emerald-100 cursor-pointer whitespace-nowrap"
                                          title="Integrar como miembro activo"
                                        >
                                          <Check className="h-3 w-3" />
                                          Integrar
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => openEditProspect(pr)}
                                        className="p-1.5 text-slate-500 hover:text-[#0A6EB4] cursor-pointer"
                                        aria-label="Editar prospecto"
                                        title="Editar prospecto"
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          try {
                                            await api.deleteProspect(pr.id);
                                            notify('ok', 'Prospecto eliminado.');
                                            await refreshData();
                                          } catch (err) {
                                            notify(
                                              'err',
                                              err instanceof Error
                                                ? err.message
                                                : 'No se pudo eliminar el prospecto.',
                                            );
                                          }
                                        }}
                                        className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                                        aria-label="Eliminar prospecto"
                                        title="Eliminar prospecto"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 3. MI PASTORAL (PersonalizaciÃ³n / Lectura para Miembro) o CATÃLOGO DE PASTORALES Y PARROQUIAS (Admin Global) */}
              {section === 'pastorals' && (
                <div className="space-y-6">
                  {activePastoral ? (
                    isMember ? (
                      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5 max-w-3xl">
                        <div className="border-b border-slate-100 pb-4">
                          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                            <span
                              className="h-2.5 w-2.5 rounded-full shrink-0"
                              style={{backgroundColor: activePastoral.accentColor}}
                            />
                            <span className="font-mono font-semibold tabular-nums">
                              {activePastoral.code}
                            </span>
                            <span>Â·</span>
                            <span>{activePastoral.zonaArciprestal}</span>
                            <span>Â·</span>
                            <span>{activePastoral.communityKind ?? activePastoral.status}</span>
                          </div>
                          <h2 className="text-base font-bold text-slate-900">
                            {activePastoral.name}
                          </h2>
                          <p className="text-xs text-slate-500 mt-1">
                            InformaciÃ³n oficial de tu comunidad dentro de la Pastoral Juvenil de Chiclayo.
                          </p>
                        </div>

                        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
                          <div>
                            <dt className="text-slate-500">Parroquia a la que pertenece</dt>
                            <dd className="mt-0.5 font-semibold text-slate-900">
                              {activePastoral.parishId && parishMap.get(activePastoral.parishId)
                                ? `${parishMap.get(activePastoral.parishId)?.name} (${parishMap.get(activePastoral.parishId)?.locality})`
                                : 'Sin parroquia fija (Movimiento / Ãmbito diocesano)'}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-500">CoordinaciÃ³n responsable</dt>
                            <dd className="mt-0.5 font-semibold text-slate-900">
                              {activePastoral.coordinatorName}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-500">Asesor espiritual / PÃ¡rroco</dt>
                            <dd className="mt-0.5 font-semibold text-slate-900">
                              {activePastoral.adviserName}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-500">Lema o enfoque pastoral</dt>
                            <dd className="mt-0.5 font-semibold text-slate-900">
                              {activePastoral.focusArea}
                            </dd>
                          </div>
                          <div className="sm:col-span-2 border-t border-slate-100 pt-3">
                            <dt className="text-slate-500">DescripciÃ³n</dt>
                            <dd className="mt-1 text-slate-700 leading-relaxed">
                              {activePastoral.description}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    ) : (
                      <form
                        onSubmit={handleUpdateOwnPastoral}
                        className="rounded-xl border border-slate-200 bg-white p-6 space-y-5 max-w-3xl"
                      >
                        <div className="border-b border-slate-100 pb-4">
                          <h2 className="text-base font-bold text-slate-900">
                            PersonalizaciÃ³n de {activePastoral.name}
                          </h2>
                          <p className="text-xs text-slate-500 mt-1">
                            Estos datos identifican a tu comunidad en su ERP independiente. Si es un movimiento o pastoral diocesana sin parroquia fija, puedes dejar la parroquia en blanco.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              Nombre oficial
                            </label>
                            <input
                              type="text"
                              required
                              value={epName}
                              onChange={(e) => setEpName(e.target.value)}
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              Tipo de comunidad
                            </label>
                            <select
                              value={epKind}
                              onChange={(e) => setEpKind(e.target.value as CommunityKind)}
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                            >
                              <option value="Pastoral Parroquial">Pastoral Parroquial</option>
                              <option value="Movimiento">Movimiento</option>
                              <option value="Pastoral Especializada">Pastoral Especializada</option>
                              <option value="Pastoral Universitaria">Pastoral Universitaria</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              Parroquia a la que pertenece (opcional)
                            </label>
                            <select
                              value={epParishId}
                              onChange={(e) => {
                                const nextId = e.target.value;
                                setEpParishId(nextId);
                                const linked = nextId ? parishMap.get(nextId) : undefined;
                                if (linked) {
                                  setEpZona(linked.zonaArciprestal);
                                }
                              }}
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                            >
                              <option value="">
                                Sin parroquia asignada (En blanco / Diocesana)
                              </option>
                              {ZONAS_PARROQUIALES.map((zona) => {
                                const items = availableParishes.filter(
                                  (par) => par.zonaArciprestal === zona,
                                );
                                if (items.length === 0) return null;
                                return (
                                  <optgroup key={zona} label={`Zona ${zona}`}>
                                    {items.map((par) => (
                                      <option key={par.id} value={par.id}>
                                        {par.name} Â· {par.locality}
                                      </option>
                                    ))}
                                  </optgroup>
                                );
                              })}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              Zona Arciprestal
                            </label>
                            <select
                              value={epZona}
                              onChange={(e) => setEpZona(e.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                            >
                              {ZONAS_ARCIPRESTALES.map((z) => (
                                <option key={z} value={z}>
                                  {z}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              Color institucional
                            </label>
                            <select
                              value={epColor}
                              onChange={(e) => setEpColor(e.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                            >
                              {PASTORAL_COLORS.map((c) => (
                                <option key={c.hex} value={c.hex}>
                                  {c.label} ({c.hex})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              Coordinador responsable
                            </label>
                            <input
                              type="text"
                              required
                              value={epCoordinator}
                              onChange={(e) => setEpCoordinator(e.target.value)}
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              Asesor espiritual / PÃ¡rroco
                            </label>
                            <input
                              type="text"
                              value={epAdviser}
                              onChange={(e) => setEpAdviser(e.target.value)}
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              Capillas o grupos vinculados
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={epParishes}
                              onChange={(e) => setEpParishes(e.target.value)}
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              Lema o enfoque pastoral
                            </label>
                            <input
                              type="text"
                              value={epFocus}
                              onChange={(e) => setEpFocus(e.target.value)}
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            DescripciÃ³n pÃºblica
                          </label>
                          <textarea
                            rows={3}
                            value={epDesc}
                            onChange={(e) => setEpDesc(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                          />
                        </div>

                        <button
                          type="submit"
                          className="rounded-lg bg-[#0A6EB4] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#085A94] cursor-pointer"
                        >
                          Guardar PersonalizaciÃ³n
                        </button>
                      </form>
                    )
                  ) : (
                    <>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-200/70 p-1 w-fit">
                          <button
                            type="button"
                            onClick={() => {
                              setPastoralCatalogTab('comunidades');
                              setPastoralZonaFilter('Todas');
                            }}
                            className={`rounded-md px-3.5 py-1.5 text-xs font-medium cursor-pointer ${
                              pastoralCatalogTab === 'comunidades'
                                ? 'bg-white text-slate-900 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Pastorales y Movimientos ({data.pastorals.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPastoralCatalogTab('parroquias');
                              setPastoralZonaFilter('Todas');
                            }}
                            className={`rounded-md px-3.5 py-1.5 text-xs font-medium cursor-pointer ${
                              pastoralCatalogTab === 'parroquias'
                                ? 'bg-white text-slate-900 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Listado de Parroquias ({availableParishes.length})
                          </button>
                        </div>

                        {isAdmin && pastoralCatalogTab === 'comunidades' && (
                          <button
                            type="button"
                            onClick={() => setShowNewPastoral((v) => !v)}
                            className="inline-flex items-center gap-2 rounded-lg bg-[#0A6EB4] px-4 py-2 text-xs font-semibold text-white hover:bg-[#085A94] whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Crear Pastoral / Movimiento
                          </button>
                        )}
                        {isAdmin && pastoralCatalogTab === 'parroquias' && (
                          <button
                            type="button"
                            onClick={() => setShowNewParish((v) => !v)}
                            className="inline-flex items-center gap-2 rounded-lg bg-[#0A6EB4] px-4 py-2 text-xs font-semibold text-white hover:bg-[#085A94] whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Registrar Parroquia
                          </button>
                        )}
                      </div>

                      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4">
                        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1 w-fit">
                          {(pastoralCatalogTab === 'parroquias'
                            ? (['Todas', ...ZONAS_PARROQUIALES] as const)
                            : (['Todas', ...ZONAS_ARCIPRESTALES] as const)
                          ).map((zona) => {
                            const count =
                              pastoralCatalogTab === 'parroquias'
                                ? zona === 'Todas'
                                  ? availableParishes.length
                                  : availableParishes.filter((par) => par.zonaArciprestal === zona).length
                                : zona === 'Todas'
                                  ? data.pastorals.length
                                  : data.pastorals.filter((p) => p.zonaArciprestal === zona).length;
                            return (
                              <button
                                key={zona}
                                type="button"
                                onClick={() => setPastoralZonaFilter(zona)}
                                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                  pastoralZonaFilter === zona
                                    ? 'bg-white text-slate-900 shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                {zona} ({count})
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
                          <Search className="h-4 w-4 text-slate-400 shrink-0" />
                          <input
                            type="text"
                            value={pastoralSearch}
                            onChange={(e) => setPastoralSearch(e.target.value)}
                            placeholder={
                              pastoralCatalogTab === 'parroquias'
                                ? 'Buscar entre las 50 parroquias por nombre, distrito o pÃ¡rroco...'
                                : 'Buscar comunidad, movimiento o parroquia vinculada...'
                            }
                            className="w-full text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none"
                          />
                        </div>
                      </div>

                      {pastoralCatalogTab === 'comunidades' ? (
                        <>
                          {showNewPastoral && isAdmin && (
                            <form
                              onSubmit={handleCreatePastoral}
                              className="rounded-xl border border-slate-200 bg-white p-5 grid grid-cols-1 gap-4 sm:grid-cols-3"
                            >
                              <input
                                type="text"
                                required
                                placeholder="Nombre (ej. Movimiento Juvenil...) *"
                                value={npName}
                                onChange={(e) => setNpName(e.target.value)}
                                className="rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-[#0A6EB4] focus:outline-none"
                              />
                              <select
                                value={npKind}
                                onChange={(e) => setNpKind(e.target.value as CommunityKind)}
                                aria-label="Tipo de comunidad"
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:border-[#0A6EB4] focus:outline-none"
                              >
                                <option value="Pastoral Parroquial">Pastoral Parroquial</option>
                                <option value="Movimiento">Movimiento</option>
                                <option value="Pastoral Especializada">Pastoral Especializada</option>
                                <option value="Pastoral Universitaria">Pastoral Universitaria</option>
                              </select>
                              <select
                                value={npParishId}
                                onChange={(e) => {
                                  const nextId = e.target.value;
                                  setNpParishId(nextId);
                                  const linked = nextId ? parishMap.get(nextId) : undefined;
                                  if (linked) setNpZona(linked.zonaArciprestal);
                                }}
                                aria-label="Parroquia (opcional)"
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:border-[#0A6EB4] focus:outline-none"
                              >
                                <option value="">Parroquia: En blanco (Opcional)</option>
                                {ZONAS_PARROQUIALES.map((zona) => {
                                  const items = availableParishes.filter(
                                    (par) => par.zonaArciprestal === zona,
                                  );
                                  if (items.length === 0) return null;
                                  return (
                                    <optgroup key={zona} label={`Zona ${zona}`}>
                                      {items.map((par) => (
                                        <option key={par.id} value={par.id}>
                                          {par.name} Â· {par.locality}
                                        </option>
                                      ))}
                                    </optgroup>
                                  );
                                })}
                              </select>
                              <select
                                value={npZona}
                                onChange={(e) => setNpZona(e.target.value)}
                                aria-label="Zona Arciprestal"
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:border-[#0A6EB4] focus:outline-none"
                              >
                                {ZONAS_ARCIPRESTALES.map((z) => (
                                  <option key={z} value={z}>
                                    Zona: {z}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="text"
                                required
                                placeholder="Coordinador responsable *"
                                value={npCoordinator}
                                onChange={(e) => setNpCoordinator(e.target.value)}
                                className="rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-[#0A6EB4] focus:outline-none"
                              />
                              <input
                                type="text"
                                placeholder="CÃ³digo (ej. PJ-67)"
                                value={npCode}
                                onChange={(e) => setNpCode(e.target.value)}
                                className="rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-[#0A6EB4] focus:outline-none"
                              />
                              <input
                                type="text"
                                placeholder="Asesor sacerdotal"
                                value={npAdviser}
                                onChange={(e) => setNpAdviser(e.target.value)}
                                className="rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-[#0A6EB4] focus:outline-none"
                              />
                              <select
                                value={npColor}
                                onChange={(e) => setNpColor(e.target.value)}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:border-[#0A6EB4] focus:outline-none"
                              >
                                {PASTORAL_COLORS.map((c) => (
                                  <option key={c.hex} value={c.hex}>
                                    {c.label} ({c.hex})
                                  </option>
                                ))}
                              </select>
                              <input
                                type="text"
                                placeholder="Territorio o Ã¡rea de enfoque"
                                value={npFocus}
                                onChange={(e) => setNpFocus(e.target.value)}
                                className="rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-[#0A6EB4] focus:outline-none"
                              />
                              <input
                                type="text"
                                placeholder="DescripciÃ³n breve"
                                value={npDesc}
                                onChange={(e) => setNpDesc(e.target.value)}
                                className="sm:col-span-3 rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-[#0A6EB4] focus:outline-none"
                              />
                              <div className="sm:col-span-3 flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setShowNewPastoral(false)}
                                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 cursor-pointer"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="submit"
                                  className="rounded-lg bg-[#0A6EB4] px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                                >
                                  Guardar Pastoral
                                </button>
                              </div>
                            </form>
                          )}

                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {data.pastorals
                              .filter((pas) => {
                                const linkedParish = pas.parishId
                                  ? parishMap.get(pas.parishId)
                                  : undefined;
                                const matchZona =
                                  pastoralZonaFilter === 'Todas'
                                    ? true
                                    : pas.zonaArciprestal === pastoralZonaFilter;
                                const q = pastoralSearch.trim().toLowerCase();
                                const matchQ =
                                  !q ||
                                  pas.name.toLowerCase().includes(q) ||
                                  pas.shortName.toLowerCase().includes(q) ||
                                  pas.zonaArciprestal.toLowerCase().includes(q) ||
                                  pas.coordinatorName.toLowerCase().includes(q) ||
                                  (linkedParish &&
                                    `${linkedParish.name} ${linkedParish.locality}`
                                      .toLowerCase()
                                      .includes(q));
                                return matchZona && matchQ;
                              })
                              .map((pas) => (
                                <div
                                  key={pas.id}
                                  className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between gap-4"
                                >
                                  <div>
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <span
                                          className="h-2.5 w-2.5 rounded-full shrink-0"
                                          style={{backgroundColor: pas.accentColor}}
                                        />
                                        <span className="font-mono font-semibold tabular-nums">
                                          {pas.code}
                                        </span>
                                        <span>Â·</span>
                                        <span>{pas.communityKind ?? 'Comunidad'}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <select
                                          value={pas.zonaArciprestal}
                                          onChange={(e) =>
                                            void handlePastoralZonaChange(pas.id, e.target.value)
                                          }
                                          aria-label={`Zona Arciprestal de ${pas.name}`}
                                          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700"
                                        >
                                          {ZONAS_ARCIPRESTALES.map((z) => (
                                            <option key={z} value={z}>
                                              {z}
                                            </option>
                                          ))}
                                        </select>
                                        <select
                                          value={pas.status}
                                          onChange={(e) =>
                                            void handlePastoralStatusChange(
                                              pas.id,
                                              e.target.value as PastoralStatus,
                                            )
                                          }
                                          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800"
                                        >
                                          <option value="Activa">Activa</option>
                                          <option value="En FormaciÃ³n">En FormaciÃ³n</option>
                                          <option value="Pausa">Pausa</option>
                                        </select>
                                      </div>
                                    </div>

                                    <h3 className="mt-2.5 text-base font-semibold text-slate-900">
                                      {pas.name}
                                    </h3>
                                    <p className="mt-1 text-xs text-slate-600">{pas.description}</p>

                                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                                      <label
                                        htmlFor={`parish-link-${pas.id}`}
                                        className="text-slate-500 shrink-0"
                                      >
                                        Parroquia:
                                      </label>
                                      <select
                                        id={`parish-link-${pas.id}`}
                                        value={pas.parishId ?? ''}
                                        onChange={(e) =>
                                          void handlePastoralParishChange(pas.id, e.target.value)
                                        }
                                        className="min-w-0 flex-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
                                      >
                                        <option value="">
                                          Sin parroquia (en blanco / Ã¡mbito diocesano)
                                        </option>
                                        {ZONAS_PARROQUIALES.map((zona) => {
                                          const items = availableParishes.filter(
                                            (par) => par.zonaArciprestal === zona,
                                          );
                                          if (items.length === 0) return null;
                                          return (
                                            <optgroup key={zona} label={`Zona ${zona}`}>
                                              {items.map((par) => (
                                                <option key={par.id} value={par.id}>
                                                  {par.name} Â· {par.locality}
                                                </option>
                                              ))}
                                            </optgroup>
                                          );
                                        })}
                                      </select>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                                    <div>
                                      <p>
                                        Coord.:{' '}
                                        <span className="font-medium text-slate-800">
                                          {pas.coordinatorName}
                                        </span>
                                      </p>
                                      <p>Asesor: {pas.adviserName}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedPastoralScope(pas.id);
                                          setSection('resumen');
                                        }}
                                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-[#0A6EB4] hover:bg-slate-50 cursor-pointer whitespace-nowrap"
                                      >
                                        <Building2 className="h-3 w-3" />
                                        Abrir ERP
                                      </button>
                                      {isAdmin && (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => openEditPastoral(pas)}
                                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-[#0A6EB4] hover:text-[#0A6EB4] cursor-pointer whitespace-nowrap"
                                            aria-label={`Editar ${pas.name}`}
                                            title="Editar pastoral o movimiento"
                                          >
                                            <Pencil className="h-3 w-3" />
                                            Editar
                                          </button>
                                          <button
                                            type="button"
                                            onClick={async () => {
                                              try {
                                                await api.deletePastoral(pas.id);
                                                notify('ok', `Comunidad "${pas.shortName}" eliminada.`);
                                                await refreshData();
                                              } catch (err) {
                                                notify(
                                                  'err',
                                                  err instanceof Error
                                                    ? err.message
                                                    : 'No se pudo eliminar la pastoral.',
                                                );
                                              }
                                            }}
                                            className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                                            aria-label="Eliminar pastoral"
                                            title="Eliminar pastoral"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </>
                      ) : (
                        <>
                          {showNewParish && isAdmin && (
                            <form
                              onSubmit={handleCreateParish}
                              className="rounded-xl border border-slate-200 bg-white p-5 grid grid-cols-1 gap-4 sm:grid-cols-4"
                            >
                              <input
                                type="text"
                                required
                                placeholder="Nombre de la parroquia *"
                                value={parName}
                                onChange={(e) => setParName(e.target.value)}
                                className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                              />
                              <input
                                type="text"
                                placeholder="Distrito / Localidad"
                                value={parLocality}
                                onChange={(e) => setParLocality(e.target.value)}
                                className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                              />
                              <select
                                value={parZona}
                                onChange={(e) => setParZona(e.target.value)}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                              >
                                {ZONAS_PARROQUIALES.map((z) => (
                                  <option key={z} value={z}>
                                    Zona: {z}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="text"
                                placeholder="PÃ¡rroco responsable"
                                value={parPastor}
                                onChange={(e) => setParPastor(e.target.value)}
                                className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                              />
                              <div className="sm:col-span-4 flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setShowNewParish(false)}
                                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 cursor-pointer"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="submit"
                                  className="rounded-lg bg-[#0A6EB4] px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                                >
                                  Guardar Parroquia
                                </button>
                              </div>
                            </form>
                          )}

                          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs">
                                <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                                  <tr>
                                    <th className="px-4 py-3 font-medium">Parroquia</th>
                                    <th className="px-4 py-3 font-medium">Localidad</th>
                                    <th className="px-4 py-3 font-medium">Zona Arciprestal</th>
                                    <th className="px-4 py-3 font-medium">PÃ¡rroco / Administrador</th>
                                    <th className="px-4 py-3 font-medium">
                                      Pastorales / Movimientos Vinculados
                                    </th>
                                    {isAdmin && (
                                      <th className="px-4 py-3 font-medium text-right">Acciones</th>
                                    )}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {availableParishes
                                    .filter((par) => {
                                      const matchZona =
                                        pastoralZonaFilter === 'Todas'
                                          ? true
                                          : par.zonaArciprestal === pastoralZonaFilter;
                                      const q = pastoralSearch.trim().toLowerCase();
                                      const matchQ =
                                        !q ||
                                        par.name.toLowerCase().includes(q) ||
                                        par.locality.toLowerCase().includes(q) ||
                                        par.pastorName.toLowerCase().includes(q) ||
                                        par.zonaArciprestal.toLowerCase().includes(q);
                                      return matchZona && matchQ;
                                    })
                                    .map((par) => {
                                      const linked = data.pastorals.filter(
                                        (pas) => pas.parishId === par.id,
                                      );
                                      return (
                                        <tr key={par.id} className="hover:bg-slate-50/70">
                                          <td className="px-4 py-3 font-semibold text-slate-900">
                                            "{par.name}"
                                          </td>
                                          <td className="px-4 py-3 text-slate-600">{par.locality}</td>
                                          <td className="px-4 py-3 font-medium text-[#109A51] whitespace-nowrap">
                                            {par.zonaArciprestal}
                                          </td>
                                          <td className="px-4 py-3 text-slate-700">{par.pastorName}</td>
                                          <td className="px-4 py-3 text-slate-600">
                                            {linked.length === 0 ? (
                                              <span className="text-slate-400">
                                                Sin comunidad vinculada aÃºn
                                              </span>
                                            ) : (
                                              <div className="flex flex-wrap gap-2">
                                                {linked.map((pas) => (
                                                  <button
                                                    key={pas.id}
                                                    type="button"
                                                    onClick={() => {
                                                      setSelectedPastoralScope(pas.id);
                                                      setSection('resumen');
                                                    }}
                                                    className="font-medium text-[#0A6EB4] hover:underline cursor-pointer"
                                                  >
                                                    {pas.shortName}
                                                  </button>
                                                ))}
                                              </div>
                                            )}
                                          </td>
                                          {isAdmin && (
                                            <td className="px-4 py-3 text-right">
                                              <div className="inline-flex items-center gap-1.5">
                                                <button
                                                  type="button"
                                                  onClick={() => openEditParish(par)}
                                                  className="p-1.5 text-slate-500 hover:text-[#0A6EB4] cursor-pointer"
                                                  aria-label={`Editar parroquia ${par.name}`}
                                                  title="Editar parroquia"
                                                >
                                                  <Pencil className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={async () => {
                                                    try {
                                                      await api.deleteParish(par.id);
                                                      notify(
                                                        'ok',
                                                        `Parroquia "${par.name}" eliminada del catÃ¡logo.`,
                                                      );
                                                      await refreshData();
                                                    } catch (err) {
                                                      notify(
                                                        'err',
                                                        err instanceof Error
                                                          ? err.message
                                                          : 'No se pudo eliminar la parroquia.',
                                                      );
                                                    }
                                                  }}
                                                  className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                                                  aria-label={`Eliminar parroquia ${par.name}`}
                                                  title="Eliminar parroquia"
                                                >
                                                  <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                              </div>
                                            </td>
                                          )}
                                        </tr>
                                      );
                                    })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* 4. MIEMBROS Y CELEBRACIONES */}
              {section === 'members' && (
                <div className="space-y-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                      {!activePastoral && (
                        <select
                          value={memberPastoralFilter}
                          onChange={(e) => setMemberPastoralFilter(e.target.value)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800"
                        >
                          <option value="all">Todas las pastorales</option>
                          {availablePastorals.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.shortName}
                            </option>
                          ))}
                        </select>
                      )}
                      <input
                        type="text"
                        placeholder="Buscar integrante o parroquia..."
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#0A6EB4] focus:outline-none"
                      />
                    </div>

                    {canManage && (
                      <button
                        type="button"
                        onClick={() => setShowNewMember((v) => !v)}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#0A6EB4] px-4 py-2 text-xs font-semibold text-white hover:bg-[#085A94] whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Agregar Miembro
                      </button>
                    )}
                  </div>

                  {showNewMember && canManage && (
                    <form
                      onSubmit={handleCreateMember}
                      className="rounded-xl border border-slate-200 bg-white p-5 grid grid-cols-1 gap-4 sm:grid-cols-3"
                    >
                      <input
                        type="text"
                        required
                        placeholder="Nombre completo *"
                        value={memName}
                        onChange={(e) => setMemName(e.target.value)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                      />
                      <input
                        type="text"
                        required
                        placeholder="Cargo (ej. Sub Coordinadora) *"
                        value={memRole}
                        onChange={(e) => setMemRole(e.target.value)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                      />
                      {isAdmin && !activePastoral ? (
                        <select
                          value={memPastoral || defaultTargetPastoralId}
                          onChange={(e) => setMemPastoral(e.target.value)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                        >
                          {availablePastorals.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 flex items-center">
                          {activePastoral?.name ?? 'Pastoral asignada'}
                        </div>
                      )}
                      <input
                        type="text"
                        required
                        placeholder="Parroquia *"
                        value={memParish}
                        onChange={(e) => setMemParish(e.target.value)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                      />
                      <select
                        value={memZona}
                        onChange={(e) => setMemZona(e.target.value)}
                        aria-label="Zona Arciprestal"
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                      >
                        {ZONAS_ARCIPRESTALES.map((z) => (
                          <option key={z} value={z}>
                            Zona: {z}
                          </option>
                        ))}
                      </select>
                      <input
                        type="tel"
                        placeholder="TelÃ©fono / WhatsApp"
                        value={memPhone}
                        onChange={(e) => setMemPhone(e.target.value)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                      />
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-500 whitespace-nowrap">Nacimiento:</label>
                        <input
                          type="date"
                          value={memBirth}
                          onChange={(e) => setMemBirth(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono"
                        />
                      </div>
                      <div className="sm:col-span-2 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowNewMember(false)}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="rounded-lg bg-[#0A6EB4] px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                        >
                          Registrar
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                    {filteredMembers.length === 0 ? (
                      <div className="p-10 text-center text-xs text-slate-500">
                        No hay miembros registrados todavÃ­a en este espacio pastoral.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                            <tr>
                              <th className="px-4 py-3 font-medium">Integrante</th>
                              <th className="px-4 py-3 font-medium">Pastoral</th>
                              <th className="px-4 py-3 font-medium">Parroquia / Zona Arciprestal</th>
                              <th className="px-4 py-3 font-medium">CumpleaÃ±os</th>
                              <th className="px-4 py-3 font-medium text-right">Pieza GrÃ¡fica</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredMembers.map((m) => (
                              <tr key={m.id} className="hover:bg-slate-50/70">
                                <td className="px-4 py-3">
                                  <p className="font-semibold text-slate-900">{m.fullName}</p>
                                  <p className="text-slate-500">{m.roleTitle}</p>
                                </td>
                                <td className="px-4 py-3 text-slate-700">
                                  {pastoralMap.get(m.pastoralId)?.shortName ?? 'General'}
                                </td>
                                <td className="px-4 py-3 text-slate-600">
                                  <p>{m.parish}</p>
                                  <p className="text-slate-400">{m.zonaArciprestal}</p>
                                </td>
                                <td className="px-4 py-3 font-mono text-slate-600 tabular-nums">
                                  {m.birthDate}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="inline-flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setCardPreset({
                                          mode: 'birthday',
                                          title: m.fullName,
                                          subtitle: `${m.roleTitle} Â· ${pastoralMap.get(m.pastoralId)?.shortName ?? 'Pastoral Juvenil'}`,
                                          dateLabel: m.birthDate,
                                          message: `Agradecemos tu entrega y alegrÃ­a en ${m.parish}. Â¡Que Dios bendiga tu vida y vocaciÃ³n de servicio!`,
                                        })
                                      }
                                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-[#8D4999] hover:bg-purple-50 cursor-pointer whitespace-nowrap"
                                    >
                                      <Gift className="h-3 w-3" />
                                      Tarjeta
                                    </button>
                                    {canManage && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => openEditMember(m)}
                                          className="p-1.5 text-slate-500 hover:text-[#0A6EB4] cursor-pointer"
                                          aria-label="Editar miembro"
                                          title="Editar integrante"
                                        >
                                          <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            try {
                                              await api.deleteMember(m.id);
                                              notify('ok', 'Integrante eliminado.');
                                              await refreshData();
                                            } catch (err) {
                                              notify(
                                                'err',
                                                err instanceof Error
                                                  ? err.message
                                                  : 'No se pudo eliminar el integrante.',
                                              );
                                            }
                                          }}
                                          className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                                          aria-label="Eliminar miembro"
                                          title="Eliminar integrante"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 5. AGENDA Y ASISTENCIA */}
              {section === 'events' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-xs text-slate-600">
                      {isMember
                        ? `Actividades de ${activePastoral ? activePastoral.shortName : 'tu comunidad'}. Confirma o cancela tu asistencia con un clic.`
                        : `Agenda propia de ${activePastoral ? activePastoral.shortName : 'la DiÃ³cesis'}. Marca "PÃºblico" para mostrarla en el portal web.`}
                    </p>
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => setShowNewEvent((v) => !v)}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#0A6EB4] px-4 py-2 text-xs font-semibold text-white hover:bg-[#085A94] whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Nueva Actividad
                      </button>
                    )}
                  </div>

                  {showNewEvent && canManage && (
                    <form
                      onSubmit={handleCreateEvent}
                      className="rounded-xl border border-slate-200 bg-white p-5 grid grid-cols-1 gap-4 sm:grid-cols-3"
                    >
                      <input
                        type="text"
                        required
                        placeholder="TÃ­tulo de la actividad *"
                        value={evTitle}
                        onChange={(e) => setEvTitle(e.target.value)}
                        className="sm:col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-xs"
                      />
                      <select
                        value={evType}
                        onChange={(e) => setEvType(e.target.value as DiocesanEvent['eventType'])}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                      >
                        <option value="Jornada">Jornada</option>
                        <option value="FormaciÃ³n">FormaciÃ³n</option>
                        <option value="Retiro">Retiro</option>
                        <option value="MisiÃ³n">MisiÃ³n</option>
                        <option value="Aniversario">Aniversario</option>
                        <option value="Asamblea">Asamblea</option>
                      </select>
                      {isAdmin && !activePastoral ? (
                        <select
                          value={evPastoral || defaultTargetPastoralId}
                          onChange={(e) => setEvPastoral(e.target.value)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                        >
                          {availablePastorals.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 flex items-center">
                          {activePastoral?.name ?? 'Pastoral asignada'}
                        </div>
                      )}
                      <input
                        type="text"
                        placeholder="Parroquia anfitriona"
                        value={evParish}
                        onChange={(e) => setEvParish(e.target.value)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Lugar exacto"
                        value={evLocation}
                        onChange={(e) => setEvLocation(e.target.value)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                      />
                      <input
                        type="date"
                        value={evDate}
                        onChange={(e) => setEvDate(e.target.value)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono"
                      />
                      <input
                        type="time"
                        value={evTime}
                        onChange={(e) => setEvTime(e.target.value)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono"
                      />
                      <input
                        type="number"
                        min={10}
                        placeholder="Aforo"
                        value={evCapacity}
                        onChange={(e) => setEvCapacity(e.target.value)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono"
                      />
                      <label className="flex items-center gap-2 text-xs text-slate-700">
                        <input
                          type="checkbox"
                          checked={evPublic}
                          onChange={(e) => setEvPublic(e.target.checked)}
                        />
                        Publicar en portal web
                      </label>
                      <div className="sm:col-span-2 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowNewEvent(false)}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="rounded-lg bg-[#0A6EB4] px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                        >
                          Guardar Actividad
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                    {data.events.length === 0 ? (
                      <div className="p-10 text-center text-xs text-slate-500">
                        No hay actividades programadas aÃºn en esta pastoral.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                            <tr>
                              <th className="px-4 py-3 font-medium">Actividad</th>
                              <th className="px-4 py-3 font-medium">Fecha y Hora</th>
                              <th className="px-4 py-3 font-medium">Pastoral</th>
                              <th className="px-4 py-3 font-medium text-right">Asistencia</th>
                              <th className="px-4 py-3 font-medium">Portal</th>
                              <th className="px-4 py-3 font-medium">Estado</th>
                              <th className="px-4 py-3 font-medium text-right">
                                {canManage ? 'Acciones' : 'Mi Asistencia'}
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {data.events.map((ev) => {
                              const isRsvped = Boolean(ev.rsvpUserIds?.includes(user.id));
                              return (
                                <tr key={ev.id} className="hover:bg-slate-50/70">
                                  <td className="px-4 py-3">
                                    <p className="font-semibold text-slate-900">{ev.title}</p>
                                    <p className="text-slate-500">{ev.location}</p>
                                  </td>
                                  <td className="px-4 py-3 font-mono text-slate-600 tabular-nums">
                                    {ev.date} Â· {ev.time}
                                  </td>
                                  <td className="px-4 py-3 text-slate-700">
                                    {pastoralMap.get(ev.pastoralId)?.shortName ?? 'General'}
                                  </td>
                                  <td className="px-4 py-3 font-mono text-right tabular-nums">
                                    {canManage ? (
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          await api.updateEvent(ev.id, {
                                            registeredCount: Math.min(ev.capacity, ev.registeredCount + 5),
                                          });
                                          await refreshData();
                                        }}
                                        className="hover:text-[#0A6EB4] cursor-pointer"
                                        title="Clic para sumar +5 inscritos"
                                      >
                                        {ev.registeredCount}/{ev.capacity}
                                      </button>
                                    ) : (
                                      <span className="text-slate-700">
                                        {ev.registeredCount}/{ev.capacity}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3">
                                    {canManage ? (
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          await api.updateEvent(ev.id, {isPublic: !ev.isPublic});
                                          await refreshData();
                                        }}
                                        className={`font-medium cursor-pointer ${
                                          ev.isPublic ? 'text-[#109A51]' : 'text-slate-400'
                                        }`}
                                      >
                                        {ev.isPublic ? 'PÃºblico' : 'Interno'}
                                      </button>
                                    ) : (
                                      <span
                                        className={`font-medium ${
                                          ev.isPublic ? 'text-[#109A51]' : 'text-slate-500'
                                        }`}
                                      >
                                        {ev.isPublic ? 'PÃºblico' : 'Interno'}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3">
                                    {canManage ? (
                                      <select
                                        value={ev.status}
                                        onChange={async (e) => {
                                          await api.updateEvent(ev.id, {
                                            status: e.target.value as EventStatus,
                                          });
                                          await refreshData();
                                        }}
                                        className="rounded border border-slate-200 bg-white px-2 py-1 text-xs"
                                      >
                                        <option value="Programado">Programado</option>
                                        <option value="En Curso">En Curso</option>
                                        <option value="Realizado">Realizado</option>
                                        <option value="Cancelado">Cancelado</option>
                                      </select>
                                    ) : (
                                      <span className="text-slate-700">{ev.status}</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    {canManage ? (
                                      <div className="inline-flex items-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => openEditEvent(ev)}
                                          className="p-1.5 text-slate-500 hover:text-[#0A6EB4] cursor-pointer"
                                          aria-label="Editar actividad"
                                          title="Editar actividad"
                                        >
                                          <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            try {
                                              await api.deleteEvent(ev.id);
                                              notify('ok', 'Actividad eliminada.');
                                              await refreshData();
                                            } catch (err) {
                                              notify(
                                                'err',
                                                err instanceof Error
                                                  ? err.message
                                                  : 'No se pudo eliminar la actividad.',
                                              );
                                            }
                                          }}
                                          className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                                          aria-label="Eliminar actividad"
                                          title="Eliminar actividad"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => void handleRsvpEvent(ev.id)}
                                        className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium cursor-pointer whitespace-nowrap ${
                                          isRsvped
                                            ? 'border-emerald-200 bg-emerald-50 text-[#109A51] hover:bg-emerald-100'
                                            : 'border-slate-200 bg-white text-[#0A6EB4] hover:bg-slate-50'
                                        }`}
                                      >
                                        {isRsvped && <Check className="h-3 w-3" />}
                                        {isRsvped ? 'Confirmada' : 'Confirmar asistencia'}
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 6. TESORERÃA, ACTAS Y USUARIOS (Independiente por Pastoral) */}
              {section === 'admin' && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-200/70 p-1 w-fit">
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => setAdminTab('finances')}
                          className={`rounded-md px-3.5 py-1.5 text-xs font-medium cursor-pointer ${
                            adminTab === 'finances'
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          TesorerÃ­a Independiente (S/)
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setAdminTab('documents')}
                        className={`rounded-md px-3.5 py-1.5 text-xs font-medium cursor-pointer ${
                          adminTab === 'documents'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {isMember ? 'Comunicados y Actas' : 'Actas y Prospectos'}
                      </button>
                      {(isAdmin || user.role === 'coordinador_pastoral') && (
                        <button
                          type="button"
                          onClick={() => setAdminTab('users')}
                          className={`rounded-md px-3.5 py-1.5 text-xs font-medium cursor-pointer ${
                            adminTab === 'users'
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Accesos y Perfiles
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-slate-500">
                      {activePastoral
                        ? `Ãmbito aislado: ${activePastoral.name}`
                        : 'Ãmbito global: Todas las pastorales'}
                    </p>
                  </div>

                  {adminTab === 'finances' && canManage && (
                    <div className="space-y-5">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="rounded-xl border border-slate-200 bg-white p-5">
                          <p className="text-xs text-slate-500">
                            Ingresos Â· {activePastoral ? activePastoral.shortName : 'DiÃ³cesis'}
                          </p>
                          <p className="mt-1 font-mono text-xl font-bold text-[#109A51] tabular-nums">
                            {formatPen(data.summary.totalIncomePen)}
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-5">
                          <p className="text-xs text-slate-500">
                            Egresos Â· {activePastoral ? activePastoral.shortName : 'DiÃ³cesis'}
                          </p>
                          <p className="mt-1 font-mono text-xl font-bold text-[#E6332A] tabular-nums">
                            {formatPen(data.summary.totalExpensePen)}
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-5">
                          <p className="text-xs text-slate-500">Saldo Neto Independiente</p>
                          <p className="mt-1 font-mono text-xl font-bold text-slate-900 tabular-nums">
                            {formatPen(data.summary.balancePen)}
                          </p>
                        </div>
                      </div>

                      <form
                        onSubmit={handleCreateFinance}
                        className="rounded-xl border border-slate-200 bg-white p-5 grid grid-cols-1 gap-3 sm:grid-cols-5"
                      >
                        <select
                          value={finType}
                          onChange={(e) => setFinType(e.target.value as FinanceType)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                        >
                          <option value="Ingreso">Ingreso</option>
                          <option value="Egreso">Egreso</option>
                        </select>
                        {isAdmin && !activePastoral ? (
                          <select
                            value={finPastoral || defaultTargetPastoralId}
                            onChange={(e) => setFinPastoral(e.target.value)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                          >
                            {availablePastorals.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.shortName}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 flex items-center truncate">
                            {activePastoral?.shortName ?? 'Tu pastoral'}
                          </div>
                        )}
                        <input
                          type="text"
                          required
                          placeholder="Concepto del movimiento *"
                          value={finConcept}
                          onChange={(e) => setFinConcept(e.target.value)}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                        />
                        <input
                          type="number"
                          required
                          min={0.5}
                          step="0.01"
                          placeholder="Monto S/ *"
                          value={finAmount}
                          onChange={(e) => setFinAmount(e.target.value)}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono"
                        />
                        <button
                          type="submit"
                          className="rounded-lg bg-[#0A6EB4] px-4 py-2 text-xs font-semibold text-white hover:bg-[#085A94] cursor-pointer"
                        >
                          Registrar
                        </button>
                      </form>

                      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                        {data.finances.length === 0 ? (
                          <div className="p-10 text-center text-xs text-slate-500">
                            Esta pastoral aÃºn no registra movimientos en su tesorerÃ­a independiente.
                          </div>
                        ) : (
                          <table className="w-full text-left text-xs">
                            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                              <tr>
                                <th className="px-4 py-3 font-medium">Fecha</th>
                                <th className="px-4 py-3 font-medium">Concepto</th>
                                <th className="px-4 py-3 font-medium">Pastoral</th>
                                <th className="px-4 py-3 font-medium">Tipo</th>
                                <th className="px-4 py-3 font-medium text-right">Monto</th>
                                <th className="px-4 py-3 font-medium text-right">Acciones</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {data.finances.map((f) => (
                                <tr key={f.id} className="hover:bg-slate-50/70">
                                  <td className="px-4 py-3 font-mono text-slate-500 tabular-nums">
                                    {f.date}
                                  </td>
                                  <td className="px-4 py-3 font-medium text-slate-900">
                                    {f.concept}
                                    <span className="ml-2 font-mono text-slate-400">{f.reference}</span>
                                  </td>
                                  <td className="px-4 py-3 text-slate-600">
                                    {pastoralMap.get(f.pastoralId)?.shortName ?? 'General'}
                                  </td>
                                  <td className="px-4 py-3">
                                    <span
                                      className={`font-medium ${
                                        f.type === 'Ingreso' ? 'text-[#109A51]' : 'text-[#E6332A]'
                                      }`}
                                    >
                                      {f.type}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 font-mono text-right font-semibold tabular-nums">
                                    {f.type === 'Ingreso' ? '+' : '-'} {formatPen(f.amountPen)}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <div className="inline-flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => openEditFinance(f)}
                                        className="p-1.5 text-slate-500 hover:text-[#0A6EB4] cursor-pointer"
                                        aria-label="Editar movimiento"
                                        title="Editar movimiento"
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          try {
                                            await api.deleteFinance(f.id);
                                            notify('ok', 'Movimiento eliminado.');
                                            await refreshData();
                                          } catch (err) {
                                            notify(
                                              'err',
                                              err instanceof Error
                                                ? err.message
                                                : 'No se pudo eliminar el movimiento.',
                                            );
                                          }
                                        }}
                                        className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                                        aria-label="Eliminar movimiento"
                                        title="Eliminar movimiento"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  )}

                  {adminTab === 'documents' && (
                    <div className="space-y-5">
                      {canManage && (
                        <form
                          onSubmit={handleCreateDocument}
                          className="rounded-xl border border-slate-200 bg-white p-5 grid grid-cols-1 gap-3 sm:grid-cols-4"
                        >
                          <input
                            type="text"
                            required
                            placeholder="TÃ­tulo de acta o prospecto *"
                            value={docTitle}
                            onChange={(e) => setDocTitle(e.target.value)}
                            className="sm:col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-xs"
                          />
                          <select
                            value={docType}
                            onChange={(e) =>
                              setDocType(
                                e.target.value as 'Prospecto' | 'Acta' | 'Plan Pastoral' | 'Comunicado',
                              )
                            }
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                          >
                            <option value="Acta">Acta</option>
                            <option value="Prospecto">Prospecto</option>
                            <option value="Plan Pastoral">Plan Pastoral</option>
                            <option value="Comunicado">Comunicado</option>
                          </select>
                          {isAdmin && !activePastoral ? (
                            <select
                              value={docPastoral || defaultTargetPastoralId}
                              onChange={(e) => setDocPastoral(e.target.value)}
                              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                            >
                              {availablePastorals.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.shortName}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 flex items-center truncate">
                              {activePastoral?.shortName ?? 'Tu pastoral'}
                            </div>
                          )}
                          <input
                            type="text"
                            required
                            placeholder="Resumen ejecutivo del documento o acuerdos *"
                            value={docSummary}
                            onChange={(e) => setDocSummary(e.target.value)}
                            className="sm:col-span-3 rounded-lg border border-slate-200 px-3 py-2 text-xs"
                          />
                          <button
                            type="submit"
                            className="rounded-lg bg-[#0A6EB4] px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                          >
                            Archivar Documento
                          </button>
                        </form>
                      )}

                      {data.documents.length === 0 ? (
                        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-500">
                          No hay actas ni comunicados archivados todavÃ­a en esta pastoral.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          {data.documents.map((doc) => (
                            <div
                              key={doc.id}
                              className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between gap-3"
                            >
                              <div>
                                <div className="flex items-center justify-between text-xs text-slate-500">
                                  <span className="inline-flex items-center gap-1.5 font-medium text-[#0A6EB4]">
                                    <FileText className="h-3.5 w-3.5" />
                                    {doc.docType}
                                  </span>
                                  <span className="font-mono tabular-nums">{doc.date}</span>
                                </div>
                                <h3 className="mt-2 text-sm font-semibold text-slate-900">{doc.title}</h3>
                                <p className="mt-1 text-xs text-slate-600 leading-relaxed">{doc.summary}</p>
                              </div>
                              <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-400">
                                <span>
                                  {pastoralMap.get(doc.pastoralId)?.shortName ?? 'Diocesana'} Â· {doc.author}
                                </span>
                                {canManage && (
                                  <div className="inline-flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => openEditDocument(doc)}
                                      className="inline-flex items-center gap-1 text-slate-500 hover:text-[#0A6EB4] cursor-pointer"
                                      aria-label="Editar documento"
                                      title="Editar documento"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                      Editar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        try {
                                          await api.deleteDocument(doc.id);
                                          notify('ok', 'Documento eliminado.');
                                          await refreshData();
                                        } catch (err) {
                                          notify(
                                            'err',
                                            err instanceof Error
                                              ? err.message
                                              : 'No se pudo eliminar el documento.',
                                          );
                                        }
                                      }}
                                      className="hover:text-red-600 cursor-pointer"
                                      aria-label="Eliminar documento"
                                      title="Eliminar documento"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {adminTab === 'users' && (isAdmin || user.role === 'coordinador_pastoral') && (
                    <div className="space-y-5">
                      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">
                            Crear acceso por perfil (Coordinador o Miembro)
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {isAdmin
                              ? 'Asigna el perfil adecuado para cada comunidad: Coordinador con ERP completo o Miembro con acceso comunitario y asistencia.'
                              : `Los perfiles que registres pertenecerÃ¡n exclusivamente a ${activePastoral?.name ?? 'tu pastoral'}.`}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 gap-4 border-t border-slate-100 pt-3 text-xs sm:grid-cols-3">
                          <div>
                            <p className="font-semibold text-slate-900">Administrador Diocesano</p>
                            <p className="mt-0.5 text-slate-500">
                              Control global de las 65 comunidades, Zonas Arciprestales, usuarios y reportes consolidados.
                            </p>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">Coordinador de Pastoral</p>
                            <p className="mt-0.5 text-slate-500">
                              GestiÃ³n independiente de su pastoral: CRM, miembros, tesorerÃ­a (S/), actas, agenda y equipo.
                            </p>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">Miembro de Pastoral</p>
                            <p className="mt-0.5 text-slate-500">
                              Consulta comunidad, directorio y actas; diseÃ±a tarjetas y confirma asistencia en agenda (sin CRM ni tesorerÃ­a).
                            </p>
                          </div>
                        </div>

                        <form
                          onSubmit={handleCreateUser}
                          className="grid grid-cols-1 gap-3 sm:grid-cols-3"
                        >
                          <input
                            type="text"
                            required
                            placeholder="Nombre completo *"
                            value={usrName}
                            onChange={(e) => setUsrName(e.target.value)}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                          />
                          <input
                            type="email"
                            required
                            placeholder="Correo de acceso *"
                            value={usrEmail}
                            onChange={(e) => setUsrEmail(e.target.value)}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                          />
                          <input
                            type="password"
                            required
                            minLength={6}
                            placeholder="ContraseÃ±a inicial (mÃ­n. 6) *"
                            value={usrPassword}
                            onChange={(e) => setUsrPassword(e.target.value)}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                          />
                          <select
                            value={usrRole}
                            onChange={(e) => setUsrRole(e.target.value as UserRole)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                          >
                            <option value="coordinador_pastoral">Coordinador de Pastoral</option>
                            <option value="miembro">Miembro de Pastoral</option>
                            <option value="secretario_tesorero">Secretario / Tesorero</option>
                            {isAdmin && <option value="admin_diocesano">Administrador Diocesano</option>}
                          </select>

                          {isAdmin ? (
                            <select
                              disabled={usrRole === 'admin_diocesano'}
                              value={usrRole === 'admin_diocesano' ? '' : usrPastoral || defaultTargetPastoralId}
                              onChange={(e) => setUsrPastoral(e.target.value)}
                              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs disabled:bg-slate-50 disabled:text-slate-400"
                            >
                              {usrRole === 'admin_diocesano' ? (
                                <option value="">Acceso global a toda la DiÃ³cesis</option>
                              ) : (
                                <>
                                  {ZONAS_ARCIPRESTALES.map((zona) => {
                                    const items = availablePastorals.filter(
                                      (p) => p.zonaArciprestal === zona,
                                    );
                                    if (items.length === 0) return null;
                                    return (
                                      <optgroup key={zona} label={`Zona ${zona}`}>
                                        {items.map((p) => (
                                          <option key={p.id} value={p.id}>
                                            {p.name}
                                          </option>
                                        ))}
                                      </optgroup>
                                    );
                                  })}
                                  {availablePastorals
                                    .filter(
                                      (p) =>
                                        !ZONAS_ARCIPRESTALES.includes(
                                          p.zonaArciprestal as (typeof ZONAS_ARCIPRESTALES)[number],
                                        ),
                                    )
                                    .map((p) => (
                                      <option key={p.id} value={p.id}>
                                        {p.name}
                                      </option>
                                    ))}
                                </>
                              )}
                            </select>
                          ) : (
                            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 flex items-center truncate">
                              {activePastoral?.name ?? 'Tu pastoral'}
                            </div>
                          )}

                          <button
                            type="submit"
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0A6EB4] px-4 py-2 text-xs font-semibold text-white hover:bg-[#085A94] cursor-pointer"
                          >
                            <Shield className="h-3.5 w-3.5" />
                            Crear Acceso
                          </button>
                        </form>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                            <tr>
                              <th className="px-4 py-3 font-medium">Usuario</th>
                              <th className="px-4 py-3 font-medium">Correo</th>
                              <th className="px-4 py-3 font-medium">Rol</th>
                              <th className="px-4 py-3 font-medium">Pastoral Asignada</th>
                              <th className="px-4 py-3 font-medium text-right">AcciÃ³n</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {usersList.map((u) => (
                              <tr key={u.id}>
                                <td className="px-4 py-3 font-semibold text-slate-900">{u.name}</td>
                                <td className="px-4 py-3 text-slate-600">{u.email}</td>
                                <td className="px-4 py-3 text-slate-700">{ROLE_LABELS[u.role]}</td>
                                <td className="px-4 py-3 text-slate-700">
                                  {u.role === 'admin_diocesano'
                                    ? 'Toda la DiÃ³cesis'
                                    : pastoralMap.get(u.pastoralId ?? '')?.name ?? 'Sin asignar'}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="inline-flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => openEditUser(u)}
                                      className="p-1.5 text-slate-500 hover:text-[#0A6EB4] cursor-pointer"
                                      aria-label="Editar usuario"
                                      title="Editar usuario"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    {u.id !== user.id && (
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          try {
                                            await api.deleteUser(u.id);
                                            notify('ok', 'Usuario eliminado.');
                                            await refreshData();
                                          } catch (err) {
                                            notify(
                                              'err',
                                              err instanceof Error
                                                ? err.message
                                                : 'No se pudo eliminar el usuario.',
                                            );
                                          }
                                        }}
                                        className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                                        aria-label="Eliminar usuario"
                                        title="Eliminar usuario"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {editModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleSubmitEditModal}
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 space-y-5 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">
                {editModal.kind === 'pastoral' && 'Editar Pastoral / Movimiento'}
                {editModal.kind === 'parish' && 'Editar Parroquia'}
                {editModal.kind === 'prospect' && 'Editar Prospecto CRM'}
                {editModal.kind === 'member' && 'Editar Integrante'}
                {editModal.kind === 'event' && 'Editar Actividad'}
                {editModal.kind === 'finance' && 'Editar Movimiento Contable'}
                {editModal.kind === 'document' && 'Editar Acta / Documento'}
                {editModal.kind === 'user' && 'Editar Acceso de Usuario'}
              </h2>
              <button
                type="button"
                onClick={() => setEditModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-900 cursor-pointer"
                aria-label="Cerrar ediciÃ³n"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {editModal.kind === 'pastoral' && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nombre oficial *
                  </label>
                  <input
                    type="text"
                    required
                    value={editModal.name}
                    onChange={(e) => setEditModal({...editModal, name: e.target.value})}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    CÃ³digo *
                  </label>
                  <input
                    type="text"
                    required
                    value={editModal.code}
                    onChange={(e) => setEditModal({...editModal, code: e.target.value})}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Tipo de comunidad
                  </label>
                  <select
                    value={editModal.communityKind}
                    onChange={(e) =>
                      setEditModal({...editModal, communityKind: e.target.value as CommunityKind})
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                  >
                    <option value="Pastoral Parroquial">Pastoral Parroquial</option>
                    <option value="Movimiento">Movimiento</option>
                    <option value="Pastoral Especializada">Pastoral Especializada</option>
                    <option value="Pastoral Universitaria">Pastoral Universitaria</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Parroquia (opcional)
                  </label>
                  <select
                    value={editModal.parishId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      const linked = nextId ? parishMap.get(nextId) : undefined;
                      setEditModal({
                        ...editModal,
                        parishId: nextId,
                        zonaArciprestal: linked ? linked.zonaArciprestal : editModal.zonaArciprestal,
                      });
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                  >
                    <option value="">Sin parroquia (en blanco / Ã¡mbito diocesano)</option>
                    {ZONAS_PARROQUIALES.map((zona) => {
                      const items = availableParishes.filter((par) => par.zonaArciprestal === zona);
                      if (items.length === 0) return null;
                      return (
                        <optgroup key={zona} label={`Zona ${zona}`}>
                          {items.map((par) => (
                            <option key={par.id} value={par.id}>
                              {par.name} Â· {par.locality}
                            </option>
                          ))}
                        </optgroup>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Zona Arciprestal
                  </label>
                  <select
                    value={editModal.zonaArciprestal}
                    onChange={(e) => setEditModal({...editModal, zonaArciprestal: e.target.value})}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                  >
                    {ZONAS_ARCIPRESTALES.map((z) => (
                      <option key={z} value={z}>
                        {z}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Estado</label>
                  <select
                    value={editModal.status}
                    onChange={(e) =>
                      setEditModal({...editModal, status: e.target.value as PastoralStatus})
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                  >
                    <option value="Activa">Activa</option>
                    <option value="En FormaciÃ³n">En FormaciÃ³n</option>
                    <option value="Pausa">Pausa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Coordinador responsable *
                  </label>
                  <input
                    type="text"
                    required
                    value={editModal.coordinatorName}
                    onChange={(e) => setEditModal({...editModal, coordinatorName: e.target.value})}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Asesor espiritual / PÃ¡rroco
                  </label>
                  <input
                    type="text"
                    value={editModal.adviserName}
                    onChange={(e) => setEditModal({...editModal, adviserName: e.target.value})}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Color institucional
                  </label>
                  <select
                    value={editModal.accentColor}
                    onChange={(e) => setEditModal({...editModal, accentColor: e.target.value})}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                  >
                    {PASTORAL_COLORS.map((c) => (
                      <option key={c.hex} value={c.hex}>
                        {c.label} ({c.hex})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Capillas o grupos vinculados
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editModal.parishCount}
                    onChange={(e) => setEditModal({...editModal, parishCount: e.target.value})}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Enfoque / Lema pastoral
                  </label>
                  <input
                    type="text"
                    value={editModal.focusArea}
                    onChange={(e) => setEditModal({...editModal, focusArea: e.target.value})}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    DescripciÃ³n breve
                  </label>
                  <textarea
                    rows={3}
                    value={editModal.description}
                    onChange={(e) => setEditModal({...editModal, description: e.target.value})}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
              </div>
            )}

            {editModal.kind === 'parish' && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nombre de la parroquia *
                  </label>
                  <input
                    type="text"
                    required
                    value={editModal.name}
                    onChange={(e) => setEditModal({...editModal, name: e.target.value})}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Distrito / Localidad
                  </label>
                  <input
                    type="text"
                    value={editModal.locality}
                    onChange={(e) => setEditModal({...editModal, locality: e.target.value})}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Zona Arciprestal
                  </label>
                  <select
                    value={editModal.zonaArciprestal}
                    onChange={(e) => setEditModal({...editModal, zonaArciprestal: e.target.value})}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                  >
                    {ZONAS_PARROQUIALES.map((z) => (
                      <option key={z} value={z}>
                        {z}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    PÃ¡rroco / Administrador
                  </label>
                  <input
                    type="text"
                    value={editModal.pastorName}
                    onChange={(e) => setEditModal({...editModal, pastorName: e.target.value})}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
              </div>
            )}

            {editModal.kind === 'prospect' && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={editModal.fullName}
                    onChange={(e) => setEditModal({...editModal, fullName: e.target.value})}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Parroquia / Comunidad *
                  </label>
                  <input
                    type="text"
                    required
                    value={editModal.parish}
                    onChange={(e) => setEditModal({...editModal, parish: e.target.value})}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Zona Arciprestal
                  </label>
                  <select
                    value={editModal.zonaArciprestal}
                    onChange={(e) => setEditModal({...editModal, zonaArciprestal: e.target.value})}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                  >
                    {ZONAS_ARCIPRESTALES.map((z) => (
                      <option key={z} value={z}>
                        {z}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Etapa CRM</label>
                  <select
                    value={editModal.stage}
                    onChange={(e) =>
                      setEditModal({...editModal, stage: e.target.value as ProspectStage})
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                  >
                    {PROSPECT_STAGES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    WhatsApp / TelÃ©fono
                  </label>
                  <input
                    type="text"
                    value={editModal.phone}
                    onChange={(e) => setEditModal({...editModal, phone: e.target.value})}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Correo</label>
                  <input
                    type="text"
                    value={editModal.email}
                    onChange={(e) => setEditModal({...editModal, email: e.target.value})}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
                {isAdmin && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Pastoral</label>
                    <select
                      value={editModal.pastoralId}
                      onChange={(e) => setEditModal({...editModal, pastoralId: e.target.value})}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                    >
                      {availablePastorals.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Notas</label>
                  <textarea
                    rows={3}
                    value={editModal.notes}
                    onChange={(e) => setEditModal({...editModal, notes: e.target.value})}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
              </div>
            )}

            {editModal.kind === 'member' && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={editModal.fullName}
                    onChange={(e) => setEditModal({...editModal, fullName: e.target.value})}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Cargo *</label>
                  <input
                    type="text"
                    required
                    value={editModal.roleTitle}
                    onChange={(e) => setEditModal({...editModal, roleTitle: e.target.value})}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Parroquia *</label>
                  <input
                    type="text"
                    required
                    value={editModal.parish}
                    onChange={(e) => setEditModal({...editModal, parish: e.target.value})}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Zona Arciprestal
                  </label>
                  <select
                    value={editModal.zonaArciprestal}
                    onChange={(e) => setEditModal({...editModal, zonaArciprestal: e.target.value})}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                  >
                    {ZONAS_ARCIPRESTALES.map((z) => (
                      <option key={z} value={z}>
                        {z}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">TelÃ©fono</label>
                  <input
                    type="text"
                    value={editModal.phone}
                    onChange={(e) => setEditModal({...editModal, phone: e.target.value})}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Correo</label>
                  <input
                    type="text"
                    value={editModal.email}
                    onChange={(e) => setEditModal({...editModal, email: e.target.value})}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Fecha de nacimiento
                  </label>
                  <input
                    type="date"
                    value={editModal.birthDate}
                    onChange={(e) => setEditModal({...editModal, birthDate: e.target.value})}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Estado</label>
                  <select
                    value={editModal.status}
                    onChange={(e) =>
                      setEditModal({...editModal, status: e.target.value as MemberStatus})
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                  >
                    <option value="Activo">Activo</option>
                    <option value="En FormaciÃ³n">En FormaciÃ³n</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </div>
                {isAdmin && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Pastoral</label>
                    <select
                      value={editModal.pastoralId}
                      onChange={(e) => setEditModal({...editModal, pastoralId: e.target.value})}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                    >
                      {availablePastorals.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {editModal.kind === 'event' && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">TÃ­tulo *</label>
                  <input
                    type="text"
                    required
                    value={editModal.title}
                    onChange={(e) => setEditModal({...editModal, title: e.target.value})}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tipo</label>
                  <select
                    value={editModal.eventType}
                    onChange={(e) =>
                      setEditModal({
                        ...editModal,
                        eventType: e.target.value as DiocesanEvent['eventType'],
                      })
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                  >
                    <option value="Jornada">Jornada</option>
                    <option value="FormaciÃ³n">FormaciÃ³n</option>
                    <option value="Retiro">Retiro</option>
                    <option value="MisiÃ³n">MisiÃ³n</option>
                    <option value="Aniversario">Aniversario</option>
                    <option value="Asamblea">Asamblea</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Estado</label>
                  <select
                    value={editModal.status}
                    onChange={(e) =>
                      setEditModal({...editModal, status: e.target.value as EventStatus})
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                  >
                    <option value="Programado">Programado</option>
                    <option value="En Curso">En Curso</option>
                    <option value="Realizado">Realizado</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={editModal.date}
                    onChange={(e) => setEditModal({...editModal, date: e.target.value})}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Hora</label>
                  <input
                    type="time"
                    value={editModal.time}
                    onChange={(e) => setEditModal({...editModal, time: e.target.value})}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Parroquia anfitriona
                  </label>
                  <input
                    type="text"
                    value={editModal.parishHost}
                    onChange={(e) => setEditModal({...editModal, parishHost: e.target.value})}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Lugar</label>
                  <input
                    type="text"
                    value={editModal.location}
                    onChange={(e) => setEditModal({...editModal, location: e.target.value})}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Aforo</label>
                  <input
                    type="number"
                    min={10}
                    value={editModal.capacity}
                    onChange={(e) => setEditModal({...editModal, capacity: e.target.value})}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-700 self-end pb-2">
                  <input
                    type="checkbox"
                    checked={editModal.isPublic}
                    onChange={(e) => setEditModal({...editModal, isPublic: e.target.checked})}
                  />
                  Publicar en portal web
                </label>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">DescripciÃ³n</label>
                  <textarea
                    rows={2}
                    value={editModal.description}
                    onChange={(e) => setEditModal({...editModal, description: e.target.value})}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
              </div>
            )}

            {editModal.kind === 'finance' && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tipo</label>
                  <select
                    value={editModal.type}
                    onChange={(e) =>
                      setEditModal({...editModal, type: e.target.value as FinanceType})
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                  >
                    <option value="Ingreso">Ingreso</option>
                    <option value="Egreso">Egreso</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Monto (S/) *</label>
                  <input
                    type="number"
                    required
                    min={0.5}
                    step="0.01"
                    value={editModal.amountPen}
                    onChange={(e) => setEditModal({...editModal, amountPen: e.target.value})}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Concepto *</label>
                  <input
                    type="text"
                    required
                    value={editModal.concept}
                    onChange={(e) => setEditModal({...editModal, concept: e.target.value})}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">CategorÃ­a</label>
                  <input
                    type="text"
                    value={editModal.category}
                    onChange={(e) => setEditModal({...editModal, category: e.target.value})}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={editModal.date}
                    onChange={(e) => setEditModal({...editModal, date: e.target.value})}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>
            )}

            {editModal.kind === 'document' && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">TÃ­tulo *</label>
                  <input
                    type="text"
                    required
                    value={editModal.title}
                    onChange={(e) => setEditModal({...editModal, title: e.target.value})}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tipo</label>
                  <select
                    value={editModal.docType}
                    onChange={(e) =>
                      setEditModal({
                        ...editModal,
                        docType: e.target.value as PastoralDocument['docType'],
                      })
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                  >
                    <option value="Acta">Acta</option>
                    <option value="Prospecto">Prospecto</option>
                    <option value="Plan Pastoral">Plan Pastoral</option>
                    <option value="Comunicado">Comunicado</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Resumen / Acuerdos *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={editModal.summary}
                    onChange={(e) => setEditModal({...editModal, summary: e.target.value})}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
              </div>
            )}

            {editModal.kind === 'user' && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Nombre *</label>
                  <input
                    type="text"
                    required
                    value={editModal.name}
                    onChange={(e) => setEditModal({...editModal, name: e.target.value})}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Correo *</label>
                  <input
                    type="email"
                    required
                    value={editModal.email}
                    onChange={(e) => setEditModal({...editModal, email: e.target.value})}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Rol</label>
                  <select
                    value={editModal.role}
                    onChange={(e) => setEditModal({...editModal, role: e.target.value as UserRole})}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                  >
                    <option value="coordinador_pastoral">Coordinador de Pastoral</option>
                    <option value="miembro">Miembro de Pastoral</option>
                    <option value="secretario_tesorero">Secretario / Tesorero</option>
                    {isAdmin && <option value="admin_diocesano">Administrador Diocesano</option>}
                  </select>
                </div>
                {isAdmin && editModal.role !== 'admin_diocesano' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Pastoral asignada
                    </label>
                    <select
                      value={editModal.pastoralId}
                      onChange={(e) => setEditModal({...editModal, pastoralId: e.target.value})}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                    >
                      {availablePastorals.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nueva contraseÃ±a (dejar en blanco para mantener la actual)
                  </label>
                  <input
                    type="password"
                    minLength={6}
                    placeholder="MÃ­nimo 6 caracteres (opcional)"
                    value={editModal.password}
                    onChange={(e) => setEditModal({...editModal, password: e.target.value})}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setEditModal(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[#0A6EB4] px-5 py-2 text-xs font-semibold text-white hover:bg-[#085A94] cursor-pointer"
              >
                Guardar Cambios
              </button>
            </div>
          </form>
        </div>
      )}

      {cardPreset && (
        <CelebrationCardModal preset={cardPreset} onClose={() => setCardPreset(null)} />
      )}
    </div>
  );
}
