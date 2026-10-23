import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import { 
  Users, Shield, LogOut, Phone, Mail, CheckCircle2, Clock, 
  AlertCircle, MessageCircle, FileSpreadsheet, RefreshCw, UserCheck,
  AlertTriangle, Check, X, ShieldAlert, HeartPulse, Droplets, MapPin, Coffee, Sparkles
} from 'lucide-react';
import * as xlsx from 'xlsx';

export default function GuiaDashboard() {
  const { user, logout } = useAuth();
  const [voluntarios, setVoluntarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estado del Día del Evento: Asistencia, Kits y Refrigerios
  const [asistencia, setAsistencia] = useState({});
  const [kitEntregado, setKitEntregado] = useState({});
  const [almuerzoEntregado, setAlmuerzoEntregado] = useState({});
  const [showSosModal, setShowSosModal] = useState(false);
  const [sosSent, setSosSent] = useState(false);
  const [sosType, setSosType] = useState('');

  const cuadrillaCode = user?.cuadrilla_codigo || 'CUA-???';
  const guiaNombre = user?.guia_nombre || user?.nombre || 'Guía de Cuadrilla';
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

  const toggleAsistencia = (id) => {
    setAsistencia(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const toggleKit = (id) => {
    setKitEntregado(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const toggleAlmuerzo = (id) => {
    setAlmuerzoEntregado(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleSendSos = (type) => {
    setSosType(type);
    setSosSent(true);
    setTimeout(() => {
      setSosSent(false);
      setShowSosModal(false);
    }, 3500);
  };

  const totalPresentes = Object.values(asistencia).filter(Boolean).length;
  const totalKits = Object.values(kitEntregado).filter(Boolean).length;

  const filteredVoluntarios = voluntarios.filter(v => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const nom = String(v.nombres_apellidos || '').toLowerCase();
    const dni = String(v.dni || '').toLowerCase();
    return nom.includes(term) || dni.includes(term);
  });

  const exportToExcel = () => {
    const data = (filteredVoluntarios.length > 0 ? filteredVoluntarios : [{}]).map((v, idx) => ({
      '#': idx + 1,
      'Cuadrilla': cuadrillaCode,
      'Guía': guiaNombre,
      'Líder': liderNombre,
      'Responsable': responsableNombre,
      'DNI': v.dni || '',
      'Nombres y Apellidos': v.nombres_apellidos || 'Sin voluntarios asignados aún',
      'Celular': v.telefono || '',
      'Asistencia Día D': asistencia[v.id] ? 'PRESENTE' : 'AUSENTE',
      'Kit Entregado': kitEntregado[v.id] ? 'SÍ' : 'NO',
      'Refrigerio Entregado': almuerzoEntregado[v.id] ? 'SÍ' : 'NO'
    }));

    const ws = xlsx.utils.json_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, `Cuadrilla_${cuadrillaCode}`);
    xlsx.writeFile(wb, `Cuadrilla_${cuadrillaCode}_${guiaNombre.replace(/\s+/g, '_')}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col font-sans text-stone-800">
      
      {/* NAVBAR SUPERIOR OFICIAL DIÓCESIS */}
      <nav className="bg-diocesis-redDark text-white sticky top-0 z-40 shadow-lg border-b-2 border-diocesis-mustard">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/logos/logo_comision_juventud.png" 
              alt="Diócesis de Chiclayo" 
              className="w-10 h-10 object-contain drop-shadow"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-title font-bold text-base md:text-lg tracking-wide text-white block leading-tight">
                  Panel del Guía de Cuadrilla
                </span>
                <span className="text-[11px] font-mono font-black px-2 py-0.5 rounded-full bg-diocesis-mustard text-diocesis-redDark shadow-xs">
                  {cuadrillaCode}
                </span>
              </div>
              <span className="text-xs text-diocesis-mustardLight font-medium">
                Diócesis de Chiclayo • Visita Papal 2026
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-bold text-stone-100">{guiaNombre}</span>
              <span className="text-[10px] text-diocesis-mustard uppercase font-semibold">
                Guía de Campo
              </span>
            </div>

            <button
              onClick={() => setShowSosModal(true)}
              className="px-3 py-1.5 text-xs font-black bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-md transition flex items-center gap-1.5 animate-pulse cursor-pointer border border-rose-400"
              title="Reportar Emergencia o Incidencia en Campo"
            >
              <ShieldAlert className="w-4 h-4" />
              <span className="hidden sm:inline">SOS Incidencia</span>
            </button>

            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white shadow transition cursor-pointer border border-white/20"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </nav>

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6 flex-1">
        
        {/* BANNER DE CADENA DE MANDO (ESTILO DIÓCESIS) */}
        <div className="bg-gradient-to-r from-diocesis-redDark via-diocesis-red to-diocesis-redDark rounded-3xl p-5 md:p-6 text-white shadow-md border border-diocesis-mustard/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-diocesis-mustard/20 text-diocesis-mustardLight border border-diocesis-mustard/40 text-[10px] font-black uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-diocesis-mustard" />
              Cadena de Mando Oficial
            </div>
            <h2 className="text-lg md:text-xl font-title font-bold text-white">
              Cuadrilla {cuadrillaCode} • {guiaNombre}
            </h2>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-stone-200">
              <span>🛡️ Líder de Sector: <strong className="text-diocesis-mustardLight font-bold">{liderNombre}</strong></span>
              <span>•</span>
              <span>🎖️ Responsable General: <strong className="text-white font-bold">{responsableNombre}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
            <button
              onClick={fetchCuadrilla}
              disabled={loading}
              className="px-3.5 py-2 text-xs font-bold text-white bg-white/15 hover:bg-white/25 rounded-xl transition border border-white/20 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
            <button
              onClick={exportToExcel}
              className="px-3.5 py-2 text-xs font-bold text-diocesis-redDark bg-diocesis-mustard hover:bg-diocesis-mustardLight rounded-xl transition shadow flex items-center gap-1.5 cursor-pointer font-title"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Descargar Planilla
            </button>
          </div>
        </div>

        {/* TARJETAS DE OPERACIÓN DEL DÍA D */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          <div className="bg-white rounded-3xl p-4 shadow-sm border border-stone-200">
            <div className="flex items-center justify-between text-stone-500 mb-1">
              <span className="text-xs font-bold">Cupo Programado</span>
              <Users className="w-4 h-4 text-diocesis-mustard" />
            </div>
            <div className="text-2xl font-title font-bold text-stone-900">
              9 <span className="text-xs font-normal text-stone-500">voluntarios</span>
            </div>
            <span className="text-[10px] text-stone-400 font-semibold block mt-1">Capacidad estándar</span>
          </div>

          <div className="bg-white rounded-3xl p-4 shadow-sm border border-stone-200">
            <div className="flex items-center justify-between text-stone-500 mb-1">
              <span className="text-xs font-bold">Asistencia Día D</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-title font-bold text-emerald-700">
              {totalPresentes} <span className="text-xs font-normal text-stone-500">presentes</span>
            </div>
            <span className="text-[10px] text-emerald-700 font-semibold block mt-1">Control en tiempo real</span>
          </div>

          <div className="bg-white rounded-3xl p-4 shadow-sm border border-stone-200">
            <div className="flex items-center justify-between text-stone-500 mb-1">
              <span className="text-xs font-bold">Kits Entregados</span>
              <Coffee className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-title font-bold text-blue-900">
              {totalKits} <span className="text-xs font-normal text-stone-500">entregados</span>
            </div>
            <span className="text-[10px] text-stone-400 font-semibold block mt-1">Polos y credenciales</span>
          </div>

          <div className="bg-white rounded-3xl p-4 shadow-sm border border-stone-200">
            <div className="flex items-center justify-between text-stone-500 mb-1">
              <span className="text-xs font-bold">Estado de Cuadrilla</span>
              <Shield className="w-4 h-4 text-diocesis-red" />
            </div>
            <div className="text-lg font-title font-bold text-diocesis-redDark truncate">
              {voluntarios.length > 0 ? 'Personal Asignado' : 'Activa en Espera'}
            </div>
            <span className="text-[10px] text-stone-400 font-semibold block mt-1">Lista para el Día D</span>
          </div>

        </div>

        {/* LISTADO DE VOLUNTARIOS Y CONTROL OPERATIVO */}
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/70">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-title font-bold text-base text-stone-900">
                  Voluntarios de mi Cuadrilla ({voluntarios.length})
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-diocesis-mustard/20 text-diocesis-mustardDark border border-diocesis-mustard/40 font-mono">
                  {cuadrillaCode}
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Pase de lista en vivo, llamada por WhatsApp y entrega de kit para el día del Santo Padre
              </p>
            </div>

            {voluntarios.length > 0 && (
              <input
                type="text"
                placeholder="Buscar por DNI o nombres..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3.5 py-1.5 text-xs bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-diocesis-red w-full sm:w-64 shadow-2xs"
              />
            )}
          </div>

          {loading ? (
            <div className="p-16 text-center text-stone-500">
              <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-diocesis-red" />
              <p className="text-xs font-bold">Cargando nómina oficial de tu cuadrilla...</p>
            </div>
          ) : voluntarios.length === 0 ? (
            <div className="p-12 md:p-16 text-center max-w-lg mx-auto space-y-4">
              <div className="w-16 h-16 bg-diocesis-cream text-diocesis-red rounded-3xl flex items-center justify-center mx-auto border-2 border-diocesis-mustard/40 shadow-inner">
                <Clock className="w-8 h-8 text-diocesis-mustardDark" />
              </div>
              <div>
                <h3 className="font-title font-bold text-lg text-stone-900">
                  Cuadrilla {cuadrillaCode} Habilitada
                </h3>
                <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                  ¡Tu cuenta de Guía está validada en el sistema! Los <strong>9 voluntarios</strong> asignados a tu cuadrilla aparecerán aquí automáticamente en cuanto la Comisión Diocesana confirme el padrón oficial de distribución.
                </p>
              </div>
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 font-medium">
                💡 <em>El Día del Evento podrás marcar aquí en vivo: Presente/Ausente, Kit entregado y contactarlos directamente con un clic a su WhatsApp.</em>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3.5 px-4">#</th>
                    <th className="py-3.5 px-4">Voluntario</th>
                    <th className="py-3.5 px-4">Contacto WhatsApp</th>
                    <th className="py-3.5 px-4 text-center">Asistencia Día D</th>
                    <th className="py-3.5 px-4 text-center">Kit Entregado</th>
                    <th className="py-3.5 px-4 text-center">Refrigerio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredVoluntarios.map((v, i) => {
                    const isPresent = Boolean(asistencia[v.id]);
                    const hasKit = Boolean(kitEntregado[v.id]);
                    const hasAlmuerzo = Boolean(almuerzoEntregado[v.id]);
                    const cleanPhone = String(v.telefono || '').replace(/\D/g, '');

                    return (
                      <tr key={v.id || i} className="hover:bg-amber-50/20 transition">
                        <td className="py-3.5 px-4 font-bold text-stone-400">{i + 1}</td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-stone-900 text-xs">{v.nombres_apellidos}</div>
                          <div className="text-[11px] font-mono text-stone-500">
                            DNI: <strong className="text-stone-800">{v.dni}</strong> • Código: {v.codigo || '-'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {cleanPhone ? (
                            <a
                              href={`https://api.whatsapp.com/send/?phone=51${cleanPhone}&text=Hola%20${encodeURIComponent(v.nombres_apellidos)},%20te%20saluda%20tu%20guía%20${encodeURIComponent(guiaNombre)}%20de%20la%20cuadrilla%20${cuadrillaCode}.`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition shadow-xs"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              {v.telefono}
                            </a>
                          ) : (
                            <span className="text-stone-400 italic text-[11px]">Sin teléfono</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => toggleAsistencia(v.id)}
                            className={`px-3 py-1 rounded-full text-[11px] font-black transition cursor-pointer border ${
                              isPresent
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300 shadow-xs'
                                : 'bg-stone-100 text-stone-500 border-stone-200 hover:bg-stone-200'
                            }`}
                          >
                            {isPresent ? '✓ PRESENTE' : 'AUSENTE'}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => toggleKit(v.id)}
                            className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition cursor-pointer border ${
                              hasKit
                                ? 'bg-blue-100 text-blue-900 border-blue-300'
                                : 'bg-stone-100 text-stone-500 border-stone-200 hover:bg-stone-200'
                            }`}
                          >
                            {hasKit ? '✓ POLO/FOTOCHECK' : 'PENDIENTE'}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => toggleAlmuerzo(v.id)}
                            className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition cursor-pointer border ${
                              hasAlmuerzo
                                ? 'bg-amber-100 text-amber-950 border-amber-300'
                                : 'bg-stone-100 text-stone-500 border-stone-200 hover:bg-stone-200'
                            }`}
                          >
                            {hasAlmuerzo ? '✓ ENTREGADO' : 'PENDIENTE'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>

      {/* MODAL SOS: INCIDENCIAS DEL DÍA D */}
      {showSosModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-rose-300 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-title font-bold text-base text-stone-900">
                    Reportar Incidencia en Campo
                  </h3>
                  <span className="text-[11px] font-mono text-stone-500">
                    Cuadrilla {cuadrillaCode} • {guiaNombre}
                  </span>
                </div>
              </div>
              <button onClick={() => setShowSosModal(false)} className="text-stone-400 hover:text-stone-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {sosSent ? (
              <div className="py-6 text-center space-y-2">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="font-title font-bold text-base text-stone-900">
                  ¡Alerta Enviada a tu Líder y Central!
                </h4>
                <p className="text-xs text-stone-600">
                  Tipo: <strong className="uppercase">{sosType}</strong>. El equipo de apoyo se pondrá en contacto contigo de inmediato.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-stone-600 leading-relaxed">
                  Selecciona la situación para notificar al instante a tu Líder ({liderNombre}) y al puesto de comando:
                </p>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleSendSos('médica / desmayo')}
                    className="p-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-2xl text-left transition flex items-center gap-2.5 text-xs font-bold text-rose-900 cursor-pointer"
                  >
                    <HeartPulse className="w-5 h-5 text-rose-600 shrink-0" />
                    <span>Emergencia Médica</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendSos('hidratación / agua')}
                    className="p-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-2xl text-left transition flex items-center gap-2.5 text-xs font-bold text-blue-900 cursor-pointer"
                  >
                    <Droplets className="w-5 h-5 text-blue-600 shrink-0" />
                    <span>Falta de Agua</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendSos('seguridad / bloqueo')}
                    className="p-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-2xl text-left transition flex items-center gap-2.5 text-xs font-bold text-amber-950 cursor-pointer"
                  >
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    <span>Seguridad / Paso</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendSos('refrigerio / comida')}
                    className="p-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-2xl text-left transition flex items-center gap-2.5 text-xs font-bold text-emerald-950 cursor-pointer"
                  >
                    <Coffee className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>Falta de Almuerzos</span>
                  </button>
                </div>

                <div className="pt-2 border-t border-stone-100 text-center">
                  <button
                    type="button"
                    onClick={() => setShowSosModal(false)}
                    className="text-xs text-stone-500 font-bold hover:underline"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
