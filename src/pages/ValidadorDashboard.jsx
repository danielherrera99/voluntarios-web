import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  LogOut, 
  QrCode, 
  Camera, 
  CameraOff, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Shirt, 
  User, 
  PackageCheck, 
  ClipboardCheck, 
  RefreshCw, 
  Clock, 
  History, 
  MapPin, 
  Users, 
  Check, 
  ShieldCheck,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';

// Sonidos sintéticos del navegador (Web Audio API)
const playSound = (type = 'success') => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'warning') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.setValueAtTime(160, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch (e) {}
};

export default function ValidadorDashboard() {
  const { user, logout } = useAuth();

  const formatFotoUrl = (url) => {
    if (!url) return null;
    const m1 = url.match(/id=([a-zA-Z0-9_-]+)/);
    if (m1) return `https://lh3.googleusercontent.com/d/${m1[1]}`;
    const m2 = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (m2) return `https://lh3.googleusercontent.com/d/${m2[1]}`;
    return url;
  };
  
  // Modos de operación: 'kits' (Entrega de Kits) | 'asistencia' (Control de Asistencia)
  const [activeTab, setActiveTab] = useState('kits');

  // Estados de escáner y búsqueda
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [manualInput, setManualInput] = useState('');
  const [searching, setSearching] = useState(false);
  
  // Voluntario escaneado/seleccionado
  const [scannedVoluntario, setScannedVoluntario] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [savingAction, setSavingAction] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState(null);

  // Formulario de Entrega de Kits
  const [entregaKitCompleto, setEntregaKitCompleto] = useState(true);
  const [entregaPolo, setEntregaPolo] = useState(true);
  const [kitNotas, setKitNotas] = useState('');

  // Formulario de Asistencia
  const [puntoAsistencia, setPuntoAsistencia] = useState('Punto Principal');

  // Historial de escaneos de la sesión actual
  const [sessionHistory, setSessionHistory] = useState([]);

  // Métricas rápidas de la sesión
  const [stats, setStats] = useState({ kitsHoy: 0, asistenciaHoy: 0 });

  const html5QrCodeRef = useRef(null);

  // Cargar métricas iniciales del validador
  const fetchStats = async () => {
    try {
      const [{ count: kCount }, { count: aCount }] = await Promise.all([
        supabase.from('voluntarios').select('*', { count: 'exact', head: true }).eq('kit_entregado', true),
        supabase.from('voluntarios').select('*', { count: 'exact', head: true }).eq('asistencia_dia_d', true)
      ]);
      setStats({
        kitsHoy: kCount || 0,
        asistenciaHoy: aCount || 0
      });
    } catch (e) {}
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Iniciar / Detener Cámara
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode('qr-reader-container');
      }

      await html5QrCodeRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          handleQrDecoded(decodedText);
        },
        () => {} // Ignorar errores de frames continuos
      );

      setIsScanning(true);
    } catch (err) {
      console.error('Error al encender cámara:', err);
      setCameraError('No se pudo acceder a la cámara. Revisa los permisos en tu navegador o usa la búsqueda manual.');
      setIsScanning(false);
    }
  };

  const stopCamera = async () => {
    try {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
      }
      setIsScanning(false);
    } catch (err) {
      console.error('Error apagando cámara:', err);
    }
  };

  useEffect(() => {
    return () => {
      // Limpiar cámara al desmontar
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  // Procesar texto leído por el QR
  const handleQrDecoded = (decodedText) => {
    let cleanDniOrCode = decodedText.trim();
    
    // Si viene como JSON institucional
    try {
      const parsed = JSON.parse(decodedText);
      if (parsed.dni) cleanDniOrCode = String(parsed.dni).trim();
      else if (parsed.codigo) cleanDniOrCode = String(parsed.codigo).trim();
    } catch (e) {
      // Viene como texto plano (ej: DNI o VOL-2026-...)
    }

    // Detener la cámara temporalmente para mostrar el resultado
    stopCamera();
    searchVolunteer(cleanDniOrCode);
  };

  // Buscar voluntario en Supabase por DNI o Código
  const searchVolunteer = async (queryTerm) => {
    if (!queryTerm) return;
    const cleanTerm = queryTerm.trim();
    setSearching(true);
    setActionError(null);
    setActionSuccessMsg(null);
    setScannedVoluntario(null);

    try {
      // 1. Buscar en Fase 2 (voluntarios)
      let q = supabase.from('voluntarios').select('*');
      if (/^\d+$/.test(cleanTerm)) {
        q = q.or(`dni.eq.${cleanTerm},dni.ilike.%${cleanTerm}%`);
      } else {
        q = q.or(`codigo.eq.${cleanTerm},codigo.ilike.%${cleanTerm}%,dni.ilike.%${cleanTerm}%`);
      }
      
      const { data: f2Data, error: f2Err } = await q.maybeSingle();
      if (f2Err) console.warn('Busqueda F2:', f2Err);

      let record = f2Data;

      // 2. Si no está en Fase 2, buscar en Fase 1
      if (!record) {
        let q1 = supabase.from('voluntarios_general').select('*');
        if (/^\d+$/.test(cleanTerm)) {
          q1 = q1.or(`dni.eq.${cleanTerm},dni.ilike.%${cleanTerm}%`);
        } else {
          q1 = q1.or(`codigo.eq.${cleanTerm},codigo.ilike.%${cleanTerm}%,dni.ilike.%${cleanTerm}%`);
        }
        const { data: f1Data, error: f1Err } = await q1.maybeSingle();
        if (f1Err) console.warn('Busqueda F1:', f1Err);
        record = f1Data;
      }

      if (!record) {
        playSound('warning');
        setActionError(`No se encontró ningún voluntario con el DNI o código "${cleanTerm}".`);
        return;
      }

      setScannedVoluntario(record);

      // Sonido de alerta si ya se le entregó el kit
      if (activeTab === 'kits' && record.kit_entregado) {
        playSound('warning');
      } else {
        playSound('success');
      }

      // Reiniciar opciones de entrega
      setEntregaKitCompleto(true);
      setEntregaPolo(true);
      setKitNotas('');
    } catch (err) {
      console.error('Error buscando voluntario:', err);
      setActionError('Ocurrió un error al consultar el registro.');
    } finally {
      setSearching(false);
    }
  };

  // Registrar Entrega de Kits & Polos
  const handleConfirmKitDelivery = async () => {
    if (!scannedVoluntario) return;
    setSavingAction(true);
    setActionError(null);

    try {
      const items = [];
      if (entregaKitCompleto) items.push('Kit Oficial');
      if (entregaPolo) items.push(`Polo (Talla ${scannedVoluntario.talla || 'Estándar'})`);
      const itemsStr = items.join(' + ') || 'Entrega estándar';

      const updateData = {
        kit_entregado: true,
        kit_polo_entregado: entregaPolo,
        kit_items_entregados: itemsStr,
        kit_fecha_entrega: new Date().toISOString(),
        kit_entregado_por: user?.nombre || 'Validador Oficial',
        kit_observaciones: kitNotas.trim() || null
      };

      const tableName = scannedVoluntario.fase === '3' || scannedVoluntario.estado === 'SELECCIONADO' 
        ? 'voluntarios' 
        : 'voluntarios_general';

      const { error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', scannedVoluntario.id);

      if (error) throw error;

      playSound('success');
      setActionSuccessMsg(`¡Kit entregado exitosamente a ${scannedVoluntario.nombres_apellidos}!`);

      // Actualizar estado local
      const updated = { ...scannedVoluntario, ...updateData };
      setScannedVoluntario(updated);

      // Agregar al historial de la sesión
      setSessionHistory(prev => [
        {
          id: Date.now(),
          nombre: scannedVoluntario.nombres_apellidos,
          dni: scannedVoluntario.dni,
          tipo: 'KIT',
          detalle: itemsStr,
          hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        },
        ...prev.slice(0, 9)
      ]);

      setStats(prev => ({ ...prev, kitsHoy: prev.kitsHoy + 1 }));
    } catch (err) {
      console.error('Error entregando kit:', err);
      setActionError('No se pudo registrar la entrega del kit.');
    } finally {
      setSavingAction(false);
    }
  };

  // Registrar Control de Asistencia (Día D)
  const handleConfirmAttendance = async () => {
    if (!scannedVoluntario) return;
    setSavingAction(true);
    setActionError(null);

    try {
      const updateData = {
        asistencia_dia_d: true,
        asistencia_fecha: new Date().toISOString(),
        asistencia_registrada_por: user?.nombre || 'Validador Oficial',
        asistencia_punto: puntoAsistencia
      };

      const tableName = scannedVoluntario.fase === '3' || scannedVoluntario.estado === 'SELECCIONADO' 
        ? 'voluntarios' 
        : 'voluntarios_general';

      const { error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', scannedVoluntario.id);

      if (error) throw error;

      playSound('success');
      setActionSuccessMsg(`¡Asistencia registrada para ${scannedVoluntario.nombres_apellidos}!`);

      // Actualizar estado local
      const updated = { ...scannedVoluntario, ...updateData };
      setScannedVoluntario(updated);

      // Agregar al historial
      setSessionHistory(prev => [
        {
          id: Date.now(),
          nombre: scannedVoluntario.nombres_apellidos,
          dni: scannedVoluntario.dni,
          tipo: 'ASISTENCIA',
          detalle: puntoAsistencia,
          hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        },
        ...prev.slice(0, 9)
      ]);

      setStats(prev => ({ ...prev, asistenciaHoy: prev.asistenciaHoy + 1 }));
    } catch (err) {
      console.error('Error registrando asistencia:', err);
      setActionError('No se pudo registrar la asistencia.');
    } finally {
      setSavingAction(false);
    }
  };

  // Reset para siguiente escaneo
  const handleNextVolunteer = () => {
    setScannedVoluntario(null);
    setActionError(null);
    setActionSuccessMsg(null);
    setManualInput('');
    startCamera();
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col font-sans selection:bg-amber-200">
      
      {/* Header Estilo Franciscano / Diocesano */}
      <header className="bg-diocesis-redDark text-white shadow-md border-b-4 border-diocesis-mustard sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 text-diocesis-mustard">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-diocesis-mustard block">
                Módulo Oficial de Validación
              </span>
              <h1 className="text-base sm:text-lg font-bold font-title leading-tight">
                Validadores • Visita Papal 2026
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-white leading-tight">{user?.nombre || 'Validador Oficial'}</span>
              <span className="text-[10px] text-diocesis-mustard uppercase font-extrabold">
                {user?.rol === 'admin' ? '🛡️ Administrador' : '🔍 Validador Acreditado'}
              </span>
            </div>

            {user?.rol === 'admin' && (
              <Link
                to="/dashboard"
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-stone-200 transition"
                title="Volver al panel de Administrador"
              >
                Volver a Dashboard
              </Link>
            )}

            <button
              onClick={logout}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Selector de Modo de Operación (2 Pestañas Clave) */}
      <div className="bg-white border-b border-stone-200 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-between flex-wrap gap-2">
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab('kits');
                setScannedVoluntario(null);
              }}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeTab === 'kits'
                  ? 'bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs'
                  : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              <PackageCheck className="w-4 h-4 text-amber-700" />
              <span>1. Entrega de Kits & Polos</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('asistencia');
                setScannedVoluntario(null);
              }}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeTab === 'asistencia'
                  ? 'bg-blue-100 text-blue-950 border border-blue-300 shadow-2xs'
                  : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              <ClipboardCheck className="w-4 h-4 text-blue-700" />
              <span>2. Control de Asistencia</span>
            </button>
          </div>

          {/* Métricas Rápidas */}
          <div className="flex items-center gap-3 text-xs font-mono font-bold text-stone-600">
            <span className="flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 text-amber-900">
              🎁 Kits: <strong className="text-amber-950">{stats.kitsHoy}</strong>
            </span>
            <span className="flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 text-blue-900">
              📋 Asistencias: <strong className="text-blue-950">{stats.asistenciaHoy}</strong>
            </span>
          </div>

        </div>
      </div>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* COLUMNA IZQUIERDA: Escáner y Búsqueda (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Tarjeta del Escáner */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-stone-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold font-title text-stone-900 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-diocesis-redDark" />
                    Escáner con Cámara
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Apunta al código QR del voluntario
                  </p>
                </div>

                <button
                  type="button"
                  onClick={isScanning ? stopCamera : startCamera}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                    isScanning
                      ? 'bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  {isScanning ? (
                    <>
                      <CameraOff className="w-3.5 h-3.5" />
                      <span>Apagar Cámara</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-3.5 h-3.5" />
                      <span>Encender Cámara</span>
                    </>
                  )}
                </button>
              </div>

              {/* Contenedor del Lector de Cámara */}
              <div className="relative rounded-2xl overflow-hidden bg-stone-950 min-h-[240px] flex items-center justify-center border-2 border-dashed border-stone-300">
                <div 
                  id="qr-reader-container" 
                  className={`w-full ${isScanning ? 'block' : 'hidden'}`}
                />
                
                {!isScanning && (
                  <div className="p-6 text-center space-y-2 text-stone-400">
                    <QrCode className="w-12 h-12 mx-auto text-stone-500" />
                    <p className="text-xs font-medium">Cámara apagada</p>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition cursor-pointer"
                    >
                      Activar Escáner Móvil
                    </button>
                  </div>
                )}
              </div>

              {cameraError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{cameraError}</span>
                </div>
              )}

              {/* Búsqueda Manual de Contingencia */}
              <div className="pt-3 border-t border-stone-100 space-y-2">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                  ¿No lee la cámara? Búsqueda manual por DNI o Código:
                </span>
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    searchVolunteer(manualInput);
                  }}
                  className="flex gap-2"
                >
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      placeholder="Escribe DNI o VOL-..."
                      className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-diocesis-mustard focus:bg-white transition"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={searching || !manualInput.trim()}
                    className="px-3.5 py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 cursor-pointer flex items-center gap-1"
                  >
                    {searching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Buscar'}
                  </button>
                </form>
              </div>

            </div>

            {/* Historial Reciente de la Sesión */}
            {sessionHistory.length > 0 && (
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-stone-200 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-stone-400" />
                  Últimos Escaneados de tu Sesión
                </h4>
                <div className="space-y-1.5">
                  {sessionHistory.map(item => (
                    <div 
                      key={item.id}
                      className="p-2 bg-stone-50 border border-stone-200/80 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="truncate pr-2">
                        <span className="font-bold text-stone-900 block truncate">{item.nombre}</span>
                        <span className="text-[10px] text-stone-500 font-mono">DNI: {item.dni} • {item.detalle}</span>
                      </div>
                      <span className="text-[10px] font-mono text-stone-400 shrink-0">{item.hora}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* COLUMNA DERECHA: Resultado de Validación y Acciones (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Mensajes de error o éxito globales */}
            {actionError && (
              <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-3xl text-rose-900 flex items-start gap-3 shadow-xs">
                <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">No se pudo procesar</h4>
                  <p className="text-xs mt-0.5">{actionError}</p>
                </div>
              </div>
            )}

            {actionSuccessMsg && (
              <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-3xl text-emerald-950 flex items-start gap-3 shadow-xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-bold text-sm">Operación Exitosa</h4>
                  <p className="text-xs mt-0.5">{actionSuccessMsg}</p>
                </div>
                <button
                  onClick={handleNextVolunteer}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Siguiente Voluntario
                </button>
              </div>
            )}

            {/* Ficha del Voluntario Escaneado */}
            {scannedVoluntario ? (
              <div className="bg-white rounded-3xl shadow-md border-2 border-stone-200 overflow-hidden space-y-4 animate-in fade-in duration-150">
                
                {/* Banner de Estado Específico */}
                {activeTab === 'kits' ? (
                  scannedVoluntario.kit_entregado ? (
                    // 🔴 ALERTA: KIT YA ENTREGADO
                    <div className="bg-rose-600 text-white p-4 text-center space-y-1">
                      <span className="text-xs font-black uppercase tracking-widest bg-black/20 px-3 py-0.5 rounded-full inline-block">
                        ⚠️ ALERTA DE DUPLICADO
                      </span>
                      <h3 className="text-lg font-black font-title">
                        ¡ESTE VOLUNTARIO YA RECIBIÓ SU KIT ANTERIORMENTE!
                      </h3>
                      <p className="text-xs text-rose-100">
                        Entregado el{' '}
                        <strong>
                          {scannedVoluntario.kit_fecha_entrega ? new Date(scannedVoluntario.kit_fecha_entrega).toLocaleString() : 'fecha registrada'}
                        </strong>{' '}
                        por <strong>{scannedVoluntario.kit_entregado_por || 'Validador previo'}</strong>.
                      </p>
                      {scannedVoluntario.kit_items_entregados && (
                        <p className="text-[11px] font-mono bg-black/20 px-2 py-0.5 rounded inline-block mt-1">
                          Entregado: {scannedVoluntario.kit_items_entregados}
                        </p>
                      )}
                    </div>
                  ) : (
                    // 🟢 HABILITADO PARA RECOJO DE KIT
                    <div className="bg-emerald-600 text-white p-4 text-center space-y-0.5">
                      <span className="text-xs font-black uppercase tracking-widest bg-black/20 px-3 py-0.5 rounded-full inline-block">
                        ✅ HABILITADO
                      </span>
                      <h3 className="text-lg font-black font-title">
                        VOLUNTARIO APROBADO PARA ENTREGA DE KIT
                      </h3>
                      <p className="text-xs text-emerald-100">
                        Verifica su identidad y selecciona los ítems entregados.
                      </p>
                    </div>
                  )
                ) : (
                  // MODO ASISTENCIA
                  scannedVoluntario.asistencia_dia_d ? (
                    <div className="bg-emerald-600 text-white p-4 text-center space-y-0.5">
                      <span className="text-xs font-black uppercase tracking-widest bg-black/20 px-3 py-0.5 rounded-full inline-block">
                        ✅ PRESENTE
                      </span>
                      <h3 className="text-lg font-black font-title">
                        ASISTENCIA YA REGISTRADA
                      </h3>
                      <p className="text-xs text-emerald-100">
                        Marcado el {new Date(scannedVoluntario.asistencia_fecha).toLocaleTimeString()} por {scannedVoluntario.asistencia_registrada_por}.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-blue-600 text-white p-4 text-center space-y-0.5">
                      <span className="text-xs font-black uppercase tracking-widest bg-black/20 px-3 py-0.5 rounded-full inline-block">
                        📋 CONTROL DE ASISTENCIA
                      </span>
                      <h3 className="text-lg font-black font-title">
                        PENDIENTE DE MARCAR ASISTENCIA
                      </h3>
                      <p className="text-xs text-blue-100">
                        Confirma la presencia del voluntario en su punto asignado.
                      </p>
                    </div>
                  )
                )}

                {/* Tarjeta de Datos del Voluntario */}
                <div className="p-6 space-y-5">
                  
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                    {/* Foto / Avatar */}
                    {scannedVoluntario.fotografia_url ? (
                      <img
                        src={formatFotoUrl(scannedVoluntario.fotografia_url)}
                        alt={scannedVoluntario.nombres_apellidos}
                        className="w-20 h-20 rounded-2xl object-cover border-2 border-stone-300 shadow-sm shrink-0 bg-stone-100"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-amber-900 shrink-0">
                        <User className="w-10 h-10 text-amber-700/80" />
                      </div>
                    )}

                    <div className="space-y-1 text-center sm:text-left flex-1">
                      <h4 className="text-xl font-bold font-title text-stone-900 leading-tight">
                        {scannedVoluntario.nombres_apellidos}
                      </h4>
                      <p className="text-xs font-mono font-bold text-stone-500">
                        DNI: <span className="text-diocesis-redDark">{scannedVoluntario.dni}</span> • Código: <span>{scannedVoluntario.codigo || `VOL-${scannedVoluntario.dni}`}</span>
                      </p>
                      
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pt-1">
                        <span className="text-[10px] font-bold bg-stone-100 text-stone-700 px-2 py-0.5 rounded border border-stone-200">
                          {scannedVoluntario.servicio || 'Servicio General'}
                        </span>
                        {scannedVoluntario.responsable_nombre && (
                          <span className="text-[10px] font-bold bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                            Resp: {scannedVoluntario.responsable_nombre}
                          </span>
                        )}
                        {scannedVoluntario.lugar_asignado && (
                          <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                            {scannedVoluntario.lugar_asignado}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* DESTACADO: Talla de Polo del Voluntario */}
                  <div className="p-4 bg-amber-100/70 border-2 border-amber-400 rounded-2xl flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center shadow-xs">
                        <Shirt className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-black tracking-wider text-amber-900 block">
                          Talla Oficial Registrada
                        </span>
                        <span className="text-2xl font-black font-mono text-amber-950">
                          {scannedVoluntario.talla || 'NO ESPECIFICADA'}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-amber-800 font-semibold text-right max-w-[140px] hidden sm:block">
                      Entrega esta prenda del almacén
                    </span>
                  </div>

                  {/* FORMULARIO DE ACCIÓN: MODO KITS */}
                  {activeTab === 'kits' && (
                    <div className="space-y-4 pt-3 border-t border-stone-200">
                      
                      {/* Checkboxes de Selección de Entrega */}
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-stone-700 block">
                          Selecciona los artículos a entregar en este momento:
                        </span>

                        <label className="flex items-center gap-3 p-3 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl cursor-pointer transition">
                          <input
                            type="checkbox"
                            checked={entregaKitCompleto}
                            onChange={(e) => setEntregaKitCompleto(e.target.checked)}
                            className="w-4 h-4 rounded text-diocesis-redDark focus:ring-diocesis-mustard"
                          />
                          <div className="text-xs">
                            <span className="font-bold text-stone-900 block">📦 Kit Completo Oficial</span>
                            <span className="text-stone-500">Mochila, cartilla, gafete y credencial</span>
                          </div>
                        </label>

                        <label className="flex items-center gap-3 p-3 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl cursor-pointer transition">
                          <input
                            type="checkbox"
                            checked={entregaPolo}
                            onChange={(e) => setEntregaPolo(e.target.checked)}
                            className="w-4 h-4 rounded text-diocesis-redDark focus:ring-diocesis-mustard"
                          />
                          <div className="text-xs">
                            <span className="font-bold text-stone-900 block">
                              👕 Polo Oficial del Voluntario (Talla {scannedVoluntario.talla || 'L'})
                            </span>
                            <span className="text-stone-500">Prenda textil oficial para la Visita Papal</span>
                          </div>
                        </label>
                      </div>

                      {/* Botón de Confirmación */}
                      <button
                        type="button"
                        disabled={savingAction || (!entregaKitCompleto && !entregaPolo)}
                        onClick={handleConfirmKitDelivery}
                        className="w-full py-3.5 px-4 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-2xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                      >
                        {savingAction ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin text-white" />
                            <span>Registrando entrega en base de datos...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-5 h-5 text-emerald-200" />
                            <span>Confirmar Entrega de Kit y Guardar</span>
                          </>
                        )}
                      </button>

                    </div>
                  )}

                  {/* FORMULARIO DE ACCIÓN: MODO ASISTENCIA */}
                  {activeTab === 'asistencia' && (
                    <div className="space-y-4 pt-3 border-t border-stone-200">
                      
                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1">
                          Punto o Puerta de Asistencia:
                        </label>
                        <select
                          value={puntoAsistencia}
                          onChange={(e) => setPuntoAsistencia(e.target.value)}
                          className="w-full py-2.5 px-3 bg-stone-50 border border-stone-300 rounded-xl text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-diocesis-mustard"
                        >
                          <option value="Punto Principal">📍 Puerta Principal de Acceso</option>
                          <option value="Capacitación General">🎓 Capacitación General / USAT</option>
                          <option value="Sede Santuario">⛪ Sede Santuario</option>
                          <option value="Sede Zaña">📍 Sede Zaña</option>
                          <option value="Sede Santa Cruz">📍 Sede Santa Cruz</option>
                          <option value="Punto de Resguardo">🛡️ Punto de Resguardo y Orden</option>
                        </select>
                      </div>

                      <button
                        type="button"
                        disabled={savingAction || scannedVoluntario.asistencia_dia_d}
                        onClick={handleConfirmAttendance}
                        className="w-full py-3.5 px-4 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white rounded-2xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                      >
                        {savingAction ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin text-white" />
                            <span>Registrando presencia...</span>
                          </>
                        ) : (
                          <>
                            <MapPin className="w-5 h-5 text-blue-200" />
                            <span>
                              {scannedVoluntario.asistencia_dia_d ? 'Asistencia Ya Registrada' : 'Marcar Asistencia Oficial'}
                            </span>
                          </>
                        )}
                      </button>

                    </div>
                  )}

                </div>

                {/* Footer de la Tarjeta con Botón para Siguiente */}
                <div className="bg-stone-50 border-t border-stone-200 p-4 flex items-center justify-between">
                  <span className="text-[11px] text-stone-400">
                    ID: {scannedVoluntario.id?.slice(0, 8)}...
                  </span>
                  <button
                    type="button"
                    onClick={handleNextVolunteer}
                    className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Escanear Otro Voluntario</span>
                  </button>
                </div>

              </div>
            ) : (
              // Estado Vacío (Esperando Escaneo)
              <div className="p-12 text-center bg-white rounded-3xl border border-stone-200 shadow-sm space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto border border-amber-200">
                  <QrCode className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold font-title text-stone-800">
                  Esperando Código QR o Búsqueda
                </h3>
                <p className="text-xs text-stone-400 max-w-sm mx-auto">
                  Enciende la cámara a la izquierda o escribe el DNI del voluntario para desplegar su ficha y procesar su kit o asistencia.
                </p>
              </div>
            )}

          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="py-3 text-center text-xs text-stone-400 bg-white border-t border-stone-200">
        Diócesis de Chiclayo • Módulo de Validación de Campo 2026
      </footer>

    </div>
  );
}

