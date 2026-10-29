import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import { 
  Shield, Users, CheckCircle2, XCircle, Clock, AlertCircle, 
  Search, FileSpreadsheet, RefreshCw, LogOut, Check, X, Phone, 
  MessageCircle, AlertTriangle, HeartPulse, Droplets, ShieldAlert, Coffee, Sparkles, MapPin
} from 'lucide-react';
import * as xlsx from 'xlsx';
import MapaTactico from '../components/MapaTactico';

export default function LiderDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('supervision'); // 'supervision' | 'guias' | 'solicitudes' | 'voluntarios'
  const [guias, setGuias] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [voluntarios, setVoluntarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionMsg, setActionMsg] = useState(null);
  const [dniStatusMap, setDniStatusMap] = useState({ f2Map: {}, f1Map: {} });

  // Estados interactivos Día D del Líder
  const [guiaStatus, setGuiaStatus] = useState({}); // { [guia_dni]: 'presente' | 'demorado' | 'contacto' }
  const [incidenciasSector, setIncidenciasSector] = useState([
    { id: 1, tipo: 'agua', sector: 'Sector 3', desc: 'Punto de hidratación requiere recarga de bidones', hora: '08:15 AM', resuelto: false },
    { id: 2, tipo: 'kits', sector: 'Sector 3', desc: 'Cuadrilla CUA-014 reporta 2 credenciales adicionales requeridas', hora: '08:40 AM', resuelto: true }
  ]);
  const [nuevaIncidenciaTexto, setNuevaIncidenciaTexto] = useState('');
  const [nuevaIncidenciaTipo, setNuevaIncidenciaTipo] = useState('agua');

  const liderNombre = user?.lider_nombre || user?.nombre || 'Líder de Sector';
  const responsableNombre = user?.responsable_nombre || 'Responsable General';

  const apiUrl = import.meta.env.VITE_API_URL || 'https://voluntarios-backend.vercel.app';

  const fetchData = async () => {
    setLoading(true);
    setActionMsg(null);
    try {
      // 1. Obtener Guías y Cuadrillas asignadas a este Líder
      const { data: guiasData, error: guiasErr } = await supabase
        .from('estructura_mandos')
        .select('*')
        .ilike('lider_nombre', `%${liderNombre}%`)
        .order('id', { ascending: true });

      if (guiasErr) throw guiasErr;
      const list = guiasData || [];
      setGuias(list);

      // 1.1 Obtener estado de validación y etapas por DNI de sus Guías
      const allDnis = [...new Set(list.map(g => g.guia_dni).filter(Boolean).map(d => String(d).trim()))];
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

      // 2. Obtener solicitudes pendientes de su equipo de guías
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

      // 3. Obtener voluntarios si ya existieran asignados
      const { data: volData } = await supabase
        .from('voluntarios')
        .select('*')
        .ilike('lider_nombre', `%${liderNombre}%`)
        .order('nombres_apellidos', { ascending: true });

      setVoluntarios(volData || []);
    } catch (err) {
      console.error('Error cargando datos de líder:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Clasificador de Etapas y Documentación por DNI para Guías del Líder
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

  const totalGuiasPresentes = Object.values(guiaStatus).filter(p => p === 'presente').length;
  const totalCapacidad = guias.reduce((acc, g) => acc + (g.total_voluntarios || 9), 0);

  // Estadísticas de fases de Guías para el Líder
  const statsFases = {
    fase3: 0,
    fase2: 0,
    fase1: 0,
    sinRegistro: 0
  };

  guias.forEach(g => {
    const info = getDniEtapaInfo(g.guia_dni, g.guia_carta);
    if (info.etapa === 3) statsFases.fase3++;
    else if (info.etapa === 2) statsFases.fase2++;
    else if (info.etapa === 1) statsFases.fase1++;
    else statsFases.sinRegistro++;
  });

  // Filtro de búsqueda en la tabla de guías
  const filteredGuias = guias.filter(g => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const matchNom = String(g.guia_nombre || '').toLowerCase().includes(term);
    const matchDni = String(g.guia_dni || '').includes(term);
    const matchCod = String(g.cuadrilla_codigo || '').toLowerCase().includes(term);
    return matchNom || matchDni || matchCod;
  });

  // Exportar a Excel
  const exportToExcel = () => {
    const data = guias.map((g, idx) => {
      const gInfo = getDniEtapaInfo(g.guia_dni, g.guia_carta);
      return {
        '#': idx + 1,
        'Cuadrilla': g.cuadrilla_codigo,
        'Líder': liderNombre,
        'Guía Oficial': g.guia_nombre,
        'DNI Guía': g.guia_dni || '',
        'Teléfono': g.guia_telefono || '',
        'Correo': g.guia_correo || '',
        'Etapa / Fase': gInfo.label,
        'Estado Postulación': gInfo.sublabel,
        'Carta Respaldo': gInfo.tieneCarta ? 'SÍ' : 'NO',
        'CUL Adjunto': gInfo.tieneCul ? 'SÍ' : 'NO',
        'Compromiso Adjunto': gInfo.tieneCompromiso ? 'SÍ' : 'NO',
        'Cupo Voluntarios': g.total_voluntarios || 9,
        'Estado Terreno': guiaStatus[g.guia_dni] === 'presente' ? 'EN PUESTO' : 'PENDIENTE',
        'Sede': g.sede_id || 'Por Definir'
      };
    });

    const ws = xlsx.utils.json_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Guias_Sector');
    xlsx.writeFile(wb, `Guias_${liderNombre.replace(/\s+/g, '_')}.xlsx`);
  };

  const toggleGuiaPresencia = (dni) => {
    setGuiaStatus(prev => ({
      ...prev,
      [dni]: prev[dni] === 'presente' ? 'pendiente' : 'presente'
    }));
  };

  const handleCrearIncidencia = (e) => {
    e.preventDefault();
    if (!nuevaIncidenciaTexto.trim()) return;
    const nueva = {
      id: Date.now(),
      tipo: nuevaIncidenciaTipo,
      sector: `Líder: ${liderNombre.split(' ')[0]}`,
      desc: nuevaIncidenciaTexto.trim(),
      hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      resuelto: false
    };
    setIncidenciasSector([nueva, ...incidenciasSector]);
    setNuevaIncidenciaTexto('');
  };

  const toggleResueltoIncidencia = (id) => {
    setIncidenciasSector(prev => prev.map(inc => inc.id === id ? { ...inc, resuelto: !inc.resuelto } : inc));
  };

  const handleAprobarSolicitud = async (solId, nombreGuia) => {
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
        body: JSON.stringify({ rol: 'guia' })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.msg || 'Error al aprobar solicitud');

      setActionMsg({
        type: 'success',
        text: `✓ Solicitud de ${nombreGuia} aprobada con éxito. Ya puede ingresar con su cuenta.`
      });
      fetchData();
    } catch (err) {
      setActionMsg({ type: 'error', text: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRechazarSolicitud = async (solId, nombreGuia) => {
    if (!confirm(`¿Estás seguro de rechazar la solicitud de acceso de ${nombreGuia}?`)) return;
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
        text: `Solicitud de ${nombreGuia} rechazada.`
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
                  Panel del Líder de Sector
                </span>
                <span className="text-[11px] font-mono font-black px-2 py-0.5 rounded-full bg-diocesis-mustard text-diocesis-redDark shadow-xs uppercase">
                  Mando Táctico
                </span>
              </div>
              <span className="text-xs text-diocesis-mustardLight font-medium">
                Diócesis de Chiclayo • Visita Papal 2026
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-white leading-tight">{liderNombre}</span>
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
        
        {/* Banner de Contexto Jerárquico Oficial */}
        <div className="bg-white rounded-2xl border-2 border-diocesis-mustard/40 p-5 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-diocesis-redDark text-white">
                Cadena de Mando
              </span>
              <span className="text-xs text-stone-500 font-semibold">Supervisión Directa:</span>
            </div>
            <h2 className="text-lg font-black text-diocesis-redDark">
              🎖️ Responsable General: {responsableNombre}
            </h2>
            <p className="text-xs text-stone-600">
              Coordinas el despliegue de <strong className="text-diocesis-red font-bold">{guias.length} guías</strong> y hasta <strong className="text-diocesis-red font-bold">{totalCapacidad} voluntarios</strong> en tu sector.
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
              disabled={guias.length === 0}
              className="px-3 py-2 text-xs font-bold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Exportar Sector
            </button>
          </div>
        </div>

        {/* Tarjetas de Métricas con Estilo Diócesis */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-diocesis-mustard/40 p-4 shadow-sm hover:border-diocesis-mustard transition">
            <div className="flex items-center justify-between text-stone-500 mb-1">
              <span className="text-xs font-bold">Guías a Cargo</span>
              <Shield className="w-4 h-4 text-diocesis-red" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-diocesis-redDark font-mono">
              {guias.length}
            </div>
            <p className="text-[11px] text-stone-500 mt-1">Cuadrillas oficiales asignadas</p>
          </div>

          <div className="bg-white rounded-2xl border border-diocesis-mustard/40 p-4 shadow-sm hover:border-diocesis-mustard transition">
            <div className="flex items-center justify-between text-stone-500 mb-1">
              <span className="text-xs font-bold">Pase de Lista Guías</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono">
              {totalGuiasPresentes} <span className="text-xs text-stone-400 font-normal">/ {guias.length}</span>
            </div>
            <p className="text-[11px] text-stone-500 mt-1">Reportados en zona Día D</p>
          </div>

          <div className="bg-white rounded-2xl border border-diocesis-mustard/40 p-4 shadow-sm hover:border-diocesis-mustard transition">
            <div className="flex items-center justify-between text-stone-500 mb-1">
              <span className="text-xs font-bold">Capacidad Sector</span>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-stone-900 font-mono">
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
              <span className="text-xs font-bold">Solicitudes Guías</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-900 font-mono">
              {solicitudes.length}
            </div>
            <p className="text-[11px] text-stone-500 mt-1">
              {solicitudes.length > 0 ? 'Esperando tu activación' : 'Todo al día'}
            </p>
          </div>
        </div>

        {/* Resumen de Fases y Documentación de Guías del Líder */}
        <div className="bg-white rounded-2xl border border-diocesis-mustard/40 p-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-diocesis-redDark">
                Estado de Documentación y Validación de tus Guías
              </span>
              <p className="text-xs text-stone-500">
                Seguimiento por DNI del primer formulario (Padrón Inicial), segundo formulario (Ficha y Carta) y aprobación oficial
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold text-stone-500">
              Total {guias.length} Guías en tu Equipo
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
            onClick={() => setActiveTab('guias')}
            className={`py-2.5 px-4 text-xs sm:text-sm font-bold border-b-4 transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'guias'
                ? 'border-diocesis-redDark text-diocesis-redDark bg-white/70 rounded-t-xl shadow-xs'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <Shield className="w-4 h-4" />
            Mis Guías & Cuadrillas ({guias.length})
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
            Aprobar Cuentas Guías
            {solicitudes.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-diocesis-red text-white text-[10px] font-bold flex items-center justify-center">
                {solicitudes.length}
              </span>
            )}
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
            Mapa Táctico del Sector
          </button>

          <button
            onClick={() => setActiveTab('voluntarios')}
            className={`py-2.5 px-4 text-xs sm:text-sm font-bold border-b-4 transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'voluntarios'
                ? 'border-diocesis-redDark text-diocesis-redDark bg-white/70 rounded-t-xl shadow-xs'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <Users className="w-4 h-4" />
            Voluntarios ({voluntarios.length})
          </button>
        </div>

        {/* PESTAÑA: MAPA TÁCTICO DEL SECTOR */}
        {activeTab === 'mapa' && (
          <MapaTactico
            rol="lider"
            cuadrillasLista={guias.map(g => ({
              ...g,
              estado_dia_d: guiaStatus[g.guia_dni] || 'pendiente',
              has_sos: incidenciasSector.some(inc => !inc.resuelto && inc.desc.includes(g.cuadrilla_codigo))
            }))}
            liderNombre={liderNombre}
          />
        )}

        {/* PESTAÑA 1: SUPERVISIÓN DÍA D (EN VIVO) */}
        {activeTab === 'supervision' && (
          <div className="space-y-6">
            
            {/* Control Rápido de Presencia de Guías */}
            <div className="bg-white rounded-2xl border border-diocesis-mustard/40 p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-base font-extrabold text-diocesis-redDark flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    Pase de Lista de Guías en el Terreno
                  </h3>
                  <p className="text-xs text-stone-500">
                    Marca con un solo toque los guías que ya se encuentran ubicados en su puesto con su cuadrilla
                  </p>
                </div>
                <span className="text-xs font-mono font-bold px-3 py-1 bg-amber-50 text-amber-900 border border-amber-300 rounded-full w-fit">
                  {totalGuiasPresentes} de {guias.length} Guías en Puesto
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {guias.map((g) => {
                  const isPresent = guiaStatus[g.guia_dni] === 'presente';
                  return (
                    <div 
                      key={g.id}
                      className={`p-3.5 rounded-xl border transition flex items-center justify-between ${
                        isPresent 
                          ? 'bg-emerald-50/80 border-emerald-400 shadow-xs' 
                          : 'bg-stone-50 border-stone-200 hover:border-diocesis-mustard'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] font-black px-1.5 py-0.5 rounded bg-diocesis-redDark text-white">
                            {g.cuadrilla_codigo}
                          </span>
                          <span className="font-bold text-xs text-stone-900 truncate block">
                            {g.guia_nombre}
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-500 font-mono mt-0.5">
                          DNI: {g.guia_dni || 'Sin DNI'} • {g.total_voluntarios || 9} cupos
                        </div>
                      </div>

                      <button
                        onClick={() => toggleGuiaPresencia(g.guia_dni)}
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
                          'Marcar'
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Panel de Alertas e Incidencias en Vivo del Sector */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Formulario para registrar incidencia */}
              <div className="bg-white rounded-2xl border border-diocesis-mustard/40 p-5 shadow-sm">
                <h4 className="text-sm font-extrabold text-diocesis-redDark flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Registrar Incidencia de Sector
                </h4>
                <p className="text-xs text-stone-500 mb-4">
                  Envía reportes directos al centro de comando de la Comisión
                </p>

                <form onSubmit={handleCrearIncidencia} className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-stone-600 block mb-1">Tipo de Incidencia</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setNuevaIncidenciaTipo('agua')}
                        className={`p-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 justify-center ${
                          nuevaIncidenciaTipo === 'agua'
                            ? 'bg-blue-100 text-blue-900 border-blue-400'
                            : 'bg-stone-50 text-stone-600 border-stone-200'
                        }`}
                      >
                        <Droplets className="w-3.5 h-3.5" /> Hidratación
                      </button>
                      <button
                        type="button"
                        onClick={() => setNuevaIncidenciaTipo('medica')}
                        className={`p-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 justify-center ${
                          nuevaIncidenciaTipo === 'medica'
                            ? 'bg-rose-100 text-rose-900 border-rose-400'
                            : 'bg-stone-50 text-stone-600 border-stone-200'
                        }`}
                      >
                        <HeartPulse className="w-3.5 h-3.5" /> Médica
                      </button>
                      <button
                        type="button"
                        onClick={() => setNuevaIncidenciaTipo('seguridad')}
                        className={`p-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 justify-center ${
                          nuevaIncidenciaTipo === 'seguridad'
                            ? 'bg-amber-100 text-amber-900 border-amber-400'
                            : 'bg-stone-50 text-stone-600 border-stone-200'
                        }`}
                      >
                        <ShieldAlert className="w-3.5 h-3.5" /> Seguridad
                      </button>
                      <button
                        type="button"
                        onClick={() => setNuevaIncidenciaTipo('kits')}
                        className={`p-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 justify-center ${
                          nuevaIncidenciaTipo === 'kits'
                            ? 'bg-amber-100 text-amber-900 border-amber-400'
                            : 'bg-stone-50 text-stone-600 border-stone-200'
                        }`}
                      >
                        <Coffee className="w-3.5 h-3.5" /> Kits / Almuerzo
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-stone-600 block mb-1">Descripción Breve</label>
                    <textarea
                      rows={3}
                      value={nuevaIncidenciaTexto}
                      onChange={(e) => setNuevaIncidenciaTexto(e.target.value)}
                      placeholder="Ej: Faltan 10 refrigerios en la zona norte del sector..."
                      className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-diocesis-red"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-diocesis-red hover:bg-diocesis-redLight text-white rounded-xl font-extrabold text-xs transition cursor-pointer shadow-sm"
                  >
                    Transmitir Alerta
                  </button>
                </form>
              </div>

              {/* Registro de Incidencias */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-diocesis-mustard/40 p-5 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-extrabold text-diocesis-redDark">
                    Registro de Incidencias del Sector ({incidenciasSector.length})
                  </h4>
                  <span className="text-[11px] text-stone-400">Canal activo en vivo</span>
                </div>

                <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[300px] pr-1">
                  {incidenciasSector.map((inc) => (
                    <div 
                      key={inc.id}
                      className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${
                        inc.resuelto 
                          ? 'bg-stone-50 border-stone-200 opacity-60' 
                          : 'bg-amber-50/60 border-amber-300'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            inc.tipo === 'medica' ? 'bg-rose-100 text-rose-800' :
                            inc.tipo === 'agua' ? 'bg-blue-100 text-blue-800' :
                            inc.tipo === 'seguridad' ? 'bg-purple-100 text-purple-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {inc.tipo}
                          </span>
                          <span className="text-[11px] font-bold text-stone-600">{inc.sector}</span>
                          <span className="text-[10px] text-stone-400 font-mono">• {inc.hora}</span>
                        </div>
                        <p className={`text-xs font-medium text-stone-800 ${inc.resuelto ? 'line-through' : ''}`}>
                          {inc.desc}
                        </p>
                      </div>

                      <button
                        onClick={() => toggleResueltoIncidencia(inc.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          inc.resuelto
                            ? 'bg-stone-200 text-stone-600 hover:bg-stone-300'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        {inc.resuelto ? 'Reabrir' : 'Atendido'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* PESTAÑA 2: MIS GUÍAS Y CUADRILLAS */}
        {activeTab === 'guias' && (
          <div className="bg-white rounded-2xl border border-diocesis-mustard/40 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/60">
              <div>
                <h3 className="text-sm font-extrabold text-diocesis-redDark">
                  Equipo de Guías Oficiales ({filteredGuias.length})
                </h3>
                <p className="text-xs text-stone-500">
                  Cada guía tiene asignada una cuadrilla oficial de voluntarios
                </p>
              </div>

              <input
                type="text"
                placeholder="Buscar por guía, DNI o cuadrilla..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-diocesis-red w-full sm:w-64"
              />
            </div>

            {loading ? (
              <div className="p-12 text-center text-stone-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-diocesis-red" />
                <p className="text-xs font-bold">Cargando tus guías asignados...</p>
              </div>
            ) : filteredGuias.length === 0 ? (
              <div className="p-12 text-center text-stone-500 text-xs">
                No se encontraron guías con el filtro ingresado.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-stone-100/70 border-b border-stone-200 text-stone-600 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-3">#</th>
                      <th className="py-3 px-3">Cuadrilla</th>
                      <th className="py-3 px-3">Nombre del Guía</th>
                      <th className="py-3 px-3">DNI</th>
                      <th className="py-3 px-3">Etapa / Fase</th>
                      <th className="py-3 px-3">Documentación</th>
                      <th className="py-3 px-3">Estado Terreno</th>
                      <th className="py-3 px-3 text-right">Cupo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredGuias.map((g, i) => {
                      const gInfo = getDniEtapaInfo(g.guia_dni, g.guia_carta);
                      return (
                        <tr key={g.id || i} className="hover:bg-amber-50/40 transition">
                          <td className="py-3 px-3 font-bold text-stone-400">{i + 1}</td>
                          <td className="py-3 px-3">
                            <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-stone-100 text-diocesis-redDark border border-stone-300">
                              {g.cuadrilla_codigo}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-stone-900">{g.guia_nombre}</div>
                            <div className="flex flex-wrap items-center gap-2 text-[10px] text-stone-500 mt-0.5">
                              {g.guia_telefono && (
                                <a 
                                  href={`https://wa.me/51${String(g.guia_telefono).replace(/\D/g, '')}`}
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-bold"
                                  title="Escribir por WhatsApp"
                                >
                                  <Phone className="w-2.5 h-2.5" />
                                  <span>{g.guia_telefono}</span>
                                </a>
                              )}
                              {g.guia_correo && (
                                <span className="text-stone-400 truncate max-w-[150px]" title={g.guia_correo}>
                                  {g.guia_correo}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-stone-700">{g.guia_dni || '-'}</td>
                          
                          {/* Etapa / Fase */}
                          <td className="py-3 px-3">
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
                          <td className="py-3 px-3">
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

                          {/* Estado Terreno Día D */}
                          <td className="py-3 px-3">
                            {guiaStatus[g.guia_dni] === 'presente' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                ✓ EN PUESTO
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-600 border border-stone-200">
                                PENDIENTE
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3 text-right font-bold text-stone-800">
                            {g.total_voluntarios || 9} cupos
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
                Guías de tu equipo que se registraron con su DNI y requieren tu autorización para ingresar
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
                  ¡Al día! No tienes solicitudes pendientes
                </h4>
                <p className="text-xs text-stone-500">
                  Cuando los guías de tu equipo se registren con su DNI, aparecerán aquí para que los actives con un solo clic.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4">Guía / DNI</th>
                      <th className="py-3 px-4">Cuadrilla</th>
                      <th className="py-3 px-4">Correo Ingresado</th>
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
                          <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-stone-100 text-diocesis-redDark border border-stone-300">
                            {s.cuadrilla_codigo || 'CUA-???'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-stone-600">{s.correo}</td>
                        <td className="py-3 px-4 font-bold text-stone-800">{s.telefono || '-'}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleAprobarSolicitud(s.id, s.nombre)}
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

        {/* PESTAÑA 4: PADRÓN DE VOLUNTARIOS */}
        {activeTab === 'voluntarios' && (
          <div className="bg-white rounded-2xl border border-diocesis-mustard/40 p-8 text-center shadow-sm">
            {voluntarios.length === 0 ? (
              <div className="max-w-md mx-auto space-y-2">
                <Clock className="w-10 h-10 text-diocesis-mustard mx-auto" />
                <h4 className="text-sm font-extrabold text-diocesis-redDark">
                  Esperando Asignación de Padrón Oficial
                </h4>
                <p className="text-xs text-stone-500 leading-relaxed">
                  Los voluntarios de tu sector aparecerán distribuidos aquí por cuadrilla y guía en cuanto la Comisión entregue las listas definitivas.
                </p>
              </div>
            ) : (
              <p className="text-xs font-bold text-stone-700">Total: {voluntarios.length} voluntarios en tu sector.</p>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
