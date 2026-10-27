import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import { 
  Award, Shield, Users, CheckCircle2, Clock, Search, 
  FileSpreadsheet, RefreshCw, LogOut, Check, X, ChevronDown, ChevronRight,
  AlertTriangle, HeartPulse, Droplets, ShieldAlert, Sparkles, Coffee, MapPin,
  AlertCircle, ExternalLink, FileText
} from 'lucide-react';
import * as xlsx from 'xlsx';
import MapaTactico from '../components/MapaTactico';

export default function ResponsableDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('supervision'); // 'supervision' | 'estructura' | 'solicitudes'
  const [mandos, setMandos] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedLideres, setExpandedLideres] = useState({});
  const [actionMsg, setActionMsg] = useState(null);
  const [dniStatusMap, setDniStatusMap] = useState({ f2Map: {}, f1Map: {} });

  // Estados interactivos Día D del Responsable
  const [liderPresencia, setLiderPresencia] = useState({});
  const [incidenciasMacro, setIncidenciasMacro] = useState([
    { id: 1, lider: 'Líder Sector Norte', tipo: 'hidratacion', desc: 'Se requiere refuerzo de 20 cajas de agua en cuadrillas 01 al 10', hora: '08:20 AM', estado: 'atendiendo' },
    { id: 2, lider: 'Líder Sector Sur', tipo: 'medica', desc: 'Voluntario atendido por insolación en carpa médica 2', hora: '09:05 AM', estado: 'controlado' }
  ]);

  const responsableNombre = user?.responsable_nombre || user?.nombre || 'Responsable General';
  const apiUrl = import.meta.env.VITE_API_URL || 'https://voluntarios-backend.vercel.app';

  const fetchData = async () => {
    setLoading(true);
    setActionMsg(null);
    try {
      // 1. Obtener la estructura de mandos de este Responsable
      const { data: mandosData, error: mErr } = await supabase
        .from('estructura_mandos')
        .select('*')
        .ilike('responsable_nombre', `%${responsableNombre}%`)
        .order('id', { ascending: true });

      if (mErr) throw mErr;
      const list = mandosData || [];
      setMandos(list);

      // 1.1 Obtener estado de validación y etapas por DNI de Guías y Líderes
      const allDnis = [...new Set([
        ...list.map(m => m.guia_dni),
        ...list.map(m => m.lider_dni)
      ].filter(Boolean).map(d => String(d).trim()))];

      const f2Map = {};
      const f1Map = {};

      if (allDnis.length > 0) {
        // Consultar Fase 2 (voluntarios con ficha y documentación)
        const { data: f2List, error: f2Err } = await supabase
          .from('voluntarios')
          .select('dni, nombres_apellidos, estado, fase, info_validada, archivo_carta_url, archivo_cul_url, archivo_compromiso_url')
          .in('dni', allDnis);

        if (!f2Err && f2List) {
          f2List.forEach(v => {
            if (v.dni) f2Map[String(v.dni).trim()] = v;
          });
        }

        // Consultar Fase 1 (voluntarios en padrón general inicial)
        const { data: f1List, error: f1Err } = await supabase
          .from('voluntarios_general')
          .select('dni, nombres_apellidos, estado, fase')
          .in('dni', allDnis);

        if (!f1Err && f1List) {
          f1List.forEach(v => {
            if (v.dni) f1Map[String(v.dni).trim()] = v;
          });
        }
      }

      setDniStatusMap({ f2Map, f1Map });

      // 2. Obtener solicitudes de su sector (filtradas automáticamente en el backend)
      const token = localStorage.getItem('token');
      if (token) {
        const solRes = await fetch(`${apiUrl}/api/auth/solicitudes`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (solRes.ok) {
          const solJson = await solRes.json();
          setSolicitudes(solJson.pendientes || []);
        }
      }
    } catch (err) {
      console.error('Error cargando datos de responsable:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Clasificador de Etapas y Documentación por DNI
  const getDniEtapaInfo = (rawDni, fallbackCarta = false) => {
    const dni = rawDni ? String(rawDni).trim() : '';
    if (!dni) {
      return {
        etapa: 0,
        label: 'Sin DNI',
        sublabel: 'No registrado',
        badgeClass: 'bg-stone-100 text-stone-500 border-stone-200',
        tieneCarta: Boolean(fallbackCarta),
        cartaUrl: null,
        tieneCul: false,
        tieneCompromiso: false,
        docsCount: fallbackCarta ? 1 : 0
      };
    }

    const f2 = dniStatusMap.f2Map?.[dni];
    const f1 = dniStatusMap.f1Map?.[dni];

    if (f2) {
      const valStr = String(f2.estado || '').toUpperCase();
      const isRejected = valStr.includes('NO') || valStr.includes('RECHAZ');
      const isApproved = !isRejected && (f2.info_validada || valStr.includes('SELECCIONAD') || valStr.includes('APROBAD'));

      let docsCount = 0;
      if (f2.archivo_carta_url || fallbackCarta) docsCount++;
      if (f2.archivo_cul_url) docsCount++;
      if (f2.archivo_compromiso_url) docsCount++;

      if (isApproved) {
        return {
          etapa: 3,
          label: 'Fase 3: Aprobado',
          sublabel: 'Seleccionado Oficial',
          badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold',
          tieneCarta: Boolean(f2.archivo_carta_url || fallbackCarta),
          cartaUrl: f2.archivo_carta_url || null,
          tieneCul: Boolean(f2.archivo_cul_url),
          culUrl: f2.archivo_cul_url || null,
          tieneCompromiso: Boolean(f2.archivo_compromiso_url),
          compromisoUrl: f2.archivo_compromiso_url || null,
          docsCount,
          estado: f2.estado
        };
      }

      if (isRejected) {
        return {
          etapa: 2,
          label: 'Fase 2: No Seleccionado',
          sublabel: f2.estado || 'Rechazado',
          badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
          tieneCarta: Boolean(f2.archivo_carta_url || fallbackCarta),
          cartaUrl: f2.archivo_carta_url || null,
          tieneCul: Boolean(f2.archivo_cul_url),
          culUrl: f2.archivo_cul_url || null,
          tieneCompromiso: Boolean(f2.archivo_compromiso_url),
          compromisoUrl: f2.archivo_compromiso_url || null,
          docsCount,
          estado: f2.estado
        };
      }

      return {
        etapa: 2,
        label: 'Fase 2: En Evaluación',
        sublabel: 'Ficha y Docs Enviados',
        badgeClass: 'bg-blue-100 text-blue-800 border-blue-300 font-bold',
        tieneCarta: Boolean(f2.archivo_carta_url || fallbackCarta),
        cartaUrl: f2.archivo_carta_url || null,
        tieneCul: Boolean(f2.archivo_cul_url),
        culUrl: f2.archivo_cul_url || null,
        tieneCompromiso: Boolean(f2.archivo_compromiso_url),
        compromisoUrl: f2.archivo_compromiso_url || null,
        docsCount,
        estado: f2.estado || 'En Revisión'
      };
    }

    if (f1) {
      return {
        etapa: 1,
        label: 'Fase 1: Padrón General',
        sublabel: 'Falta Ficha 2',
        badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
        tieneCarta: Boolean(fallbackCarta),
        cartaUrl: null,
        tieneCul: false,
        culUrl: null,
        tieneCompromiso: false,
        compromisoUrl: null,
        docsCount: fallbackCarta ? 1 : 0,
        estado: 'Fase 1 Inicial'
      };
    }

    return {
      etapa: 0,
      label: 'Sin Registro',
      sublabel: 'Pendiente Formulario',
      badgeClass: 'bg-stone-100 text-stone-500 border-stone-300 font-medium',
      tieneCarta: Boolean(fallbackCarta),
      cartaUrl: null,
      tieneCul: false,
      culUrl: null,
      tieneCompromiso: false,
      compromisoUrl: null,
      docsCount: fallbackCarta ? 1 : 0,
      estado: 'Sin Registro'
    };
  };

  // Agrupar Guías por Líder
  const lideresMap = {};
  mandos.forEach(m => {
    const lName = m.lider_nombre || 'Sin Líder Asignado';
    if (!lideresMap[lName]) {
      lideresMap[lName] = {
        nombre: lName,
        dni: m.lider_dni,
        carta: m.lider_carta,
        guias: []
      };
    }
    lideresMap[lName].guias.push(m);
  });

  const lideresList = Object.values(lideresMap);
  const totalGuias = mandos.length;
  const totalCapacidad = mandos.reduce((acc, m) => acc + (m.total_voluntarios || 9), 0);

  // Estadísticas globales de etapas de Guías de este sector
  const statsFases = {
    fase3: 0,
    fase2: 0,
    fase1: 0,
    sinRegistro: 0
  };

  mandos.forEach(m => {
    const info = getDniEtapaInfo(m.guia_dni, m.guia_carta);
    if (info.etapa === 3) statsFases.fase3++;
    else if (info.etapa === 2) statsFases.fase2++;
    else if (info.etapa === 1) statsFases.fase1++;
    else statsFases.sinRegistro++;
  });

  // Exportar reporte consolidado a Excel
  const exportToExcel = () => {
    const data = mandos.map((m, idx) => {
      const gInfo = getDniEtapaInfo(m.guia_dni, m.guia_carta);
      const lInfo = getDniEtapaInfo(m.lider_dni, m.lider_carta);
      return {
        '#': idx + 1,
        'Cuadrilla': m.cuadrilla_codigo,
        'Responsable General': m.responsable_nombre,
        'Líder de Sector': m.lider_nombre,
        'DNI Líder': m.lider_dni || '',
        'Etapa Líder': lInfo.label,
        'Guía Oficial': m.guia_nombre,
        'DNI Guía': m.guia_dni || '',
        'Etapa / Fase': gInfo.label,
        'Estado Postulación': gInfo.sublabel,
        'Carta Respaldo': gInfo.tieneCarta ? 'SÍ' : 'NO',
        'CUL Adjunto': gInfo.tieneCul ? 'SÍ' : 'NO',
        'Compromiso Adjunto': gInfo.tieneCompromiso ? 'SÍ' : 'NO',
        'Cupo Voluntarios': m.total_voluntarios || 9,
        'Sede Operativa': m.sede_id || 'Por Definir'
      };
    });

    const ws = xlsx.utils.json_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Estructura_Mandos');
    xlsx.writeFile(wb, `Estructura_${responsableNombre.replace(/\s+/g, '_')}.xlsx`);
  };

  const toggleLider = (nombre) => {
    setExpandedLideres(prev => ({
      ...prev,
      [nombre]: !prev[nombre]
    }));
  };

  const togglePresenciaLider = (nombre) => {
    setLiderPresencia(prev => ({
      ...prev,
      [nombre]: prev[nombre] === 'presente' ? 'pendiente' : 'presente'
    }));
  };

  const totalLideresPresentes = Object.values(liderPresencia).filter(p => p === 'presente').length;

  const handleAprobarSolicitud = async (solId, nombrePersona, rolPersona) => {
    setActionLoading(solId);
    setActionMsg(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/api/auth/solicitudes/${solId}/aprobar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ rol: rolPersona || 'lider' })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.msg || 'Error al aprobar solicitud');

      setActionMsg({
        type: 'success',
        text: `✓ Solicitud de ${nombrePersona} aprobada con éxito como ${rolPersona || 'mando'}.`
      });
      fetchData();
    } catch (err) {
      setActionMsg({ type: 'error', text: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRechazarSolicitud = async (solId, nombrePersona) => {
    if (!confirm(`¿Estás seguro de rechazar la solicitud de acceso de ${nombrePersona}?`)) return;
    setActionLoading(solId);
    setActionMsg(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/api/auth/solicitudes/${solId}/rechazar`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.msg || 'Error al rechazar solicitud');

      setActionMsg({
        type: 'info',
        text: `Solicitud de ${nombrePersona} rechazada.`
      });
      fetchData();
    } catch (err) {
      setActionMsg({ type: 'error', text: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-diocesis-cream flex flex-col font-sans text-stone-800">
      
      {/* NAVBAR SUPERIOR OFICIAL DIÓCESIS */}
      <nav className="bg-diocesis-redDark text-white sticky top-0 z-40 shadow-lg border-b-2 border-diocesis-mustard">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={import.meta.env.BASE_URL + 'logos/logo_comision_juventud.png'} 
              alt="Diócesis de Chiclayo" 
              className="w-10 h-10 object-contain drop-shadow"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-title font-bold text-base md:text-lg tracking-wide text-white block leading-tight">
                  Panel de Responsable General
                </span>
                <span className="text-[11px] font-mono font-black px-2 py-0.5 rounded-full bg-diocesis-mustard text-diocesis-redDark shadow-xs uppercase">
                  Comando Estratégico
                </span>
              </div>
              <span className="text-xs text-diocesis-mustardLight font-medium">
                Diócesis de Chiclayo • Visita Papal 2026
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-white leading-tight">{responsableNombre}</span>
              <span className="text-[11px] text-diocesis-mustard font-mono">DNI: {user?.dni}</span>
            </div>
            <button
              onClick={logout}
              className="px-3 py-1.5 text-xs font-bold bg-diocesis-red hover:bg-diocesis-redLight text-white rounded-lg transition flex items-center gap-1.5 cursor-pointer border border-diocesis-mustard/40 shadow-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6 flex-1">
        
        {/* Banner de Sector con Estilo Diócesis */}
        <div className="bg-white rounded-2xl border-2 border-diocesis-mustard/40 p-5 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-diocesis-redDark text-white">
                Jurisdicción de Sector
              </span>
              <span className="text-xs text-stone-500 font-semibold">Comisión Central de Voluntarios:</span>
            </div>
            <h2 className="text-lg font-black text-diocesis-redDark">
              🎖️ Coordinador General de Sector: {responsableNombre}
            </h2>
            <p className="text-xs text-stone-600">
              Supervisas directamente a <strong className="text-diocesis-red font-bold">{lideresList.length} Líderes</strong>, <strong className="text-diocesis-red font-bold">{totalGuias} Guías</strong> y un despliegue de hasta <strong className="text-diocesis-red font-bold">{totalCapacidad} voluntarios</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-3 py-2 text-xs font-bold text-diocesis-redDark bg-amber-50 hover:bg-amber-100 border border-diocesis-mustard/50 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
            <button
              onClick={exportToExcel}
              disabled={mandos.length === 0}
              className="px-3 py-2 text-xs font-bold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Exportar Sector Completo
            </button>
          </div>
        </div>

        {/* Tarjetas de Métricas con Estilo Diócesis */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-diocesis-mustard/40 p-4 shadow-sm hover:border-diocesis-mustard transition">
            <div className="flex items-center justify-between text-stone-500 mb-1">
              <span className="text-xs font-bold">Líderes de Sector</span>
              <Award className="w-4 h-4 text-diocesis-mustard" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-diocesis-redDark font-mono">
              {lideresList.length}
            </div>
            <p className="text-[11px] text-stone-500 mt-1">Mandos tácticos directos</p>
          </div>

          <div className="bg-white rounded-2xl border border-diocesis-mustard/40 p-4 shadow-sm hover:border-diocesis-mustard transition">
            <div className="flex items-center justify-between text-stone-500 mb-1">
              <span className="text-xs font-bold">Guías / Cuadrillas</span>
              <Shield className="w-4 h-4 text-diocesis-red" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-stone-900 font-mono">
              {totalGuias}
            </div>
            <p className="text-[11px] text-stone-500 mt-1">Cuadrillas operativas</p>
          </div>

          <div className="bg-white rounded-2xl border border-diocesis-mustard/40 p-4 shadow-sm hover:border-diocesis-mustard transition">
            <div className="flex items-center justify-between text-stone-500 mb-1">
              <span className="text-xs font-bold">Capacidad Total Sector</span>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-blue-900 font-mono">
              {totalCapacidad}
            </div>
            <p className="text-[11px] text-stone-500 mt-1">Voluntarios proyectados</p>
          </div>

          <div className={`rounded-2xl border p-4 shadow-sm transition ${
            solicitudes.length > 0 
              ? 'bg-amber-100/70 border-diocesis-mustard' 
              : 'bg-white border-diocesis-mustard/40'
          }`}>
            <div className="flex items-center justify-between text-stone-500 mb-1">
              <span className="text-xs font-bold">Solicitudes Pendientes</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-900 font-mono">
              {solicitudes.length}
            </div>
            <p className="text-[11px] text-stone-500 mt-1">
              {solicitudes.length > 0 ? 'Esperando tu aprobación' : 'Todo al día'}
            </p>
          </div>
        </div>

        {/* Resumen de Fases y Documentación del Sector */}
        <div className="bg-white rounded-2xl border border-diocesis-mustard/40 p-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-diocesis-redDark">
                Estado de Documentación y Validación de Guías
              </span>
              <p className="text-xs text-stone-500">
                Seguimiento por DNI del primer formulario (Padrón Inicial), segundo formulario (Ficha y Carta) y selección oficial
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold text-stone-500">
              Total {totalGuias} Guías en Sector
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-emerald-50/90 border border-emerald-300 rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-800 block">Fase 3: Aprobados</span>
                <span className="text-xl sm:text-2xl font-black text-emerald-950 font-mono">{statsFases.fase3}</span>
                <span className="text-[10px] text-emerald-700 block font-medium">Seleccionados oficiales</span>
              </div>
              <div className="w-8 h-8 rounded-xl bg-emerald-200 text-emerald-900 flex items-center justify-center font-bold text-xs shadow-2xs">✓</div>
            </div>

            <div className="bg-blue-50/90 border border-blue-300 rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-blue-800 block">Fase 2: En Evaluación</span>
                <span className="text-xl sm:text-2xl font-black text-blue-950 font-mono">{statsFases.fase2}</span>
                <span className="text-[10px] text-blue-700 block font-medium">Docs y Carta enviados</span>
              </div>
              <div className="w-8 h-8 rounded-xl bg-blue-200 text-blue-900 flex items-center justify-center font-bold text-xs shadow-2xs">📄</div>
            </div>

            <div className="bg-amber-50/90 border border-amber-300 rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-900 block">Fase 1: Padrón General</span>
                <span className="text-xl sm:text-2xl font-black text-amber-950 font-mono">{statsFases.fase1}</span>
                <span className="text-[10px] text-amber-800 block font-medium">Solo 1er formulario</span>
              </div>
              <div className="w-8 h-8 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center font-bold text-xs shadow-2xs">⏳</div>
            </div>

            <div className="bg-stone-50 border border-stone-300 rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-stone-600 block">Sin Registro</span>
                <span className="text-xl sm:text-2xl font-black text-stone-800 font-mono">{statsFases.sinRegistro}</span>
                <span className="text-[10px] text-stone-500 block font-medium">Pendiente postular</span>
              </div>
              <div className="w-8 h-8 rounded-xl bg-stone-200 text-stone-700 flex items-center justify-center font-bold text-xs shadow-2xs">⚠️</div>
            </div>
          </div>
        </div>

        {/* Notificación de acción */}
        {actionMsg && (
          <div className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between border shadow-sm ${
            actionMsg.type === 'success' 
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300' 
              : actionMsg.type === 'error'
              ? 'bg-red-50 text-red-900 border-red-300'
              : 'bg-blue-50 text-blue-900 border-blue-300'
          }`}>
            <span>{actionMsg.text}</span>
            <button onClick={() => setActionMsg(null)} className="text-stone-400 hover:text-stone-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Pestañas de Navegación con Estilo Diócesis */}
        <div className="flex border-b-2 border-diocesis-mustard/30 gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('supervision')}
            className={`py-2.5 px-4 text-xs sm:text-sm font-bold border-b-4 transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'supervision'
                ? 'border-diocesis-redDark text-diocesis-redDark bg-white/70 rounded-t-xl shadow-xs'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-diocesis-mustard" />
            Supervisión Día D en Vivo
          </button>

          <button
            onClick={() => setActiveTab('estructura')}
            className={`py-2.5 px-4 text-xs sm:text-sm font-bold border-b-4 transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'estructura'
                ? 'border-diocesis-redDark text-diocesis-redDark bg-white/70 rounded-t-xl shadow-xs'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <Users className="w-4 h-4" />
            Estructura de Mandos ({lideresList.length} Líderes / {totalGuias} Guías)
          </button>

          <button
            onClick={() => setActiveTab('mapa')}
            className={`py-2.5 px-4 text-xs sm:text-sm font-bold border-b-4 transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'mapa'
                ? 'border-diocesis-redDark text-diocesis-redDark bg-white/70 rounded-t-xl shadow-xs'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <MapPin className="w-4 h-4 text-diocesis-red" />
            Mapa General de Despliegue
          </button>

          <button
            onClick={() => setActiveTab('solicitudes')}
            className={`py-2.5 px-4 text-xs sm:text-sm font-bold border-b-4 transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'solicitudes'
                ? 'border-diocesis-redDark text-diocesis-redDark bg-white/70 rounded-t-xl shadow-xs'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Aprobar Cuentas del Sector
            {solicitudes.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-diocesis-red text-white text-[10px] font-bold flex items-center justify-center">
                {solicitudes.length}
              </span>
            )}
          </button>
        </div>

        {/* PESTAÑA: MAPA GENERAL DE DESPLIEGUE */}
        {activeTab === 'mapa' && (
          <MapaTactico
            rol="responsable"
            cuadrillasLista={mandos.map(m => ({
              ...m,
              estado_dia_d: liderPresencia[m.lider_nombre] || 'pendiente',
              has_sos: incidenciasMacro.some(inc => inc.estado !== 'controlado' && inc.lider === m.lider_nombre)
            }))}
            liderNombre={responsableNombre}
          />
        )}

        {/* PESTAÑA 1: SUPERVISIÓN DÍA D (EN VIVO) */}
        {activeTab === 'supervision' && (
          <div className="space-y-6">
            
            {/* Monitor de Despliegue de Líderes */}
            <div className="bg-white rounded-2xl border border-diocesis-mustard/40 p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-base font-extrabold text-diocesis-redDark flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    Estado de Despliegue de Líderes en el Terreno
                  </h3>
                  <p className="text-xs text-stone-500">
                    Control de arribo y confirmación de los líderes de sector en sus puntos de control
                  </p>
                </div>
                <span className="text-xs font-mono font-bold px-3 py-1 bg-amber-50 text-amber-900 border border-amber-300 rounded-full w-fit">
                  {totalLideresPresentes} de {lideresList.length} Líderes Confirmados
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {lideresList.map((lider, idx) => {
                  const isPresent = liderPresencia[lider.nombre] === 'presente';
                  return (
                    <div 
                      key={idx}
                      className={`p-4 rounded-xl border transition flex items-center justify-between ${
                        isPresent 
                          ? 'bg-emerald-50/80 border-emerald-400 shadow-xs' 
                          : 'bg-stone-50 border-stone-200 hover:border-diocesis-mustard'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-diocesis-redDark text-white">
                          Líder #{idx + 1}
                        </span>
                        <h4 className="font-bold text-xs sm:text-sm text-stone-900 mt-1 truncate">
                          {lider.nombre}
                        </h4>
                        <div className="text-[11px] text-stone-500 font-mono mt-0.5">
                          DNI: {lider.dni || 'Sin DNI'} • {lider.guias.length} cuadrillas
                        </div>
                      </div>

                      <button
                        onClick={() => togglePresenciaLider(lider.nombre)}
                        className={`px-3 py-1.5 rounded-lg font-extrabold text-xs transition cursor-pointer flex items-center gap-1 ${
                          isPresent
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                            : 'bg-white hover:bg-stone-200 text-stone-700 border border-stone-300'
                        }`}
                      >
                        {isPresent ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            En Puesto
                          </>
                        ) : (
                          'Confirmar'
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Alertas e Incidencias Consolidadas de Sector */}
            <div className="bg-white rounded-2xl border border-diocesis-mustard/40 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-extrabold text-diocesis-redDark flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    Monitor de Incidencias y Soporte de Campo
                  </h3>
                  <p className="text-xs text-stone-500">
                    Incidencias reportadas por los Líderes de tu sector para escalamiento con la Comisión
                  </p>
                </div>
                <span className="text-[11px] font-mono font-bold px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-300 rounded-full">
                  Canal Abierto
                </span>
              </div>

              <div className="space-y-3">
                {incidenciasMacro.map((inc) => (
                  <div 
                    key={inc.id}
                    className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-diocesis-mustard transition"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                          inc.tipo === 'medica' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {inc.tipo}
                        </span>
                        <strong className="text-xs text-stone-900">{inc.lider}</strong>
                        <span className="text-[10px] text-stone-400 font-mono">• {inc.hora}</span>
                      </div>
                      <p className="text-xs text-stone-700 font-medium">
                        {inc.desc}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300">
                        {inc.estado === 'controlado' ? '✓ Controlado' : '⏳ En Atención'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* PESTAÑA 2: ESTRUCTURA DE MANDOS */}
        {activeTab === 'estructura' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-diocesis-mustard/40 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-diocesis-redDark">
                  Organigrama de Mandos de tu Sector
                </h3>
                <p className="text-xs text-stone-500">
                  Despliega cada líder para ver los guías y cuadrillas bajo su mando
                </p>
              </div>

              <input
                type="text"
                placeholder="Buscar por líder, guía o cuadrilla..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-diocesis-red w-full sm:w-64"
              />
            </div>

            {loading ? (
              <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center text-stone-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-diocesis-red" />
                <p className="text-xs font-bold">Cargando organigrama del sector...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lideresList
                  .filter(l => {
                    if (!searchTerm) return true;
                    const term = searchTerm.toLowerCase();
                    const matchLider = l.nombre.toLowerCase().includes(term) || String(l.dni || '').includes(term);
                    const matchGuia = l.guias.some(g => 
                      String(g.guia_nombre || '').toLowerCase().includes(term) ||
                      String(g.cuadrilla_codigo || '').toLowerCase().includes(term)
                    );
                    return matchLider || matchGuia;
                  })
                  .map((lider, idx) => {
                    const isExpanded = !!expandedLideres[lider.nombre];
                    const cupoTotalLider = lider.guias.reduce((acc, g) => acc + (g.total_voluntarios || 9), 0);

                    return (
                      <div 
                        key={idx}
                        className="bg-white rounded-2xl border border-diocesis-mustard/40 shadow-xs overflow-hidden transition"
                      >
                        {/* Cabecera del Líder */}
                        <div 
                          onClick={() => toggleLider(lider.nombre)}
                          className="p-4 flex items-center justify-between cursor-pointer hover:bg-amber-50/50 transition border-b border-stone-100"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-diocesis-redDark text-diocesis-mustardLight flex items-center justify-center font-bold text-xs shadow-xs">
                              L{idx + 1}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-sm text-stone-900">
                                  {lider.nombre}
                                </span>
                                <span className="text-[11px] font-mono text-stone-500 font-bold">
                                  DNI: {lider.dni || 'Sin DNI'}
                                </span>
                                {(() => {
                                  const lInfo = getDniEtapaInfo(lider.dni, lider.carta);
                                  return (
                                    <span className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border ${lInfo.badgeClass}`}>
                                      {lInfo.label}
                                    </span>
                                  );
                                })()}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-stone-500 mt-0.5">
                                <span>{lider.guias.length} Guías / Cuadrillas</span>
                                <span>•</span>
                                <span className="font-semibold text-diocesis-red">{cupoTotalLider} cupos de voluntarios</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {lider.carta ? (
                              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                Carta: Entregada
                              </span>
                            ) : (
                              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-600 border border-stone-300">
                                Carta: Pendiente
                              </span>
                            )}
                            <button className="text-stone-400 hover:text-stone-700">
                              {isExpanded ? <ChevronDown className="w-5 h-5 text-diocesis-redDark" /> : <ChevronRight className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>

                        {/* Listado de Guías expandido */}
                        {isExpanded && (
                          <div className="bg-stone-50/60 p-4 border-t border-stone-100">
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                  <tr className="text-stone-500 font-bold uppercase text-[10px] border-b border-stone-200">
                                    <th className="py-2.5 px-3">Cuadrilla</th>
                                    <th className="py-2.5 px-3">Nombre del Guía</th>
                                    <th className="py-2.5 px-3">DNI Guía</th>
                                    <th className="py-2.5 px-3">Etapa / Fase</th>
                                    <th className="py-2.5 px-3">Documentación</th>
                                    <th className="py-2.5 px-3 text-right">Cupo</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-200/50">
                                  {lider.guias.map((g, gIdx) => {
                                    const gInfo = getDniEtapaInfo(g.guia_dni, g.guia_carta);
                                    return (
                                      <tr key={g.id || gIdx} className="hover:bg-white transition">
                                        <td className="py-2.5 px-3">
                                          <span className="font-mono font-bold px-2 py-0.5 rounded bg-white text-diocesis-redDark border border-stone-300">
                                            {g.cuadrilla_codigo}
                                          </span>
                                        </td>
                                        <td className="py-2.5 px-3 font-bold text-stone-900">{g.guia_nombre}</td>
                                        <td className="py-2.5 px-3 font-mono font-bold text-stone-700">{g.guia_dni || '-'}</td>
                                        
                                        {/* Etapa / Fase */}
                                        <td className="py-2.5 px-3">
                                          <div className="flex flex-col items-start gap-0.5">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border shadow-2xs ${gInfo.badgeClass}`}>
                                              {gInfo.etapa === 3 && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                                              {gInfo.etapa === 2 && <Clock className="w-3 h-3 text-blue-600" />}
                                              {gInfo.etapa === 1 && <Clock className="w-3 h-3 text-amber-600" />}
                                              {gInfo.etapa === 0 && <AlertCircle className="w-3 h-3 text-stone-400" />}
                                              {gInfo.label}
                                            </span>
                                            <span className="text-[10px] text-stone-400 font-medium pl-1">
                                              {gInfo.sublabel}
                                            </span>
                                          </div>
                                        </td>

                                        {/* Documentación / Carta */}
                                        <td className="py-2.5 px-3">
                                          <div className="flex flex-wrap items-center gap-1.5">
                                            {gInfo.cartaUrl ? (
                                              <a
                                                href={gInfo.cartaUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300 transition"
                                                title="Ver Carta de Respaldo enviada"
                                              >
                                                ✓ Carta ↗
                                              </a>
                                            ) : gInfo.tieneCarta ? (
                                              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                                ✓ Carta
                                              </span>
                                            ) : (
                                              <span className="text-[10px] font-bold text-stone-400 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200">
                                                Sin Carta
                                              </span>
                                            )}

                                            {gInfo.tieneCul && (
                                              gInfo.culUrl ? (
                                                <a
                                                  href={gInfo.culUrl}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  className="text-[9px] font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200 transition"
                                                  title="Ver Certificado Único Laboral"
                                                >
                                                  CUL ↗
                                                </a>
                                              ) : (
                                                <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                                  CUL
                                                </span>
                                              )
                                            )}

                                            {gInfo.tieneCompromiso && (
                                              gInfo.compromisoUrl ? (
                                                <a
                                                  href={gInfo.compromisoUrl}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  className="text-[9px] font-bold text-purple-800 bg-purple-50 hover:bg-purple-100 px-1.5 py-0.5 rounded border border-purple-200 transition"
                                                  title="Ver Acta de Compromiso"
                                                >
                                                  Acta ↗
                                                </a>
                                              ) : (
                                                <span className="text-[9px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                                                  Acta
                                                </span>
                                              )
                                            )}
                                          </div>
                                        </td>

                                        <td className="py-2.5 px-3 text-right font-bold text-stone-800">
                                          {g.total_voluntarios || 9}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA 3: APROBAR SOLICITUDES DE ACCESO */}
        {activeTab === 'solicitudes' && (
          <div className="bg-white rounded-2xl border border-diocesis-mustard/40 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-stone-100 bg-amber-50/40">
              <h3 className="text-sm font-extrabold text-diocesis-redDark">
                Solicitudes de Acceso Pendientes ({solicitudes.length})
              </h3>
              <p className="text-xs text-stone-500">
                Líderes y Guías de tu sector que se registraron con su DNI y requieren tu autorización para ingresar
              </p>
            </div>

            {loading ? (
              <div className="p-12 text-center text-stone-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-diocesis-red" />
                <p className="text-xs font-bold">Verificando solicitudes...</p>
              </div>
            ) : solicitudes.length === 0 ? (
              <div className="p-12 text-center max-w-md mx-auto space-y-2">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-extrabold text-stone-900">
                  ¡Al día! No tienes solicitudes pendientes en tu sector
                </h4>
                <p className="text-xs text-stone-500">
                  Cuando los mandos de tu sector se registren con su DNI, aparecerán aquí para que los actives con un solo clic.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4">Solicitante</th>
                      <th className="py-3 px-4">Rol Asignado</th>
                      <th className="py-3 px-4">Correo</th>
                      <th className="py-3 px-4">Celular</th>
                      <th className="py-3 px-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {solicitudes.map((s) => (
                      <tr key={s.id} className="hover:bg-amber-50/40 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-stone-900">{s.nombre}</div>
                          <div className="text-[11px] font-mono text-stone-500">DNI: {s.dni}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`font-bold px-2 py-0.5 rounded-md text-[10px] uppercase border ${
                            s.rol_propuesto === 'lider'
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-blue-100 text-blue-900 border-blue-300'
                          }`}>
                            {s.rol_propuesto || 'Líder / Guía'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-stone-600">{s.correo}</td>
                        <td className="py-3 px-4 font-bold text-stone-800">{s.telefono || '-'}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleAprobarSolicitud(s.id, s.nombre, s.rol_propuesto)}
                              disabled={actionLoading === s.id}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs transition shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Aprobar
                            </button>
                            <button
                              onClick={() => handleRechazarSolicitud(s.id, s.nombre)}
                              disabled={actionLoading === s.id}
                              className="px-2.5 py-1.5 bg-stone-100 hover:bg-red-50 text-stone-600 hover:text-red-700 rounded-lg font-bold text-xs transition cursor-pointer disabled:opacity-50 border border-stone-300 hover:border-red-300"
                            >
                              <X className="w-3.5 h-3.5" />
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
        )}

      </main>
    </div>
  );
}
