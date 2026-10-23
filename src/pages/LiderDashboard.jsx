import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import { 
  Shield, Users, CheckCircle2, XCircle, Clock, AlertCircle, 
  Search, FileSpreadsheet, RefreshCw, LogOut, Check, X, Phone, Mail
} from 'lucide-react';
import * as xlsx from 'xlsx';

export default function LiderDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('guias'); // 'guias' | 'solicitudes' | 'voluntarios'
  const [guias, setGuias] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [voluntarios, setVoluntarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionMsg, setActionMsg] = useState(null);

  const liderNombre = user?.lider_nombre || user?.nombre || 'Líder';
  const responsableNombre = user?.responsable_nombre || 'Responsable General';

  const apiUrl = import.meta.env.VITE_API_URL || 'https://voluntarios-backend.onrender.com';

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
      setGuias(guiasData || []);

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
        text: `✓ Solicitud de ${nombreGuia} aprobada con éxito. Ya puede ingresar a su cuenta.`
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
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.msg || 'Error al rechazar');

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

  const filteredGuias = guias.filter(g => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      String(g.guia_nombre || '').toLowerCase().includes(term) ||
      String(g.guia_dni || '').toLowerCase().includes(term) ||
      String(g.cuadrilla_codigo || '').toLowerCase().includes(term)
    );
  });

  const totalCapacidad = guias.reduce((acc, g) => acc + (g.total_voluntarios || 9), 0);

  const exportToExcel = () => {
    const data = filteredGuias.map((g, idx) => ({
      '#': idx + 1,
      'Cuadrilla': g.cuadrilla_codigo,
      'Líder': g.lider_nombre,
      'Responsable': g.responsable_nombre,
      'Nombre del Guía': g.guia_nombre,
      'DNI Guía': g.guia_dni || '',
      'Carta de Respaldo': g.guia_carta ? 'SÍ' : 'PENDIENTE',
      'Cupo Voluntarios': g.total_voluntarios || 9
    }));

    const ws = xlsx.utils.json_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, `Guias_Lider_${liderNombre.slice(0, 15)}`);
    xlsx.writeFile(wb, `Guias_${liderNombre.replace(/\s+/g, '_')}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-sm">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200 uppercase">
                  Líder de Sector
                </span>
                <span className="text-xs font-medium text-stone-500">
                  DNI: <strong className="font-mono text-stone-800">{user?.dni}</strong>
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-extrabold text-stone-900 leading-tight">
                {liderNombre}
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
        
        {/* Banner de Contexto Jerárquico */}
        <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
              Sector Asignado
            </span>
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <span className="text-stone-500 font-medium">Bajo la supervisión de:</span>
              <strong className="text-stone-900 font-bold">🎖️ {responsableNombre}</strong>
              <span className="text-stone-400">•</span>
              <span className="text-stone-600 font-medium">Diócesis de Chiclayo 2026</span>
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
              disabled={guias.length === 0}
              className="px-3 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Exportar Guías
            </button>
          </div>
        </div>

        {/* Tarjetas de Métricas */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs">
            <span className="text-xs font-bold text-stone-500">Guías a Cargo</span>
            <div className="text-2xl font-black text-emerald-800 mt-1">
              {guias.length} <span className="text-xs font-normal text-stone-500">guías</span>
            </div>
            <p className="text-[11px] text-stone-400 mt-1">Equipo directo de coordinación</p>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs">
            <span className="text-xs font-bold text-stone-500">Cuadrillas Asignadas</span>
            <div className="text-2xl font-black text-stone-900 mt-1 font-mono">
              {guias.length}
            </div>
            <p className="text-[11px] text-stone-400 mt-1">Cuadrillas activas en campo</p>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs">
            <span className="text-xs font-bold text-stone-500">Capacidad Total</span>
            <div className="text-2xl font-black text-blue-900 mt-1">
              {totalCapacidad} <span className="text-xs font-normal text-stone-500">voluntarios</span>
            </div>
            <p className="text-[11px] text-stone-400 mt-1">Proyección máxima de tu sector</p>
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
              {solicitudes.length > 0 ? 'Guías esperando tu aprobación' : 'Sin solicitudes pendientes'}
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
            onClick={() => setActiveTab('guias')}
            className={`py-2.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'guias'
                ? 'border-emerald-600 text-emerald-900'
                : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            <Users className="w-4 h-4" />
            Mis Guías y Cuadrillas ({guias.length})
          </button>

          <button
            onClick={() => setActiveTab('solicitudes')}
            className={`py-2.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'solicitudes'
                ? 'border-emerald-600 text-emerald-900'
                : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Aprobar Cuentas de Guías
            {solicitudes.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                {solicitudes.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('voluntarios')}
            className={`py-2.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'voluntarios'
                ? 'border-emerald-600 text-emerald-900'
                : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            <Users className="w-4 h-4" />
            Voluntarios del Sector ({voluntarios.length})
          </button>
        </div>

        {/* CONTENIDO: TAB GUÍAS */}
        {activeTab === 'guias' && (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-stone-900">
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
                className="px-3 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full sm:w-64"
              />
            </div>

            {loading ? (
              <div className="p-12 text-center text-stone-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
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
                    <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Cuadrilla</th>
                      <th className="py-3 px-4">Nombre del Guía</th>
                      <th className="py-3 px-4">DNI</th>
                      <th className="py-3 px-4">Carta Respaldo</th>
                      <th className="py-3 px-4">Cupo Voluntarios</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredGuias.map((g, i) => (
                      <tr key={g.id || i} className="hover:bg-emerald-50/30 transition">
                        <td className="py-3 px-4 font-bold text-stone-400">{i + 1}</td>
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 border border-stone-300">
                            {g.cuadrilla_codigo}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-stone-900">{g.guia_nombre}</td>
                        <td className="py-3 px-4 font-mono font-bold text-stone-700">{g.guia_dni || '-'}</td>
                        <td className="py-3 px-4">
                          {g.guia_carta ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              ✓ ENVIADO
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-600 border border-stone-300">
                              PENDIENTE
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-bold text-stone-800">
                          {g.total_voluntarios || 9} cupos
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* CONTENIDO: TAB APROBAR SOLICITUDES (DELEGACIÓN JERÁRQUICA) */}
        {activeTab === 'solicitudes' && (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-stone-100">
              <h3 className="text-sm font-extrabold text-stone-900">
                Solicitudes de Acceso Pendientes ({solicitudes.length})
              </h3>
              <p className="text-xs text-stone-500">
                Guías de tu equipo que se registraron con su DNI y requieren tu autorización para ingresar
              </p>
            </div>

            {loading ? (
              <div className="p-12 text-center text-stone-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
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
                          <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
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

        {/* CONTENIDO: TAB VOLUNTARIOS */}
        {activeTab === 'voluntarios' && (
          <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center shadow-xs">
            {voluntarios.length === 0 ? (
              <div className="max-w-md mx-auto space-y-2">
                <Clock className="w-10 h-10 text-stone-400 mx-auto" />
                <h4 className="text-sm font-extrabold text-stone-900">
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
