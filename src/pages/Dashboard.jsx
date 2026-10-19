import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import { 
  LogOut, 
  Users, 
  Search, 
  RefreshCw, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  ExternalLink, 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  Database, 
  Eye, 
  X, 
  FileCheck,
  ShieldCheck,
  FolderOpen,
  XCircle,
  MessageCircle,
  PhoneCall,
  AlertCircle,
  Phone,
  UserCheck,
  PieChart,
  Key,
  Copy,
  Check,
  Shield,
  Shuffle,
  Layers
} from 'lucide-react';

// Portal Oficial de Consulta Pública
const PORTAL_CONSULTA_URL = "https://amigosdeleoncix.onrender.com/";

// Formulario Oficial de Google Forms (Fase 2)
const GOOGLE_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSfO_z7lnEDjQR37y7V7uh9gEsFs5ZNlznvM6_GyeKiAljmlmA/viewform";

// Formato Oficial de la Carta de Recomendación (Google Drive)
const CARTA_RECOMENDACION_URL = "https://drive.google.com/file/d/1SvOr6zyyG2al2vVhZH3ryfgFVaR04Uyz/view?usp=sharing";

// Limpiar fecha de nacimiento u otros prefijos que puedan estar en el nombre (ej. "19/07/1981 ROSA GARCÍA GALLEGOS")
const cleanVolunteerName = (name) => {
  if (!name) return '';
  return name.replace(/^\d{1,2}\/\d{1,2}\/\d{2,4}\s*[-–—:]*\s*/, '').trim();
};

// Generar enlace directo a WhatsApp con mensaje personalizado incluyendo el enlace al formulario oficial, carta de recomendación y portal de consulta
const getWhatsAppContactUrl = (telefono, nombres) => {
  if (!telefono) return null;
  const cleanPhone = String(telefono).replace(/\D/g, '');
  if (!cleanPhone) return null;
  const name = cleanVolunteerName(nombres);
  const msg = `¡Hola *${name}*! 👋\n\nTe saludamos con alegría del equipo de Voluntariado de la *Diócesis de Chiclayo* para la Visita del Santo Padre 🕊️✨.\n\nNotamos que estás registrado/a en el Padrón General, pero aún no registramos tus documentos de la *Fase 2*.\n\n📄 *Sube tu documentación en el siguiente formulario oficial:*\n${GOOGLE_FORM_URL}\n\n📥 *Descarga aquí el formato oficial de la Carta de Recomendación:*\n${CARTA_RECOMENDACION_URL}\n\n🔍 *Si ya enviaste tu documentación o deseas dar seguimiento a tu postulación, valida tu estado aquí:*\n${PORTAL_CONSULTA_URL}\n\n¡Muchas gracias por tu compromiso y vocación de servicio! 🙏✨`;
  // Usamos directamente api.whatsapp.com/send para evitar que el redireccionador wa.me corrompa los emojis UTF-8 en rombos
  return `https://api.whatsapp.com/send/?phone=51${cleanPhone}&text=${encodeURIComponent(msg)}`;
};

export default function Dashboard() {
  const { user, logout } = useAuth();

  // Roles y permisos
  const isAdmin = user?.rol === 'admin';
  const isComision = user?.rol === 'comision' || user?.rol === 'colaborador' || isAdmin;
  const isLider = user?.rol === 'lider';
  const isCoordinador = user?.rol === 'coordinador';
  
  // Pestaña activa: 'fase2' (Google Forms), 'fase1' (Padrón General), o 'sin_fase2' (Pendientes de enviar Fase 2)
  const [activeTab, setActiveTab] = useState('fase2');

  // Datos y paginación
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // Para Fase 2: 'ALL', 'SELECCIONADO', 'EN REVISIÓN', 'NO SELECCIONADO', 'PENDIENTE'
  const [fase1Filter, setFase1Filter] = useState('ALL'); // Para Fase 1: 'ALL', 'SIN_FASE2', 'CON_FASE2'
  const [contactFilter, setContactFilter] = useState('ALL'); // Para Sin Fase 2: 'ALL', 'NO_CONTACTADOS', 'CONTACTADOS'
  const [collaboratorFilter, setCollaboratorFilter] = useState('ALL'); // 'ALL', 'UNASSIGNED', o nombre del colaborador

  // Filtros de jerarquía y cuadrillas
  const [liderFilter, setLiderFilter] = useState(isLider ? (user?.lider_nombre || 'ALL') : 'ALL');
  const [coordinadorFilter, setCoordinadorFilter] = useState(isCoordinador ? (user?.coordinador_nombre || 'ALL') : 'ALL');
  const [hierarchyData, setHierarchyData] = useState({ lideres: [], coordinadoresPorLider: {} });

  const [updatingId, setUpdatingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalRecords, setTotalRecords] = useState(0);

  // Modal Unificado de Reparto, Cuadrillas y Colaboradores
  const [showDistributeModal, setShowDistributeModal] = useState(false);
  const [modalTab, setModalTab] = useState('cuadrillas'); // 'cuadrillas', 'organigrama', 'colaboradores', 'cuentas'
  const [collaboratorNamesInput, setCollaboratorNamesInput] = useState('');
  const [distributing, setDistributing] = useState(false);
  const [distributeMsg, setDistributeMsg] = useState(null);
  const [collaboratorsStats, setCollaboratorsStats] = useState([]);
  const [loadingCollabStats, setLoadingCollabStats] = useState(false);
  const [copiedCreds, setCopiedCreds] = useState(false);

  // Estados específicos para Chocoloteo de Cuadrillas
  const [cuadrillasHierarchyInput, setCuadrillasHierarchyInput] = useState('');
  const [cuadrillasShuffle, setCuadrillasShuffle] = useState(true);
  const [cuadrillasTarget, setCuadrillasTarget] = useState('sin_fase2');
  const [cuadrillasStats, setCuadrillasStats] = useState([]);
  const [loadingCuadrillasStats, setLoadingCuadrillasStats] = useState(false);

  // Edición manual de asignación en ficha de voluntario
  const [editLider, setEditLider] = useState('');
  const [editCoordinador, setEditCoordinador] = useState('');
  const [editCuadrilla, setEditCuadrilla] = useState('');
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [assignSuccessMsg, setAssignSuccessMsg] = useState(null);

  // Estadísticas globales (KPIs)
  const [stats, setStats] = useState({
    generalTotal: 7241,
    fase2Total: 0,
    seleccionados: 0,
    enRevision: 0,
    noSeleccionados: 0,
    pendientes: 0,
    sinFase2: 5214,
    conFase2: 2027,
    contactados: 0,
    sinContactar: 5214
  });

  // Estado de sincronización en vivo
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState(null);

  // Modal de detalle
  const [selectedVoluntario, setSelectedVoluntario] = useState(null);

  // Sincronizar campos de edición cuando se selecciona un voluntario
  useEffect(() => {
    if (selectedVoluntario) {
      setEditLider(selectedVoluntario.lider_nombre || '');
      setEditCoordinador(selectedVoluntario.coordinador_nombre || '');
      setEditCuadrilla(selectedVoluntario.cuadrilla_codigo || '');
      setAssignSuccessMsg(null);
    }
  }, [selectedVoluntario]);

  // Debounce para búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setCurrentPage(1); // Reset a primera página al buscar
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset de página al cambiar de pestaña o filtro
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, statusFilter, fase1Filter, contactFilter, collaboratorFilter, liderFilter, coordinadorFilter]);

  // Cargar estadísticas globales una sola vez o al sincronizar
  const fetchGlobalStats = useCallback(async () => {
    try {
      const [
        { count: generalCount },
        { count: f2Total },
        { count: selCount },
        { count: revCount },
        { count: noSelCount },
        { count: pendCount },
        { count: sinF2Count },
        { count: contactadosCount }
      ] = await Promise.all([
        supabase.from('voluntarios_general').select('*', { count: 'exact', head: true }),
        supabase.from('voluntarios').select('*', { count: 'exact', head: true }),
        supabase.from('voluntarios').select('*', { count: 'exact', head: true }).eq('estado', 'SELECCIONADO'),
        supabase.from('voluntarios').select('*', { count: 'exact', head: true }).eq('estado', 'EN REVISIÓN'),
        supabase.from('voluntarios').select('*', { count: 'exact', head: true }).eq('estado', 'NO SELECCIONADO'),
        supabase.from('voluntarios').select('*', { count: 'exact', head: true }).or('estado.eq.PENDIENTE,estado.is.null'),
        supabase.from('voluntarios_general').select('*', { count: 'exact', head: true }).or('estado.eq.SIN_FASE2,estado.eq.CONTACTADO'),
        supabase.from('voluntarios_general').select('*', { count: 'exact', head: true }).eq('estado', 'CONTACTADO')
      ]);

      const gTotal = generalCount || 7241;
      const sinF2 = sinF2Count ?? 5214;
      const contactados = contactadosCount || 0;
      const sinContactar = Math.max(0, sinF2 - contactados);
      const conF2 = gTotal - sinF2;

      setStats({
        generalTotal: gTotal,
        fase2Total: f2Total || 0,
        seleccionados: selCount || 0,
        enRevision: revCount || 0,
        noSeleccionados: noSelCount || 0,
        pendientes: pendCount || 0,
        sinFase2: sinF2,
        conFase2: conF2,
        contactados: contactados,
        sinContactar: sinContactar
      });
    } catch (err) {
      console.error('Error cargando estadísticas:', err);
    }
  }, []);

  useEffect(() => {
    fetchGlobalStats();
  }, [fetchGlobalStats]);

  // Cargar registros paginados según la pestaña activa
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const isFase2 = activeTab === 'fase2';
      const tableName = isFase2 ? 'voluntarios' : 'voluntarios_general';
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase.from(tableName).select('*', { count: 'exact' });

      // Filtro de búsqueda por DNI o Nombres
      if (debouncedSearch) {
        // Si son solo números, busca directo por DNI exacto o prefijo
        if (/^\d+$/.test(debouncedSearch)) {
          query = query.ilike('dni', `%${debouncedSearch}%`);
        } else {
          query = query.or(`nombres_apellidos.ilike.%${debouncedSearch}%,dni.ilike.%${debouncedSearch}%`);
        }
      }

      // Filtro de estado para Fase 2
      if (isFase2 && statusFilter !== 'ALL') {
        if (statusFilter === 'PENDIENTE') {
          query = query.or('estado.eq.PENDIENTE,estado.is.null');
        } else {
          query = query.eq('estado', statusFilter);
        }
      }

      // Filtro para pestaña exclusiva 'sin_fase2'
      if (activeTab === 'sin_fase2') {
        if (contactFilter === 'CONTACTADOS') {
          query = query.eq('estado', 'CONTACTADO');
        } else if (contactFilter === 'NO_CONTACTADOS') {
          query = query.eq('estado', 'SIN_FASE2');
        } else {
          query = query.or('estado.eq.SIN_FASE2,estado.eq.CONTACTADO');
        }
      }

      // Filtro desplegable dentro de pestaña 'fase1'
      if (activeTab === 'fase1' && fase1Filter !== 'ALL') {
        if (fase1Filter === 'SIN_FASE2') {
          query = query.or('estado.eq.SIN_FASE2,estado.eq.CONTACTADO');
        } else {
          query = query.eq('estado', fase1Filter);
        }
      }

      // Filtro por colaborador asignado (solo para Fase 1 y Sin Fase 2)
      if (activeTab !== 'fase2' && collaboratorFilter !== 'ALL') {
        if (collaboratorFilter === 'UNASSIGNED') {
          query = query.or('fase.eq.1,fase.is.null');
        } else {
          query = query.eq('fase', collaboratorFilter);
        }
      }

      // Filtro por Líder General (Nivel 1)
      const effectiveLider = isLider ? (user?.lider_nombre || '') : liderFilter;
      if (effectiveLider && effectiveLider !== 'ALL') {
        if (effectiveLider === 'UNASSIGNED') {
          query = query.is('lider_nombre', null);
        } else {
          query = query.eq('lider_nombre', effectiveLider);
        }
      }

      // Filtro por Coordinador de Cuadrilla (Nivel 2)
      const effectiveCoordinador = isCoordinador ? (user?.coordinador_nombre || '') : coordinadorFilter;
      if (effectiveCoordinador && effectiveCoordinador !== 'ALL') {
        if (effectiveCoordinador === 'UNASSIGNED') {
          query = query.is('coordinador_nombre', null);
        } else {
          query = query.eq('coordinador_nombre', effectiveCoordinador);
        }
      }

      // Orden y rango de paginación
      query = query.order('nombres_apellidos', { ascending: true }).range(from, to);

      const { data, count, error } = await query;
      if (error) throw error;

      setRecords(data || []);
      setTotalRecords(count || 0);
    } catch (err) {
      console.error('Error consultando registros:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, currentPage, pageSize, debouncedSearch, statusFilter, fase1Filter, contactFilter, collaboratorFilter, liderFilter, coordinadorFilter, isLider, isCoordinador, user]);

  // Cambiar estado de Contactado / No Contactado con el switch
  const handleToggleContactado = async (voluntario) => {
    if (voluntario.estado === 'CON_FASE2') return;

    const isCurrentlyContacted = voluntario.estado === 'CONTACTADO';
    const newEstado = isCurrentlyContacted ? 'SIN_FASE2' : 'CONTACTADO';

    setUpdatingId(voluntario.id);

    // Actualización optimista inmediata en la UI
    setRecords(prev => prev.map(r => r.id === voluntario.id ? { ...r, estado: newEstado } : r));
    if (selectedVoluntario && selectedVoluntario.id === voluntario.id) {
      setSelectedVoluntario(prev => ({ ...prev, estado: newEstado }));
    }

    try {
      const { error } = await supabase
        .from('voluntarios_general')
        .update({ estado: newEstado })
        .eq('id', voluntario.id);

      if (error) throw error;

      // Actualizar contadores globales
      setStats(prev => ({
        ...prev,
        contactados: isCurrentlyContacted ? Math.max(0, prev.contactados - 1) : prev.contactados + 1,
        sinContactar: isCurrentlyContacted ? prev.sinContactar + 1 : Math.max(0, prev.sinContactar - 1)
      }));
    } catch (err) {
      console.error('Error al actualizar estado de contacto:', err);
      // Revertir en caso de error
      setRecords(prev => prev.map(r => r.id === voluntario.id ? { ...r, estado: voluntario.estado } : r));
    } finally {
      setUpdatingId(null);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Función para forzar sincronización con Google Sheets en el backend
  const handleSyncNow = async () => {
    setSyncing(true);
    setSyncMsg('Sincronizando con Google Sheets...');
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://voluntarios-backend.onrender.com';
      const res = await fetch(`${apiUrl}/api/sync-fase2`);
      const data = await res.json();
      if (res.ok && data.success) {
        setSyncMsg(`✅ Sincronizado: ${data.total} procesados (${data.saved} guardados).`);
        await fetchGlobalStats();
        await fetchRecords();
      } else {
        setSyncMsg('⚠️ Nota: La sincronización en segundo plano sigue activa.');
        await fetchGlobalStats();
        await fetchRecords();
      }
    } catch (e) {
      setSyncMsg('✅ Actualizando datos...');
      await fetchGlobalStats();
      await fetchRecords();
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(null), 5000);
    }
  };

  // Cargar estadísticas de avance de cada colaborador
  const fetchCollaboratorsStats = useCallback(async () => {
    setLoadingCollabStats(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://voluntarios-backend.onrender.com';
      const res = await fetch(`${apiUrl}/api/collaborators-stats`);
      const data = await res.json();
      if (res.ok) {
        const statsList = Array.isArray(data) ? data : (data.stats || []);
        setCollaboratorsStats(statsList.filter(s => s.name && s.name !== 'Sin asignar'));
      }
    } catch (err) {
      console.error('Error fetching collaborator stats:', err);
    } finally {
      setLoadingCollabStats(false);
    }
  }, []);

  useEffect(() => {
    fetchCollaboratorsStats();
  }, [fetchCollaboratorsStats]);

  // Ejecutar reparto equitativo
  const handleDistribute = async () => {
    const rawNames = collaboratorNamesInput
      .split(/[\n,]+/)
      .map(n => n.trim())
      .filter(n => n.length > 0);

    const names = [...new Set(rawNames)];

    if (names.length === 0) {
      alert('Por favor ingresa al menos un nombre de colaborador.');
      return;
    }

    setDistributing(true);
    setDistributeMsg({ type: 'info', text: `Repartiendo equitativamente entre ${names.length} colaboradores...` });
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://voluntarios-backend.onrender.com';
      const res = await fetch(`${apiUrl}/api/distribute-voluntarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collaborators: names })
      });
      const data = await res.json();
      if (res.ok && (data.success || Array.isArray(data))) {
        setDistributeMsg({ 
          type: 'success', 
          text: `¡Reparto completado con éxito! Se asignaron ${(data.total || data.totalDistributed)?.toLocaleString() || 'los'} postulantes entre ${data.collaborators?.length || names.length} personas.` 
        });
        await fetchCollaboratorsStats();
        await fetchRecords();
        await fetchGlobalStats();
      } else {
        setDistributeMsg({ 
          type: 'error', 
          text: `Error: ${data.error || 'No se pudo completar el reparto.'}` 
        });
      }
    } catch (err) {
      console.error('Error al repartir:', err);
      setDistributeMsg({ 
        type: 'error', 
        text: `Error de conexión: ${err.message}` 
      });
    } finally {
      setDistributing(false);
    }
  };

  // Cargar estadísticas y jerarquía de cuadrillas y líderes
  const fetchCuadrillasStats = useCallback(async () => {
    setLoadingCuadrillasStats(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://voluntarios-backend.onrender.com';
      const [statsRes, optionsRes] = await Promise.all([
        fetch(`${apiUrl}/api/cuadrillas-stats`),
        fetch(`${apiUrl}/api/lideres-coordinadores`)
      ]);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setCuadrillasStats(Array.isArray(statsData) ? statsData : []);
      }
      if (optionsRes.ok) {
        const optionsData = await optionsRes.json();
        setHierarchyData(optionsData || { lideres: [], coordinadoresPorLider: {} });
      }
    } catch (err) {
      console.error('Error fetching cuadrillas stats:', err);
    } finally {
      setLoadingCuadrillasStats(false);
    }
  }, []);

  useEffect(() => {
    fetchCuadrillasStats();
  }, [fetchCuadrillasStats]);

  // Ejecutar reparto y chocoloteo de cuadrillas
  const handleDistributeCuadrillas = async () => {
    const rawLines = cuadrillasHierarchyInput
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);

    if (rawLines.length === 0) {
      alert('Por favor ingresa los nombres de los líderes o la estructura de cuadrillas.');
      return;
    }

    // Parsear líneas tipo:
    // "Carlos Morales: Juan Pérez, María Silva"
    // O si solo ponen el nombre del líder: "Carlos Morales" (se crean cuadrillas 01 a 10)
    const hierarchy = rawLines.map((line, idx) => {
      if (line.includes(':')) {
        const [liderPart, coordsPart] = line.split(':');
        const coords = coordsPart
          .split(/[\n,]+/)
          .map(c => c.trim())
          .filter(Boolean);
        return {
          nombre: liderPart.trim(),
          coordinadores: coords.length > 0 ? coords : [`Cuadrilla ${String(idx + 1).padStart(2, '0')}`]
        };
      } else {
        return {
          nombre: line.trim(),
          coordinadores: Array.from({ length: 10 }, (_, i) => `${line.trim()} - Cuadrilla ${String(i + 1).padStart(2, '0')}`)
        };
      }
    });

    setDistributing(true);
    setDistributeMsg({ type: 'info', text: `🎲 Chocoloteando y repartiendo equitativamente entre ${hierarchy.length} líderes...` });
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://voluntarios-backend.onrender.com';
      const res = await fetch(`${apiUrl}/api/distribute-cuadrillas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hierarchy,
          shuffle: cuadrillasShuffle,
          targetFase: cuadrillasTarget
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDistributeMsg({
          type: 'success',
          text: `🎉 ¡Chocoloteo exitoso! Se repartieron ${data.total?.toLocaleString()} postulantes entre ${data.summary?.length} líderes y sus coordinadores.`
        });
        await fetchCuadrillasStats();
        await fetchRecords();
        await fetchGlobalStats();
      } else {
        setDistributeMsg({
          type: 'error',
          text: `Error: ${data.error || 'No se pudo completar el reparto de cuadrillas.'}`
        });
      }
    } catch (err) {
      console.error('Error al repartir cuadrillas:', err);
      setDistributeMsg({ type: 'error', text: `Error de conexión: ${err.message}` });
    } finally {
      setDistributing(false);
    }
  };

  // Guardar asignación individual en ficha de voluntario
  const handleSaveSingleAssignment = async () => {
    if (!selectedVoluntario) return;
    setSavingAssignment(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://voluntarios-backend.onrender.com';
      const res = await fetch(`${apiUrl}/api/asignar-cuadrilla`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: [selectedVoluntario.id],
          lider_nombre: editLider.trim() || null,
          coordinador_nombre: editCoordinador.trim() || null,
          cuadrilla_codigo: editCuadrilla.trim() || null
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAssignSuccessMsg('✅ Asignación guardada con éxito.');
        setSelectedVoluntario(prev => ({
          ...prev,
          lider_nombre: editLider.trim() || null,
          coordinador_nombre: editCoordinador.trim() || null,
          cuadrilla_codigo: editCuadrilla.trim() || null
        }));
        await fetchRecords();
        await fetchCuadrillasStats();
      } else {
        alert(data.error || 'No se pudo guardar la asignación.');
      }
    } catch (err) {
      alert('Error de conexión: ' + err.message);
    } finally {
      setSavingAssignment(false);
      setTimeout(() => setAssignSuccessMsg(null), 3000);
    }
  };

  const totalPages = Math.ceil(totalRecords / pageSize) || 1;

  // Lista de coordinadores disponibles según el filtro o rol de líder actual
  const effectiveLeaderSelected = isLider ? (user?.lider_nombre || '') : liderFilter;
  const availableCoordinators = (effectiveLeaderSelected && effectiveLeaderSelected !== 'ALL' && effectiveLeaderSelected !== 'UNASSIGNED')
    ? (hierarchyData.coordinadoresPorLider?.[effectiveLeaderSelected] || [])
    : [...new Set(Object.values(hierarchyData.coordinadoresPorLider || {}).flat())];

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col font-sans text-stone-800">
      
      {/* NAVBAR SUPERIOR */}
      <nav className="bg-diocesis-redDark text-white sticky top-0 z-40 shadow-lg border-b-2 border-diocesis-mustard">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/logos/logo_comision_juventud.png" 
              alt="Comisión Diocesana de Juventud" 
              className="w-10 h-10 object-contain drop-shadow"
            />
            <div>
              <span className="font-title font-bold text-lg md:text-xl tracking-wide text-white block leading-tight">
                Panel de Administración
              </span>
              <span className="text-xs text-diocesis-mustardLight font-medium">
                Diócesis de Chiclayo • Padrón de Voluntariado
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-stone-100 transition"
              title="Abrir Consulta Pública en nueva pestaña"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Ver Portal Público
            </a>

            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-bold text-stone-200">{user?.correo || user?.email}</span>
              <span className="text-[10px] text-diocesis-mustard uppercase font-bold tracking-wider">
                {isAdmin ? 'Super Administrador' :
                 isComision ? 'Comisión de Inscripciones' :
                 isLider ? `👑 Líder General: ${user?.lider_nombre || user?.nombre}` :
                 isCoordinador ? `🎖️ Coordinador: ${user?.coordinador_nombre || user?.nombre}` :
                 'Colaborador'}
              </span>
            </div>

            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-diocesis-red hover:bg-diocesis-redLight text-white shadow transition"
              title="Cerrar Sesión"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </nav>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* BANNERS INFORMATIVOS DE ROL Y ALCANCE */}
        {isLider && (
          <div className="p-4 bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-purple-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-diocesis-mustard shrink-0">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-sm md:text-base font-bold font-title">
                  Sector a Cargo: {user?.lider_nombre || user?.nombre}
                </h2>
                <p className="text-xs text-purple-200">
                  Estás visualizando a todos los coordinadores y voluntarios asignados a tu cadena de mando.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowDistributeModal(true);
                setModalTab('organigrama');
                fetchCuadrillasStats();
              }}
              className="px-3.5 py-1.5 bg-diocesis-mustard hover:bg-amber-400 text-stone-900 font-bold rounded-xl text-xs transition shrink-0"
            >
              Ver Avance de mis Cuadrillas →
            </button>
          </div>
        )}

        {isCoordinador && (
          <div className="p-4 bg-gradient-to-r from-emerald-800 to-teal-900 text-white rounded-2xl shadow-sm flex items-center gap-3 border border-emerald-700">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-emerald-200 shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm md:text-base font-bold font-title">
                Cuadrilla Asignada: {user?.coordinador_nombre || user?.nombre}
              </h2>
              <p className="text-xs text-emerald-200">
                Aquí tienes la lista exclusiva de tus voluntarios asignados para contactar por WhatsApp y validar su participación.
              </p>
            </div>
          </div>
        )}

        {/* TARJETAS DE ESTADÍSTICAS (KPIS) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 sm:gap-4">
          
          {/* Total Fase 1 General */}
          <button
            onClick={() => { setActiveTab('fase1'); setFase1Filter('ALL'); }}
            className={`text-left rounded-2xl p-3.5 border transition flex flex-col justify-between ${
              activeTab === 'fase1' && fase1Filter === 'ALL'
                ? 'bg-stone-50 border-diocesis-mustard ring-2 ring-diocesis-mustard/30 shadow-sm'
                : 'bg-white border-stone-200 shadow-sm hover:border-stone-300'
            }`}
          >
            <div className="flex items-center justify-between text-stone-500 mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider">Padrón Fase 1</span>
              <Database className="w-3.5 h-3.5 text-stone-400" />
            </div>
            <div className="text-xl md:text-2xl font-extrabold text-stone-800">
              {stats.generalTotal.toLocaleString()}
            </div>
            <span className="text-[10px] text-stone-500 mt-1">Inscritos Iniciales</span>
          </button>

          {/* Sin Enviar Fase 2 (Por Contactar) */}
          <button
            onClick={() => { setActiveTab('sin_fase2'); }}
            className={`text-left rounded-2xl p-3.5 border transition flex flex-col justify-between ${
              activeTab === 'sin_fase2' || (activeTab === 'fase1' && fase1Filter === 'SIN_FASE2')
                ? 'bg-amber-100/80 border-amber-500 ring-2 ring-amber-400/40 shadow-sm'
                : 'bg-amber-50/70 border-amber-200 shadow-sm hover:border-amber-400'
            }`}
          >
            <div className="flex items-center justify-between text-amber-800 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Sin Enviar F2</span>
              <PhoneCall className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-xl md:text-2xl font-extrabold text-amber-800">
              {stats.sinFase2.toLocaleString()}
            </div>
            <span className="text-[10px] text-amber-700 font-bold mt-1">⚠️ Por contactar</span>
          </button>

          {/* Total Fase 2 Forms */}
          <button
            onClick={() => { setActiveTab('fase2'); setStatusFilter('ALL'); }}
            className={`text-left rounded-2xl p-3.5 border transition flex flex-col justify-between ${
              activeTab === 'fase2'
                ? 'bg-stone-50 border-diocesis-redDark ring-2 ring-diocesis-red/30 shadow-sm'
                : 'bg-white border-diocesis-mustard/60 shadow-sm hover:border-diocesis-mustard'
            }`}
          >
            <div className="flex items-center justify-between text-diocesis-mustardDark mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Fase 2 Forms</span>
              <FolderOpen className="w-3.5 h-3.5 text-diocesis-mustard" />
            </div>
            <div className="text-xl md:text-2xl font-extrabold text-diocesis-redDark">
              {stats.fase2Total.toLocaleString()}
            </div>
            <span className="text-[10px] text-diocesis-mustardDark font-medium mt-1">Expedientes Únicos</span>
          </button>

          {/* Seleccionados / Validados */}
          <button
            onClick={() => { setActiveTab('fase2'); setStatusFilter('SELECCIONADO'); }}
            className="text-left bg-emerald-50 rounded-2xl p-3.5 border border-emerald-200 shadow-sm hover:border-emerald-400 transition flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-emerald-700 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Seleccionados</span>
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-xl md:text-2xl font-extrabold text-emerald-700">
              {stats.seleccionados.toLocaleString()}
            </div>
            <span className="text-[10px] text-emerald-600 font-semibold mt-1">Pase a Etapa 3</span>
          </button>

          {/* En Revisión / Observados */}
          <button
            onClick={() => { setActiveTab('fase2'); setStatusFilter('EN REVISIÓN'); }}
            className="text-left bg-amber-50 rounded-2xl p-3.5 border border-amber-200 shadow-sm hover:border-amber-400 transition flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-amber-800 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">En Revisión</span>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-xl md:text-2xl font-extrabold text-amber-800">
              {stats.enRevision.toLocaleString()}
            </div>
            <span className="text-[10px] text-amber-700 font-semibold mt-1">Con Observación</span>
          </button>

          {/* No Seleccionados */}
          <button
            onClick={() => { setActiveTab('fase2'); setStatusFilter('NO SELECCIONADO'); }}
            className="text-left bg-rose-50 rounded-2xl p-3.5 border border-rose-200 shadow-sm hover:border-rose-400 transition flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-rose-800 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">No Selecc.</span>
              <XCircle className="w-3.5 h-3.5 text-rose-600" />
            </div>
            <div className="text-xl md:text-2xl font-extrabold text-rose-700">
              {stats.noSeleccionados.toLocaleString()}
            </div>
            <span className="text-[10px] text-rose-600 font-semibold mt-1">No admitidos</span>
          </button>

          {/* Pendientes Fase 2 */}
          <button
            onClick={() => { setActiveTab('fase2'); setStatusFilter('PENDIENTE'); }}
            className="text-left bg-stone-50 rounded-2xl p-3.5 border border-stone-200 shadow-sm hover:border-stone-400 transition flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-stone-600 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Pendientes F2</span>
              <Clock className="w-3.5 h-3.5 text-stone-500" />
            </div>
            <div className="text-xl md:text-2xl font-extrabold text-stone-700">
              {stats.pendientes.toLocaleString()}
            </div>
            <span className="text-[10px] text-stone-500 font-semibold mt-1">Por evaluar</span>
          </button>
        </div>

        {/* BARRA DE CONTROL: PESTAÑAS, BUSCADOR Y ACCIONES */}
        <div className="bg-white rounded-3xl p-4 md:p-6 shadow-sm border border-stone-200 space-y-4">
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Pestañas de Navegación */}
            <div className="inline-flex flex-wrap p-1 bg-stone-100 rounded-2xl border border-stone-200 self-start gap-1">
              <button
                onClick={() => setActiveTab('fase2')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs md:text-sm font-bold transition ${
                  activeTab === 'fase2'
                    ? 'bg-diocesis-redDark text-white shadow'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <FolderOpen className="w-4 h-4" />
                Fase 2: Google Forms
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-extrabold ${
                  activeTab === 'fase2' ? 'bg-diocesis-mustard text-diocesis-redDark' : 'bg-stone-200 text-stone-700'
                }`}>
                  {stats.fase2Total}
                </span>
              </button>

              <button
                onClick={() => { setActiveTab('fase1'); setFase1Filter('ALL'); }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs md:text-sm font-bold transition ${
                  activeTab === 'fase1'
                    ? 'bg-diocesis-redDark text-white shadow'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Database className="w-4 h-4" />
                Fase 1: Padrón General
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-extrabold ${
                  activeTab === 'fase1' ? 'bg-diocesis-mustard text-diocesis-redDark' : 'bg-stone-200 text-stone-700'
                }`}>
                  {stats.generalTotal}
                </span>
              </button>

              <button
                onClick={() => { setActiveTab('sin_fase2'); }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs md:text-sm font-bold transition ${
                  activeTab === 'sin_fase2'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100/80 border border-amber-200/60'
                }`}
                title="Postulantes de Fase 1 que aún no envían documentación para Fase 2"
              >
                <PhoneCall className="w-4 h-4 text-amber-500" />
                ⚠️ Sin Enviar Fase 2
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-extrabold ${
                  activeTab === 'sin_fase2' ? 'bg-white text-amber-800' : 'bg-amber-200 text-amber-900'
                }`}>
                  {stats.sinFase2}
                </span>
              </button>
            </div>

            {/* Acciones Rápidas */}
            <div className="flex items-center gap-2 self-end lg:self-auto flex-wrap">
              {syncMsg && (
                <span className="text-xs font-semibold text-diocesis-mustardDark animate-pulse">
                  {syncMsg}
                </span>
              )}

              {/* Botón Chocolotear Cuadrillas */}
              {isComision && (
                <button
                  onClick={() => {
                    setShowDistributeModal(true);
                    setModalTab('cuadrillas');
                    fetchCuadrillasStats();
                  }}
                  className="inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
                  title="Chocolotear y repartir equitativamente entre los 20 líderes y sus cuadrillas"
                >
                  <Shuffle className="w-3.5 h-3.5 text-white" />
                  <span>🎲 Chocolotear Cuadrillas</span>
                </button>
              )}

              {/* Botón Ver Avance y Organigrama de Cuadrillas */}
              <button
                onClick={() => {
                  setShowDistributeModal(true);
                  setModalTab('organigrama');
                  fetchCuadrillasStats();
                }}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-purple-800 to-indigo-900 hover:from-purple-900 hover:to-indigo-950 text-white rounded-xl text-xs font-bold shadow-sm transition"
                title="Ver organigrama y avance en vivo por líder y cuadrilla"
              >
                <Shield className="w-3.5 h-3.5 text-diocesis-mustard" />
                <span>Avance de Cuadrillas</span>
              </button>

              {/* Botón para abrir modal de reparto de equipo simple */}
              {isComision && (
                <button
                  onClick={() => {
                    setShowDistributeModal(true);
                    setModalTab('colaboradores');
                    fetchCollaboratorsStats();
                  }}
                  className="inline-flex items-center gap-2 px-3.5 py-2 bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-700 rounded-xl text-xs font-bold transition"
                  title="Repartir postulantes sin Fase 2 entre los miembros del equipo"
                >
                  <Users className="w-3.5 h-3.5 text-stone-600" />
                  <span>Reparto Simple</span>
                </button>
              )}

              {isComision && (
                <button
                  onClick={handleSyncNow}
                  disabled={syncing}
                  className="inline-flex items-center gap-2 px-3.5 py-2 bg-stone-50 hover:bg-stone-100 border border-stone-300 rounded-xl text-xs font-bold text-stone-700 transition disabled:opacity-50"
                  title="Sincronizar ahora con la hoja de Google Sheets"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-diocesis-red' : ''}`} />
                  {syncing ? 'Sincronizando...' : 'Sincronizar Sheets'}
                </button>
              )}
            </div>
          </div>

          {/* Filtros y Buscador */}
          <div className="space-y-2.5 pt-2 border-t border-stone-100">
            {/* Fila 1: Búsqueda, Estado de Fase, Cantidad */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              {/* Buscador por DNI / Nombres */}
              <div className="md:col-span-6 lg:col-span-5 relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por DNI o Nombres..."
                  className="w-full pl-10 pr-9 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-diocesis-mustard focus:bg-white transition"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Filtro de estado según la pestaña activa */}
              {activeTab === 'fase2' ? (
                <div className="md:col-span-4 lg:col-span-4">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full py-2.5 px-3 bg-stone-50 border border-stone-300 rounded-xl text-sm font-semibold text-stone-700 focus:outline-none focus:ring-2 focus:ring-diocesis-mustard"
                  >
                    <option value="ALL">Todos los Estados (Fase 2)</option>
                    <option value="SELECCIONADO">✅ Solo Seleccionados ({stats.seleccionados})</option>
                    <option value="EN REVISIÓN">⚠️ En Revisión / Observados ({stats.enRevision})</option>
                    <option value="NO SELECCIONADO">❌ No Seleccionados ({stats.noSeleccionados})</option>
                    <option value="PENDIENTE">⏳ Pendientes ({stats.pendientes})</option>
                  </select>
                </div>
              ) : activeTab === 'fase1' ? (
                <div className="md:col-span-4 lg:col-span-4">
                  <select
                    value={fase1Filter}
                    onChange={(e) => setFase1Filter(e.target.value)}
                    className="w-full py-2.5 px-3 bg-stone-50 border border-stone-300 rounded-xl text-sm font-semibold text-stone-700 focus:outline-none focus:ring-2 focus:ring-diocesis-mustard"
                  >
                    <option value="ALL">Todos en Fase 1 ({stats.generalTotal})</option>
                    <option value="SIN_FASE2">⚠️ Sin enviar Fase 2 / Por contactar ({stats.sinFase2})</option>
                    <option value="CON_FASE2">✅ Ya enviaron Fase 2 ({stats.conFase2})</option>
                  </select>
                </div>
              ) : (
                <div className="md:col-span-4 lg:col-span-4">
                  <select
                    value={contactFilter}
                    onChange={(e) => setContactFilter(e.target.value)}
                    className="w-full py-2.5 px-3 bg-amber-50/70 border border-amber-300 rounded-xl text-sm font-semibold text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="ALL">📋 Todos sin Fase 2 ({stats.sinFase2})</option>
                    <option value="NO_CONTACTADOS">⏳ Pendientes de Contactar ({stats.sinContactar})</option>
                    <option value="CONTACTADOS">📞 Ya Contactados ({stats.contactados})</option>
                  </select>
                </div>
              )}

              {/* Selector de cantidad por página */}
              <div className="md:col-span-2 lg:col-span-3">
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="w-full py-2.5 px-3 bg-stone-50 border border-stone-300 rounded-xl text-sm font-semibold text-stone-700 focus:outline-none focus:ring-2 focus:ring-diocesis-mustard"
                >
                  <option value={25}>25 por página</option>
                  <option value={50}>50 por página</option>
                  <option value={100}>100 por página</option>
                </select>
              </div>
            </div>

            {/* Fila 2: Filtros de Cadena de Mando (Líder y Coordinador) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1 border-t border-dashed border-stone-200">
              {/* Filtro por Líder General */}
              <div className="md:col-span-6 lg:col-span-4">
                <select
                  value={liderFilter}
                  disabled={isLider}
                  onChange={(e) => {
                    setLiderFilter(e.target.value);
                    setCoordinadorFilter('ALL');
                    setCurrentPage(1);
                  }}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold border transition ${
                    liderFilter !== 'ALL'
                      ? 'bg-purple-100/90 text-purple-950 border-purple-400 ring-1 ring-purple-300'
                      : 'bg-purple-50/60 text-purple-900 border-purple-200 hover:border-purple-300'
                  }`}
                >
                  <option value="ALL">👑 Todos los Líderes ({hierarchyData.lideres?.length || 0})</option>
                  <option value="UNASSIGNED">⚪ Sin Líder Asignado</option>
                  {hierarchyData.lideres?.map(l => (
                    <option key={l} value={l}>👑 {l}</option>
                  ))}
                </select>
              </div>

              {/* Filtro por Coordinador de Cuadrilla (Dependiente) */}
              <div className="md:col-span-6 lg:col-span-4">
                <select
                  value={coordinadorFilter}
                  disabled={isCoordinador}
                  onChange={(e) => {
                    setCoordinadorFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold border transition ${
                    coordinadorFilter !== 'ALL'
                      ? 'bg-indigo-100/90 text-indigo-950 border-indigo-400 ring-1 ring-indigo-300'
                      : 'bg-indigo-50/60 text-indigo-900 border-indigo-200 hover:border-indigo-300'
                  }`}
                >
                  <option value="ALL">🎖️ Todos los Coordinadores ({availableCoordinators.length})</option>
                  <option value="UNASSIGNED">⚪ Sin Coordinador</option>
                  {availableCoordinators.map(c => (
                    <option key={c} value={c}>🎖️ {c}</option>
                  ))}
                </select>
              </div>

              {/* Filtro por Colaborador de Contacto Previo (Fase 1) */}
              {activeTab !== 'fase2' && (
                <div className="md:col-span-12 lg:col-span-4">
                  <select
                    value={collaboratorFilter}
                    onChange={(e) => {
                      setCollaboratorFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full py-2 px-3 bg-stone-50 border border-stone-300 rounded-xl text-xs font-semibold text-stone-700"
                  >
                    <option value="ALL">👥 Contacto Simple: Todos</option>
                    <option value="UNASSIGNED">⚪ Sin Asignar</option>
                    {collaboratorsStats.map(c => (
                      <option key={c.name} value={c.name}>
                        👤 {c.name} ({c.contactados || 0}/{c.total || 0})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* TABLA DE REGISTROS */}
        <div className="bg-white rounded-3xl shadow-sm border border-stone-200 overflow-hidden">
          
          {/* Header de la Tabla */}
          <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50/50">
            <div className="text-xs font-bold text-stone-600">
              Mostrando <span className="text-diocesis-redDark font-extrabold">{records.length}</span> de{' '}
              <span className="text-diocesis-redDark font-extrabold">{totalRecords.toLocaleString()}</span> registros
              {debouncedSearch && <span> (filtrado por "{debouncedSearch}")</span>}
            </div>
            <div className="text-xs text-stone-500 font-semibold">
              Página {currentPage} de {totalPages}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs md:text-sm border-collapse">
              <thead>
                <tr className="bg-stone-100/80 border-b border-stone-200 text-stone-600 uppercase text-[11px] font-bold tracking-wider">
                  <th className="py-3 px-4">DNI</th>
                  <th className="py-3 px-4">Nombres y Apellidos</th>
                  <th className="py-3 px-4">Servicio / Comisión</th>
                  <th className="py-3 px-4">Contacto</th>
                  {activeTab === 'fase2' ? (
                    <>
                      <th className="py-3 px-4 text-center">Estado</th>
                      <th className="py-3 px-4 text-center">Documentos</th>
                      <th className="py-3 px-4 text-center">Acción</th>
                    </>
                  ) : (
                    <>
                      <th className="py-3 px-4">Líder / Cuadrilla</th>
                      <th className="py-3 px-4 text-center">¿Contactado?</th>
                      <th className="py-3 px-4 text-center">Estado Fase 2</th>
                      <th className="py-3 px-4">Distrito / Parroquia</th>
                      <th className="py-3 px-4 text-center">Talla</th>
                      <th className="py-3 px-4 text-center">Acción</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {loading ? (
                  <tr>
                    <td colSpan={activeTab === 'fase2' ? 7 : 10} className="py-12 text-center text-stone-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-diocesis-mustard" />
                      <span className="font-semibold text-sm">Cargando registros...</span>
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={activeTab === 'fase2' ? 7 : 10} className="py-12 text-center text-stone-500">
                      <Users className="w-8 h-8 mx-auto mb-2 text-stone-300" />
                      <p className="font-bold text-stone-700">No se encontraron registros</p>
                      <p className="text-xs text-stone-400 mt-1">Prueba cambiando los términos de búsqueda o el filtro.</p>
                    </td>
                  </tr>
                ) : (
                  records.map((r, idx) => {
                    const isRejected = r.estado === 'NO SELECCIONADO' || (r.estado && r.estado.toUpperCase().includes('NO'));
                    const isApproved = !isRejected && (r.estado === 'SELECCIONADO' || r.info_validada);
                    const isRevision = !isRejected && r.estado === 'EN REVISIÓN';

                    const cleanPhone = r.telefono ? String(r.telefono).replace(/\D/g, '') : '';

                    return (
                      <tr key={r.id || r.dni || idx} className="hover:bg-amber-50/40 transition">
                        {/* DNI */}
                        <td className="py-3 px-4 font-mono font-bold text-diocesis-redDark whitespace-nowrap">
                          {r.dni}
                        </td>

                        {/* Nombres y Apellidos */}
                        <td className="py-3 px-4 font-semibold text-stone-900">
                          {cleanVolunteerName(r.nombres_apellidos)}
                        </td>

                        {/* Servicio */}
                        <td className="py-3 px-4 text-stone-600 text-xs">
                          {r.servicio || r.grupo_integra || <span className="text-stone-400 italic">No asignado</span>}
                        </td>

                        {/* Contacto con WhatsApp directo */}
                        <td className="py-3 px-4 text-xs whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div>
                              <div className="font-semibold text-stone-800">{r.telefono || '-'}</div>
                              <div className="text-stone-400 text-[11px] truncate max-w-[140px]">{r.correo || '-'}</div>
                            </div>
                            {cleanPhone && (
                              <a
                                href={getWhatsAppContactUrl(r.telefono, r.nombres_apellidos)}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition flex items-center justify-center shrink-0 shadow-xs"
                                title="Escribir por WhatsApp con enlace al formulario Fase 2"
                              >
                                <MessageCircle className="w-4 h-4 text-emerald-700" />
                              </a>
                            )}
                          </div>
                        </td>

                        {/* Columnas según Fase activa */}
                        {activeTab === 'fase2' ? (
                          <>
                            {/* Estado Badge */}
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              {isApproved ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Seleccionado
                                </span>
                              ) : isRevision ? (
                                <span 
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300"
                                  title={r.observacion || 'Documentos en revisión'}
                                >
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                                  En Revisión
                                </span>
                              ) : isRejected ? (
                                <span 
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300"
                                  title={r.observacion || 'No admitido'}
                                >
                                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                  No Seleccionado
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-600 border border-stone-200">
                                  <Clock className="w-3.5 h-3.5" />
                                  Pendiente
                                </span>
                              )}
                            </td>

                            {/* Enlaces de Documentos */}
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                {r.archivo_compromiso_url && (
                                  <a
                                    href={r.archivo_compromiso_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition"
                                    title="Ver DNI / Pasaporte"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-diocesis-red" />
                                  </a>
                                )}
                                {r.archivo_cul_url && (
                                  <a
                                    href={r.archivo_cul_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition"
                                    title="Ver CertiAdulto (CUL)"
                                  >
                                    <FileCheck className="w-3.5 h-3.5 text-diocesis-mustard" />
                                  </a>
                                )}
                                {r.archivo_carta_url && (
                                  <a
                                    href={r.archivo_carta_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition"
                                    title="Ver Carta de Compromiso"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                                  </a>
                                )}
                                {!r.archivo_compromiso_url && !r.archivo_cul_url && !r.archivo_carta_url && (
                                  <span className="text-stone-300 text-xs italic">-</span>
                                )}
                              </div>
                            </td>

                            {/* Ver Detalle */}
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => setSelectedVoluntario(r)}
                                className="p-1.5 rounded-lg bg-diocesis-red/10 hover:bg-diocesis-red/20 text-diocesis-redDark font-semibold transition"
                                title="Ver Ficha Completa"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </td>
                          </>
                        ) : (
                          <>
                            {/* Líder y Coordinador de Cuadrilla */}
                            <td className="py-3 px-4 text-xs whitespace-nowrap">
                              {r.lider_nombre ? (
                                <div className="space-y-0.5">
                                  <div className="font-bold text-stone-900 flex items-center gap-1">
                                    <Shield className="w-3.5 h-3.5 text-diocesis-red shrink-0" />
                                    <span className="truncate max-w-[150px]">{r.lider_nombre}</span>
                                  </div>
                                  <div className="text-[11px] text-purple-700 font-semibold flex items-center gap-1">
                                    <Users className="w-3 h-3 text-purple-500 shrink-0" />
                                    <span className="truncate max-w-[130px]">{r.coordinador_nombre || 'Coord. pendiente'}</span>
                                    {r.cuadrilla_codigo && (
                                      <span className="font-mono text-[9px] bg-purple-100 text-purple-800 px-1 py-0.2 rounded font-bold">
                                        {r.cuadrilla_codigo}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : r.fase && r.fase !== '1' && r.fase !== '2' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-200">
                                  <Users className="w-3 h-3 text-purple-700" />
                                  {r.fase}
                                </span>
                              ) : (
                                <span className="text-stone-400 italic text-[11px]">
                                  Sin asignar
                                </span>
                              )}
                            </td>

                            {/* Switch ¿Contactado? */}
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              {r.estado === 'CON_FASE2' || r.fase === '2' ? (
                                <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  Doc. Enviado
                                </span>
                              ) : (
                                <div className="inline-flex items-center gap-1.5 justify-center">
                                  <button
                                    type="button"
                                    role="switch"
                                    aria-checked={r.estado === 'CONTACTADO'}
                                    disabled={updatingId === r.id}
                                    onClick={() => handleToggleContactado(r)}
                                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                                      r.estado === 'CONTACTADO' ? 'bg-emerald-600' : 'bg-stone-300'
                                    } ${updatingId === r.id ? 'opacity-40 cursor-wait' : ''}`}
                                    title={r.estado === 'CONTACTADO' ? 'Marcar como NO contactado' : 'Marcar como CONTACTADO'}
                                  >
                                    <span
                                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                        r.estado === 'CONTACTADO' ? 'translate-x-4' : 'translate-x-0'
                                      }`}
                                    />
                                  </button>
                                  <span className={`text-[11px] font-bold ${r.estado === 'CONTACTADO' ? 'text-emerald-700' : 'text-stone-400'}`}>
                                    {r.estado === 'CONTACTADO' ? 'Sí' : 'No'}
                                  </span>
                                </div>
                              )}
                            </td>

                            {/* Estado de envío a Fase 2 */}
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              {r.estado === 'CON_FASE2' || r.fase === '2' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                  Envió Fase 2
                                </span>
                              ) : (
                                <span 
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300"
                                  title="No ha enviado los documentos en el formulario de Fase 2"
                                >
                                  <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                                  Sin enviar Fase 2
                                </span>
                              )}
                            </td>

                            {/* Distrito y Código */}
                            <td className="py-3 px-4 text-xs text-stone-600">
                              <div>{r.distrito || r.jurisdiccion || '-'}</div>
                              {r.codigo && <span className="text-[10px] text-stone-400 font-mono">Cód: {r.codigo}</span>}
                            </td>

                            {/* Talla */}
                            <td className="py-3 px-4 text-center font-bold text-xs text-stone-700">
                              {r.talla || '-'}
                            </td>

                            {/* Acción: Ver Ficha Completa */}
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => setSelectedVoluntario(r)}
                                className="p-1.5 rounded-lg bg-diocesis-red/10 hover:bg-diocesis-red/20 text-diocesis-redDark font-semibold transition"
                                title="Ver Ficha Completa"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* BARRA DE PAGINACIÓN */}
          <div className="px-6 py-4 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-stone-500 font-medium">
              Página <strong className="text-stone-800">{currentPage}</strong> de{' '}
              <strong className="text-stone-800">{totalPages}</strong> (Total:{' '}
              {totalRecords.toLocaleString()} voluntarios)
            </span>

            <div className="inline-flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1 || loading}
                className="px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-100 text-xs font-bold text-stone-700 disabled:opacity-40 transition"
                title="Primera página"
              >
                «
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-100 text-xs font-bold text-stone-700 disabled:opacity-40 transition"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Anterior
              </button>
              
              <div className="px-3 py-1 bg-white border border-stone-300 rounded-lg text-xs font-extrabold text-diocesis-redDark">
                {currentPage}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-100 text-xs font-bold text-stone-700 disabled:opacity-40 transition"
              >
                Siguiente <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages || loading}
                className="px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-100 text-xs font-bold text-stone-700 disabled:opacity-40 transition"
                title="Última página"
              >
                »
              </button>
            </div>
          </div>
        </div>

      </main>

      {/* MODAL DETALLE DE VOLUNTARIO */}
      {selectedVoluntario && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-stone-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-start justify-between border-b border-stone-100 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-diocesis-mustard bg-stone-100 px-2 py-0.5 rounded-md">
                  Ficha de Postulante
                </span>
                <h3 className="text-lg md:text-xl font-bold font-title text-diocesis-redDark mt-1">
                  {cleanVolunteerName(selectedVoluntario.nombres_apellidos)}
                </h3>
                <p className="text-xs font-mono font-bold text-stone-500">
                  DNI: {selectedVoluntario.dni} {selectedVoluntario.codigo ? `• Código: ${selectedVoluntario.codigo}` : ''}
                </p>
              </div>
              <button
                onClick={() => setSelectedVoluntario(null)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg bg-stone-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Datos del Voluntario */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-stone-50 rounded-xl">
                <span className="text-stone-400 block text-[10px] font-semibold uppercase">Servicio / Comisión</span>
                <span className="font-bold text-stone-800">{selectedVoluntario.servicio || 'No asignado'}</span>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl">
                <span className="text-stone-400 block text-[10px] font-semibold uppercase">Estado Actual</span>
                <span className={`font-bold ${
                  selectedVoluntario.estado === 'SELECCIONADO' ? 'text-emerald-700' :
                  selectedVoluntario.estado === 'EN REVISIÓN' ? 'text-amber-700' :
                  selectedVoluntario.estado === 'SIN_FASE2' ? 'text-amber-700' :
                  selectedVoluntario.estado === 'CON_FASE2' ? 'text-emerald-700' :
                  (selectedVoluntario.estado === 'NO SELECCIONADO' || (selectedVoluntario.estado && selectedVoluntario.estado.includes('NO'))) ? 'text-rose-700' : 'text-stone-700'
                }`}>
                  {selectedVoluntario.estado === 'SIN_FASE2' ? '⚠️ Sin enviar Fase 2' :
                   selectedVoluntario.estado === 'CON_FASE2' ? '✅ Envió Fase 2' :
                   (selectedVoluntario.estado || 'PENDIENTE')}
                </span>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-stone-400 block text-[10px] font-semibold uppercase">Teléfono</span>
                  <span className="font-bold text-stone-800">{selectedVoluntario.telefono || '-'}</span>
                </div>
                {selectedVoluntario.telefono && (
                  <div className="flex items-center gap-1.5">
                    <a
                      href={getWhatsAppContactUrl(selectedVoluntario.telefono, selectedVoluntario.nombres_apellidos)}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 transition shadow-xs"
                      title="Escribir por WhatsApp con formulario"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                )}
              </div>

              <div className="p-3 bg-stone-50 rounded-xl">
                <span className="text-stone-400 block text-[10px] font-semibold uppercase">Correo</span>
                <span className="font-bold text-stone-800 truncate block">{selectedVoluntario.correo || '-'}</span>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl">
                <span className="text-stone-400 block text-[10px] font-semibold uppercase">Ubicación / Distrito</span>
                <span className="font-bold text-stone-800">
                  {[selectedVoluntario.distrito, selectedVoluntario.provincia].filter(Boolean).join(', ') || '-'}
                </span>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl">
                <span className="text-stone-400 block text-[10px] font-semibold uppercase">Contacto Emergencia</span>
                <span className="font-bold text-stone-800">
                  {selectedVoluntario.contacto_emergencia ? `${selectedVoluntario.contacto_emergencia} (${selectedVoluntario.telefono_emergencia || ''})` : '-'}
                </span>
              </div>

              {/* Control de Contacto en Modal */}
              {selectedVoluntario.estado !== 'CON_FASE2' && (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between col-span-2">
                  <div>
                    <span className="text-amber-800 block text-[10px] font-bold uppercase tracking-wider">
                      Control de Contacto Telefónico / WhatsApp
                    </span>
                    <span className={`font-bold text-xs ${selectedVoluntario.estado === 'CONTACTADO' ? 'text-emerald-700' : 'text-stone-600'}`}>
                      {selectedVoluntario.estado === 'CONTACTADO' ? '✅ Ya fue contactado/a por el equipo' : '⏳ Aún no ha sido contactado/a'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={selectedVoluntario.estado === 'CONTACTADO'}
                      disabled={updatingId === selectedVoluntario.id}
                      onClick={() => handleToggleContactado(selectedVoluntario)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        selectedVoluntario.estado === 'CONTACTADO' ? 'bg-emerald-600' : 'bg-stone-300'
                      } ${updatingId === selectedVoluntario.id ? 'opacity-50 cursor-wait' : ''}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          selectedVoluntario.estado === 'CONTACTADO' ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <span className="text-xs font-bold text-stone-700">
                      {selectedVoluntario.estado === 'CONTACTADO' ? 'Contactado' : 'No'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Observación si existe */}
            {selectedVoluntario.observacion && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1">
                <span className="font-bold text-amber-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                  Observación Registrada:
                </span>
                <p className="text-amber-800 leading-relaxed font-medium">
                  {selectedVoluntario.observacion}
                </p>
              </div>
            )}

            {/* Documentos Adjuntos */}
            <div className="space-y-2 pt-2 border-t border-stone-100">
              <span className="text-xs font-bold text-stone-700 block">
                {selectedVoluntario.archivo_compromiso_url || selectedVoluntario.archivo_cul_url || selectedVoluntario.archivo_carta_url
                  ? 'Documentos Subidos en Google Forms:'
                  : 'Estado de Documentación en Fase 2:'}
              </span>
              
              {selectedVoluntario.archivo_compromiso_url || selectedVoluntario.archivo_cul_url || selectedVoluntario.archivo_carta_url ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {selectedVoluntario.archivo_compromiso_url ? (
                    <a
                      href={selectedVoluntario.archivo_compromiso_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-2.5 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl text-xs font-semibold text-stone-800 transition"
                    >
                      <span className="truncate">DNI / Pasaporte</span>
                      <ExternalLink className="w-3.5 h-3.5 text-diocesis-red" />
                    </a>
                  ) : (
                    <div className="p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-400 italic text-center">
                      Sin DNI
                    </div>
                  )}

                  {selectedVoluntario.archivo_cul_url ? (
                    <a
                      href={selectedVoluntario.archivo_cul_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-2.5 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl text-xs font-semibold text-stone-800 transition"
                    >
                      <span className="truncate">CertiAdulto</span>
                      <ExternalLink className="w-3.5 h-3.5 text-diocesis-mustard" />
                    </a>
                  ) : (
                    <div className="p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-400 italic text-center">
                      Sin CUL
                    </div>
                  )}

                  {selectedVoluntario.archivo_carta_url ? (
                    <a
                      href={selectedVoluntario.archivo_carta_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-2.5 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl text-xs font-semibold text-stone-800 transition"
                    >
                      <span className="truncate">Carta Compromiso</span>
                      <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                    </a>
                  ) : (
                    <div className="p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-400 italic text-center">
                      Sin Carta
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="font-bold flex items-center gap-1.5 text-amber-900">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      Sin expediente enviado en Fase 2
                    </p>
                    <p className="text-amber-800 text-[11px]">
                      Este postulante completó la inscripción inicial pero aún no envía sus documentos.
                    </p>
                  </div>
                  {selectedVoluntario.telefono && (
                    <a
                      href={getWhatsAppContactUrl(selectedVoluntario.telefono, selectedVoluntario.nombres_apellidos)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition shadow-xs shrink-0"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Contactar por WhatsApp
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* ASIGNACIÓN MANUAL DE CADENA DE MANDO (LÍDER Y COORDINADOR) */}
            {isComision && (
              <div className="p-3.5 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-purple-700" />
                    Asignación de Cadena de Mando
                  </span>
                  {assignSuccessMsg && (
                    <span className="text-xs font-bold text-emerald-700 animate-pulse">
                      {assignSuccessMsg}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">Líder General</label>
                    <input
                      type="text"
                      value={editLider}
                      onChange={(e) => setEditLider(e.target.value)}
                      placeholder="Ej: Carlos Morales"
                      className="w-full px-2.5 py-1.5 bg-white border border-purple-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-purple-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">Coordinador</label>
                    <input
                      type="text"
                      value={editCoordinador}
                      onChange={(e) => setEditCoordinador(e.target.value)}
                      placeholder="Ej: Juan Pérez"
                      className="w-full px-2.5 py-1.5 bg-white border border-purple-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-purple-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">Cód. Cuadrilla</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={editCuadrilla}
                        onChange={(e) => setEditCuadrilla(e.target.value)}
                        placeholder="Ej: L01-C03"
                        className="w-full px-2.5 py-1.5 bg-white border border-purple-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-purple-400"
                      />
                      <button
                        type="button"
                        onClick={handleSaveSingleAssignment}
                        disabled={savingAssignment}
                        className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50 shrink-0"
                      >
                        {savingAssignment ? '...' : 'Guardar'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedVoluntario(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL UNIFICADO: CADENA DE MANDO, CHOCOLOTEO Y COLABORADORES */}
      {showDistributeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-stone-200 space-y-5 animate-in fade-in zoom-in-95 duration-150 my-8">
            
            {/* Cabecera del modal con pestañas */}
            <div className="flex items-start justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-800 to-indigo-900 flex items-center justify-center text-diocesis-mustard shadow-sm">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-bold font-title text-stone-900 leading-tight">
                    Gestión de Cadena de Mando y Cuadrillas
                  </h3>
                  <p className="text-xs text-stone-500 font-medium">
                    Organiza, chocolotea y supervisa el avance de líderes, coordinadores y cuadrillas.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDistributeModal(false);
                  setDistributeMsg(null);
                }}
                className="text-stone-400 hover:text-stone-600 p-1.5 rounded-lg bg-stone-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Pestañas de Navegación del Modal */}
            <div className="flex items-center gap-1.5 bg-stone-100 p-1.5 rounded-2xl overflow-x-auto text-xs font-bold">
              {isComision && (
                <button
                  type="button"
                  onClick={() => setModalTab('cuadrillas')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition shrink-0 ${
                    modalTab === 'cuadrillas'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  🎲 Chocolotear Cuadrillas
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setModalTab('organigrama');
                  fetchCuadrillasStats();
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition shrink-0 ${
                  modalTab === 'organigrama'
                    ? 'bg-purple-800 text-white shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                📊 Organigrama en Vivo
              </button>

              {isComision && (
                <button
                  type="button"
                  onClick={() => setModalTab('colaboradores')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition shrink-0 ${
                    modalTab === 'colaboradores'
                      ? 'bg-diocesis-redDark text-white shadow-sm'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  👥 Reparto Simple
                </button>
              )}

              <button
                type="button"
                onClick={() => setModalTab('cuentas')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition shrink-0 ${
                  modalTab === 'cuentas'
                    ? 'bg-stone-800 text-white shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                🔑 Accesos del Equipo
              </button>
            </div>

            {/* TAB 1: CHOCOLOTEO Y REPARTO DE CUADRILLAS */}
            {modalTab === 'cuadrillas' && (
              <div className="space-y-4">
                <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-950">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>¿Cómo funciona el Chocoloteo de Cuadrillas?</span>
                  </div>
                  <p className="text-amber-800 leading-relaxed">
                    Ingresa los nombres de los <strong>20 Líderes</strong> (uno por línea). Si deseas especificar sus coordinadores, escribe: 
                    <code className="bg-amber-100/90 text-amber-950 px-1 py-0.5 rounded font-mono ml-1 font-bold">Líder: Coord 1, Coord 2...</code>.
                    Si ingresas solo el nombre del líder, el sistema creará automáticamente <strong>10 cuadrillas</strong> para cada líder.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                    Estructura de Líderes y Coordinadores:
                  </label>
                  <textarea
                    value={cuadrillasHierarchyInput}
                    onChange={(e) => setCuadrillasHierarchyInput(e.target.value)}
                    placeholder={`Ejemplo:\nCarlos Morales: Juan Pérez, María Silva, Roberto Díaz\nAna Gómez: Pedro Torres, Lucía Vega\nO simplemente escribe un líder por línea:\nCarlos Morales\nAna Gómez\nLuis Rodríguez`}
                    rows={5}
                    className="w-full p-3 bg-stone-50 border border-stone-300 rounded-2xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition resize-none"
                  />

                  {/* Resumen de cálculo en vivo */}
                  {(() => {
                    const lines = cuadrillasHierarchyInput.split('\n').map(l => l.trim()).filter(Boolean);
                    const totalLideres = lines.length;
                    let totalCoords = 0;
                    lines.forEach(l => {
                      if (l.includes(':')) {
                        const coords = l.split(':')[1].split(/[\n,]+/).map(c => c.trim()).filter(Boolean);
                        totalCoords += coords.length || 1;
                      } else {
                        totalCoords += 10;
                      }
                    });
                    const baseTotal = cuadrillasTarget === 'sin_fase2' ? (stats.sinFase2 || 5214) : (stats.generalTotal || 7241);
                    const porCoord = totalCoords > 0 ? Math.ceil(baseTotal / totalCoords) : 0;

                    return (
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-600 px-1">
                        <span>
                          👑 <strong>{totalLideres}</strong> líder{totalLideres === 1 ? '' : 'es'} ingresado{totalLideres === 1 ? '' : 's'} • 🎖️ ~<strong>{totalCoords}</strong> cuadrillas • 👥 ~<strong>{porCoord}</strong> voluntarios c/u
                        </span>
                        <span className="text-[11px] text-stone-400">
                          Total a repartir: {baseTotal.toLocaleString()}
                        </span>
                      </div>
                    );
                  })()}
                </div>

                {/* Opciones de Chocoloteo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-stone-800">
                    <input
                      type="checkbox"
                      checked={cuadrillasShuffle}
                      onChange={(e) => setCuadrillasShuffle(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                    />
                    <span>🎲 Chocoloteo Aleatorio (Mezclar al azar)</span>
                  </label>

                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">Público Objetivo:</label>
                    <select
                      value={cuadrillasTarget}
                      onChange={(e) => setCuadrillasTarget(e.target.value)}
                      className="w-full py-1.5 px-2.5 bg-white border border-stone-300 rounded-xl text-xs font-semibold text-stone-700"
                    >
                      <option value="sin_fase2">⚠️ Solo Sin Enviar Fase 2 ({stats.sinFase2?.toLocaleString()} postulantes)</option>
                      <option value="all">📋 Todo el Padrón General ({stats.generalTotal?.toLocaleString()} postulantes)</option>
                    </select>
                  </div>
                </div>

                {/* Botón de Acción */}
                <button
                  type="button"
                  onClick={handleDistributeCuadrillas}
                  disabled={distributing || !cuadrillasHierarchyInput.trim()}
                  className="w-full py-3 px-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold rounded-2xl text-sm shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Shuffle className={`w-4 h-4 ${distributing ? 'animate-spin' : ''}`} />
                  {distributing ? 'Chocoloteando y guardando en la base de datos...' : '⚡ Iniciar Chocoloteo y Reparto de Cuadrillas'}
                </button>
              </div>
            )}

            {/* TAB 2: ORGANIGRAMA Y AVANCE EN VIVO */}
            {modalTab === 'organigrama' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-stone-600 font-medium">
                    Mostrando <strong>{cuadrillasStats.length}</strong> líderes y sus cuadrillas con avance en tiempo real.
                  </div>
                  <button
                    type="button"
                    onClick={fetchCuadrillasStats}
                    disabled={loadingCuadrillasStats}
                    className="text-xs font-bold text-purple-700 hover:underline inline-flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingCuadrillasStats ? 'animate-spin' : ''}`} />
                    Actualizar
                  </button>
                </div>

                {cuadrillasStats.length === 0 ? (
                  <div className="p-8 text-center bg-stone-50 rounded-2xl border border-stone-200 text-stone-400 text-xs">
                    <Shield className="w-8 h-8 mx-auto mb-2 text-stone-300" />
                    <p className="font-bold text-stone-700">Aún no hay cuadrillas registradas</p>
                    <p className="mt-1">Usa la pestaña "Chocolotear Cuadrillas" para asignar a los líderes y coordinadores.</p>
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto space-y-2.5 pr-1">
                    {cuadrillasStats.map((lider) => (
                      <div key={lider.nombre} className="p-3.5 bg-stone-50 hover:bg-stone-100/70 border border-stone-200 rounded-2xl space-y-2 transition">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-purple-600 shrink-0"></span>
                            <span className="font-bold text-sm text-stone-900 font-title">
                              {lider.nombre}
                            </span>
                            <span className="text-[11px] font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full">
                              {lider.coordinadores?.length || 0} cuadrillas
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs">
                            <span className="font-bold text-stone-700">
                              Total: <strong>{lider.total?.toLocaleString()}</strong>
                            </span>
                            <span className="font-bold text-emerald-700">
                              Contactados: <strong>{lider.contactados?.toLocaleString()}</strong>
                            </span>
                            <div className="flex items-center gap-1.5">
                              <div className="w-16 bg-stone-200 rounded-full h-2 overflow-hidden">
                                <div 
                                  className="bg-emerald-500 h-2 rounded-full transition-all"
                                  style={{ width: `${Math.min(100, lider.porcentaje)}%` }}
                                />
                              </div>
                              <span className="font-extrabold text-[11px] text-stone-800 w-8 text-right">
                                {lider.porcentaje}%
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Lista de coordinadores de este líder */}
                        {lider.coordinadores && lider.coordinadores.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-stone-200/60">
                            {lider.coordinadores.map((coord) => (
                              <div key={coord.nombre} className="p-2 bg-white rounded-xl border border-stone-200/80 flex items-center justify-between text-xs">
                                <div className="truncate pr-2">
                                  <div className="font-bold text-stone-800 truncate flex items-center gap-1">
                                    <Users className="w-3 h-3 text-purple-600 shrink-0" />
                                    <span>{coord.nombre}</span>
                                  </div>
                                  <span className="text-[10px] text-stone-400 font-mono">
                                    {coord.cuadrilla} • {coord.contactados}/{coord.total} ({coord.porcentaje}%)
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setLiderFilter(lider.nombre);
                                    setCoordinadorFilter(coord.nombre);
                                    setActiveTab('sin_fase2');
                                    setShowDistributeModal(false);
                                  }}
                                  className="text-[10px] font-bold text-purple-700 hover:bg-purple-100/70 px-2 py-1 rounded-lg transition shrink-0"
                                  title="Filtrar tabla principal por esta cuadrilla"
                                >
                                  Ver →
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: REPARTO SIMPLE DE COLABORADORES */}
            {modalTab === 'colaboradores' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                    Ingresa los nombres de los colaboradores:
                  </label>
                  <textarea
                    value={collaboratorNamesInput}
                    onChange={(e) => setCollaboratorNamesInput(e.target.value)}
                    placeholder="Ejemplo: Carlos, María, Juan Pérez, Sofía Gómez (separados por comas o saltos de línea)"
                    rows={3}
                    className="w-full p-3 bg-stone-50 border border-stone-300 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-diocesis-mustard focus:bg-white transition resize-none"
                  />
                  
                  {/* Cálculo en vivo */}
                  {(() => {
                    const names = collaboratorNamesInput.split(/[\n,]+/).map(n => n.trim()).filter(n => n.length > 0);
                    const uniqueCount = new Set(names).size;
                    const totalPorRepartir = stats.sinFase2 || 5214;
                    const perPerson = uniqueCount > 0 ? Math.ceil(totalPorRepartir / uniqueCount) : 0;

                    return (
                      <div className="flex items-center justify-between text-xs text-stone-500 px-1">
                        <span>
                          {uniqueCount > 0 ? (
                            <span className="font-semibold text-stone-700">
                              👥 {uniqueCount} colaborador{uniqueCount > 1 ? 'es' : ''} • ~
                              <strong className="text-diocesis-redDark">{perPerson.toLocaleString()}</strong> postulantes c/u
                            </span>
                          ) : (
                            'Escribe o pega los nombres para calcular el reparto automático.'
                          )}
                        </span>
                        <span className="text-[11px] text-stone-400">Total a repartir: {totalPorRepartir.toLocaleString()}</span>
                      </div>
                    );
                  })()}
                </div>

                <button
                  type="button"
                  onClick={handleDistribute}
                  disabled={distributing || !collaboratorNamesInput.trim()}
                  className="w-full py-3 px-4 bg-gradient-to-r from-diocesis-redDark to-diocesis-red hover:from-diocesis-red hover:to-diocesis-redLight text-white font-bold rounded-2xl text-sm shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Users className={`w-4 h-4 ${distributing ? 'animate-spin' : ''}`} />
                  {distributing ? 'Repartiendo equitativamente en la base de datos...' : '⚡ Iniciar Reparto Equitativo Simple'}
                </button>

                {/* Tabla de avance por colaborador */}
                {collaboratorsStats.length > 0 && (
                  <div className="max-h-48 overflow-y-auto border border-stone-200 rounded-2xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-stone-100/90 sticky top-0 border-b border-stone-200 text-stone-600 font-bold">
                        <tr>
                          <th className="py-2 px-3">Colaborador</th>
                          <th className="py-2 px-3 text-center">Asignados</th>
                          <th className="py-2 px-3 text-center">Contactados</th>
                          <th className="py-2 px-3 text-center">% Avance</th>
                          <th className="py-2 px-3 text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {collaboratorsStats.map((c) => (
                          <tr key={c.name} className="hover:bg-amber-50/40">
                            <td className="py-2 px-3 font-bold text-stone-900">{c.name}</td>
                            <td className="py-2 px-3 text-center font-mono font-bold">{c.total?.toLocaleString()}</td>
                            <td className="py-2 px-3 text-center font-mono font-bold text-emerald-700">{c.contactados?.toLocaleString()}</td>
                            <td className="py-2 px-3 text-center font-bold text-[11px]">{c.porcentaje}%</td>
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setCollaboratorFilter(c.name);
                                  setActiveTab('sin_fase2');
                                  setShowDistributeModal(false);
                                }}
                                className="text-[11px] font-bold text-diocesis-redDark hover:underline"
                              >
                                Filtrar →
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: CREDENCIALES Y CUENTAS */}
            {modalTab === 'cuentas' && (
              <div className="space-y-3">
                <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50/60 border border-amber-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-900">
                      <Key className="w-3.5 h-3.5 text-amber-700" />
                      <span>Acceso Central Comisión de Inscripciones:</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText('Correo: equipo@amigosdelpapa.pe\nContraseña: Voluntarios2026*\nEnlace: https://voluntarios-web.onrender.com/login');
                        setCopiedCreds(true);
                        setTimeout(() => setCopiedCreds(false), 2500);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-xs font-bold text-amber-900 transition"
                    >
                      {copiedCreds ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      {copiedCreds ? '¡Copiado!' : 'Copiar'}
                    </button>
                  </div>
                  <div className="text-xs font-mono font-bold text-stone-800 space-y-0.5">
                    <div>Correo: <span className="text-diocesis-redDark">equipo@amigosdelpapa.pe</span></div>
                    <div>Contraseña: <span className="text-diocesis-redDark">Voluntarios2026*</span></div>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    Este usuario tiene perfil de <strong>Comisión de Inscripciones</strong> con acceso a todo el padrón para realizar validaciones, filtros y asignaciones.
                  </p>
                </div>

                <div className="p-4 bg-purple-50/80 border border-purple-200 rounded-2xl space-y-1.5 text-xs text-purple-950">
                  <div className="font-bold flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-purple-700" />
                    <span>Cuentas para Líderes y Coordinadores:</span>
                  </div>
                  <p className="text-purple-900 leading-relaxed text-[11px]">
                    Las cuentas de Líderes y Coordinadores se crean con su propio correo o DNI. Al iniciar sesión, el sistema detecta automáticamente su nombre y <strong>bloquea la vista para mostrar exclusivamente a sus cuadrillas asignadas</strong>.
                  </p>
                </div>
              </div>
            )}

            {/* Mensaje de estado de la operación */}
            {distributeMsg && (
              <div className={`p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
                distributeMsg.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' :
                distributeMsg.type === 'error' ? 'bg-rose-50 text-rose-900 border border-rose-200' :
                'bg-amber-50 text-amber-900 border border-amber-200 animate-pulse'
              }`}>
                {distributeMsg.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" /> :
                 distributeMsg.type === 'error' ? <XCircle className="w-4 h-4 text-rose-600 shrink-0" /> :
                 <RefreshCw className="w-4 h-4 text-amber-600 shrink-0 animate-spin" />}
                <span>{distributeMsg.text}</span>
              </div>
            )}

            {/* Footer del Modal */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowDistributeModal(false);
                  setDistributeMsg(null);
                }}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
