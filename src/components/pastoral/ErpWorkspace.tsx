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
import {api, type ErpDashboardData} from '../../lib/api';
import type {
  AuthUser,
  DiocesanEvent,
  EventStatus,
  FinanceType,
  Pastoral,
  PastoralStatus,
  ProspectStage,
  UserRole,
} from '../../types';
import {CelebrationCardModal, type CelebrationCardPreset} from './CelebrationCardModal';

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
  {hex: '#8D4999', label: 'Púrpura Cruz'},
  {hex: '#109A51', label: 'Verde Esperanza'},
  {hex: '#E6332A', label: 'Rojo Espíritu'},
];

function formatPen(amount: number): string {
  return `S/ ${amount.toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function ErpWorkspace({user, onLogout, onGoPublic}: ErpWorkspaceProps) {
  const isAdmin = user.role === 'admin_diocesano';
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
  const [adminTab, setAdminTab] = useState<'finances' | 'documents' | 'users'>('finances');

  // Modals / Drawers
  const [cardPreset, setCardPreset] = useState<CelebrationCardPreset | null>(null);
  const [showNewPastoral, setShowNewPastoral] = useState(false);
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
  const defaultTargetPastoralId =
    activePastoral?.id ?? user.pastoralId ?? availablePastorals[0]?.id ?? 'pas-juvenil';

  const pastoralMap = new Map<string, Pastoral>(
    availablePastorals.map((p) => [p.id, p]),
  );

  // New Pastoral Form (Admin only)
  const [npName, setNpName] = useState('');
  const [npCode, setNpCode] = useState('');
  const [npCoordinator, setNpCoordinator] = useState('');
  const [npAdviser, setNpAdviser] = useState('');
  const [npParishes, setNpParishes] = useState('12');
  const [npFocus, setNpFocus] = useState('');
  const [npColor, setNpColor] = useState('#0A6EB4');
  const [npDesc, setNpDesc] = useState('');

  // Edit Own Pastoral Form (Personalización)
  const [epName, setEpName] = useState('');
  const [epCoordinator, setEpCoordinator] = useState('');
  const [epAdviser, setEpAdviser] = useState('');
  const [epParishes, setEpParishes] = useState('1');
  const [epFocus, setEpFocus] = useState('');
  const [epColor, setEpColor] = useState('#0A6EB4');
  const [epDesc, setEpDesc] = useState('');

  useEffect(() => {
    if (activePastoral) {
      setEpName(activePastoral.name);
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
        coordinatorName: npCoordinator,
        adviserName: npAdviser || 'Por asignar',
        parishCount: Number(npParishes) || 0,
        focusArea: npFocus,
        accentColor: npColor,
        description: npDesc,
        status: 'Activa',
      });
      setNpName('');
      setNpCode('');
      setNpCoordinator('');
      setNpAdviser('');
      setNpFocus('');
      setNpDesc('');
      setShowNewPastoral(false);
      notify('ok', 'Pastoral creada en el catálogo diocesano.');
      await refreshData();
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'No se pudo crear la pastoral.');
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

  // Prospect Form
  const [prName, setPrName] = useState('');
  const [prParish, setPrParish] = useState('');
  const [prDecanato, setPrDecanato] = useState('Decanato Chiclayo Centro');
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
        decanato: prDecanato,
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
  const [memDecanato, setMemDecanato] = useState('Decanato Chiclayo Centro');
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
        decanato: memDecanato,
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
  const [evParish, setEvParish] = useState('Catedral Santa María');
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
      notify('ok', 'Movimiento registrado en la tesorería de la pastoral.');
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

  const sectionLabels: Record<ErpSection, string> = {
    resumen: activePastoral ? `Panel · ${activePastoral.shortName}` : 'Resumen Diocesano',
    crm: 'CRM Prospectos',
    pastorals: activePastoral ? 'Identidad de Mi Pastoral' : 'Pastorales de la Diócesis',
    members: 'Miembros y Tarjetas',
    events: 'Agenda y Asistencia',
    admin: 'Tesorería, Actas y Usuarios',
  };

  const navItems: Array<{id: ErpSection; label: string; icon: typeof LayoutDashboard}> = [
    {id: 'resumen', label: 'Panel General', icon: LayoutDashboard},
    {id: 'crm', label: 'CRM Prospectos', icon: UserCheck},
    {id: 'pastorals', label: activePastoral ? 'Mi Pastoral' : 'Pastorales', icon: BookOpen},
    {id: 'members', label: 'Miembros y Tarjetas', icon: Users},
    {id: 'events', label: 'Agenda y Asistencia', icon: CalendarDays},
    {id: 'admin', label: 'Tesorería y Actas', icon: DollarSign},
  ];

  const filteredProspects = (data?.prospects ?? []).filter((p) => {
    const matchStage = crmFilter === 'Todos' ? true : p.stage === crmFilter;
    const q = crmSearch.trim().toLowerCase();
    const matchQ =
      !q ||
      p.fullName.toLowerCase().includes(q) ||
      p.parish.toLowerCase().includes(q) ||
      p.decanato.toLowerCase().includes(q);
    return matchStage && matchQ;
  });

  const filteredMembers = (data?.members ?? []).filter((m) => {
    const matchPas = memberPastoralFilter === 'all' ? true : m.pastoralId === memberPastoralFilter;
    const q = memberSearch.trim().toLowerCase();
    const matchQ =
      !q ||
      m.fullName.toLowerCase().includes(q) ||
      m.parish.toLowerCase().includes(q) ||
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
                src="/assets/aistudio/PJ_8x_b40a6c17.png"
                alt="Pastoral Juvenil Chiclayo"
                className="h-8 w-auto object-contain shrink-0"
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0">
                <p className="text-sm font-bold tracking-tight text-slate-900 truncate">
                  {activePastoral ? activePastoral.shortName : 'ERP Diocesano'}
                </p>
                <p className="text-[11px] font-mono text-slate-400 truncate">
                  {activePastoral ? `${activePastoral.code} · Independiente` : 'Vista Global Chiclayo'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900 cursor-pointer"
              aria-label="Cerrar menú"
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
                Espacio de Pastoral
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
                {availablePastorals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} · {p.shortName}
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
              title="Cerrar sesión"
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
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="text-sm text-slate-500 truncate">
              <span>Diócesis de Chiclayo</span>
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
                  title: activePastoral ? activePastoral.name : 'Pastoral Juvenil P. San José Obrero',
                  subtitle: activePastoral
                    ? activePastoral.focusArea
                    : '¡Gracias por su servicio y entrega!',
                  dateLabel: '5 de Noviembre',
                  yearsLabel: '3 Años',
                  message: 'Sigamos anunciando la alegría del Evangelio entre los jóvenes de Chiclayo.',
                })
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" style={{color: activeAccent}} />
              Diseñar Tarjeta
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
          {/* Personalized Pastoral Identity Strip when inside a single Pastoral workspace */}
          {activePastoral && (
            <div className="rounded-xl border border-slate-200 bg-white px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{backgroundColor: activeAccent}}
                  />
                  <span className="font-mono font-semibold tabular-nums">{activePastoral.code}</span>
                  <span>·</span>
                  <span>ERP y Tesorería Independiente</span>
                  <span>·</span>
                  <span className="font-mono tabular-nums">{activePastoral.parishCount} parroquias</span>
                </div>
                <h1 className="text-lg font-bold text-slate-900">{activePastoral.name}</h1>
                <p className="text-xs text-slate-600">
                  Coord.: {activePastoral.coordinatorName} · Asesor: {activePastoral.adviserName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSection('pastorals')}
                className="self-start sm:self-auto rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
              >
                Personalizar Mi Pastoral
              </button>
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
                aria-label="Cerrar notificación"
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
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-5">
                      <p className="text-xs text-slate-500">
                        {activePastoral ? 'Actividades Próximas' : 'Pastorales Activas'}
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
                    <div className="rounded-xl border border-slate-200 bg-white p-5">
                      <p className="text-xs text-slate-500">Prospectos CRM Abiertos</p>
                      <p className="mt-2 font-mono text-2xl font-bold text-[#0A6EB4] tabular-nums">
                        {data.summary.openProspects}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-5">
                      <p className="text-xs text-slate-500">Miembros Activos</p>
                      <p className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                        {data.summary.activeMembers}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-5">
                      <p className="text-xs text-slate-500">
                        {activePastoral ? 'Saldo Tesorería Propia' : 'Saldo Consolidado Diócesis'}
                      </p>
                      <p className="mt-2 font-mono text-2xl font-bold text-[#109A51] tabular-nums">
                        {formatPen(data.summary.balancePen)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    <div className="lg:col-span-8 rounded-xl border border-slate-200 bg-white overflow-hidden">
                      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                        <h2 className="text-sm font-semibold text-slate-900">
                          {activePastoral
                            ? `Últimas Actas y Documentos · ${activePastoral.shortName}`
                            : 'Pastorales de la Diócesis (Acceso Independiente)'}
                        </h2>
                        <button
                          type="button"
                          onClick={() => setSection(activePastoral ? 'admin' : 'pastorals')}
                          className="text-xs font-medium text-[#0A6EB4] hover:underline cursor-pointer"
                        >
                          {activePastoral ? 'Ir a Actas y Tesorería' : 'Gestionar catálogo'}
                        </button>
                      </div>

                      {activePastoral ? (
                        data.documents.length === 0 ? (
                          <div className="p-8 text-center text-xs text-slate-500">
                            Aún no hay actas registradas en {activePastoral.shortName}. Puedes agregar la primera en Tesorería y Actas.
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
                                <th className="px-5 py-3 font-medium">Código</th>
                                <th className="px-5 py-3 font-medium">Pastoral</th>
                                <th className="px-5 py-3 font-medium">Coordinación</th>
                                <th className="px-5 py-3 font-medium text-right">Parroquias</th>
                                <th className="px-5 py-3 font-medium text-right">Espacio ERP</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {data.pastorals.map((p) => (
                                <tr key={p.id} className="hover:bg-slate-50/70">
                                  <td className="px-5 py-3 font-mono text-slate-500 tabular-nums">
                                    {p.code}
                                  </td>
                                  <td className="px-5 py-3 font-medium text-slate-900">{p.name}</td>
                                  <td className="px-5 py-3 text-slate-600">{p.coordinatorName}</td>
                                  <td className="px-5 py-3 font-mono text-right text-slate-700 tabular-nums">
                                    {p.parishCount}
                                  </td>
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
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-white p-5 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <h2 className="text-sm font-semibold text-slate-900">
                          Últimos Prospectos CRM
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
                          No hay prospectos registrados aún en este espacio pastoral.
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
                                {pr.parish} · {pr.stage}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 2. CRM PROSPECTOS */}
              {section === 'crm' && (
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
                      <input
                        type="text"
                        placeholder="Decanato"
                        value={prDecanato}
                        onChange={(e) => setPrDecanato(e.target.value)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-[#0A6EB4] focus:outline-none"
                      />
                      <input
                        type="tel"
                        placeholder="WhatsApp / Teléfono"
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
                        placeholder="Buscar prospecto por nombre, parroquia o decanato..."
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
                              <th className="px-4 py-3 font-medium">Parroquia / Decanato</th>
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
                                  <p className="text-slate-400">{pr.decanato}</p>
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
                                  <div className="inline-flex items-center gap-2">
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
                                      onClick={async () => {
                                        await api.deleteProspect(pr.id);
                                        await refreshData();
                                      }}
                                      className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                                      aria-label="Eliminar prospecto"
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

              {/* 3. MI PASTORAL (Personalización) o CATÁLOGO DE PASTORALES (Admin Global) */}
              {section === 'pastorals' && (
                <div className="space-y-6">
                  {activePastoral ? (
                    <form
                      onSubmit={handleUpdateOwnPastoral}
                      className="rounded-xl border border-slate-200 bg-white p-6 space-y-5 max-w-3xl"
                    >
                      <div className="border-b border-slate-100 pb-4">
                        <h2 className="text-base font-bold text-slate-900">
                          Personalización de {activePastoral.name}
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">
                          Estos datos identifican a tu pastoral en su ERP independiente y en el portal público de la Diócesis.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            Nombre oficial de la Pastoral
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
                            Asesor espiritual / Sacerdote
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
                            Parroquias o comunidades vinculadas
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={epParishes}
                            onChange={(e) => setEpParishes(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono"
                          />
                        </div>
                        <div>
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
                          Descripción pública
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
                        Guardar Personalización
                      </button>
                    </form>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-600">
                          Cada pastoral creada aquí cuenta con su propio espacio ERP, tesorería, CRM y archivo de actas independiente.
                        </p>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => setShowNewPastoral((v) => !v)}
                            className="inline-flex items-center gap-2 rounded-lg bg-[#0A6EB4] px-4 py-2 text-xs font-semibold text-white hover:bg-[#085A94] whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Crear Pastoral / Sede
                          </button>
                        )}
                      </div>

                      {showNewPastoral && isAdmin && (
                        <form
                          onSubmit={handleCreatePastoral}
                          className="rounded-xl border border-slate-200 bg-white p-5 grid grid-cols-1 gap-4 sm:grid-cols-3"
                        >
                          <input
                            type="text"
                            required
                            placeholder="Nombre (ej. Pastoral Juvenil Pomalca) *"
                            value={npName}
                            onChange={(e) => setNpName(e.target.value)}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-[#0A6EB4] focus:outline-none"
                          />
                          <input
                            type="text"
                            placeholder="Código (ej. PJ-POM)"
                            value={npCode}
                            onChange={(e) => setNpCode(e.target.value)}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-[#0A6EB4] focus:outline-none"
                          />
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
                            placeholder="Asesor sacerdotal"
                            value={npAdviser}
                            onChange={(e) => setNpAdviser(e.target.value)}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-[#0A6EB4] focus:outline-none"
                          />
                          <input
                            type="number"
                            min={0}
                            placeholder="N.° Parroquias / Capillas"
                            value={npParishes}
                            onChange={(e) => setNpParishes(e.target.value)}
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
                            placeholder="Territorio o área de enfoque"
                            value={npFocus}
                            onChange={(e) => setNpFocus(e.target.value)}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-[#0A6EB4] focus:outline-none"
                          />
                          <input
                            type="text"
                            placeholder="Descripción breve"
                            value={npDesc}
                            onChange={(e) => setNpDesc(e.target.value)}
                            className="sm:col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-[#0A6EB4] focus:outline-none"
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
                        {data.pastorals.map((pas) => (
                          <div
                            key={pas.id}
                            className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between gap-4"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                  <span
                                    className="h-2.5 w-2.5 rounded-full shrink-0"
                                    style={{backgroundColor: pas.accentColor}}
                                  />
                                  <span className="font-mono font-semibold tabular-nums">{pas.code}</span>
                                  <span>·</span>
                                  <span className="font-mono tabular-nums">{pas.parishCount} parroquias</span>
                                </div>
                                <select
                                  value={pas.status}
                                  onChange={(e) =>
                                    void handlePastoralStatusChange(pas.id, e.target.value as PastoralStatus)
                                  }
                                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800"
                                >
                                  <option value="Activa">Activa</option>
                                  <option value="En Formación">En Formación</option>
                                  <option value="Pausa">Pausa</option>
                                </select>
                              </div>

                              <h3 className="mt-2 text-base font-semibold text-slate-900">{pas.name}</h3>
                              <p className="mt-1 text-xs text-slate-600">{pas.description}</p>
                            </div>

                            <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                              <div>
                                <p>
                                  Coord.:{' '}
                                  <span className="font-medium text-slate-800">{pas.coordinatorName}</span>
                                </p>
                                <p>Asesor: {pas.adviserName}</p>
                              </div>
                              <div className="flex items-center gap-2">
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
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      await api.deletePastoral(pas.id);
                                      await refreshData();
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                                    aria-label="Eliminar pastoral"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
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

                    <button
                      type="button"
                      onClick={() => setShowNewMember((v) => !v)}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#0A6EB4] px-4 py-2 text-xs font-semibold text-white hover:bg-[#085A94] whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Agregar Miembro
                    </button>
                  </div>

                  {showNewMember && (
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
                      <input
                        type="text"
                        placeholder="Decanato"
                        value={memDecanato}
                        onChange={(e) => setMemDecanato(e.target.value)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                      />
                      <input
                        type="tel"
                        placeholder="Teléfono / WhatsApp"
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
                        No hay miembros registrados todavía en este espacio pastoral.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                            <tr>
                              <th className="px-4 py-3 font-medium">Integrante</th>
                              <th className="px-4 py-3 font-medium">Pastoral</th>
                              <th className="px-4 py-3 font-medium">Parroquia / Decanato</th>
                              <th className="px-4 py-3 font-medium">Cumpleaños</th>
                              <th className="px-4 py-3 font-medium text-right">Pieza Gráfica</th>
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
                                  <p className="text-slate-400">{m.decanato}</p>
                                </td>
                                <td className="px-4 py-3 font-mono text-slate-600 tabular-nums">
                                  {m.birthDate}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="inline-flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setCardPreset({
                                          mode: 'birthday',
                                          title: m.fullName,
                                          subtitle: `${m.roleTitle} · ${pastoralMap.get(m.pastoralId)?.shortName ?? 'Pastoral Juvenil'}`,
                                          dateLabel: m.birthDate,
                                          message: `Agradecemos tu entrega y alegría en ${m.parish}. ¡Que Dios bendiga tu vida y vocación de servicio!`,
                                        })
                                      }
                                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-[#8D4999] hover:bg-purple-50 cursor-pointer whitespace-nowrap"
                                    >
                                      <Gift className="h-3 w-3" />
                                      Tarjeta
                                    </button>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        await api.deleteMember(m.id);
                                        await refreshData();
                                      }}
                                      className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                                      aria-label="Eliminar miembro"
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

              {/* 5. AGENDA Y ASISTENCIA */}
              {section === 'events' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-600">
                      Agenda propia de {activePastoral ? activePastoral.shortName : 'la Diócesis'}. Marca "Público" para mostrarla en el portal web.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowNewEvent((v) => !v)}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#0A6EB4] px-4 py-2 text-xs font-semibold text-white hover:bg-[#085A94] whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Nueva Actividad
                    </button>
                  </div>

                  {showNewEvent && (
                    <form
                      onSubmit={handleCreateEvent}
                      className="rounded-xl border border-slate-200 bg-white p-5 grid grid-cols-1 gap-4 sm:grid-cols-3"
                    >
                      <input
                        type="text"
                        required
                        placeholder="Título de la actividad *"
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
                        <option value="Formación">Formación</option>
                        <option value="Retiro">Retiro</option>
                        <option value="Misión">Misión</option>
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
                        No hay actividades programadas aún en esta pastoral.
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
                              <th className="px-4 py-3 font-medium text-right">Eliminar</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {data.events.map((ev) => (
                              <tr key={ev.id} className="hover:bg-slate-50/70">
                                <td className="px-4 py-3">
                                  <p className="font-semibold text-slate-900">{ev.title}</p>
                                  <p className="text-slate-500">{ev.location}</p>
                                </td>
                                <td className="px-4 py-3 font-mono text-slate-600 tabular-nums">
                                  {ev.date} · {ev.time}
                                </td>
                                <td className="px-4 py-3 text-slate-700">
                                  {pastoralMap.get(ev.pastoralId)?.shortName ?? 'General'}
                                </td>
                                <td className="px-4 py-3 font-mono text-right tabular-nums">
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
                                </td>
                                <td className="px-4 py-3">
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
                                    {ev.isPublic ? 'Público' : 'Interno'}
                                  </button>
                                </td>
                                <td className="px-4 py-3">
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
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      await api.deleteEvent(ev.id);
                                      await refreshData();
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                                    aria-label="Eliminar actividad"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
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

              {/* 6. TESORERÍA, ACTAS Y USUARIOS (Independiente por Pastoral) */}
              {section === 'admin' && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-200/70 p-1 w-fit">
                      <button
                        type="button"
                        onClick={() => setAdminTab('finances')}
                        className={`rounded-md px-3.5 py-1.5 text-xs font-medium cursor-pointer ${
                          adminTab === 'finances'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Tesorería Independiente (S/)
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdminTab('documents')}
                        className={`rounded-md px-3.5 py-1.5 text-xs font-medium cursor-pointer ${
                          adminTab === 'documents'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Actas y Prospectos
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
                          Accesos y Coordinadores
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-slate-500">
                      {activePastoral
                        ? `Ámbito aislado: ${activePastoral.name}`
                        : 'Ámbito global: Todas las pastorales'}
                    </p>
                  </div>

                  {adminTab === 'finances' && (
                    <div className="space-y-5">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="rounded-xl border border-slate-200 bg-white p-5">
                          <p className="text-xs text-slate-500">
                            Ingresos · {activePastoral ? activePastoral.shortName : 'Diócesis'}
                          </p>
                          <p className="mt-1 font-mono text-xl font-bold text-[#109A51] tabular-nums">
                            {formatPen(data.summary.totalIncomePen)}
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-5">
                          <p className="text-xs text-slate-500">
                            Egresos · {activePastoral ? activePastoral.shortName : 'Diócesis'}
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
                            Esta pastoral aún no registra movimientos en su tesorería independiente.
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
                                <th className="px-4 py-3 font-medium text-right">Eliminar</th>
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
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        await api.deleteFinance(f.id);
                                        await refreshData();
                                      }}
                                      className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                                      aria-label="Eliminar movimiento"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
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
                      <form
                        onSubmit={handleCreateDocument}
                        className="rounded-xl border border-slate-200 bg-white p-5 grid grid-cols-1 gap-3 sm:grid-cols-4"
                      >
                        <input
                          type="text"
                          required
                          placeholder="Título de acta o prospecto *"
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

                      {data.documents.length === 0 ? (
                        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-500">
                          No hay actas ni prospectos archivados todavía en esta pastoral.
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
                                  {pastoralMap.get(doc.pastoralId)?.shortName ?? 'Diocesana'} · {doc.author}
                                </span>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await api.deleteDocument(doc.id);
                                    await refreshData();
                                  }}
                                  className="hover:text-red-600 cursor-pointer"
                                  aria-label="Eliminar documento"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
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
                            Crear acceso independiente para coordinador o tesorero
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {isAdmin
                              ? 'Cada coordinador o tesorero que crees aquí solo verá su propia pastoral (su tesorería, sus actas, sus miembros y su CRM).'
                              : `Los usuarios que registres pertenecerán exclusivamente al equipo de ${activePastoral?.name ?? 'tu pastoral'}.`}
                          </p>
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
                            minLength={8}
                            placeholder="Contraseña inicial (mín. 8) *"
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
                                <option value="">Acceso global a toda la Diócesis</option>
                              ) : (
                                availablePastorals.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.code} · {p.name}
                                  </option>
                                ))
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
                              <th className="px-4 py-3 font-medium text-right">Acción</th>
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
                                    ? 'Toda la Diócesis'
                                    : pastoralMap.get(u.pastoralId ?? '')?.name ?? 'Sin asignar'}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {u.id !== user.id && (
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        await api.deleteUser(u.id);
                                        await refreshData();
                                      }}
                                      className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                                      aria-label="Eliminar usuario"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  )}
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

      {cardPreset && (
        <CelebrationCardModal preset={cardPreset} onClose={() => setCardPreset(null)} />
      )}
    </div>
  );
}
