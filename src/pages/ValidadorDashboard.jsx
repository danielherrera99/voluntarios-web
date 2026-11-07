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
  X,
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
  ExternalLink,
  SwitchCamera,
  Eye,
  RotateCcw,
  Filter
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
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [camerasList, setCamerasList] = useState([]);
  const [activeCameraIndex, setActiveCameraIndex] = useState(0);
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

  // Estados del Visor de Asistentes y Entregas en Tiempo Real
  const [visorRecords, setVisorRecords] = useState([]);
  const [loadingVisor, setLoadingVisor] = useState(false);
  const [visorSearch, setVisorSearch] = useState('');
  const [visorFilter, setVisorFilter] = useState('ALL'); // 'ALL' | 'KITS' | 'ASISTENCIA'

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

  // Cargar registros completos del Visor en Tiempo Real
  const fetchVisorRecords = async () => {
    setLoadingVisor(true);
    try {
      const [{ data: vF2, error: e2 }, { data: vF1, error: e1 }] = await Promise.all([
        supabase.from('voluntarios')
          .select('id, dni, codigo, nombres_apellidos, talla, servicio, responsable_nombre, lugar_asignado, fotografia_url, kit_entregado, kit_polo_entregado, kit_items_entregados, kit_fecha_entrega, kit_entregado_por, asistencia_dia_d, asistencia_fecha, asistencia_registrada_por, asistencia_punto, fase, estado')
          .or('kit_entregado.eq.true,asistencia_dia_d.eq.true'),
        supabase.from('voluntarios_general')
          .select('id, dni, codigo, nombres_apellidos, talla, servicio, responsable_nombre, lugar_asignado, fotografia_url, kit_entregado, kit_polo_entregado, kit_items_entregados, kit_fecha_entrega, kit_entregado_por, asistencia_dia_d, asistencia_fecha, asistencia_registrada_por, asistencia_punto, fase, estado')
          .or('kit_entregado.eq.true,asistencia_dia_d.eq.true')
      ]);

      if (e2) console.warn('Error fetching F2 visor:', e2);
      if (e1) console.warn('Error fetching F1 visor:', e1);

      // Combinar y deduplicar por DNI o ID (Fase 2 tiene precedencia)
      const map = new Map();
      (vF1 || []).forEach(item => map.set(item.dni || item.id, item));
      (vF2 || []).forEach(item => map.set(item.dni || item.id, item));

      const combined = Array.from(map.values()).sort((a, b) => {
        const timeA = new Date(a.kit_fecha_entrega || a.asistencia_fecha || 0).getTime();
        const timeB = new Date(b.kit_fecha_entrega || b.asistencia_fecha || 0).getTime();
        return timeB - timeA;
      });

      setVisorRecords(combined);
    } catch (err) {
      console.error('Error cargando visor:', err);
    } finally {
      setLoadingVisor(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchVisorRecords();
  }, []);

  // Iniciar Cámara con autodetección de sensor trasero y manejo resiliente
  const startCamera = async (overrideCameraId = null) => {
    setCameraError(null);
    setIsStartingCamera(true);

    // Verificar contexto seguro (HTTPS o localhost) requerido por WebRTC
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      setCameraError('La cámara en teléfonos celulares requiere conexión segura HTTPS. Si estás probando en tu celular, ábrelo en el dominio de producción (Render con HTTPS) o usa la búsqueda manual por DNI abajo.');
      setIsStartingCamera(false);
      return;
    }

    try {
      // Si ya hay una instancia previa escaneando, detenerla primero
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        try {
          await html5QrCodeRef.current.stop();
        } catch (e) {}
      }

      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode('qr-reader-container');
      }

      // Obtener lista de cámaras si aún no la tenemos
      let cams = camerasList;
      if (!cams || cams.length === 0) {
        try {
          cams = await Html5Qrcode.getCameras();
          if (cams && cams.length > 0) {
            setCamerasList(cams);
          }
        } catch (camErr) {
          console.warn('No se pudieron listar cámaras con antelación:', camErr);
        }
      }

      // Determinar configuración de cámara
      let cameraConfig;
      if (overrideCameraId) {
        cameraConfig = overrideCameraId;
      } else if (cams && cams.length > 0) {
        // Buscar cámara trasera por etiqueta
        const backIdx = cams.findIndex(c => /back|rear|trasera|environment|externa/i.test(c.label));
        const chosenIdx = backIdx !== -1 ? backIdx : cams.length - 1;
        setActiveCameraIndex(chosenIdx);
        cameraConfig = cams[chosenIdx].id;
      } else {
        cameraConfig = { facingMode: 'environment' };
      }

      // Pequeño retardo para asegurar que el DOM layout esté listo
      await new Promise(r => setTimeout(r, 60));

      await html5QrCodeRef.current.start(
        cameraConfig,
        {
          fps: 15,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const size = Math.max(160, Math.floor(minEdge * 0.72));
            return { width: size, height: size };
          }
        },
        (decodedText) => {
          handleQrDecoded(decodedText);
        },
        () => {} // Ignorar errores de frames continuos
      );

      setIsScanning(true);
    } catch (err) {
      console.warn('Fallo primer intento con ID de cámara, intentando facingMode:', err);
      // Intento fallback con facingMode: environment
      try {
        if (!html5QrCodeRef.current) {
          html5QrCodeRef.current = new Html5Qrcode('qr-reader-container');
        }
        await html5QrCodeRef.current.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: (w, h) => {
              const m = Math.min(w, h);
              return { width: Math.max(150, Math.floor(m * 0.7)), height: Math.max(150, Math.floor(m * 0.7)) };
            }
          },
          (decodedText) => {
            handleQrDecoded(decodedText);
          },
          () => {}
        );
        setIsScanning(true);
      } catch (fallbackErr) {
        console.error('Error definitivo al encender cámara:', fallbackErr);
        setCameraError('No se pudo acceder a la cámara. Asegúrate de otorgar permisos o utiliza la búsqueda manual por DNI abajo.');
        setIsScanning(false);
      }
    } finally {
      setIsStartingCamera(false);
    }
  };

  const stopCamera = async () => {
    try {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
      }
    } catch (err) {
      console.error('Error apagando cámara:', err);
    } finally {
      setIsScanning(false);
    }
  };

  // Alternar entre cámaras si el dispositivo tiene más de una
  const switchCamera = async () => {
    if (!camerasList || camerasList.length <= 1) return;
    const nextIdx = (activeCameraIndex + 1) % camerasList.length;
    setActiveCameraIndex(nextIdx);
    await stopCamera();
    await startCamera(camerasList[nextIdx].id);
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

  // ========================================================
  // REVERSIÓN / ANULACIÓN DE PRUEBAS (EXCLUSIVO ADMINISTRADOR)
  // ========================================================
  const handleResetKit = async (voluntario) => {
    if (user?.rol !== 'admin') {
      alert('Acceso restringido: Solo los administradores pueden anular o revertir entregas de kit.');
      return;
    }

    const voluntarioNombre = voluntario.nombres_apellidos || 'este voluntario';
    if (!window.confirm(`¿Estás seguro de ANULAR la entrega de kit de ${voluntarioNombre}?\n\nEl registro volverá a figurar como PENDIENTE de entrega.`)) {
      return;
    }

    setSavingAction(true);
    setActionError(null);
    try {
      const resetData = {
        kit_entregado: false,
        kit_polo_entregado: false,
        kit_items_entregados: null,
        kit_fecha_entrega: null,
        kit_entregado_por: null,
        kit_observaciones: null
      };

      const tableName = voluntario.fase === '3' || voluntario.estado === 'SELECCIONADO' 
        ? 'voluntarios' 
        : 'voluntarios_general';

      const { error } = await supabase
        .from(tableName)
        .update(resetData)
        .eq('id', voluntario.id);

      if (error) throw error;

      playSound('success');

      // Actualizar tarjeta si es el voluntario escaneado en el modal
      if (scannedVoluntario && scannedVoluntario.id === voluntario.id) {
        setScannedVoluntario(prev => ({ ...prev, ...resetData }));
        setActionSuccessMsg(`Entrega de kit anulada correctamente para ${voluntarioNombre}.`);
      }

      await Promise.all([fetchStats(), fetchVisorRecords()]);
    } catch (err) {
      console.error('Error anulando kit:', err);
      setActionError('No se pudo anular la entrega del kit.');
    } finally {
      setSavingAction(false);
    }
  };

  const handleResetAttendance = async (voluntario) => {
    if (user?.rol !== 'admin') {
      alert('Acceso restringido: Solo los administradores pueden anular o revertir registros de asistencia.');
      return;
    }

    const voluntarioNombre = voluntario.nombres_apellidos || 'este voluntario';
    if (!window.confirm(`¿Estás seguro de ANULAR la asistencia de ${voluntarioNombre}?\n\nEl registro volverá a figurar como NO MARCADO.`)) {
      return;
    }

    setSavingAction(true);
    setActionError(null);
    try {
      const resetData = {
        asistencia_dia_d: false,
        asistencia_fecha: null,
        asistencia_registrada_por: null,
        asistencia_punto: null
      };

      const tableName = voluntario.fase === '3' || voluntario.estado === 'SELECCIONADO' 
        ? 'voluntarios' 
        : 'voluntarios_general';

      const { error } = await supabase
        .from(tableName)
        .update(resetData)
        .eq('id', voluntario.id);

      if (error) throw error;

      playSound('success');

      // Actualizar tarjeta si es el voluntario escaneado en el modal
      if (scannedVoluntario && scannedVoluntario.id === voluntario.id) {
        setScannedVoluntario(prev => ({ ...prev, ...resetData }));
        setActionSuccessMsg(`Asistencia anulada correctamente para ${voluntarioNombre}.`);
      }

      await Promise.all([fetchStats(), fetchVisorRecords()]);
    } catch (err) {
      console.error('Error anulando asistencia:', err);
      setActionError('No se pudo anular la asistencia.');
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

  // Bloqueo de scroll de fondo y atajo ESC cuando el modal está abierto
  useEffect(() => {
    if (scannedVoluntario) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && scannedVoluntario) {
        handleNextVolunteer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [scannedVoluntario]);

  // Filtrado de registros en el Visor
  const filteredVisorRecords = visorRecords.filter(item => {
    if (visorFilter === 'KITS' && !item.kit_entregado) return false;
    if (visorFilter === 'ASISTENCIA' && !item.asistencia_dia_d) return false;
    if (visorSearch.trim()) {
      const term = visorSearch.toLowerCase().trim();
      const matchName = item.nombres_apellidos?.toLowerCase().includes(term);
      const matchDni = item.dni?.includes(term);
      const matchCodigo = item.codigo?.toLowerCase().includes(term);
      const matchResp = item.responsable_nombre?.toLowerCase().includes(term);
      const matchVal = (item.kit_entregado_por || '').toLowerCase().includes(term) || (item.asistencia_registrada_por || '').toLowerCase().includes(term);
      return matchName || matchDni || matchCodigo || matchResp || matchVal;
    }
    return true;
  });

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

      {/* Selector de Modo de Operación (Kits, Asistencia y Visor en Vivo) */}
      <div className="bg-white border-b border-stone-200 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-between flex-wrap gap-2">
          
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setActiveTab('kits');
                setScannedVoluntario(null);
              }}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
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
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeTab === 'asistencia'
                  ? 'bg-blue-100 text-blue-950 border border-blue-300 shadow-2xs'
                  : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              <ClipboardCheck className="w-4 h-4 text-blue-700" />
              <span>2. Control de Asistencia</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('visor');
                setScannedVoluntario(null);
                stopCamera();
                fetchVisorRecords();
              }}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeTab === 'visor'
                  ? 'bg-purple-100 text-purple-950 border border-purple-300 shadow-2xs'
                  : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              <Eye className="w-4 h-4 text-purple-700" />
              <span>3. Visor de Asistentes & Entregas</span>
              {visorRecords.length > 0 && (
                <span className="bg-purple-200 text-purple-950 px-1.5 py-0.2 rounded-full text-[10px] font-black">
                  {visorRecords.length}
                </span>
              )}
            </button>
          </div>

          {/* Métricas Rápidas Interactivas (Hacen clic directo al visor) */}
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-stone-600">
            <button
              type="button"
              onClick={() => {
                setActiveTab('visor');
                setVisorFilter('KITS');
                stopCamera();
                fetchVisorRecords();
              }}
              className="flex items-center gap-1 bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 rounded-xl border border-amber-200 text-amber-900 transition cursor-pointer"
              title="Ver en el Visor la lista de quienes recibieron su Kit"
            >
              🎁 Kits: <strong className="text-amber-950">{stats.kitsHoy}</strong>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('visor');
                setVisorFilter('ASISTENCIA');
                stopCamera();
                fetchVisorRecords();
              }}
              className="flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-xl border border-blue-200 text-blue-900 transition cursor-pointer"
              title="Ver en el Visor la lista de quienes marcaron Asistencia"
            >
              📋 Asistencias: <strong className="text-blue-950">{stats.asistenciaHoy}</strong>
            </button>
          </div>

        </div>
      </div>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {activeTab === 'visor' ? (
          /* ======================================================== */
          /* PESTAÑA 3: VISOR EN VIVO DE ENTREGAS Y ASISTENCIAS      */
          /* ======================================================== */
          <div className="space-y-5 animate-in fade-in duration-150">
            
            {/* Header del Visor */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center border border-purple-200 shadow-2xs">
                    <Eye className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold font-title text-stone-900 leading-tight">
                      Padrón en Vivo • Entregas y Asistencias
                    </h2>
                    <p className="text-xs text-stone-500">
                      Visualiza en tiempo real a los voluntarios que han llegado y recibido implementos.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {user?.rol === 'admin' ? (
                  <span className="px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                    <ShieldCheck className="w-4 h-4 text-rose-600" />
                    <span>Modo Administrador (Anulación habilitada)</span>
                  </span>
                ) : (
                  <span className="px-3 py-1.5 bg-stone-100 border border-stone-200 text-stone-700 rounded-xl text-xs font-bold flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-stone-500" />
                    <span>Validador (Solo lectura)</span>
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => {
                    fetchVisorRecords();
                    fetchStats();
                  }}
                  disabled={loadingVisor}
                  className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Recargar datos desde la base de datos"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingVisor ? 'animate-spin' : ''}`} />
                  <span>Actualizar</span>
                </button>
              </div>
            </div>

            {/* Barra de Filtros y Búsqueda */}
            <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                {/* Input de Búsqueda */}
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    value={visorSearch}
                    onChange={(e) => setVisorSearch(e.target.value)}
                    placeholder="Buscar por nombre, DNI, código o validador..."
                    className="w-full pl-9 pr-8 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-diocesis-mustard"
                  />
                  {visorSearch && (
                    <button
                      onClick={() => setVisorSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filtros Tipo Pills */}
                <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                  <button
                    type="button"
                    onClick={() => setVisorFilter('ALL')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                      visorFilter === 'ALL'
                        ? 'bg-stone-900 text-white shadow-xs'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    Todos ({visorRecords.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setVisorFilter('KITS')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                      visorFilter === 'KITS'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
                    }`}
                  >
                    🎁 Kits ({visorRecords.filter(r => r.kit_entregado).length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setVisorFilter('ASISTENCIA')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                      visorFilter === 'ASISTENCIA'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-blue-50 text-blue-900 hover:bg-blue-100 border border-blue-200'
                    }`}
                  >
                    📋 Asistencias ({visorRecords.filter(r => r.asistencia_dia_d).length})
                  </button>
                </div>
              </div>

              {/* Conteo filtrado */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-stone-500 pt-1 border-t border-stone-100 gap-1">
                <span>
                  Mostrando <strong>{filteredVisorRecords.length}</strong> de <strong>{visorRecords.length}</strong> voluntario(s) con actividad registrada.
                </span>
                {user?.rol === 'admin' && (
                  <span className="text-[11px] text-rose-700 font-semibold">
                    💡 Como Administrador puedes anular registros erróneos o pruebas usando el botón "Anular".
                  </span>
                )}
              </div>
            </div>

            {/* Listado de Voluntarios en el Visor */}
            {loadingVisor ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-stone-200 shadow-sm space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin text-diocesis-redDark mx-auto" />
                <p className="text-xs font-bold text-stone-600">Cargando registros del padrón en vivo...</p>
              </div>
            ) : filteredVisorRecords.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-stone-200 shadow-sm space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
                  <Users className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold font-title text-stone-800">
                  {visorRecords.length === 0 
                    ? 'Aún no se han registrado entregas ni asistencias hoy' 
                    : 'Ningún voluntario coincide con la búsqueda o filtro'}
                </h3>
                <p className="text-xs text-stone-400 max-w-sm mx-auto">
                  {visorRecords.length === 0
                    ? 'Regresa a la pestaña de "Entrega de Kits" o "Control de Asistencia" para escanear el primer código QR.'
                    : 'Prueba cambiando el término de búsqueda o seleccionando "Todos".'}
                </p>
                {visorRecords.length === 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('kits')}
                    className="px-4 py-2 bg-diocesis-redDark hover:bg-diocesis-red text-white text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Ir a Escanear Kits
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredVisorRecords.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-sm hover:border-stone-300 transition space-y-3"
                  >
                    {/* Fila Principal: Foto, Datos y Talla */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {item.fotografia_url ? (
                          <img
                            src={formatFotoUrl(item.fotografia_url)}
                            alt={item.nombres_apellidos}
                            className="w-12 h-12 rounded-xl object-cover border border-stone-300 shrink-0 bg-stone-100"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-900 shrink-0">
                            <User className="w-6 h-6 text-amber-700" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-stone-900 truncate">
                            {item.nombres_apellidos}
                          </h4>
                          <p className="text-xs font-mono text-stone-500">
                            DNI: <strong className="text-diocesis-redDark">{item.dni || 'S/D'}</strong> • Código: <span className="font-bold">{item.codigo || `VOL-${item.dni}`}</span>
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            {item.servicio && (
                              <span className="text-[10px] bg-stone-100 text-stone-700 px-1.5 py-0.2 rounded font-medium">
                                {item.servicio}
                              </span>
                            )}
                            {item.responsable_nombre && (
                              <span className="text-[10px] bg-blue-50 text-blue-800 px-1.5 py-0.2 rounded font-medium">
                                Resp: {item.responsable_nombre}
                              </span>
                            )}
                            {item.lugar_asignado && (
                              <span className="text-[10px] bg-emerald-50 text-emerald-800 px-1.5 py-0.2 rounded font-medium">
                                {item.lugar_asignado}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Talla Oficial */}
                      <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                        <span className="text-[10px] uppercase font-bold text-stone-400">Talla:</span>
                        <span className="px-2.5 py-1 bg-amber-100 border border-amber-300 text-amber-950 font-black font-mono text-xs rounded-lg">
                          {item.talla || 'No especificada'}
                        </span>
                      </div>
                    </div>

                    {/* Fila Secundaria: Estados de Kit y Asistencia + Botones de Anulación */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-stone-100 text-xs">
                      
                      {/* Estado Kit */}
                      <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                        item.kit_entregado 
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                          : 'bg-stone-50 border-stone-200 text-stone-400'
                      }`}>
                        <div className="min-w-0">
                          <span className="font-bold block truncate">
                            {item.kit_entregado ? '🎁 Kit Entregado' : '⚪ Kit Pendiente'}
                          </span>
                          {item.kit_entregado && (
                            <span className="text-[10px] text-stone-600 block truncate">
                              {item.kit_items_entregados || 'Kit Oficial'} • {item.kit_fecha_entrega ? new Date(item.kit_fecha_entrega).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''} por <strong>{item.kit_entregado_por || 'Validador'}</strong>
                            </span>
                          )}
                        </div>

                        {user?.rol === 'admin' && item.kit_entregado && (
                          <button
                            type="button"
                            disabled={savingAction}
                            onClick={() => handleResetKit(item)}
                            className="px-2.5 py-1 text-[11px] font-bold bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 rounded-lg flex items-center gap-1 shrink-0 transition cursor-pointer shadow-2xs disabled:opacity-50"
                            title="Anular entrega y volver a estado pendiente (Exclusivo Administrador)"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Anular Kit</span>
                          </button>
                        )}
                      </div>

                      {/* Estado Asistencia */}
                      <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                        item.asistencia_dia_d 
                          ? 'bg-blue-50/70 border-blue-200 text-blue-950'
                          : 'bg-stone-50 border-stone-200 text-stone-400'
                      }`}>
                        <div className="min-w-0">
                          <span className="font-bold block truncate">
                            {item.asistencia_dia_d ? '📋 Asistencia Confirmada' : '⚪ Asistencia No Marcada'}
                          </span>
                          {item.asistencia_dia_d && (
                            <span className="text-[10px] text-stone-600 block truncate">
                              {item.asistencia_punto || 'Punto Oficial'} • {item.asistencia_fecha ? new Date(item.asistencia_fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''} por <strong>{item.asistencia_registrada_por || 'Validador'}</strong>
                            </span>
                          )}
                        </div>

                        {user?.rol === 'admin' && item.asistencia_dia_d && (
                          <button
                            type="button"
                            disabled={savingAction}
                            onClick={() => handleResetAttendance(item)}
                            className="px-2.5 py-1 text-[11px] font-bold bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 rounded-lg flex items-center gap-1 shrink-0 transition cursor-pointer shadow-2xs disabled:opacity-50"
                            title="Anular asistencia y volver a estado no marcado (Exclusivo Administrador)"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Anular Asistencia</span>
                          </button>
                        )}
                      </div>

                    </div>

                  </div>
                ))}
              </div>
            )}

          </div>
        ) : (
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

                <div className="flex items-center gap-1.5">
                  {isScanning && camerasList.length > 1 && (
                    <button
                      type="button"
                      onClick={switchCamera}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-stone-100 hover:bg-stone-200 text-stone-700 transition flex items-center gap-1 cursor-pointer"
                      title="Cambiar entre lentes de la cámara"
                    >
                      <SwitchCamera className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Girar</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={isScanning ? stopCamera : () => startCamera()}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                      isScanning
                        ? 'bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    {isScanning ? (
                      <>
                        <CameraOff className="w-3.5 h-3.5" />
                        <span>Apagar</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-3.5 h-3.5" />
                        <span>Encender Cámara</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Contenedor del Lector de Cámara */}
              <div className="relative rounded-2xl overflow-hidden bg-stone-950 min-h-[260px] flex items-center justify-center border-2 border-stone-800 shadow-inner">
                {/* Contenedor Html5Qrcode: SIEMPRE visible en el layout del DOM */}
                <div 
                  id="qr-reader-container" 
                  className="w-full h-full"
                />
                
                {!isScanning && (
                  <div className="absolute inset-0 bg-stone-900 flex flex-col items-center justify-center p-6 text-center space-y-3 text-stone-300 z-10">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-amber-400 shadow-inner">
                      <QrCode className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Escáner de Código QR</p>
                      <p className="text-xs text-stone-400">Activa la cámara para apuntar al fotocheck</p>
                    </div>
                    <button
                      type="button"
                      disabled={isStartingCamera}
                      onClick={() => startCamera()}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black transition cursor-pointer shadow-md disabled:opacity-50"
                    >
                      {isStartingCamera ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Iniciando sensor...</span>
                        </>
                      ) : (
                        <>
                          <Camera className="w-4 h-4" />
                          <span>Activar Cámara</span>
                        </>
                      )}
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

          {/* COLUMNA DERECHA: Panel de Estado y Guía de Operaciones (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Mensaje de error de búsqueda cuando no hay voluntario cargado */}
            {actionError && !scannedVoluntario && (
              <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-3xl text-rose-900 flex items-start gap-3 shadow-xs animate-in fade-in">
                <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-bold text-sm">No se encontró voluntario</h4>
                  <p className="text-xs mt-0.5">{actionError}</p>
                </div>
                <button
                  onClick={() => setActionError(null)}
                  className="text-rose-700 hover:text-rose-900 cursor-pointer p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Tarjeta de Espera / Estado de la Estación de Validación */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm text-center space-y-5">
              <div className="relative inline-block">
                <div className="w-20 h-20 rounded-3xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto border-2 border-amber-200 shadow-inner">
                  <QrCode className="w-10 h-10" />
                </div>
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-white"></span>
                </span>
              </div>

              <div className="max-w-md mx-auto space-y-1.5">
                <h3 className="text-lg sm:text-xl font-bold font-title text-stone-900">
                  Estación de Validación Lista
                </h3>
                <p className="text-xs sm:text-sm text-stone-500">
                  {isScanning 
                    ? 'Apunta la cámara al código QR de la credencial. La ficha del voluntario se abrirá automáticamente en una ventana emergente sin que tengas que deslizar la pantalla.'
                    : 'Enciende la cámara a la izquierda o digita el DNI del voluntario para abrir su ficha instantánea.'}
                </p>
              </div>

              {/* Botón de acceso rápido para reabrir ficha si existe */}
              {scannedVoluntario && (
                <div className="pt-2">
                  <button
                    onClick={() => {}}
                    className="px-5 py-2.5 bg-diocesis-redDark hover:bg-diocesis-red text-white rounded-2xl text-xs font-bold shadow-md transition flex items-center justify-center gap-2 mx-auto cursor-pointer"
                  >
                    <User className="w-4 h-4 text-diocesis-mustard" />
                    <span>Ficha Abierta: {scannedVoluntario.nombres_apellidos}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Protocolo y Buenas Prácticas para agilizar filas */}
            <div className="bg-stone-50/80 rounded-3xl p-5 border border-stone-200/80 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-diocesis-mustard" />
                Flujo Rápido de Atención en Cola
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white rounded-2xl border border-stone-200 space-y-1">
                  <span className="font-bold text-stone-800 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-mono text-[10px] font-black flex items-center justify-center">1</span>
                    Ventana Inmediata (Modal)
                  </span>
                  <p className="text-stone-500 text-[11px]">
                    Al escanear, el resultado salta al frente en pantalla completa. No necesitas deslizar hacia abajo en tu teléfono.
                  </p>
                </div>

                <div className="p-3 bg-white rounded-2xl border border-stone-200 space-y-1">
                  <span className="font-bold text-stone-800 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-mono text-[10px] font-black flex items-center justify-center">2</span>
                    Entrega de Polo por Talla
                  </span>
                  <p className="text-stone-500 text-[11px]">
                    La talla oficial registrada aparece destacada en color ámbar para entregar la prenda textil exacta del inventario.
                  </p>
                </div>

                <div className="p-3 bg-white rounded-2xl border border-stone-200 space-y-1">
                  <span className="font-bold text-stone-800 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-mono text-[10px] font-black flex items-center justify-center">3</span>
                    Detección de Duplicados
                  </span>
                  <p className="text-stone-500 text-[11px]">
                    Si un voluntario ya recibió su kit, la pantalla se teñirá de rojo con la fecha exacta y nombre del validador previo.
                  </p>
                </div>

                <div className="p-3 bg-white rounded-2xl border border-stone-200 space-y-1">
                  <span className="font-bold text-stone-800 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-mono text-[10px] font-black flex items-center justify-center">4</span>
                    Siguiente en 1 Toque
                  </span>
                  <p className="text-stone-500 text-[11px]">
                    Al pulsar "Siguiente Voluntario", la ventana se cierra y la cámara vuelve a escanear de forma automática.
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>
        )}

      </main>

      {/* ======================================================== */}
      {/* MODAL POPUP FLOTANTE: RESULTADO INMEDIATO DEL ESCANEO   */}
      {/* (Evita hacer scroll en móvil y acelera la atención)     */}
      {/* ======================================================== */}
      {scannedVoluntario && (
        <div 
          className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleNextVolunteer();
          }}
        >
          <div 
            className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl border-2 border-stone-200 relative my-auto animate-in zoom-in-95 duration-150 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Botón flotante para cerrar X */}
            <button
              onClick={handleNextVolunteer}
              aria-label="Cerrar modal"
              className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition cursor-pointer z-20 shadow-md"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Banner de Estado Específico */}
            {activeTab === 'kits' ? (
              scannedVoluntario.kit_entregado ? (
                // 🔴 ALERTA: KIT YA ENTREGADO
                <div className="bg-rose-600 text-white p-4 pr-12 text-center space-y-1">
                  <span className="text-[11px] font-black uppercase tracking-widest bg-black/20 px-3 py-0.5 rounded-full inline-block">
                    ⚠️ ALERTA DE DUPLICADO
                  </span>
                  <h3 className="text-base sm:text-lg font-black font-title">
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
                <div className="bg-emerald-600 text-white p-4 pr-12 text-center space-y-0.5">
                  <span className="text-[11px] font-black uppercase tracking-widest bg-black/20 px-3 py-0.5 rounded-full inline-block">
                    ✅ HABILITADO
                  </span>
                  <h3 className="text-base sm:text-lg font-black font-title">
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
                <div className="bg-emerald-600 text-white p-4 pr-12 text-center space-y-0.5">
                  <span className="text-[11px] font-black uppercase tracking-widest bg-black/20 px-3 py-0.5 rounded-full inline-block">
                    ✅ PRESENTE
                  </span>
                  <h3 className="text-base sm:text-lg font-black font-title">
                    ASISTENCIA YA REGISTRADA
                  </h3>
                  <p className="text-xs text-emerald-100">
                    Marcado el {new Date(scannedVoluntario.asistencia_fecha).toLocaleTimeString()} por {scannedVoluntario.asistencia_registrada_por}.
                  </p>
                </div>
              ) : (
                <div className="bg-blue-600 text-white p-4 pr-12 text-center space-y-0.5">
                  <span className="text-[11px] font-black uppercase tracking-widest bg-black/20 px-3 py-0.5 rounded-full inline-block">
                    📋 CONTROL DE ASISTENCIA
                  </span>
                  <h3 className="text-base sm:text-lg font-black font-title">
                    PENDIENTE DE MARCAR ASISTENCIA
                  </h3>
                  <p className="text-xs text-blue-100">
                    Confirma la presencia del voluntario en su punto asignado.
                  </p>
                </div>
              )
            )}

            {/* Mensajes de error o éxito específicos dentro del modal */}
            {actionError && (
              <div className="m-4 mb-0 p-3.5 bg-rose-50 border-2 border-rose-300 rounded-2xl text-rose-900 flex items-start gap-2.5">
                <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold block">Error al procesar:</span>
                  <span>{actionError}</span>
                </div>
              </div>
            )}

            {actionSuccessMsg && (
              <div className="m-4 mb-0 p-3.5 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-emerald-950 flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs flex-1">
                  <span className="font-bold block">¡Acción Confirmada!</span>
                  <span>{actionSuccessMsg}</span>
                </div>
              </div>
            )}

            {/* Opciones de Anulación / Reversión Exclusivas para Administrador */}
            {user?.rol === 'admin' && (scannedVoluntario.kit_entregado || scannedVoluntario.asistencia_dia_d) && (
              <div className="m-4 mb-0 p-3.5 bg-rose-50 border-2 border-rose-300 rounded-2xl space-y-2 animate-in fade-in">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-rose-600" />
                  Opciones de Administrador (Pruebas / Reversión):
                </span>
                <p className="text-[11px] text-rose-700 leading-tight">
                  Puedes anular este registro para volver a probar el escaneo o corregir una entrega errónea.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {scannedVoluntario.kit_entregado && (
                    <button
                      type="button"
                      disabled={savingAction}
                      onClick={() => handleResetKit(scannedVoluntario)}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Anular Entrega de Kit</span>
                    </button>
                  )}
                  {scannedVoluntario.asistencia_dia_d && (
                    <button
                      type="button"
                      disabled={savingAction}
                      onClick={() => handleResetAttendance(scannedVoluntario)}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Anular Asistencia</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Tarjeta de Datos del Voluntario */}
            <div className="p-5 sm:p-6 space-y-4">
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

                <div className="space-y-1 text-center sm:text-left flex-1 min-w-0">
                  <h4 className="text-lg sm:text-xl font-bold font-title text-stone-900 leading-tight">
                    {scannedVoluntario.nombres_apellidos}
                  </h4>
                  <p className="text-xs font-mono font-bold text-stone-500">
                    DNI: <span className="text-diocesis-redDark">{scannedVoluntario.dni || 'Sin DNI'}</span> • Código: <span>{scannedVoluntario.codigo || `VOL-${scannedVoluntario.dni}`}</span>
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
              <div className="p-3.5 bg-amber-100/80 border-2 border-amber-400 rounded-2xl flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center shadow-xs">
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
                <span className="text-xs text-amber-800 font-semibold text-right max-w-[130px] hidden sm:block">
                  Entrega esta prenda del almacén
                </span>
              </div>

              {/* FORMULARIO DE ACCIÓN: MODO KITS */}
              {activeTab === 'kits' && (
                <div className="space-y-3 pt-2 border-t border-stone-200">
                  {/* Checkboxes de Selección de Entrega */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-stone-700 block">
                      Selecciona los artículos a entregar:
                    </span>

                    <label className="flex items-center gap-3 p-2.5 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl cursor-pointer transition">
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

                    <label className="flex items-center gap-3 p-2.5 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl cursor-pointer transition">
                      <input
                        type="checkbox"
                        checked={entregaPolo}
                        onChange={(e) => setEntregaPolo(e.target.checked)}
                        className="w-4 h-4 rounded text-diocesis-redDark focus:ring-diocesis-mustard"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-stone-900 block">
                          👕 Polo Oficial (Talla {scannedVoluntario.talla || 'L'})
                        </span>
                        <span className="text-stone-500">Prenda textil oficial Visita Papal</span>
                      </div>
                    </label>
                  </div>

                  {/* Botón de Confirmación */}
                  <button
                    type="button"
                    disabled={savingAction || (!entregaKitCompleto && !entregaPolo)}
                    onClick={handleConfirmKitDelivery}
                    className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-2xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {savingAction ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>Guardando entrega...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5 text-emerald-200" />
                        <span>Confirmar Entrega de Kit</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* FORMULARIO DE ACCIÓN: MODO ASISTENCIA */}
              {activeTab === 'asistencia' && (
                <div className="space-y-3 pt-2 border-t border-stone-200">
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
                    className="w-full py-3 px-4 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white rounded-2xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
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

            {/* Footer del Modal con botón destacado para siguiente voluntario */}
            <div className="bg-stone-50 border-t border-stone-200 p-4 flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={handleNextVolunteer}
                className="w-full sm:w-auto px-4 py-2 text-stone-600 hover:text-stone-900 text-xs font-semibold transition cursor-pointer"
              >
                Cerrar Ventana
              </button>
              
              <button
                type="button"
                onClick={handleNextVolunteer}
                className="w-full sm:w-auto px-5 py-2.5 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2 shadow-sm"
              >
                <QrCode className="w-4 h-4 text-diocesis-mustard" />
                <span>Escanear Siguiente Voluntario</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-3 text-center text-xs text-stone-400 bg-white border-t border-stone-200">
        Diócesis de Chiclayo • Módulo de Validación de Campo 2026
      </footer>

    </div>
  );
}

