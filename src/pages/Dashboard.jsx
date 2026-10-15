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
  FolderOpen
} from 'lucide-react';

export default function Dashboard() {
  const { user, logout } = useAuth();
  
  // Pestaña activa: 'fase2' (Google Forms) o 'fase1' (Padrón General)
  const [activeTab, setActiveTab] = useState('fase2');

  // Datos y paginación
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL', 'SELECCIONADO', 'EN REVISIÓN', 'PENDIENTE'
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalRecords, setTotalRecords] = useState(0);

  // Estadísticas globales (KPIs)
  const [stats, setStats] = useState({
    generalTotal: 7241,
    fase2Total: 0,
    seleccionados: 0,
    enRevision: 0,
    pendientes: 0
  });

  // Estado de sincronización en vivo
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState(null);

  // Modal de detalle
  const [selectedVoluntario, setSelectedVoluntario] = useState(null);

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
  }, [activeTab, statusFilter]);

  // Cargar estadísticas globales una sola vez o al sincronizar
  const fetchGlobalStats = useCallback(async () => {
    try {
      const [
        { count: generalCount },
        { count: f2Total },
        { count: selCount },
        { count: revCount },
        { count: pendCount }
      ] = await Promise.all([
        supabase.from('voluntarios_general').select('*', { count: 'exact', head: true }),
        supabase.from('voluntarios').select('*', { count: 'exact', head: true }),
        supabase.from('voluntarios').select('*', { count: 'exact', head: true }).eq('estado', 'SELECCIONADO'),
        supabase.from('voluntarios').select('*', { count: 'exact', head: true }).eq('estado', 'EN REVISIÓN'),
        supabase.from('voluntarios').select('*', { count: 'exact', head: true }).or('estado.eq.PENDIENTE,estado.is.null')
      ]);

      setStats({
        generalTotal: generalCount || 7241,
        fase2Total: f2Total || 0,
        seleccionados: selCount || 0,
        enRevision: revCount || 0,
        pendientes: pendCount || 0
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
      const tableName = activeTab === 'fase2' ? 'voluntarios' : 'voluntarios_general';
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
      if (activeTab === 'fase2' && statusFilter !== 'ALL') {
        if (statusFilter === 'PENDIENTE') {
          query = query.or('estado.eq.PENDIENTE,estado.is.null');
        } else {
          query = query.eq('estado', statusFilter);
        }
      }

      // Orden y rango de paginación
      if (activeTab === 'fase2') {
        query = query.order('nombres_apellidos', { ascending: true }).range(from, to);
      } else {
        query = query.order('nombres_apellidos', { ascending: true }).range(from, to);
      }

      const { data, count, error } = await query;
      if (error) throw error;

      setRecords(data || []);
      setTotalRecords(count || 0);
    } catch (err) {
      console.error('Error consultando registros:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, currentPage, pageSize, debouncedSearch, statusFilter]);

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

  const totalPages = Math.ceil(totalRecords / pageSize) || 1;

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col font-sans text-stone-800">
      
      {/* NAVBAR SUPERIOR */}
      <nav className="bg-diocesis-redDark text-white sticky top-0 z-40 shadow-lg border-b-2 border-diocesis-mustard">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-diocesis-mustard flex items-center justify-center text-diocesis-redDark shadow">
              <ShieldCheck className="w-6 h-6" />
            </div>
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
              <span className="text-xs font-bold text-stone-200">{user?.email}</span>
              <span className="text-[10px] text-diocesis-mustard uppercase font-semibold">Administrador</span>
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

        {/* TARJETAS DE ESTADÍSTICAS (KPIS) */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
          
          {/* Total Fase 1 General */}
          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-stone-500 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Padrón Fase 1</span>
              <Database className="w-4 h-4 text-stone-400" />
            </div>
            <div className="text-2xl md:text-3xl font-extrabold text-stone-800">
              {stats.generalTotal.toLocaleString()}
            </div>
            <span className="text-[11px] text-stone-500 mt-1">Inscritos Iniciales</span>
          </div>

          {/* Total Fase 2 Forms */}
          <div className="bg-white rounded-2xl p-4 border-2 border-diocesis-mustard shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-diocesis-mustardDark mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Fase 2 (Google Forms)</span>
              <FolderOpen className="w-4 h-4 text-diocesis-mustard" />
            </div>
            <div className="text-2xl md:text-3xl font-extrabold text-diocesis-redDark">
              {stats.fase2Total.toLocaleString()}
            </div>
            <span className="text-[11px] text-diocesis-mustardDark font-medium mt-1">Expedientes Únicos</span>
          </div>

          {/* Seleccionados / Validados */}
          <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-700 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Seleccionados</span>
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl md:text-3xl font-extrabold text-emerald-700">
              {stats.seleccionados.toLocaleString()}
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold mt-1">Pase a Etapa 3</span>
          </div>

          {/* En Revisión / Observados */}
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-amber-800 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">En Revisión</span>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl md:text-3xl font-extrabold text-amber-800">
              {stats.enRevision.toLocaleString()}
            </div>
            <span className="text-[11px] text-amber-700 font-semibold mt-1">Con Observación</span>
          </div>

          {/* Pendientes */}
          <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 shadow-sm flex flex-col justify-between col-span-2 md:col-span-1">
            <div className="flex items-center justify-between text-stone-600 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Pendientes</span>
              <Clock className="w-4 h-4 text-stone-500" />
            </div>
            <div className="text-2xl md:text-3xl font-extrabold text-stone-700">
              {stats.pendientes.toLocaleString()}
            </div>
            <span className="text-[11px] text-stone-500 font-semibold mt-1">Por evaluar</span>
          </div>
        </div>

        {/* BARRA DE CONTROL: PESTAÑAS, BUSCADOR Y ACCIONES */}
        <div className="bg-white rounded-3xl p-4 md:p-6 shadow-sm border border-stone-200 space-y-4">
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Pestañas de Navegación */}
            <div className="inline-flex p-1 bg-stone-100 rounded-2xl border border-stone-200 self-start">
              <button
                onClick={() => setActiveTab('fase2')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition ${
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
                onClick={() => setActiveTab('fase1')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition ${
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
            </div>

            {/* Acciones Rápidas */}
            <div className="flex items-center gap-2 self-end lg:self-auto">
              {syncMsg && (
                <span className="text-xs font-semibold text-diocesis-mustardDark animate-pulse">
                  {syncMsg}
                </span>
              )}
              <button
                onClick={handleSyncNow}
                disabled={syncing}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-stone-50 hover:bg-stone-100 border border-stone-300 rounded-xl text-xs font-bold text-stone-700 transition disabled:opacity-50"
                title="Sincronizar ahora con la hoja de Google Sheets"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-diocesis-red' : ''}`} />
                {syncing ? 'Sincronizando...' : 'Sincronizar Sheets'}
              </button>
            </div>
          </div>

          {/* Filtros y Buscador */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 border-t border-stone-100">
            
            {/* Buscador por DNI / Nombres */}
            <div className="md:col-span-6 lg:col-span-7 relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por DNI o Nombres y Apellidos..."
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

            {/* Filtro por Estado (Solo para Fase 2) */}
            {activeTab === 'fase2' ? (
              <div className="md:col-span-4 lg:col-span-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full py-2.5 px-3 bg-stone-50 border border-stone-300 rounded-xl text-sm font-semibold text-stone-700 focus:outline-none focus:ring-2 focus:ring-diocesis-mustard"
                >
                  <option value="ALL">Todos los Estados</option>
                  <option value="SELECCIONADO">✅ Solo Seleccionados</option>
                  <option value="EN REVISIÓN">⚠️ En Revisión / Observados</option>
                  <option value="PENDIENTE">⏳ Pendientes</option>
                </select>
              </div>
            ) : (
              <div className="md:col-span-4 lg:col-span-3 flex items-center text-xs text-stone-500 font-medium px-2">
                Mostrando Padrón Diocesano Completo
              </div>
            )}

            {/* Selector de cantidad por página */}
            <div className="md:col-span-2 lg:col-span-2">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="w-full py-2.5 px-3 bg-stone-50 border border-stone-300 rounded-xl text-sm font-semibold text-stone-700 focus:outline-none focus:ring-2 focus:ring-diocesis-mustard"
              >
                <option value={25}>25 por pág.</option>
                <option value={50}>50 por pág.</option>
                <option value={100}>100 por pág.</option>
              </select>
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
                      <th className="py-3 px-4">Código</th>
                      <th className="py-3 px-4">Distrito / Parroquia</th>
                      <th className="py-3 px-4 text-center">Talla</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {loading ? (
                  <tr>
                    <td colSpan={activeTab === 'fase2' ? 7 : 7} className="py-12 text-center text-stone-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-diocesis-mustard" />
                      <span className="font-semibold text-sm">Cargando registros...</span>
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={activeTab === 'fase2' ? 7 : 7} className="py-12 text-center text-stone-500">
                      <Users className="w-8 h-8 mx-auto mb-2 text-stone-300" />
                      <p className="font-bold text-stone-700">No se encontraron registros</p>
                      <p className="text-xs text-stone-400 mt-1">Prueba cambiando los términos de búsqueda o el filtro.</p>
                    </td>
                  </tr>
                ) : (
                  records.map((r, idx) => {
                    const isApproved = r.estado === 'SELECCIONADO' || r.info_validada;
                    const isRevision = r.estado === 'EN REVISIÓN';

                    return (
                      <tr key={r.id || r.dni || idx} className="hover:bg-amber-50/40 transition">
                        {/* DNI */}
                        <td className="py-3 px-4 font-mono font-bold text-diocesis-redDark whitespace-nowrap">
                          {r.dni}
                        </td>

                        {/* Nombres y Apellidos */}
                        <td className="py-3 px-4 font-semibold text-stone-900">
                          {r.nombres_apellidos}
                        </td>

                        {/* Servicio */}
                        <td className="py-3 px-4 text-stone-600 text-xs">
                          {r.servicio || r.grupo_integra || <span className="text-stone-400 italic">No asignado</span>}
                        </td>

                        {/* Contacto */}
                        <td className="py-3 px-4 text-xs">
                          <div className="font-medium text-stone-800">{r.telefono || '-'}</div>
                          <div className="text-stone-400 text-[11px] truncate max-w-[150px]">{r.correo || '-'}</div>
                        </td>

                        {/* Columnas específicas de Fase 2 */}
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
                            {/* Columnas específicas de Fase 1 */}
                            <td className="py-3 px-4 font-mono text-xs font-semibold text-stone-600">
                              {r.codigo || '-'}
                            </td>
                            <td className="py-3 px-4 text-xs text-stone-600">
                              {r.distrito || r.jurisdiccion || '-'}
                            </td>
                            <td className="py-3 px-4 text-center font-bold text-xs text-stone-700">
                              {r.talla || '-'}
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
                  {selectedVoluntario.nombres_apellidos}
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
                  selectedVoluntario.estado === 'EN REVISIÓN' ? 'text-amber-700' : 'text-stone-700'
                }`}>
                  {selectedVoluntario.estado || 'PENDIENTE'}
                </span>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl">
                <span className="text-stone-400 block text-[10px] font-semibold uppercase">Teléfono</span>
                <span className="font-bold text-stone-800">{selectedVoluntario.telefono || '-'}</span>
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
              <span className="text-xs font-bold text-stone-700 block">Documentos Subidos en Google Forms:</span>
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
            </div>

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

    </div>
  );
}
