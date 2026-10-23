import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import { 
  Users, Shield, LogOut, Phone, Mail, CheckCircle2, Clock, 
  AlertCircle, MessageCircle, FileSpreadsheet, RefreshCw, UserCheck
} from 'lucide-react';
import * as xlsx from 'xlsx';

export default function GuiaDashboard() {
  const { user, logout } = useAuth();
  const [voluntarios, setVoluntarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const cuadrillaCode = user?.cuadrilla_codigo || 'CUA-???';
  const guiaNombre = user?.guia_nombre || user?.nombre || 'Guía';
  const liderNombre = user?.lider_nombre || 'Líder Asignado';
  const responsableNombre = user?.responsable_nombre || 'Responsable General';

  const fetchCuadrilla = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('voluntarios')
        .select('*');

      if (user?.cuadrilla_codigo) {
        query = query.or(`cuadrilla_codigo.eq.${user.cuadrilla_codigo},guia_nombre.eq.${guiaNombre}`);
      } else {
        query = query.eq('guia_nombre', guiaNombre);
      }

      const { data, error } = await query.order('nombres_apellidos', { ascending: true });
      if (error) throw error;
      setVoluntarios(data || []);
    } catch (err) {
      console.error('Error cargando cuadrilla:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCuadrilla();
  }, [user]);

  const filteredVoluntarios = voluntarios.filter(v => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const nom = String(v.nombres_apellidos || '').toLowerCase();
    const dni = String(v.dni || '').toLowerCase();
    return nom.includes(term) || dni.includes(term);
  });

  const exportToExcel = () => {
    const data = filteredVoluntarios.map((v, idx) => ({
      '#': idx + 1,
      'Cuadrilla': cuadrillaCode,
      'Guía': guiaNombre,
      'Líder': liderNombre,
      'Responsable': responsableNombre,
      'DNI': v.dni || '',
      'Código Voluntario': v.codigo || '',
      'Nombres y Apellidos': v.nombres_apellidos || '',
      'Celular': v.telefono || '',
      'Correo': v.correo || '',
      'Estado': v.estado || 'REGISTRADO'
    }));

    const ws = xlsx.utils.json_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, `Cuadrilla_${cuadrillaCode}`);
    xlsx.writeFile(wb, `Cuadrilla_${cuadrillaCode}_${guiaNombre.replace(/\s+/g, '_')}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-sm">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-200 uppercase">
                  Guía de Cuadrilla
                </span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-800 border border-stone-300">
                  {cuadrillaCode}
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-extrabold text-stone-900 leading-tight">
                {guiaNombre}
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
        
        {/* Banner de Jerarquía de Mando */}
        <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
              Cadena de Mando Oficial
            </span>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-sm">
              <div className="flex items-center gap-1.5">
                <span className="text-stone-500 font-medium">🎖️ Responsable General:</span>
                <strong className="text-stone-900 font-bold">{responsableNombre}</strong>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-stone-500 font-medium">🛡️ Líder de Sector:</span>
                <strong className="text-stone-900 font-bold">{liderNombre}</strong>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchCuadrilla}
              disabled={loading}
              className="px-3 py-2 text-xs font-bold text-stone-700 bg-stone-50 hover:bg-stone-100 border border-stone-300 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
            <button
              onClick={exportToExcel}
              disabled={voluntarios.length === 0}
              className="px-3 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Exportar Excel
            </button>
          </div>
        </div>

        {/* Tarjetas de Métricas de Cuadrilla */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs">
            <span className="text-xs font-bold text-stone-500">Código de Cuadrilla</span>
            <div className="text-2xl font-black text-blue-900 font-mono mt-1">
              {cuadrillaCode}
            </div>
            <p className="text-[11px] text-stone-400 mt-1">Identificador único en campo</p>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs">
            <span className="text-xs font-bold text-stone-500">Cupo Programado</span>
            <div className="text-2xl font-black text-stone-900 mt-1">
              9 <span className="text-xs font-normal text-stone-500">voluntarios</span>
            </div>
            <p className="text-[11px] text-stone-400 mt-1">Capacidad estándar por guía</p>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs">
            <span className="text-xs font-bold text-stone-500">Voluntarios Asignados</span>
            <div className="text-2xl font-black text-emerald-700 mt-1">
              {voluntarios.length} <span className="text-xs font-normal text-stone-500">registrados</span>
            </div>
            <p className="text-[11px] text-stone-400 mt-1">
              {voluntarios.length > 0 ? 'Cuadrilla con personal activo' : 'Esperando asignación oficial'}
            </p>
          </div>
        </div>

        {/* Lista o Estado de Voluntarios */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-stone-900">
                Miembros de mi Cuadrilla ({filteredVoluntarios.length})
              </h2>
              <p className="text-xs text-stone-500">
                Lista de voluntarios asignados bajo tu liderazgo directo en campo
              </p>
            </div>

            {voluntarios.length > 0 && (
              <input
                type="text"
                placeholder="Buscar por nombre o DNI..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
              />
            )}
          </div>

          {loading ? (
            <div className="p-12 text-center text-stone-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
              <p className="text-xs font-bold">Cargando información de tu cuadrilla...</p>
            </div>
          ) : voluntarios.length === 0 ? (
            <div className="p-12 text-center max-w-lg mx-auto space-y-3">
              <div className="w-16 h-16 bg-blue-50 text-blue-700 rounded-3xl flex items-center justify-center mx-auto border border-blue-200 shadow-inner">
                <Clock className="w-8 h-8" />
              </div>
              <h3 className="text-base font-extrabold text-stone-900">
                Cuadrilla {cuadrillaCode} Activa y en Espera
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                ¡Tu cuenta y cuadrilla están 100% configuradas en el sistema oficial! Los <strong>9 voluntarios</strong> de tu cuadrilla aparecerán listados aquí con sus teléfonos, nombres y botones directos de WhatsApp tan pronto la Comisión cargue el padrón oficial de distribución.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">DNI</th>
                    <th className="py-3 px-4">Código</th>
                    <th className="py-3 px-4">Nombres y Apellidos</th>
                    <th className="py-3 px-4">Contacto Directo</th>
                    <th className="py-3 px-4">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredVoluntarios.map((v, i) => (
                    <tr key={v.id || i} className="hover:bg-blue-50/40 transition">
                      <td className="py-3 px-4 font-bold text-stone-400">{i + 1}</td>
                      <td className="py-3 px-4 font-mono font-bold text-stone-900">{v.dni}</td>
                      <td className="py-3 px-4 font-mono text-stone-600">{v.codigo || '-'}</td>
                      <td className="py-3 px-4 font-bold text-stone-800">{v.nombres_apellidos}</td>
                      <td className="py-3 px-4">
                        {v.telefono ? (
                          <a
                            href={`https://api.whatsapp.com/send/?phone=51${String(v.telefono).replace(/\D/g, '')}&text=Hola%20${encodeURIComponent(v.nombres_apellidos)},%20te%20saluda%20tu%20guía%20${encodeURIComponent(guiaNombre)}%20de%20la%20cuadrilla%20${cuadrillaCode}.`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] transition shadow-xs"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            {v.telefono}
                          </a>
                        ) : (
                          <span className="text-stone-400 italic text-[11px]">Sin teléfono</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {v.estado || 'REGISTRADO'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
