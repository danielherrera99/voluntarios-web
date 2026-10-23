import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import { 
  Award, Shield, Users, CheckCircle2, Clock, Search, 
  FileSpreadsheet, RefreshCw, LogOut, Check, X, ChevronDown, ChevronRight
} from 'lucide-react';
import * as xlsx from 'xlsx';

export default function ResponsableDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('estructura'); // 'estructura' | 'solicitudes'
  const [mandos, setMandos] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedLideres, setExpandedLideres] = useState({});
  const [actionMsg, setActionMsg] = useState(null);

  const responsableNombre = user?.responsable_nombre || user?.nombre || 'Responsable General';
  const apiUrl = import.meta.env.VITE_API_URL || 'https://voluntarios-backend.onrender.com';

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
      setMandos(mandosData || []);

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

  const toggleLider = (nombre) => {
    setExpandedLideres(prev => ({
      ...prev,
      [nombre]: !prev[nombre]
    }));
  };

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
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.msg || 'Error al rechazar');

      setActionMsg({ type: 'info', text: `Solicitud de ${nombrePersona} rechazada.` });
      fetchData();
    } catch (err) {
      setActionMsg({ type: 'error', text: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const exportToExcel = () => {
    const data = mandos.map((m, idx) => ({
      '#': idx + 1,
      'Responsable': m.responsable_nombre,
      'Líder': m.lider_nombre,
      'DNI Líder': m.lider_dni || '',
      'Cuadrilla': m.cuadrilla_codigo,
      'Nombre del Guía': m.guia_nombre,
      'DNI Guía': m.guia_dni || '',
      'Carta Respaldo Guía': m.guia_carta ? 'SÍ' : 'PENDIENTE',
      'Cupo Voluntarios': m.total_voluntarios || 9
    }));

    const ws = xlsx.utils.json_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, `Sector_${responsableNombre.slice(0, 15)}`);
    xlsx.writeFile(wb, `Sector_${responsableNombre.replace(/\s+/g, '_')}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold shadow-sm">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-950 border border-amber-300 uppercase">
                  Responsable General
                </span>
                <span className="text-xs font-medium text-stone-500">
                  DNI: <strong className="font-mono text-stone-800">{user?.dni}</strong>
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-extrabold text-stone-900 leading-tight">
                {responsableNombre}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={logout}
              className="px-3 py-1.5 text-xs font-bold text-stone-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition flex items-center gap-1.5 cursor-pointer border border-transparent hover:border-red-200"
            >
              <LogOut className="w-3.5 h-3.5" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6 flex-1">
        
        {/* Banner de Sector */}
        <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
              Sector General
            </span>
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <span className="text-stone-500 font-medium">Coordinación Pastoral:</span>
              <strong className="text-stone-900 font-bold">Diócesis de Chiclayo - Visita Papal 2026</strong>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-3 py-2 text-xs font-bold text-stone-700 bg-stone-50 hover:bg-stone-100 border border-stone-300 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
            <button
              onClick={exportToExcel}
              disabled={mandos.length === 0}
              className="px-3 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Exportar Sector
            </button>
          </div>
        </div>

        {/* Tarjetas de Métricas */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs">
            <span className="text-xs font-bold text-stone-500">Líderes de Sector</span>
            <div className="text-2xl font-black text-amber-900 mt-1">
              {lideresList.length} <span className="text-xs font-normal text-stone-500">líderes</span>
            </div>
            <p className="text-[11px] text-stone-400 mt-1">Mandos intermedios a cargo</p>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs">
            <span className="text-xs font-bold text-stone-500">Total Guías / Cuadrillas</span>
            <div className="text-2xl font-black text-stone-900 mt-1 font-mono">
              {totalGuias}
            </div>
            <p className="text-[11px] text-stone-400 mt-1">Cuadrillas operativas en tu zona</p>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs">
            <span className="text-xs font-bold text-stone-500">Capacidad Total de Sector</span>
            <div className="text-2xl font-black text-blue-900 mt-1">
              {totalCapacidad} <span className="text-xs font-normal text-stone-500">voluntarios</span>
            </div>
            <p className="text-[11px] text-stone-400 mt-1">Capacidad máxima proyectada</p>
          </div>

          <div className={`rounded-2xl border p-4 shadow-xs transition ${
            solicitudes.length > 0 
              ? 'bg-amber-50/70 border-amber-300' 
              : 'bg-white border-stone-200'
          }`}>
            <span className="text-xs font-bold text-stone-500">Solicitudes por Aprobar</span>
            <div className="text-2xl font-black mt-1 text-amber-900">
              {solicitudes.length}
            </div>
            <p className="text-[11px] text-stone-400 mt-1">
              {solicitudes.length > 0 ? 'Mandos esperando tu autorización' : 'Sin solicitudes pendientes'}
            </p>
          </div>
        </div>

        {/* Notificación de acción */}
        {actionMsg && (
          <div className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between border ${
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

        {/* Pestañas de Navegación */}
        <div className="flex border-b border-stone-200 gap-2">
          <button
            onClick={() => setActiveTab('estructura')}
            className={`py-2.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'estructura'
                ? 'border-amber-600 text-amber-950'
                : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            <Shield className="w-4 h-4" />
            Estructura del Sector ({lideresList.length} Líderes • {totalGuias} Guías)
          </button>

          <button
            onClick={() => setActiveTab('solicitudes')}
            className={`py-2.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'solicitudes'
                ? 'border-amber-600 text-amber-950'
                : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Aprobar Cuentas del Sector
            {solicitudes.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                {solicitudes.length}
              </span>
            )}
          </button>
        </div>

        {/* CONTENIDO: TAB ESTRUCTURA */}
        {activeTab === 'estructura' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200">
              <div>
                <h3 className="text-sm font-extrabold text-stone-900">
                  Líderes y Guías del Sector
                </h3>
                <p className="text-xs text-stone-500">
                  Haz clic en cualquier Líder para desplegar sus Guías y Cuadrillas asignadas
                </p>
              </div>

              <input
                type="text"
                placeholder="Buscar líder, guía, DNI o cuadrilla..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 w-full sm:w-72"
              />
            </div>

            {loading ? (
              <div className="bg-white rounded-2xl p-12 text-center text-stone-500 border border-stone-200">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-600" />
                <p className="text-xs font-bold">Cargando árbol de mando del sector...</p>
              </div>
            ) : lideresList.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center text-stone-500 border border-stone-200 text-xs">
                No se encontraron líderes asignados a este Responsable.
              </div>
            ) : (
              <div className="space-y-3">
                {lideresList.map((lider, lIdx) => {
                  const isExpanded = Boolean(expandedLideres[lider.nombre] || searchTerm);
                  const matchingGuias = lider.guias.filter(g => {
                    if (!searchTerm) return true;
                    const t = searchTerm.toLowerCase();
                    return (
                      String(g.guia_nombre || '').toLowerCase().includes(t) ||
                      String(g.guia_dni || '').toLowerCase().includes(t) ||
                      String(g.cuadrilla_codigo || '').toLowerCase().includes(t) ||
                      String(lider.nombre || '').toLowerCase().includes(t)
                    );
                  });

                  if (searchTerm && matchingGuias.length === 0) return null;

                  return (
                    <div key={lider.nombre || lIdx} className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
                      {/* Cabecera del Líder */}
                      <button
                        onClick={() => toggleLider(lider.nombre)}
                        className="w-full p-4 flex items-center justify-between hover:bg-stone-50/80 transition text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200 uppercase">
                                Líder de Sector
                              </span>
                              {lider.dni && (
                                <span className="text-[11px] font-mono text-stone-500">
                                  DNI: {lider.dni}
                                </span>
                              )}
                            </div>
                            <h4 className="text-sm font-extrabold text-stone-900 mt-0.5">
                              {lider.nombre}
                            </h4>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs font-bold text-stone-600">
                          <span className="px-2.5 py-1 rounded-lg bg-stone-100 text-stone-800">
                            {matchingGuias.length} Guías / Cuadrillas
                          </span>
                        </div>
                      </button>

                      {/* Tabla desplegable de Guías */}
                      {isExpanded && (
                        <div className="border-t border-stone-100 bg-stone-50/50 p-3 overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="text-stone-500 font-bold uppercase text-[10px] tracking-wider border-b border-stone-200">
                                <th className="py-2 px-3">Cuadrilla</th>
                                <th className="py-2 px-3">Nombre del Guía</th>
                                <th className="py-2 px-3">DNI</th>
                                <th className="py-2 px-3">Carta Respaldo</th>
                                <th className="py-2 px-3 text-right">Cupo</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                              {matchingGuias.map((g, gi) => (
                                <tr key={g.id || gi} className="hover:bg-amber-50/30 transition">
                                  <td className="py-2.5 px-3">
                                    <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 border border-stone-300">
                                      {g.cuadrilla_codigo}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 font-bold text-stone-900">{g.guia_nombre}</td>
                                  <td className="py-2.5 px-3 font-mono font-bold text-stone-600">{g.guia_dni || '-'}</td>
                                  <td className="py-2.5 px-3">
                                    {g.guia_carta ? (
                                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200">
                                        ✓ ENVIADO
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full border border-stone-300">
                                        PENDIENTE
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 font-bold text-stone-800 text-right">
                                    {g.total_voluntarios || 9} cupos
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* CONTENIDO: TAB APROBAR SOLICITUDES (DELEGACIÓN JERÁRQUICA) */}
        {activeTab === 'solicitudes' && (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-stone-100">
              <h3 className="text-sm font-extrabold text-stone-900">
                Solicitudes de Acceso de tu Sector ({solicitudes.length})
              </h3>
              <p className="text-xs text-stone-500">
                Líderes y Guías de tu zona que se registraron con su DNI y requieren tu activación
              </p>
            </div>

            {loading ? (
              <div className="p-12 text-center text-stone-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-600" />
                <p className="text-xs font-bold">Verificando solicitudes del sector...</p>
              </div>
            ) : solicitudes.length === 0 ? (
              <div className="p-12 text-center max-w-md mx-auto space-y-2">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-extrabold text-stone-900">
                  ¡Al día! No hay solicitudes pendientes en tu sector
                </h4>
                <p className="text-xs text-stone-500">
                  Cuando tus líderes o guías creen su cuenta con su DNI, aparecerán listados aquí para que los autorices.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4">Postulante / DNI</th>
                      <th className="py-3 px-4">Cargo Reconocido</th>
                      <th className="py-3 px-4">Líder / Cuadrilla</th>
                      <th className="py-3 px-4">Contacto</th>
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
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            s.rol === 'lider'
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : 'bg-blue-100 text-blue-900 border border-blue-300'
                          }`}>
                            {s.rol === 'lider' ? '🛡️ Líder de Sector' : '🤝 Guía de Cuadrilla'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-stone-800">{s.lider_nombre || '-'}</div>
                          {s.cuadrilla_codigo && (
                            <div className="text-[10px] font-mono text-stone-500">{s.cuadrilla_codigo}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-mono text-stone-600">{s.correo}</div>
                          <div className="text-[11px] font-bold text-stone-700">{s.telefono || '-'}</div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleAprobarSolicitud(s.id, s.nombre, s.rol)}
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
