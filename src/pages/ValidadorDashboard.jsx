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
  Filter,
  Coffee,
  Utensils,
  Boxes,
  Truck,
  Printer,
  FileCheck,
  CheckCheck
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

// Responsables Generales Canónicos
const CANONICAL_LIDERES = [
  { nombre: 'SEBASTIÁN LEÓN SALOMÉ', dni: '73050638' },
  { nombre: 'CRISTINA NOMBERA BAZÁN', dni: '72648617' },
  { nombre: 'MARIA SOLEDAD LONGA GRANDA', dni: '47584113' },
  { nombre: 'JHONATAN FRANCISCO FIESTAS PATAZCA', dni: '47844514' },
  { nombre: 'FATIMA ELIZABETH GONZALES FIESTAS', dni: '74447092' },
  { nombre: 'MARÍA ISABEL BAUDAT SANCHEZ', dni: '75262428' },
  { nombre: 'RICARDO ACOSTA DEL AGUILA', dni: '77212304' },
  { nombre: 'ANNGHY GABRIELA SALAZAR GONZALES', dni: '72693556' },
  { nombre: 'ELENA XIOMARA SOPLOPUCO LOCONI', dni: '76069148' },
  { nombre: 'PAMELA DEL MILAGRO QUICIO MONJE', dni: '73381541' },
  { nombre: 'PRISCILLA NIÑO MALDONADO', dni: '75194090' },
  { nombre: 'PEDRO ALEJANDRO LEÓN BONILLA', dni: '16654195' },
  { nombre: 'LUIS MIGUEL CHUMAN MONTERO', dni: '71436152' },
  { nombre: 'WALTER GARCIA', dni: '46066172' },
  { nombre: 'SANDY TATIANA LIMO ORÉ', dni: '72307847' },
  { nombre: 'KATHERYN MELISA MARTINEZ BARBADILLO', dni: '75245598' },
  { nombre: 'CHISCUL ESQUIVES ANYELO HERNAN', dni: '46054145' },
  { nombre: 'SANTOS MAXIMO FIESTAS PATAZCA', dni: '75879740' },
  { nombre: 'WILDER ANIBAL LÓPEZ ALARCÓN', dni: '47814182' }
];

// Mapeo canónico exacto para localizar sin margen de error los voluntarios de cada Responsable
const RESPONSABLE_ALIASES = {
  '75879740': ['SANTOS MÁXIMO FIESTAS PATAZCA', 'SANTOS MAXIMO FIESTAS PATAZCA', 'MAX'],
  '47844514': ['JHONATAN FRANCISCO FIESTAS PATAZCA', 'JHONATAN'],
  '75262428': ['MARÍA ISABEL BAUDAT SANCHEZ', 'MARIA ISABEL BAUDAT SANCHEZ', 'MARIA BAUDAT'],
  '75194090': ['PRISCILLA NIÑO MALDONADO', 'PRISCILA'],
  '72307847': ['SANDY LIMO ORÉ', 'SANDY LIMO ORE', 'SANDY TATIANA LIMO ORÉ', 'SANDY'],
  '73381541': ['PAMELA DEL MILAGRO QUICIO MONJE', 'PAMELA'],
  '71436152': ['LUIS MIGUEL CHUMAN MONTERO', 'CHUMAN'],
  '46054145': ['ANYELO HERNAN CHISCUL ESQUIVES', 'CHISCUL ESQUIVES ANYELO HERNAN', 'ANYELO'],
  '72648617': ['CRISTINA NOMBERA BAZÁN', 'CRISTINA NOMBERA BAZAN', 'CRISTINA'],
  '74447092': ['FATIMA ELIZABETH GONZALES FIESTAS', 'FATIMA'],
  '76069148': ['ELENA XIOMARA SOPLOPUCO LOCONI', 'XIOMARA'],
  '47584113': ['MARIA SOLEDAD LONGA GRANDA', 'MARIA LONGA'],
  '75245598': ['KATHERYN MELISA MARTINEZ', 'KATHERYN MELISA MARTINEZ BARBADILLO', 'MELISSA'],
  '73050638': ['SEBASTIÁN LEÓN SALOMÉ', 'SEBASTIAN LEON SALOME', 'SEBASTIAN'],
  '16654195': ['PEDRO ALEJANDRO LEÓN BONILLA', 'SR. PEDRO', 'PEDRO'],
  '77212304': ['RICARDO ACOSTA DEL AGUILA', 'RICARDO'],
  '47814182': ['WILDER ANIBAL LÓPEZ ALARCÓN', 'WILDER ANIBAL LOPEZ ALARCON', 'WILDER'],
  '72693556': ['ANNGHY GABRIELA SALAZAR GONZALES', 'ANNGHY', 'ANGIE'],
  '46066172': ['WALTER GARCIA', 'WALTER']
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
  
  // Modos de operación: 
  // 'asistencia' (1) | 'kits' (2) | 'desayuno' (3) | 'cena' (4) | 'despacho_lote' (5) | 'visor' (6)
  const [activeTab, setActiveTab] = useState('asistencia');

  // Estados de escáner y búsqueda
  const [isScanning, setIsScanning] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [camerasList, setCamerasList] = useState([]);
  const [activeCameraIndex, setActiveCameraIndex] = useState(0);
  const [cameraError, setCameraError] = useState(null);
  const [manualInput, setManualInput] = useState('');
  const [searching, setSearching] = useState(false);
  
  // Voluntario escaneado/seleccionado en Modal
  const [scannedVoluntario, setScannedVoluntario] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [savingAction, setSavingAction] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState(null);
  const [justConfirmed, setJustConfirmed] = useState(null); // null | 'KIT' | 'ASISTENCIA' | 'DESAYUNO' | 'CENA'

  // Formulario de Entrega de Kits
  const [entregaKitCompleto, setEntregaKitCompleto] = useState(true);
  const [entregaPolo, setEntregaPolo] = useState(true);
  const [kitNotas, setKitNotas] = useState('');

  // Formulario de Asistencia y Alimentos
  const [puntoAsistencia, setPuntoAsistencia] = useState('Punto Principal');
  const [puntoAlimentos, setPuntoAlimentos] = useState('Comedor Principal / Almacén');

  // Historial de escaneos de la sesión actual
  const [sessionHistory, setSessionHistory] = useState([]);

  // Métricas rápidas de la sesión
  const [stats, setStats] = useState({ 
    kitsHoy: 0, 
    asistenciaHoy: 0,
    desayunoHoy: 0,
    cenaHoy: 0
  });

  // Estados del Visor de Asistentes y Entregas en Tiempo Real
  const [visorRecords, setVisorRecords] = useState([]);
  const [loadingVisor, setLoadingVisor] = useState(false);
  const [visorSearch, setVisorSearch] = useState('');
  const [visorFilter, setVisorFilter] = useState('ALL'); // 'ALL' | 'PENDING_ASISTENCIA' | 'ASISTENCIA' | 'KITS' | 'DESAYUNO' | 'CENA'
  const [selectedVisorLeader, setSelectedVisorLeader] = useState('');
  const [markingActionKey, setMarkingActionKey] = useState(null);
  const [sessionUndoSnapshots, setSessionUndoSnapshots] = useState({});

  // ========================================================
  // ESTADOS DEL MÓDULO DE DESPACHO EN BLOQUE A RESPONSABLES
  // ========================================================
  const [lideresList, setLideresList] = useState(CANONICAL_LIDERES);
  const [selectedLeader, setSelectedLeader] = useState('');
  const [loadingLote, setLoadingLote] = useState(false);
  const [loteVoluntarios, setLoteVoluntarios] = useState([]);
  const [despacharKitsCheck, setDespacharKitsCheck] = useState(true);
  const [despacharDesayunoCheck, setDespacharDesayunoCheck] = useState(false);
  const [despacharCenaCheck, setDespacharCenaCheck] = useState(false);
  const [kitsCantidad, setKitsCantidad] = useState(0);
  const [desayunosCantidad, setDesayunosCantidad] = useState(0);
  const [cenasCantidad, setCenasCantidad] = useState(0);
  const [loteReceipt, setLoteReceipt] = useState(null);
  const [confirmingLote, setConfirmingLote] = useState(false);

  const html5QrCodeRef = useRef(null);

  // Determinar condición de filtro por rol y jurisdicción
  const getUserScopeOrCondition = () => {
    if (!user || user.rol === 'admin' || user.rol === 'validador') {
      return null; // Administrador o Validador de Almacén Central: acceso global
    }
    if (user.rol === 'responsable') {
      const aliases = (user.dni && RESPONSABLE_ALIASES[user.dni])
        ? RESPONSABLE_ALIASES[user.dni]
        : [user.responsable_nombre || user.nombre];
      return aliases.flatMap(a => [
        `responsable_nombre.ilike.%${a}%`,
        `lugar_asignado.ilike.%${a}%`
      ]).join(',');
    }
    if (user.rol === 'lider') {
      const lNom = user.lider_nombre || user.nombre;
      return `lider_nombre.ilike.%${lNom}%`;
    }
    if (user.rol === 'guia') {
      if (user.cuadrilla_codigo) {
        return `cuadrilla_codigo.eq.${user.cuadrilla_codigo},guia_nombre.eq.${user.nombre}`;
      }
    }
    return null;
  };

  const isMyVolunteer = (rec) => {
    if (!rec || !user || user.rol === 'admin' || user.rol === 'validador') return true;
    if (user.rol === 'responsable') {
      const aliases = (user.dni && RESPONSABLE_ALIASES[user.dni])
        ? RESPONSABLE_ALIASES[user.dni]
        : [user.responsable_nombre || user.nombre];
      const recResp = (rec.responsable_nombre || rec.lugar_asignado || '').toUpperCase();
      return aliases.some(a => recResp.includes(a.toUpperCase()));
    }
    if (user.rol === 'lider') {
      const lNom = (user.lider_nombre || user.nombre || '').toUpperCase();
      const recLid = (rec.lider_nombre || '').toUpperCase();
      return recLid.includes(lNom);
    }
    if (user.rol === 'guia') {
      return rec.cuadrilla_codigo === user.cuadrilla_codigo || rec.guia_nombre === user.nombre;
    }
    return true;
  };

  // Cargar lista dinámica de líderes de estructura_mandos
  const fetchLideres = async () => {
    try {
      const { data, error } = await supabase
        .from('estructura_mandos')
        .select('responsable_general_nombre, responsable_general_dni')
        .not('responsable_general_nombre', 'is', null);

      if (!error && data && data.length > 0) {
        const unique = new Map();
        CANONICAL_LIDERES.forEach(l => unique.set(l.nombre.toUpperCase().trim(), l));
        data.forEach(item => {
          const norm = item.responsable_general_nombre.toUpperCase().trim();
          if (!unique.has(norm)) {
            unique.set(norm, {
              nombre: item.responsable_general_nombre.trim(),
              dni: item.responsable_general_dni || ''
            });
          }
        });
        setLideresList(Array.from(unique.values()).sort((a, b) => a.nombre.localeCompare(b.nombre)));
      }
    } catch (e) {
      console.warn('Error fetching leaders list:', e);
    }
  };

  // Cargar métricas iniciales del validador / responsable
  const fetchStats = async () => {
    try {
      const scopeOr = getUserScopeOrCondition();

      let qK = supabase.from('voluntarios').select('*', { count: 'exact', head: true }).eq('kit_entregado', true);
      let qA = supabase.from('voluntarios').select('*', { count: 'exact', head: true }).eq('asistencia_dia_d', true);
      let qD = supabase.from('voluntarios').select('*', { count: 'exact', head: true }).eq('desayuno_entregado', true);
      let qC = supabase.from('voluntarios').select('*', { count: 'exact', head: true }).eq('cena_entregada', true);

      if (scopeOr) {
        qK = qK.or(scopeOr);
        qA = qA.or(scopeOr);
        qD = qD.or(scopeOr);
        qC = qC.or(scopeOr);
      }

      const [{ count: kCount }, { count: aCount }, { count: dCount }, { count: cCount }] = await Promise.all([
        qK, qA, qD, qC
      ]);

      setStats({
        kitsHoy: kCount || 0,
        asistenciaHoy: aCount || 0,
        desayunoHoy: dCount || 0,
        cenaHoy: cCount || 0
      });
    } catch (e) {
      console.warn('Error fetching stats:', e);
    }
  };

  // Cargar registros completos del Visor en Tiempo Real
  const fetchVisorRecords = async (leaderOverride) => {
    setLoadingVisor(true);
    try {
      const targetLeader = typeof leaderOverride === 'string' ? leaderOverride : selectedVisorLeader;
      const scopeOr = getUserScopeOrCondition();
      const selectCols = 'id, dni, codigo, nombres_apellidos, talla, servicio, responsable_nombre, lugar_asignado, fotografia_url, kit_entregado, kit_polo_entregado, kit_items_entregados, kit_fecha_entrega, kit_entregado_por, kit_estado, kit_custodio_nombre, kit_fecha_despacho_lote, asistencia_dia_d, asistencia_fecha, asistencia_registrada_por, asistencia_punto, desayuno_entregado, desayuno_fecha, desayuno_entregado_por, desayuno_punto, desayuno_estado, desayuno_custodio_nombre, cena_entregada, cena_fecha, cena_entregada_por, cena_punto, cena_estado, cena_custodio_nombre, fase, estado';

      let qF2 = supabase.from('voluntarios').select(selectCols);
      let qF1 = supabase.from('voluntarios_general').select(selectCols);

      if (scopeOr) {
        // Para Responsables, Líderes o Guías: mostrar los voluntarios de su jurisdicción
        qF2 = qF2.or(scopeOr);
        qF1 = qF1.or(scopeOr);
      } else if (targetLeader) {
        // Para Admin/Validador seleccionando un responsable específico: cargar todo su padrón
        const firstWord = targetLeader.split(' ')[0] || targetLeader;
        qF2 = qF2.ilike('responsable_nombre', `%${firstWord}%`);
        qF1 = qF1.ilike('responsable_nombre', `%${firstWord}%`);
      } else {
        // Para Administradores y Validadores de Almacén: vista global
        const globalFilter = 'kit_entregado.eq.true,asistencia_dia_d.eq.true,desayuno_entregado.eq.true,cena_entregada.eq.true,kit_estado.eq.EN_CUSTODIA_RESPONSABLE,desayuno_estado.eq.EN_CUSTODIA_RESPONSABLE,cena_estado.eq.EN_CUSTODIA_RESPONSABLE';
        qF2 = qF2.or(globalFilter);
        qF1 = qF1.or(globalFilter);
      }

      const [{ data: vF2, error: e2 }, { data: vF1, error: e1 }] = await Promise.all([
        qF2, qF1
      ]);

      if (e2) console.warn('Error fetching F2 visor:', e2);
      if (e1) console.warn('Error fetching F1 visor:', e1);

      // Combinar y deduplicar por DNI o ID (Fase 2 tiene precedencia)
      const map = new Map();
      (vF1 || []).forEach(item => map.set(item.dni || item.id, { ...item, _origenTabla: 'voluntarios_general' }));
      (vF2 || []).forEach(item => map.set(item.dni || item.id, { ...item, _origenTabla: 'voluntarios' }));

      const combined = Array.from(map.values()).sort((a, b) => {
        const timeA = new Date(a.kit_fecha_entrega || a.asistencia_fecha || a.desayuno_fecha || a.cena_fecha || a.kit_fecha_despacho_lote || 0).getTime();
        const timeB = new Date(b.kit_fecha_entrega || b.asistencia_fecha || b.desayuno_fecha || b.cena_fecha || b.kit_fecha_despacho_lote || 0).getTime();
        return timeB - timeA;
      });

      setVisorRecords(combined);

      if (scopeOr || !targetLeader) {
        setStats({
          kitsHoy: combined.filter(r => r.kit_entregado).length,
          asistenciaHoy: combined.filter(r => r.asistencia_dia_d).length,
          desayunoHoy: combined.filter(r => r.desayuno_entregado).length,
          cenaHoy: combined.filter(r => r.cena_entregada).length
        });
      }
    } catch (err) {
      console.error('Error cargando visor:', err);
    } finally {
      setLoadingVisor(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchVisorRecords();
    fetchLideres();
  }, []);

  // Evitar que roles de campo (Responsable, Líder, Guía) ingresen a Despacho en Bloque (exclusivo almacén)
  useEffect(() => {
    if ((user?.rol === 'responsable' || user?.rol === 'lider' || user?.rol === 'guia') && activeTab === 'despacho_lote') {
      setActiveTab('asistencia');
    }
  }, [user, activeTab]);

  // Iniciar Cámara con autodetección de sensor trasero y manejo resiliente
  const startCamera = async (overrideCameraId = null) => {
    setCameraError(null);
    setIsStartingCamera(true);

    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      setCameraError('La cámara en teléfonos celulares requiere conexión segura HTTPS. Si estás probando en tu celular, ábrelo en el dominio de producción (Render con HTTPS) o usa la búsqueda manual por DNI abajo.');
      setIsStartingCamera(false);
      return;
    }

    try {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        try {
          await html5QrCodeRef.current.stop();
        } catch (e) {}
      }

      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode('qr-reader-container');
      }

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

      let cameraConfig;
      if (overrideCameraId) {
        cameraConfig = overrideCameraId;
      } else if (cams && cams.length > 0) {
        const backIdx = cams.findIndex(c => /back|rear|trasera|environment|externa/i.test(c.label));
        const chosenIdx = backIdx !== -1 ? backIdx : cams.length - 1;
        setActiveCameraIndex(chosenIdx);
        cameraConfig = cams[chosenIdx].id;
      } else {
        cameraConfig = { facingMode: 'environment' };
      }

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
        () => {}
      );

      setIsScanning(true);
    } catch (err) {
      console.warn('Fallo primer intento con ID de cámara, intentando facingMode:', err);
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

  const switchCamera = async () => {
    if (!camerasList || camerasList.length <= 1) return;
    const nextIdx = (activeCameraIndex + 1) % camerasList.length;
    setActiveCameraIndex(nextIdx);
    await stopCamera();
    await startCamera(camerasList[nextIdx].id);
  };

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  // Procesar texto leído por el QR
  const handleQrDecoded = (decodedText) => {
    let cleanDniOrCode = decodedText.trim();
    try {
      const parsed = JSON.parse(decodedText);
      if (parsed.dni) cleanDniOrCode = String(parsed.dni).trim();
      else if (parsed.codigo) cleanDniOrCode = String(parsed.codigo).trim();
    } catch (e) {}

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
    setJustConfirmed(null);
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

      let record = f2Data ? { ...f2Data, _origenTabla: 'voluntarios' } : null;

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
        if (f1Data) record = { ...f1Data, _origenTabla: 'voluntarios_general' };
      }

      if (!record) {
        playSound('warning');
        setActionError(`No se encontró ningún voluntario con el DNI o código "${cleanTerm}".`);
        return;
      }

      setScannedVoluntario(record);

      // Sonido de alerta si ya se procesó según el modo activo
      const yaProcesado = 
        (activeTab === 'kits' && record.kit_entregado) ||
        (activeTab === 'asistencia' && record.asistencia_dia_d) ||
        (activeTab === 'desayuno' && record.desayuno_entregado) ||
        (activeTab === 'cena' && record.cena_entregada);

      if (yaProcesado) {
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

  // ========================================================
  // ACCIONES INDIVIDUALES (1 A 1)
  // ========================================================

  // 1. Registrar Control de Asistencia (Día D)
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

      if (scannedVoluntario.dni) {
        await Promise.all([
          supabase.from('voluntarios').update(updateData).eq('dni', scannedVoluntario.dni),
          supabase.from('voluntarios_general').update(updateData).eq('dni', scannedVoluntario.dni)
        ]);
      } else {
        const tableName = scannedVoluntario._origenTabla || (scannedVoluntario.fase === '3' ? 'voluntarios' : 'voluntarios_general');
        const { error } = await supabase.from(tableName).update(updateData).eq('id', scannedVoluntario.id);
        if (error) throw error;
      }

      playSound('success');
      setActionSuccessMsg(`¡Asistencia registrada para ${scannedVoluntario.nombres_apellidos}!`);
      setJustConfirmed('ASISTENCIA');

      const updated = { ...scannedVoluntario, ...updateData };
      setScannedVoluntario(updated);

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

  // 2. Registrar Entrega de Kits & Polos
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
        kit_observaciones: kitNotas.trim() || null,
        kit_estado: 'ENTREGADO_FINAL'
      };

      if (scannedVoluntario.dni) {
        await Promise.all([
          supabase.from('voluntarios').update(updateData).eq('dni', scannedVoluntario.dni),
          supabase.from('voluntarios_general').update(updateData).eq('dni', scannedVoluntario.dni)
        ]);
      } else {
        const tableName = scannedVoluntario._origenTabla || (scannedVoluntario.fase === '3' ? 'voluntarios' : 'voluntarios_general');
        const { error } = await supabase.from(tableName).update(updateData).eq('id', scannedVoluntario.id);
        if (error) throw error;
      }

      playSound('success');
      setActionSuccessMsg(`¡Kit entregado exitosamente a ${scannedVoluntario.nombres_apellidos}!`);
      setJustConfirmed('KIT');

      const updated = { ...scannedVoluntario, ...updateData };
      setScannedVoluntario(updated);

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

  // 3. Registrar Entrega de Desayuno (24h Flexible / 1 por voluntario)
  const handleConfirmDesayuno = async () => {
    if (!scannedVoluntario) return;
    setSavingAction(true);
    setActionError(null);

    try {
      const updateData = {
        desayuno_entregado: true,
        desayuno_estado: 'ENTREGADO_FINAL',
        desayuno_fecha: new Date().toISOString(),
        desayuno_entregado_por: user?.nombre || 'Validador Oficial',
        desayuno_punto: puntoAlimentos
      };

      if (scannedVoluntario.dni) {
        await Promise.all([
          supabase.from('voluntarios').update(updateData).eq('dni', scannedVoluntario.dni),
          supabase.from('voluntarios_general').update(updateData).eq('dni', scannedVoluntario.dni)
        ]);
      } else {
        const tableName = scannedVoluntario._origenTabla || (scannedVoluntario.fase === '3' ? 'voluntarios' : 'voluntarios_general');
        const { error } = await supabase.from(tableName).update(updateData).eq('id', scannedVoluntario.id);
        if (error) throw error;
      }

      playSound('success');
      setActionSuccessMsg(`¡Ración de desayuno registrada para ${scannedVoluntario.nombres_apellidos}!`);
      setJustConfirmed('DESAYUNO');

      const updated = { ...scannedVoluntario, ...updateData };
      setScannedVoluntario(updated);

      setSessionHistory(prev => [
        {
          id: Date.now(),
          nombre: scannedVoluntario.nombres_apellidos,
          dni: scannedVoluntario.dni,
          tipo: 'DESAYUNO',
          detalle: puntoAlimentos,
          hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        },
        ...prev.slice(0, 9)
      ]);

      setStats(prev => ({ ...prev, desayunoHoy: (prev.desayunoHoy || 0) + 1 }));
    } catch (err) {
      console.error('Error entregando desayuno:', err);
      setActionError('No se pudo registrar la entrega del desayuno.');
    } finally {
      setSavingAction(false);
    }
  };

  // 4. Registrar Entrega de Cena (24h Flexible / 1 por voluntario)
  const handleConfirmCena = async () => {
    if (!scannedVoluntario) return;
    setSavingAction(true);
    setActionError(null);

    try {
      const updateData = {
        cena_entregada: true,
        cena_estado: 'ENTREGADO_FINAL',
        cena_fecha: new Date().toISOString(),
        cena_entregada_por: user?.nombre || 'Validador Oficial',
        cena_punto: puntoAlimentos
      };

      if (scannedVoluntario.dni) {
        await Promise.all([
          supabase.from('voluntarios').update(updateData).eq('dni', scannedVoluntario.dni),
          supabase.from('voluntarios_general').update(updateData).eq('dni', scannedVoluntario.dni)
        ]);
      } else {
        const tableName = scannedVoluntario._origenTabla || (scannedVoluntario.fase === '3' ? 'voluntarios' : 'voluntarios_general');
        const { error } = await supabase.from(tableName).update(updateData).eq('id', scannedVoluntario.id);
        if (error) throw error;
      }

      playSound('success');
      setActionSuccessMsg(`¡Ración de cena registrada para ${scannedVoluntario.nombres_apellidos}!`);
      setJustConfirmed('CENA');

      const updated = { ...scannedVoluntario, ...updateData };
      setScannedVoluntario(updated);

      setSessionHistory(prev => [
        {
          id: Date.now(),
          nombre: scannedVoluntario.nombres_apellidos,
          dni: scannedVoluntario.dni,
          tipo: 'CENA',
          detalle: puntoAlimentos,
          hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        },
        ...prev.slice(0, 9)
      ]);

      setStats(prev => ({ ...prev, cenaHoy: (prev.cenaHoy || 0) + 1 }));
    } catch (err) {
      console.error('Error entregando cena:', err);
      setActionError('No se pudo registrar la entrega de la cena.');
    } finally {
      setSavingAction(false);
    }
  };

  // ========================================================
  // REVERSIÓN / ANULACIÓN DE REGISTROS (EXCLUSIVO ADMINISTRADOR)
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
        kit_observaciones: null,
        kit_estado: 'PENDIENTE',
        kit_custodio_nombre: null,
        kit_custodio_dni: null,
        kit_fecha_despacho_lote: null
      };

      if (voluntario.dni) {
        await Promise.all([
          supabase.from('voluntarios').update(resetData).eq('dni', voluntario.dni),
          supabase.from('voluntarios_general').update(resetData).eq('dni', voluntario.dni)
        ]);
      } else {
        const tableName = voluntario._origenTabla || (voluntario.fase === '3' ? 'voluntarios' : 'voluntarios_general');
        const { error } = await supabase.from(tableName).update(resetData).eq('id', voluntario.id);
        if (error) throw error;
      }

      if (error) throw error;

      playSound('success');

      if (scannedVoluntario && scannedVoluntario.id === voluntario.id) {
        setJustConfirmed(null);
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

      if (voluntario.dni) {
        await Promise.all([
          supabase.from('voluntarios').update(resetData).eq('dni', voluntario.dni),
          supabase.from('voluntarios_general').update(resetData).eq('dni', voluntario.dni)
        ]);
      } else {
        const tableName = voluntario._origenTabla || (voluntario.fase === '3' ? 'voluntarios' : 'voluntarios_general');
        const { error } = await supabase.from(tableName).update(resetData).eq('id', voluntario.id);
        if (error) throw error;
      }

      if (error) throw error;

      playSound('success');

      if (scannedVoluntario && scannedVoluntario.id === voluntario.id) {
        setJustConfirmed(null);
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

  const handleResetDesayuno = async (voluntario) => {
    if (user?.rol !== 'admin') {
      alert('Acceso restringido: Solo los administradores pueden anular o revertir entregas de desayuno.');
      return;
    }

    const voluntarioNombre = voluntario.nombres_apellidos || 'este voluntario';
    if (!window.confirm(`¿Estás seguro de ANULAR el desayuno de ${voluntarioNombre}?\n\nEl registro volverá a figurar como PENDIENTE de entrega.`)) {
      return;
    }

    setSavingAction(true);
    setActionError(null);
    try {
      const resetData = {
        desayuno_entregado: false,
        desayuno_fecha: null,
        desayuno_entregado_por: null,
        desayuno_punto: null,
        desayuno_estado: 'PENDIENTE',
        desayuno_custodio_nombre: null
      };

      if (voluntario.dni) {
        await Promise.all([
          supabase.from('voluntarios').update(resetData).eq('dni', voluntario.dni),
          supabase.from('voluntarios_general').update(resetData).eq('dni', voluntario.dni)
        ]);
      } else {
        const tableName = voluntario._origenTabla || (voluntario.fase === '3' ? 'voluntarios' : 'voluntarios_general');
        const { error } = await supabase.from(tableName).update(resetData).eq('id', voluntario.id);
        if (error) throw error;
      }

      playSound('success');

      if (scannedVoluntario && scannedVoluntario.id === voluntario.id) {
        setJustConfirmed(null);
        setScannedVoluntario(prev => ({ ...prev, ...resetData }));
        setActionSuccessMsg(`Entrega de desayuno anulada para ${voluntarioNombre}.`);
      }

      await Promise.all([fetchStats(), fetchVisorRecords()]);
    } catch (err) {
      console.error('Error anulando desayuno:', err);
      setActionError('No se pudo anular la entrega de desayuno.');
    } finally {
      setSavingAction(false);
    }
  };

  const handleResetCena = async (voluntario) => {
    if (user?.rol !== 'admin') {
      alert('Acceso restringido: Solo los administradores pueden anular o revertir entregas de cena.');
      return;
    }

    const voluntarioNombre = voluntario.nombres_apellidos || 'este voluntario';
    if (!window.confirm(`¿Estás seguro de ANULAR la cena de ${voluntarioNombre}?\n\nEl registro volverá a figurar como PENDIENTE de entrega.`)) {
      return;
    }

    setSavingAction(true);
    setActionError(null);
    try {
      const resetData = {
        cena_entregada: false,
        cena_fecha: null,
        cena_entregada_por: null,
        cena_punto: null,
        cena_estado: 'PENDIENTE',
        cena_custodio_nombre: null
      };

      if (voluntario.dni) {
        await Promise.all([
          supabase.from('voluntarios').update(resetData).eq('dni', voluntario.dni),
          supabase.from('voluntarios_general').update(resetData).eq('dni', voluntario.dni)
        ]);
      } else {
        const tableName = voluntario._origenTabla || (voluntario.fase === '3' ? 'voluntarios' : 'voluntarios_general');
        const { error } = await supabase.from(tableName).update(resetData).eq('id', voluntario.id);
        if (error) throw error;
      }

      playSound('success');

      if (scannedVoluntario && scannedVoluntario.id === voluntario.id) {
        setJustConfirmed(null);
        setScannedVoluntario(prev => ({ ...prev, ...resetData }));
        setActionSuccessMsg(`Entrega de cena anulada para ${voluntarioNombre}.`);
      }

      await Promise.all([fetchStats(), fetchVisorRecords()]);
    } catch (err) {
      console.error('Error anulando cena:', err);
      setActionError('No se pudo anular la entrega de cena.');
    } finally {
      setSavingAction(false);
    }
  };

  // ========================================================
  // HELPER SINCRONIZACIÓN DUAL DE TABLAS (POR DNI O ID)
  // ========================================================
  const syncVolunteerPatch = async (voluntario, patchData) => {
    if (voluntario.dni) {
      const results = await Promise.all([
        supabase.from('voluntarios').update(patchData).eq('dni', voluntario.dni),
        supabase.from('voluntarios_general').update(patchData).eq('dni', voluntario.dni)
      ]);
      const err = results.find(r => r.error)?.error;
      if (err) throw err;
    } else {
      const tbl = voluntario._origenTabla || (voluntario.fase === '3' ? 'voluntarios' : 'voluntarios_general');
      const { error } = await supabase.from(tbl).update(patchData).eq('id', voluntario.id);
      if (error) throw error;
    }
  };

  // ========================================================
  // ACCIONES RÁPIDAS A 1 CLIC EN EL VISOR (ASISTENCIA, KIT, DESAYUNO, CENA)
  // ========================================================
  const getQuickActionSpec = (tipo, voluntario) => {
    const nowIso = new Date().toISOString();
    const userName = user?.nombre || 'Responsable Oficial';
    const specs = {
      ASISTENCIA: {
        statKey: 'asistenciaHoy',
        snapshot: {
          asistencia_dia_d: voluntario.asistencia_dia_d || false,
          asistencia_fecha: voluntario.asistencia_fecha || null,
          asistencia_registrada_por: voluntario.asistencia_registrada_por || null,
          asistencia_punto: voluntario.asistencia_punto || null
        },
        patch: {
          asistencia_dia_d: true,
          asistencia_fecha: nowIso,
          asistencia_registrada_por: userName,
          asistencia_punto: puntoAsistencia || 'Punto Principal'
        }
      },
      KIT: {
        statKey: 'kitsHoy',
        snapshot: {
          kit_entregado: voluntario.kit_entregado || false,
          kit_polo_entregado: voluntario.kit_polo_entregado || false,
          kit_items_entregados: voluntario.kit_items_entregados || null,
          kit_fecha_entrega: voluntario.kit_fecha_entrega || null,
          kit_entregado_por: voluntario.kit_entregado_por || null,
          kit_estado: voluntario.kit_estado || 'PENDIENTE'
        },
        patch: {
          kit_entregado: true,
          kit_polo_entregado: true,
          kit_items_entregados: `Kit Oficial + Polo (Talla ${voluntario.talla || 'Estándar'})`,
          kit_fecha_entrega: nowIso,
          kit_entregado_por: userName,
          kit_estado: 'ENTREGADO_FINAL'
        }
      },
      DESAYUNO: {
        statKey: 'desayunoHoy',
        snapshot: {
          desayuno_entregado: voluntario.desayuno_entregado || false,
          desayuno_estado: voluntario.desayuno_estado || 'PENDIENTE',
          desayuno_fecha: voluntario.desayuno_fecha || null,
          desayuno_entregado_por: voluntario.desayuno_entregado_por || null,
          desayuno_punto: voluntario.desayuno_punto || null
        },
        patch: {
          desayuno_entregado: true,
          desayuno_estado: 'ENTREGADO_FINAL',
          desayuno_fecha: nowIso,
          desayuno_entregado_por: userName,
          desayuno_punto: puntoAlimentos || 'Comedor Principal / Almacén'
        }
      },
      CENA: {
        statKey: 'cenaHoy',
        snapshot: {
          cena_entregada: voluntario.cena_entregada || false,
          cena_estado: voluntario.cena_estado || 'PENDIENTE',
          cena_fecha: voluntario.cena_fecha || null,
          cena_entregada_por: voluntario.cena_entregada_por || null,
          cena_punto: voluntario.cena_punto || null
        },
        patch: {
          cena_entregada: true,
          cena_estado: 'ENTREGADO_FINAL',
          cena_fecha: nowIso,
          cena_entregada_por: userName,
          cena_punto: puntoAlimentos || 'Comedor Principal / Almacén'
        }
      }
    };
    return specs[tipo];
  };

  const handleQuickAction = async (voluntario, tipo) => {
    const idKey = voluntario.dni || voluntario.id;
    if (!idKey) return;
    const actionKey = `${idKey}_${tipo}`;
    const spec = getQuickActionSpec(tipo, voluntario);
    if (!spec) return;

    setMarkingActionKey(actionKey);

    // Actualización optimista instantánea en UI
    setVisorRecords(prev => prev.map(item => {
      const match = (voluntario.dni && item.dni === voluntario.dni) || (item.id === voluntario.id);
      return match ? { ...item, ...spec.patch } : item;
    }));
    setStats(prev => ({ ...prev, [spec.statKey]: (prev[spec.statKey] || 0) + 1 }));
    setSessionUndoSnapshots(prev => ({ ...prev, [actionKey]: spec.snapshot }));
    playSound('success');

    try {
      await syncVolunteerPatch(voluntario, spec.patch);
    } catch (err) {
      console.error(`Error marcando ${tipo} rápido:`, err);
      alert('Ocurrió un error al guardar el registro en el servidor. Intenta nuevamente.');
      // Revertir optimismo
      setVisorRecords(prev => prev.map(item => {
        const match = (voluntario.dni && item.dni === voluntario.dni) || (item.id === voluntario.id);
        return match ? { ...item, ...spec.snapshot } : item;
      }));
      setStats(prev => ({ ...prev, [spec.statKey]: Math.max(0, (prev[spec.statKey] || 1) - 1) }));
      setSessionUndoSnapshots(prev => {
        const next = { ...prev };
        delete next[actionKey];
        return next;
      });
    } finally {
      setMarkingActionKey(null);
    }
  };

  const handleQuickUndo = async (voluntario, tipo) => {
    const idKey = voluntario.dni || voluntario.id;
    if (!idKey) return;
    const actionKey = `${idKey}_${tipo}`;
    const snapshot = sessionUndoSnapshots[actionKey];

    // Si no se marcó en esta sesión y es Admin, usar anulación oficial con confirmación
    if (!snapshot) {
      if (user?.rol !== 'admin') {
        alert('Solo los administradores o quien acaba de marcar el registro pueden anularlo.');
        return;
      }
      if (tipo === 'ASISTENCIA') return handleResetAttendance(voluntario);
      if (tipo === 'KIT') return handleResetKit(voluntario);
      if (tipo === 'DESAYUNO') return handleResetDesayuno(voluntario);
      if (tipo === 'CENA') return handleResetCena(voluntario);
      return;
    }

    const spec = getQuickActionSpec(tipo, voluntario);
    setMarkingActionKey(actionKey);

    // Restaurar exactamente el estado previo (incluyendo si estaba EN_CUSTODIA_RESPONSABLE)
    setVisorRecords(prev => prev.map(item => {
      const match = (voluntario.dni && item.dni === voluntario.dni) || (item.id === voluntario.id);
      return match ? { ...item, ...snapshot } : item;
    }));
    setStats(prev => ({ ...prev, [spec.statKey]: Math.max(0, (prev[spec.statKey] || 1) - 1) }));
    setSessionUndoSnapshots(prev => {
      const next = { ...prev };
      delete next[actionKey];
      return next;
    });

    try {
      await syncVolunteerPatch(voluntario, snapshot);
    } catch (err) {
      console.error(`Error revirtiendo ${tipo}:`, err);
      alert('No se pudo deshacer el cambio en el servidor.');
      await fetchVisorRecords();
    } finally {
      setMarkingActionKey(null);
    }
  };

  // ========================================================
  // DESPACHO EN BLOQUE A RESPONSABLES (MODO B)
  // ========================================================
  const computeTallas = (list) => list.reduce((acc, v) => {
    const t = (v.talla || 'Sin Talla').toUpperCase().trim();
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});

  const dispatchBatchTarget = async (targetList, patchData) => {
    const dnis = targetList.map(v => v.dni).filter(Boolean);
    const idsSinDniF2 = targetList.filter(v => !v.dni && v._origenTabla === 'voluntarios').map(v => v.id);
    const idsSinDniF1 = targetList.filter(v => !v.dni && v._origenTabla === 'voluntarios_general').map(v => v.id);

    const updatePromises = [];
    for (let i = 0; i < dnis.length; i += 100) {
      const chunk = dnis.slice(i, i + 100);
      updatePromises.push(supabase.from('voluntarios').update(patchData).in('dni', chunk));
      updatePromises.push(supabase.from('voluntarios_general').update(patchData).in('dni', chunk));
    }
    for (let i = 0; i < idsSinDniF2.length; i += 100) {
      updatePromises.push(supabase.from('voluntarios').update(patchData).in('id', idsSinDniF2.slice(i, i + 100)));
    }
    for (let i = 0; i < idsSinDniF1.length; i += 100) {
      updatePromises.push(supabase.from('voluntarios_general').update(patchData).in('id', idsSinDniF1.slice(i, i + 100)));
    }
    const results = await Promise.all(updatePromises);
    const err = results.find(r => r.error)?.error;
    if (err) throw err;
  };

  const handleSelectLeader = async (leaderName, preserveReceipt = false) => {
    setSelectedLeader(leaderName);
    if (!preserveReceipt) {
      setLoteReceipt(null);
    }
    if (!leaderName) {
      setLoteVoluntarios([]);
      setKitsCantidad(0);
      setDesayunosCantidad(0);
      setCenasCantidad(0);
      return;
    }

    setLoadingLote(true);
    setActionError(null);
    try {
      const firstWord = leaderName.split(' ')[0] || leaderName;
      const [{ data: f2Data, error: f2Err }, { data: f1Data, error: f1Err }] = await Promise.all([
        supabase.from('voluntarios')
          .select('id, dni, codigo, nombres_apellidos, talla, servicio, responsable_nombre, lugar_asignado, kit_entregado, kit_estado, kit_custodio_nombre, kit_fecha_despacho_lote, desayuno_entregado, desayuno_estado, desayuno_custodio_nombre, cena_entregada, cena_estado, cena_custodio_nombre, fase, estado')
          .ilike('responsable_nombre', `%${firstWord}%`),
        supabase.from('voluntarios_general')
          .select('id, dni, codigo, nombres_apellidos, talla, servicio, responsable_nombre, lugar_asignado, kit_entregado, kit_estado, kit_custodio_nombre, kit_fecha_despacho_lote, desayuno_entregado, desayuno_estado, desayuno_custodio_nombre, cena_entregada, cena_estado, cena_custodio_nombre, fase, estado')
          .ilike('responsable_nombre', `%${firstWord}%`)
      ]);

      if (f2Err) console.warn('Lote F2 error:', f2Err);
      if (f1Err) console.warn('Lote F1 error:', f1Err);

      const map = new Map();
      (f1Data || []).forEach(v => map.set(v.dni || v.id, { ...v, _origenTabla: 'voluntarios_general' }));
      (f2Data || []).forEach(v => map.set(v.dni || v.id, { ...v, _origenTabla: 'voluntarios' }));

      const list = Array.from(map.values());
      setLoteVoluntarios(list);

      // Inicializar cantidades por defecto al total pendiente de cada rubro
      setKitsCantidad(list.filter(v => !v.kit_entregado && v.kit_estado !== 'EN_CUSTODIA_RESPONSABLE').length);
      setDesayunosCantidad(list.filter(v => !v.desayuno_entregado && v.desayuno_estado !== 'EN_CUSTODIA_RESPONSABLE').length);
      setCenasCantidad(list.filter(v => !v.cena_entregada && v.cena_estado !== 'EN_CUSTODIA_RESPONSABLE').length);
    } catch (err) {
      console.error('Error cargando voluntarios del responsable:', err);
      setActionError('Error al consultar el lote de voluntarios del responsable seleccionado.');
    } finally {
      setLoadingLote(false);
    }
  };

  // Desglose de tallas del lote seleccionado
  const loteTallasBreakdown = computeTallas(loteVoluntarios);

  // Conteos de estado del lote seleccionado
  const loteKitsPending = loteVoluntarios.filter(v => !v.kit_entregado && v.kit_estado !== 'EN_CUSTODIA_RESPONSABLE');
  const loteKitsCustodia = loteVoluntarios.filter(v => v.kit_estado === 'EN_CUSTODIA_RESPONSABLE');
  const loteKitsDelivered = loteVoluntarios.filter(v => v.kit_entregado);

  const loteDesayunosPending = loteVoluntarios.filter(v => !v.desayuno_entregado && v.desayuno_estado !== 'EN_CUSTODIA_RESPONSABLE');
  const loteDesayunosCustodia = loteVoluntarios.filter(v => v.desayuno_estado === 'EN_CUSTODIA_RESPONSABLE');
  const loteDesayunosDelivered = loteVoluntarios.filter(v => v.desayuno_entregado);

  const loteCenasPending = loteVoluntarios.filter(v => !v.cena_entregada && v.cena_estado !== 'EN_CUSTODIA_RESPONSABLE');
  const loteCenasCustodia = loteVoluntarios.filter(v => v.cena_estado === 'EN_CUSTODIA_RESPONSABLE');
  const loteCenasDelivered = loteVoluntarios.filter(v => v.cena_entregada);

  // Cantidades efectivas respetando el candado máximo pendiente
  const effectiveKitsQty = despacharKitsCheck
    ? Math.min(loteKitsPending.length, Math.max(0, parseInt(kitsCantidad, 10) || 0))
    : 0;
  const effectiveDesayunosQty = despacharDesayunoCheck
    ? Math.min(loteDesayunosPending.length, Math.max(0, parseInt(desayunosCantidad, 10) || 0))
    : 0;
  const effectiveCenasQty = despacharCenaCheck
    ? Math.min(loteCenasPending.length, Math.max(0, parseInt(cenasCantidad, 10) || 0))
    : 0;

  const kitsTargetPreview = loteKitsPending.slice(0, effectiveKitsQty);
  const kitsTallasPreview = computeTallas(kitsTargetPreview);

  // Ejecutar el Despacho en Bloque (total o parcial por cantidad)
  const handleConfirmDespachoLote = async () => {
    if (!selectedLeader || loteVoluntarios.length === 0) return;

    const kitsTarget = loteKitsPending.slice(0, effectiveKitsQty);
    const desayunosTarget = loteDesayunosPending.slice(0, effectiveDesayunosQty);
    const cenasTarget = loteCenasPending.slice(0, effectiveCenasQty);

    if (kitsTarget.length === 0 && desayunosTarget.length === 0 && cenasTarget.length === 0) {
      alert('Debes seleccionar al menos un artículo y una cantidad mayor a 0 para despachar.');
      return;
    }

    const itemsToDispatchDesc = [];
    if (kitsTarget.length > 0) {
      const rest = loteKitsPending.length - kitsTarget.length;
      itemsToDispatchDesc.push(`${kitsTarget.length} Kits${rest > 0 ? ` (quedarán ${rest} pendientes)` : ' (lote completo)'}`);
    }
    if (desayunosTarget.length > 0) {
      const rest = loteDesayunosPending.length - desayunosTarget.length;
      itemsToDispatchDesc.push(`${desayunosTarget.length} Desayunos${rest > 0 ? ` (quedarán ${rest} pendientes)` : ' (lote completo)'}`);
    }
    if (cenasTarget.length > 0) {
      const rest = loteCenasPending.length - cenasTarget.length;
      itemsToDispatchDesc.push(`${cenasTarget.length} Cenas${rest > 0 ? ` (quedarán ${rest} pendientes)` : ' (lote completo)'}`);
    }

    const confirmMsg = `¿Confirmar DESPACHO EN BLOQUE al Responsable:\n\n👤 ${selectedLeader}?\n\nArtículos a entregar en este envío:\n• ${itemsToDispatchDesc.join('\n• ')}\n\n⚠️ Nota: Estos voluntarios quedarán marcados como "EN CUSTODIA DEL RESPONSABLE" y los restantes seguirán pendientes para próximos retiros.`;
    if (!window.confirm(confirmMsg)) return;

    setConfirmingLote(true);
    setActionError(null);

    try {
      const nowIso = new Date().toISOString();
      const validadorNombre = user?.nombre || 'Almacén Central';

      // 1. Despachar Kits seleccionados
      if (kitsTarget.length > 0) {
        await dispatchBatchTarget(kitsTarget, {
          kit_estado: 'EN_CUSTODIA_RESPONSABLE',
          kit_custodio_nombre: selectedLeader,
          kit_fecha_despacho_lote: nowIso,
          kit_entregado_por: validadorNombre
        });
      }

      // 2. Despachar Desayunos seleccionados
      if (desayunosTarget.length > 0) {
        await dispatchBatchTarget(desayunosTarget, {
          desayuno_estado: 'EN_CUSTODIA_RESPONSABLE',
          desayuno_custodio_nombre: selectedLeader,
          desayuno_fecha: nowIso,
          desayuno_entregado_por: validadorNombre,
          desayuno_punto: puntoAlimentos
        });
      }

      // 3. Despachar Cenas seleccionadas
      if (cenasTarget.length > 0) {
        await dispatchBatchTarget(cenasTarget, {
          cena_estado: 'EN_CUSTODIA_RESPONSABLE',
          cena_custodio_nombre: selectedLeader,
          cena_fecha: nowIso,
          cena_entregada_por: validadorNombre,
          cena_punto: puntoAlimentos
        });
      }

      playSound('success');

      // Voluntarios amarrados a este comprobante específico (parcial o total)
      const receiptVolMap = new Map();
      [...kitsTarget, ...desayunosTarget, ...cenasTarget].forEach(v => {
        receiptVolMap.set(v.dni || v.id, v);
      });
      const receiptVolList = Array.from(receiptVolMap.values());
      const receiptTallas = kitsTarget.length > 0 ? computeTallas(kitsTarget) : computeTallas(receiptVolList);

      // Generar Comprobante de Despacho Oficial
      const receiptData = {
        folio: `LOTE-${Date.now().toString().slice(-6)}`,
        responsable: selectedLeader,
        despachadoPor: validadorNombre,
        fechaHora: new Date().toLocaleString(),
        totalAsignados: loteVoluntarios.length,
        kitsDespachados: kitsTarget.length,
        desayunosDespachados: desayunosTarget.length,
        cenasDespachadas: cenasTarget.length,
        tallas: receiptTallas,
        voluntarios: receiptVolList.map(v => ({
          dni: v.dni,
          nombre: v.nombres_apellidos,
          talla: v.talla || 'Estándar',
          codigo: v.codigo
        }))
      };

      setLoteReceipt(receiptData);

      // Recargar lista del líder manteniendo el comprobante visible
      await handleSelectLeader(selectedLeader, true);
      await fetchStats();
      await fetchVisorRecords();
    } catch (err) {
      console.error('Error en despacho en bloque:', err);
      setActionError('Ocurrió un error al procesar el despacho en bloque.');
    } finally {
      setConfirmingLote(false);
    }
  };

  // Reset para siguiente escaneo individual
  const handleNextVolunteer = () => {
    setScannedVoluntario(null);
    setActionError(null);
    setActionSuccessMsg(null);
    setJustConfirmed(null);
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
    if (visorFilter === 'PENDING_ASISTENCIA' && item.asistencia_dia_d) return false;
    if (visorFilter === 'KITS' && !item.kit_entregado && item.kit_estado !== 'EN_CUSTODIA_RESPONSABLE') return false;
    if (visorFilter === 'ASISTENCIA' && !item.asistencia_dia_d) return false;
    if (visorFilter === 'DESAYUNO' && !item.desayuno_entregado && item.desayuno_estado !== 'EN_CUSTODIA_RESPONSABLE') return false;
    if (visorFilter === 'CENA' && !item.cena_entregada && item.cena_estado !== 'EN_CUSTODIA_RESPONSABLE') return false;

    if (visorSearch.trim()) {
      const term = visorSearch.toLowerCase().trim();
      const matchName = item.nombres_apellidos?.toLowerCase().includes(term);
      const matchDni = item.dni?.includes(term);
      const matchCodigo = item.codigo?.toLowerCase().includes(term);
      const matchResp = item.responsable_nombre?.toLowerCase().includes(term);
      const matchCust = (item.kit_custodio_nombre || '').toLowerCase().includes(term) || (item.desayuno_custodio_nombre || '').toLowerCase().includes(term);
      const matchVal = (item.kit_entregado_por || '').toLowerCase().includes(term) || (item.asistencia_registrada_por || '').toLowerCase().includes(term);
      return matchName || matchDni || matchCodigo || matchResp || matchCust || matchVal;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col font-sans selection:bg-amber-200">
      
      {/* Header Estilo Franciscano / Diocesano */}
      <header className="bg-diocesis-redDark text-white shadow-md border-b-4 border-diocesis-mustard sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 text-diocesis-mustard">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-diocesis-mustard block">
                Módulo Oficial de Validación y Logística
              </span>
              <h1 className="text-base sm:text-lg font-bold font-title leading-tight">
                Control de Campo • Visita Papal 2026
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-white leading-tight">{user?.nombre || 'Validador Oficial'}</span>
              <span className="text-[10px] text-diocesis-mustard uppercase font-extrabold">
                {user?.rol === 'admin' ? '🛡️ Administrador' :
                 user?.rol === 'responsable' ? '👑 Responsable General' :
                 user?.rol === 'lider' ? '⭐ Líder de Sector' :
                 user?.rol === 'guia' ? '🚩 Guía de Cuadrilla' :
                 '🔍 Validador Acreditado'}
              </span>
            </div>

            {(user?.rol === 'admin' || user?.rol === 'responsable' || user?.rol === 'lider' || user?.rol === 'guia') && (
              <Link
                to="/dashboard"
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-stone-200 transition"
                title="Volver a mi panel de gestión"
              >
                Volver a Mi Panel
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

      {/* Selector de Modo de Operación (6 Módulos Oficiales) */}
      <div className="bg-white border-b border-stone-200 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between flex-wrap gap-2">
          
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* 1. Asistencia */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('asistencia');
                setScannedVoluntario(null);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeTab === 'asistencia'
                  ? 'bg-blue-100 text-blue-950 border border-blue-300 shadow-2xs'
                  : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              <ClipboardCheck className="w-4 h-4 text-blue-700" />
              <span>1. Asistencia</span>
            </button>

            {/* 2. Kits */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('kits');
                setScannedVoluntario(null);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeTab === 'kits'
                  ? 'bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs'
                  : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              <PackageCheck className="w-4 h-4 text-amber-700" />
              <span>2. Kits & Polos</span>
            </button>

            {/* 3. Desayuno */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('desayuno');
                setScannedVoluntario(null);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeTab === 'desayuno'
                  ? 'bg-orange-100 text-orange-950 border border-orange-300 shadow-2xs'
                  : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              <Coffee className="w-4 h-4 text-orange-700" />
              <span>3. Desayuno</span>
            </button>

            {/* 4. Cena */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('cena');
                setScannedVoluntario(null);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeTab === 'cena'
                  ? 'bg-emerald-100 text-emerald-950 border border-emerald-300 shadow-2xs'
                  : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              <Utensils className="w-4 h-4 text-emerald-700" />
              <span>4. Cena</span>
            </button>

            {/* 5. Despacho en Bloque (Exclusivo Administrador y Validador de Almacén) */}
            {(user?.rol === 'admin' || user?.rol === 'validador') && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('despacho_lote');
                  setScannedVoluntario(null);
                  stopCamera();
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                  activeTab === 'despacho_lote'
                    ? 'bg-indigo-100 text-indigo-950 border border-indigo-300 shadow-2xs'
                    : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                <Boxes className="w-4 h-4 text-indigo-700" />
                <span>5. Despacho en Bloque</span>
              </button>
            )}

            {/* Visor en Vivo / Visor de Sector */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('visor');
                setScannedVoluntario(null);
                stopCamera();
                fetchVisorRecords();
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeTab === 'visor'
                  ? 'bg-purple-100 text-purple-950 border border-purple-300 shadow-2xs'
                  : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              <Eye className="w-4 h-4 text-purple-700" />
              <span>
                {user?.rol === 'responsable' 
                  ? '5. Visor de Mi Sector' 
                  : (user?.rol === 'lider' || user?.rol === 'guia')
                  ? '5. Visor de Mi Grupo'
                  : '6. Visor en Vivo'}
              </span>
              {visorRecords.length > 0 && (
                <span className="bg-purple-200 text-purple-950 px-1.5 py-0.2 rounded-full text-[10px] font-black">
                  {visorRecords.length}
                </span>
              )}
            </button>
          </div>

          {/* Métricas Rápidas Interactivas */}
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-stone-600 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setActiveTab('visor');
                setVisorFilter('ASISTENCIA');
                stopCamera();
                fetchVisorRecords();
              }}
              className="flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-xl border border-blue-200 text-blue-900 transition cursor-pointer"
              title="Ver asistencias en el Visor"
            >
              📋 Asist: <strong className="text-blue-950">{stats.asistenciaHoy}</strong>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('visor');
                setVisorFilter('KITS');
                stopCamera();
                fetchVisorRecords();
              }}
              className="flex items-center gap-1 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-xl border border-amber-200 text-amber-900 transition cursor-pointer"
              title="Ver kits en el Visor"
            >
              🎁 Kits: <strong className="text-amber-950">{stats.kitsHoy}</strong>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('visor');
                setVisorFilter('DESAYUNO');
                stopCamera();
                fetchVisorRecords();
              }}
              className="flex items-center gap-1 bg-orange-50 hover:bg-orange-100 px-2.5 py-1 rounded-xl border border-orange-200 text-orange-900 transition cursor-pointer"
              title="Ver desayunos en el Visor"
            >
              ☕ Desay: <strong className="text-orange-950">{stats.desayunoHoy}</strong>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('visor');
                setVisorFilter('CENA');
                stopCamera();
                fetchVisorRecords();
              }}
              className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-xl border border-emerald-200 text-emerald-950 transition cursor-pointer"
              title="Ver cenas en el Visor"
            >
              🍽️ Cenas: <strong className="text-emerald-950">{stats.cenaHoy}</strong>
            </button>
          </div>

        </div>
      </div>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {/* ======================================================== */}
        {/* PESTAÑA 5: DESPACHO EN BLOQUE A RESPONSABLES            */}
        {/* ======================================================== */}
        {activeTab === 'despacho_lote' ? (
          <div className="space-y-6 animate-in fade-in duration-150">
            
            {/* Header del Despacho en Bloque */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-800 flex items-center justify-center border border-indigo-200 shadow-2xs">
                  <Boxes className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold font-title text-stone-900 leading-tight">
                    Despacho en Bloque a Responsables • Almacén Central
                  </h2>
                  <p className="text-xs text-stone-500">
                    Entrega lotes completos de kits o raciones a los Líderes con trazabilidad y candado anti-fraude.
                  </p>
                </div>
              </div>

              <div className="px-3.5 py-2 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-2xl text-xs font-bold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Control de Custodia Estricto</span>
              </div>
            </div>

            {/* Selector de Responsable y Panel de Control */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-sm space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div className="md:col-span-8 space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                    Seleccionar Responsable / Líder de Cuadrilla:
                  </label>
                  <select
                    value={selectedLeader}
                    onChange={(e) => handleSelectLeader(e.target.value)}
                    className="w-full py-3 px-3.5 bg-stone-50 border border-stone-300 rounded-2xl text-sm font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-diocesis-mustard cursor-pointer"
                  >
                    <option value="">-- Elige un responsable general ({lideresList.length} registrados) --</option>
                    {lideresList.map((lid, idx) => (
                      <option key={idx} value={lid.nombre}>
                        👤 {lid.nombre} {lid.dni ? `(DNI: ${lid.dni})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectLeader(selectedLeader)}
                    disabled={!selectedLeader || loadingLote}
                    className="w-full py-3 px-4 bg-stone-900 hover:bg-black text-white text-xs font-bold rounded-2xl transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingLote ? 'animate-spin' : ''}`} />
                    <span>Recargar Lote</span>
                  </button>
                </div>
              </div>

              {/* Mensajes de error */}
              {actionError && (
                <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-2xl text-xs text-rose-900 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              {/* Estado de Carga */}
              {loadingLote && (
                <div className="p-8 text-center space-y-2">
                  <RefreshCw className="w-7 h-7 animate-spin text-indigo-600 mx-auto" />
                  <p className="text-xs font-bold text-stone-600">Consultando asignaciones del responsable...</p>
                </div>
              )}

              {/* Contenido cuando el líder está seleccionado */}
              {!loadingLote && selectedLeader && (
                <div className="space-y-6 pt-3 border-t border-stone-100">
                  
                  {/* Tarjetas de Resumen del Grupo */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200">
                      <span className="text-[10px] uppercase font-bold text-stone-500 block">Total Voluntarios</span>
                      <span className="text-2xl font-black font-mono text-stone-900">{loteVoluntarios.length}</span>
                    </div>

                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200">
                      <span className="text-[10px] uppercase font-bold text-amber-700 block">Kits Pendientes</span>
                      <span className="text-2xl font-black font-mono text-amber-950">{loteKitsPending.length}</span>
                      <span className="text-[10px] text-amber-800 block">
                        ({loteKitsCustodia.length} en custodia • {loteKitsDelivered.length} entregados)
                      </span>
                    </div>

                    <div className="p-4 bg-orange-50 rounded-2xl border border-orange-200">
                      <span className="text-[10px] uppercase font-bold text-orange-700 block">Desayunos Pend.</span>
                      <span className="text-2xl font-black font-mono text-orange-950">{loteDesayunosPending.length}</span>
                      <span className="text-[10px] text-orange-800 block">
                        ({loteDesayunosCustodia.length} en custodia • {loteDesayunosDelivered.length} entregados)
                      </span>
                    </div>

                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
                      <span className="text-[10px] uppercase font-bold text-emerald-700 block">Cenas Pendientes</span>
                      <span className="text-2xl font-black font-mono text-emerald-950">{loteCenasPending.length}</span>
                      <span className="text-[10px] text-emerald-800 block">
                        ({loteCenasCustodia.length} en custodia • {loteCenasDelivered.length} entregados)
                      </span>
                    </div>
                  </div>

                  {/* Desglose de Tallas de Polos */}
                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                        <Shirt className="w-4 h-4 text-amber-600" />
                        Desglose de Prendas Textiles por Talla en este Lote:
                      </span>
                      <span className="text-xs text-stone-500 font-mono">
                        Total prendas requeridas: <strong>{loteVoluntarios.length}</strong>
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {Object.entries(loteTallasBreakdown).map(([talla, count]) => (
                        <div 
                          key={talla}
                          className="px-3.5 py-1.5 bg-white border border-stone-300 rounded-xl text-xs font-mono flex items-center gap-2 shadow-2xs"
                        >
                          <span className="font-bold text-stone-500">Talla {talla}:</span>
                          <span className="text-sm font-black text-stone-900 bg-amber-100 px-2 py-0.5 rounded text-amber-950">
                            {count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Panel de Ejecución del Despacho */}
                  <div className="p-5 bg-indigo-50/80 rounded-2xl border-2 border-indigo-200 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
                          <Truck className="w-4 h-4 text-indigo-700" />
                          Seleccionar Artículos para Despacho Masivo:
                        </h4>
                        <p className="text-xs text-indigo-800 mt-0.5">
                          Marca los artículos que vas a entregar físicamente en este momento a <strong>{selectedLeader}</strong>.
                        </p>
                      </div>
                      <span className="px-2.5 py-1 bg-indigo-200/70 text-indigo-950 rounded-lg text-[10px] font-black uppercase">
                        Candado Anti-Exceso Activo
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        {
                          id: 'kits',
                          label: '🎁 Kits & Polos',
                          checked: despacharKitsCheck,
                          setChecked: setDespacharKitsCheck,
                          pendingCount: loteKitsPending.length,
                          qty: kitsCantidad,
                          setQty: setKitsCantidad,
                          effectiveQty: effectiveKitsQty,
                          activeBorder: 'border-amber-400'
                        },
                        {
                          id: 'desayunos',
                          label: '☕ Raciones Desayuno',
                          checked: despacharDesayunoCheck,
                          setChecked: setDespacharDesayunoCheck,
                          pendingCount: loteDesayunosPending.length,
                          qty: desayunosCantidad,
                          setQty: setDesayunosCantidad,
                          effectiveQty: effectiveDesayunosQty,
                          activeBorder: 'border-orange-400'
                        },
                        {
                          id: 'cenas',
                          label: '🍽️ Raciones Cena',
                          checked: despacharCenaCheck,
                          setChecked: setDespacharCenaCheck,
                          pendingCount: loteCenasPending.length,
                          qty: cenasCantidad,
                          setQty: setCenasCantidad,
                          effectiveQty: effectiveCenasQty,
                          activeBorder: 'border-emerald-400'
                        }
                      ].map(opt => (
                        <div
                          key={opt.id}
                          className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2.5 transition ${
                            opt.checked && opt.pendingCount > 0
                              ? `bg-white ${opt.activeBorder} shadow-xs`
                              : 'bg-white/60 border-stone-200 opacity-80'
                          }`}
                        >
                          <label className="flex items-start gap-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={opt.checked}
                              onChange={(e) => opt.setChecked(e.target.checked)}
                              disabled={opt.pendingCount === 0}
                              className="w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <div className="text-xs flex-1 min-w-0">
                              <span className="font-bold text-stone-900 block">{opt.label}</span>
                              <span className="text-stone-500 block">
                                {opt.pendingCount > 0
                                  ? `${opt.pendingCount} pendientes en total`
                                  : '✅ Ya despachados'}
                              </span>
                            </div>
                          </label>

                          {opt.checked && opt.pendingCount > 0 && (
                            <div className="pt-2 border-t border-stone-100 space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-bold text-stone-700">Cantidad ahora:</span>
                                <button
                                  type="button"
                                  onClick={() => opt.setQty(opt.pendingCount)}
                                  className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded border border-indigo-200 transition cursor-pointer"
                                  title="Seleccionar todo el restante pendiente"
                                >
                                  Todo ({opt.pendingCount})
                                </button>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={1}
                                  max={opt.pendingCount}
                                  value={opt.qty}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    if (raw === '') {
                                      opt.setQty('');
                                    } else {
                                      const parsed = Math.max(0, Math.min(opt.pendingCount, parseInt(raw, 10) || 0));
                                      opt.setQty(parsed);
                                    }
                                  }}
                                  onBlur={() => {
                                    if (opt.qty === '' || Number(opt.qty) < 1) {
                                      opt.setQty(Math.min(1, opt.pendingCount));
                                    }
                                  }}
                                  className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-sm font-black font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <span className="text-[11px] font-mono text-stone-500 shrink-0">
                                  / {opt.pendingCount}
                                </span>
                              </div>
                              <span className="text-[10px] text-indigo-700 font-semibold block">
                                {opt.pendingCount - opt.effectiveQty > 0
                                  ? `Quedarán ${opt.pendingCount - opt.effectiveQty} pendientes para después`
                                  : 'Se despachará el 100% pendiente'}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Vista previa de tallas exactas cuando es despacho parcial de Kits */}
                    {despacharKitsCheck && effectiveKitsQty > 0 && effectiveKitsQty < loteKitsPending.length && (
                      <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl space-y-1.5">
                        <span className="text-[11px] font-bold text-amber-950 block">
                          👕 Tallas sugeridas para estos {effectiveKitsQty} Kits que vas a despachar ahora:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(kitsTallasPreview).map(([talla, count]) => (
                            <span
                              key={talla}
                              className="px-2 py-0.5 bg-white border border-amber-200 rounded-lg text-[11px] font-mono text-amber-950"
                            >
                              {talla}: <strong>{count}</strong>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={confirmingLote || (effectiveKitsQty === 0 && effectiveDesayunosQty === 0 && effectiveCenasQty === 0)}
                      onClick={handleConfirmDespachoLote}
                      className="w-full py-4 px-6 bg-indigo-700 hover:bg-indigo-800 active:bg-indigo-900 text-white rounded-2xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer"
                    >
                      {confirmingLote ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          <span>Procesando entrega y actualizando custodia...</span>
                        </>
                      ) : (
                        <>
                          <Boxes className="w-5 h-5 text-indigo-200" />
                          <span>
                            Confirmar Despacho a {selectedLeader}
                            {(effectiveKitsQty + effectiveDesayunosQty + effectiveCenasQty) > 0 && (
                              ` (${[
                                effectiveKitsQty > 0 ? `${effectiveKitsQty} Kits` : '',
                                effectiveDesayunosQty > 0 ? `${effectiveDesayunosQty} Des.` : '',
                                effectiveCenasQty > 0 ? `${effectiveCenasQty} Cen.` : ''
                              ].filter(Boolean).join(' • ')})`
                            )}
                          </span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Comprobante de Despacho Digital si se completó */}
                  {loteReceipt && (
                    <div className="p-6 bg-white rounded-3xl border-2 border-emerald-400 shadow-xl space-y-4 animate-in zoom-in-95 duration-200">
                      <div className="flex items-start justify-between border-b pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                            <FileCheck className="w-7 h-7" />
                          </div>
                          <div>
                            <span className="text-[10px] font-mono uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-black">
                              COMPROBANTE OFICIAL • {loteReceipt.folio}
                            </span>
                            <h3 className="text-lg font-bold font-title text-stone-900 leading-tight">
                              Acta de Entrega y Cadena de Custodia
                            </h3>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => window.print()}
                          className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Printer className="w-4 h-4" />
                          <span>Imprimir Acta</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 bg-stone-50 rounded-xl space-y-1">
                          <span className="text-stone-500 block">Responsable Receptor:</span>
                          <span className="font-bold text-stone-900 text-sm block">👤 {loteReceipt.responsable}</span>
                          <span className="text-[11px] text-stone-500">
                            Entregado por: <strong>{loteReceipt.despachadoPor}</strong> • {loteReceipt.fechaHora}
                          </span>
                        </div>

                        <div className="p-3 bg-stone-50 rounded-xl space-y-1">
                          <span className="text-stone-500 block">Cantidades Despachadas en este Lote:</span>
                          <div className="flex flex-wrap gap-2 text-xs font-bold pt-0.5">
                            {loteReceipt.kitsDespachados > 0 && (
                              <span className="bg-amber-100 text-amber-950 px-2 py-0.5 rounded border border-amber-300">
                                🎁 {loteReceipt.kitsDespachados} Kits
                              </span>
                            )}
                            {loteReceipt.desayunosDespachados > 0 && (
                              <span className="bg-orange-100 text-orange-950 px-2 py-0.5 rounded border border-orange-300">
                                ☕ {loteReceipt.desayunosDespachados} Desayunos
                              </span>
                            )}
                            {loteReceipt.cenasDespachadas > 0 && (
                              <span className="bg-emerald-100 text-emerald-950 px-2 py-0.5 rounded border border-emerald-300">
                                🍽️ {loteReceipt.cenasDespachadas} Cenas
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Lista Nominativa de Voluntarios Incluidos */}
                      <details className="text-xs bg-stone-50 rounded-xl p-3 border border-stone-200">
                        <summary className="font-bold text-stone-800 cursor-pointer">
                          Ver lista nominal de los {loteReceipt.voluntarios.length} voluntarios amarrados a este lote
                        </summary>
                        <div className="mt-3 max-h-56 overflow-y-auto space-y-1 divide-y divide-stone-200">
                          {loteReceipt.voluntarios.map((vol, i) => (
                            <div key={i} className="pt-1.5 flex items-center justify-between text-[11px]">
                              <span><strong>{i + 1}.</strong> {vol.nombre}</span>
                              <span className="font-mono text-stone-500">DNI: {vol.dni} • Talla: <strong>{vol.talla}</strong></span>
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  )}

                  {/* Lista de Voluntarios del Grupo con Estado Actual */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600">
                      Padrón del Grupo Asignado ({loteVoluntarios.length} voluntarios):
                    </h4>
                    <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
                      {loteVoluntarios.map((v, i) => (
                        <div 
                          key={v.id || i}
                          className="p-2.5 bg-white rounded-xl border border-stone-200 flex items-center justify-between gap-3 text-xs shadow-2xs"
                        >
                          <div className="min-w-0">
                            <span className="font-bold text-stone-900 block truncate">
                              {i + 1}. {v.nombres_apellidos}
                            </span>
                            <span className="text-[11px] text-stone-500 font-mono">
                              DNI: <strong>{v.dni}</strong> • Talla: <strong>{v.talla || 'L'}</strong>
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                            {/* Estado Kit */}
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              v.kit_entregado 
                                ? 'bg-emerald-100 text-emerald-950 border border-emerald-300' 
                                : v.kit_estado === 'EN_CUSTODIA_RESPONSABLE'
                                ? 'bg-amber-100 text-amber-950 border border-amber-300'
                                : 'bg-stone-100 text-stone-600'
                            }`}>
                              🎁 Kit: {v.kit_entregado ? 'Entregado' : v.kit_estado === 'EN_CUSTODIA_RESPONSABLE' ? 'En Custodia' : 'Pendiente'}
                            </span>

                            {/* Estado Desayuno */}
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              v.desayuno_entregado 
                                ? 'bg-orange-100 text-orange-950 border border-orange-300' 
                                : v.desayuno_estado === 'EN_CUSTODIA_RESPONSABLE'
                                ? 'bg-amber-100 text-amber-950 border border-amber-300'
                                : 'bg-stone-100 text-stone-600'
                            }`}>
                              ☕ Des: {v.desayuno_entregado ? 'Entregado' : v.desayuno_estado === 'EN_CUSTODIA_RESPONSABLE' ? 'En Custodia' : 'Pendiente'}
                            </span>

                            {/* Estado Cena */}
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              v.cena_entregada 
                                ? 'bg-emerald-100 text-emerald-950 border border-emerald-300' 
                                : v.cena_estado === 'EN_CUSTODIA_RESPONSABLE'
                                ? 'bg-amber-100 text-amber-950 border border-amber-300'
                                : 'bg-stone-100 text-stone-600'
                            }`}>
                              🍽️ Cen: {v.cena_entregada ? 'Entregada' : v.cena_estado === 'EN_CUSTODIA_RESPONSABLE' ? 'En Custodia' : 'Pendiente'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

            </div>

          </div>
        ) : activeTab === 'visor' ? (
          /* ======================================================== */
          /* PESTAÑA 6: VISOR EN VIVO DE ENTREGAS Y ASISTENCIAS      */
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
                      {user?.rol === 'responsable' 
                        ? `Padrón en Vivo • Sector: ${user?.responsable_nombre || user?.nombre || 'Mi Sector'}` 
                        : (user?.rol === 'lider' || user?.rol === 'guia')
                        ? `Padrón en Vivo • ${user?.nombre}`
                        : 'Padrón en Vivo • Entregas, Alimentos y Asistencia'}
                    </h2>
                    <p className="text-xs text-stone-500">
                      {user?.rol === 'responsable'
                        ? 'Visualiza en tiempo real los kits, alimentos y asistencias de los voluntarios asignados a tu sector.'
                        : (user?.rol === 'lider' || user?.rol === 'guia')
                        ? 'Visualiza en tiempo real las entregas de tu grupo asignado.'
                        : 'Visualiza en tiempo real los kits, desayunos, cenas y asistencias registradas.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {user?.rol === 'admin' ? (
                  <span className="px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                    <ShieldCheck className="w-4 h-4 text-rose-600" />
                    <span>Modo Administrador (Control Total y Anulación)</span>
                  </span>
                ) : (
                  <span className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-xs font-bold flex items-center gap-1.5">
                    <ClipboardCheck className="w-4 h-4 text-blue-600" />
                    <span>Control Rápido a 1 Clic</span>
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
              {/* Fila 1: Búsqueda amplia y Selectores de Punto / Sector */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
                {/* Input de Búsqueda */}
                <div className="relative flex-1 min-w-0">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    value={visorSearch}
                    onChange={(e) => setVisorSearch(e.target.value)}
                    placeholder="Buscar por nombre, DNI, código, responsable o validador..."
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

                {/* Selectores rápidos al marcar */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-[10px] font-bold text-stone-500">Punto:</span>
                    <select
                      value={puntoAsistencia}
                      onChange={(e) => setPuntoAsistencia(e.target.value)}
                      className="py-1.5 px-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-diocesis-mustard"
                    >
                      <option value="Punto Principal">📍 Puerta Principal</option>
                      <option value="Lista en Campo / Cuadrilla">📱 Lista en Campo</option>
                      <option value="Capacitación General">🎓 Capacitación USAT</option>
                      <option value="Sede Santuario">⛪ Sede Santuario</option>
                      <option value="Sede Zaña">📍 Sede Zaña</option>
                      <option value="Sede Santa Cruz">📍 Sede Santa Cruz</option>
                      <option value="Punto de Resguardo">🛡️ Resguardo</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-[10px] font-bold text-stone-500">Comedor:</span>
                    <select
                      value={puntoAlimentos}
                      onChange={(e) => setPuntoAlimentos(e.target.value)}
                      className="py-1.5 px-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-diocesis-mustard"
                    >
                      <option value="Comedor Principal / Almacén">🍽️ Comedor Principal</option>
                      <option value="Comedor Sector Santuario">⛪ Sector Santuario</option>
                      <option value="Comedor USAT">🎓 Comedor USAT</option>
                      <option value="Punto Móvil Cuadrillas">🚚 Cuadrillas</option>
                    </select>
                  </div>

                  {/* Filtro por Responsable para Administrador / Validador General */}
                  {(!user || user.rol === 'admin' || user.rol === 'validador') && (
                    <select
                      value={selectedVisorLeader}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedVisorLeader(val);
                        fetchVisorRecords(val);
                      }}
                      className="py-1.5 px-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-diocesis-mustard max-w-[200px] truncate"
                      title="Filtrar padrón completo por Responsable"
                    >
                      <option value="">👤 Todos los Sectores (Con Actividad)</option>
                      {lideresList.map(l => (
                        <option key={l.dni || l.nombre} value={l.nombre}>
                          👤 {l.nombre}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Fila 2: Filtros Tipo Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 flex-wrap">
                <button
                  type="button"
                  onClick={() => setVisorFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                    visorFilter === 'ALL'
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  Todos ({visorRecords.length})
                </button>

                <button
                  type="button"
                  onClick={() => setVisorFilter('PENDING_ASISTENCIA')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                    visorFilter === 'PENDING_ASISTENCIA'
                      ? 'bg-rose-700 text-white shadow-xs'
                      : 'bg-rose-50 text-rose-900 hover:bg-rose-100 border border-rose-200'
                  }`}
                >
                  ⏳ Sin Asistencia ({visorRecords.filter(r => !r.asistencia_dia_d).length})
                </button>

                <button
                  type="button"
                  onClick={() => setVisorFilter('ASISTENCIA')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                    visorFilter === 'ASISTENCIA'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-blue-50 text-blue-900 hover:bg-blue-100 border border-blue-200'
                  }`}
                >
                  📋 Asistencias ({visorRecords.filter(r => r.asistencia_dia_d).length})
                </button>

                <button
                  type="button"
                  onClick={() => setVisorFilter('KITS')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                    visorFilter === 'KITS'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
                  }`}
                >
                  🎁 Kits ({visorRecords.filter(r => r.kit_entregado || r.kit_estado === 'EN_CUSTODIA_RESPONSABLE').length})
                </button>

                <button
                  type="button"
                  onClick={() => setVisorFilter('DESAYUNO')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                    visorFilter === 'DESAYUNO'
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'bg-orange-50 text-orange-900 hover:bg-orange-100 border border-orange-200'
                  }`}
                >
                  ☕ Desayunos ({visorRecords.filter(r => r.desayuno_entregado || r.desayuno_estado === 'EN_CUSTODIA_RESPONSABLE').length})
                </button>

                <button
                  type="button"
                  onClick={() => setVisorFilter('CENA')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                    visorFilter === 'CENA'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  🍽️ Cenas ({visorRecords.filter(r => r.cena_entregada || r.cena_estado === 'EN_CUSTODIA_RESPONSABLE').length})
                </button>
              </div>

              {/* Conteo filtrado */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-stone-500 pt-1 border-t border-stone-100 gap-1">
                <span>
                  Mostrando <strong>{filteredVisorRecords.length}</strong> de <strong>{visorRecords.length}</strong> voluntario(s) {(user?.rol === 'responsable' || user?.rol === 'lider' || user?.rol === 'guia' || selectedVisorLeader) ? 'asignados a este sector' : 'con actividad registrada'}.
                </span>
                {user?.rol === 'admin' && (
                  <span className="text-[11px] text-rose-700 font-semibold">
                    💡 Como Administrador puedes anular registros erróneos usando el botón "Anular".
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
                    ? 'Regresa a las pestañas de escaneo o despacho en bloque para registrar la primera entrega.'
                    : 'Prueba cambiando el término de búsqueda o seleccionando "Todos".'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredVisorRecords.map((item) => {
                  const idKey = item.dni || item.id;
                  return (
                  <div
                    key={idKey}
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

                    {/* Fila Cuádruple: Asistencia, Kit, Desayuno, Cena */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-2 border-t border-stone-100 text-xs">
                      
                      {/* 1. Asistencia */}
                      <div className={`p-2.5 rounded-xl border flex flex-col justify-between gap-1.5 transition-colors ${
                        item.asistencia_dia_d 
                          ? 'bg-blue-50/70 border-blue-200 text-blue-950'
                          : 'bg-stone-50 border-stone-200 text-stone-700'
                      }`}>
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold block truncate">
                              {item.asistencia_dia_d ? '📋 Asistencia OK' : '⚪ Asist. No Marcada'}
                            </span>
                            {markingActionKey === `${idKey}_ASISTENCIA` && (
                              <RefreshCw className="w-3 h-3 animate-spin text-blue-600 shrink-0" />
                            )}
                          </div>
                          {item.asistencia_dia_d && (
                            <span className="text-[10px] text-stone-600 block truncate">
                              {item.asistencia_punto || 'Punto Oficial'} • {item.asistencia_fecha ? new Date(item.asistencia_fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          )}
                        </div>

                        {!item.asistencia_dia_d ? (
                          <button
                            type="button"
                            disabled={markingActionKey === `${idKey}_ASISTENCIA`}
                            onClick={() => handleQuickAction(item, 'ASISTENCIA')}
                            className="w-full mt-1 py-1.5 px-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                            title="Haz clic para marcar asistencia inmediatamente"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Marcar Asistencia</span>
                          </button>
                        ) : (
                          (user?.rol === 'admin' || sessionUndoSnapshots[`${idKey}_ASISTENCIA`]) && (
                            <button
                              type="button"
                              disabled={savingAction || markingActionKey === `${idKey}_ASISTENCIA`}
                              onClick={() => handleQuickUndo(item, 'ASISTENCIA')}
                              className="px-2 py-0.5 text-[10px] font-bold bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 rounded flex items-center gap-1 self-start transition cursor-pointer shadow-2xs disabled:opacity-50 mt-1"
                              title={sessionUndoSnapshots[`${idKey}_ASISTENCIA`] ? 'Deshacer marca recién hecha' : 'Anular asistencia'}
                            >
                              <RotateCcw className="w-2.5 h-2.5" />
                              <span>{sessionUndoSnapshots[`${idKey}_ASISTENCIA`] ? 'Deshacer' : 'Anular'}</span>
                            </button>
                          )
                        )}
                      </div>

                      {/* 2. Kit & Polo */}
                      <div className={`p-2.5 rounded-xl border flex flex-col justify-between gap-1.5 transition-colors ${
                        item.kit_entregado 
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                          : item.kit_estado === 'EN_CUSTODIA_RESPONSABLE'
                          ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                          : 'bg-stone-50 border-stone-200 text-stone-700'
                      }`}>
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold block truncate">
                              {item.kit_entregado 
                                ? '🎁 Kit Entregado' 
                                : item.kit_estado === 'EN_CUSTODIA_RESPONSABLE'
                                ? '📦 En Custodia Líder'
                                : '⚪ Kit Pendiente'}
                            </span>
                            {markingActionKey === `${idKey}_KIT` && (
                              <RefreshCw className="w-3 h-3 animate-spin text-emerald-600 shrink-0" />
                            )}
                          </div>
                          {item.kit_entregado && (
                            <span className="text-[10px] text-stone-600 block truncate">
                              {item.kit_items_entregados || 'Kit Oficial'} • {item.kit_fecha_entrega ? new Date(item.kit_fecha_entrega).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          )}
                          {!item.kit_entregado && item.kit_estado === 'EN_CUSTODIA_RESPONSABLE' && (
                            <span className="text-[10px] text-amber-800 block truncate">
                              Custodio: <strong>{item.kit_custodio_nombre}</strong>
                            </span>
                          )}
                        </div>

                        {!item.kit_entregado ? (
                          <div className="flex flex-col gap-1 mt-1">
                            <button
                              type="button"
                              disabled={markingActionKey === `${idKey}_KIT`}
                              onClick={() => handleQuickAction(item, 'KIT')}
                              className={`w-full py-1.5 px-2.5 text-white rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 disabled:opacity-50 ${
                                item.kit_estado === 'EN_CUSTODIA_RESPONSABLE'
                                  ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800'
                                  : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
                              }`}
                              title={item.kit_estado === 'EN_CUSTODIA_RESPONSABLE' ? 'Confirmar entrega final del kit al voluntario' : 'Entregar Kit & Polo en 1 clic'}
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{item.kit_estado === 'EN_CUSTODIA_RESPONSABLE' ? 'Entregar al Vol.' : 'Entregar Kit'}</span>
                            </button>
                            {user?.rol === 'admin' && item.kit_estado === 'EN_CUSTODIA_RESPONSABLE' && (
                              <button
                                type="button"
                                disabled={savingAction}
                                onClick={() => handleResetKit(item)}
                                className="px-2 py-0.5 text-[10px] font-bold bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 rounded flex items-center gap-1 self-start transition cursor-pointer shadow-2xs disabled:opacity-50"
                              >
                                <RotateCcw className="w-2.5 h-2.5" />
                                <span>Anular Custodia</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          (user?.rol === 'admin' || sessionUndoSnapshots[`${idKey}_KIT`]) && (
                            <button
                              type="button"
                              disabled={savingAction || markingActionKey === `${idKey}_KIT`}
                              onClick={() => handleQuickUndo(item, 'KIT')}
                              className="px-2 py-0.5 text-[10px] font-bold bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 rounded flex items-center gap-1 self-start transition cursor-pointer shadow-2xs disabled:opacity-50 mt-1"
                            >
                              <RotateCcw className="w-2.5 h-2.5" />
                              <span>{sessionUndoSnapshots[`${idKey}_KIT`] ? 'Deshacer' : 'Anular'}</span>
                            </button>
                          )
                        )}
                      </div>

                      {/* 3. Desayuno */}
                      <div className={`p-2.5 rounded-xl border flex flex-col justify-between gap-1.5 transition-colors ${
                        item.desayuno_entregado 
                          ? 'bg-orange-50/80 border-orange-200 text-orange-950'
                          : item.desayuno_estado === 'EN_CUSTODIA_RESPONSABLE'
                          ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                          : 'bg-stone-50 border-stone-200 text-stone-700'
                      }`}>
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold block truncate">
                              {item.desayuno_entregado 
                                ? '☕ Desayuno Entregado' 
                                : item.desayuno_estado === 'EN_CUSTODIA_RESPONSABLE'
                                ? '📦 Desayuno en Líder'
                                : '⚪ Desayuno Pendiente'}
                            </span>
                            {markingActionKey === `${idKey}_DESAYUNO` && (
                              <RefreshCw className="w-3 h-3 animate-spin text-orange-600 shrink-0" />
                            )}
                          </div>
                          {item.desayuno_entregado && (
                            <span className="text-[10px] text-stone-600 block truncate">
                              {item.desayuno_fecha ? new Date(item.desayuno_fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''} por {item.desayuno_entregado_por || 'Validador'}
                            </span>
                          )}
                          {!item.desayuno_entregado && item.desayuno_estado === 'EN_CUSTODIA_RESPONSABLE' && (
                            <span className="text-[10px] text-amber-800 block truncate">
                              Custodio: <strong>{item.desayuno_custodio_nombre}</strong>
                            </span>
                          )}
                        </div>

                        {!item.desayuno_entregado ? (
                          <div className="flex flex-col gap-1 mt-1">
                            <button
                              type="button"
                              disabled={markingActionKey === `${idKey}_DESAYUNO`}
                              onClick={() => handleQuickAction(item, 'DESAYUNO')}
                              className={`w-full py-1.5 px-2.5 text-white rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 disabled:opacity-50 ${
                                item.desayuno_estado === 'EN_CUSTODIA_RESPONSABLE'
                                  ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800'
                                  : 'bg-orange-600 hover:bg-orange-700 active:bg-orange-800'
                              }`}
                              title={item.desayuno_estado === 'EN_CUSTODIA_RESPONSABLE' ? 'Confirmar entrega final de desayuno al voluntario' : 'Entregar Desayuno en 1 clic'}
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{item.desayuno_estado === 'EN_CUSTODIA_RESPONSABLE' ? 'Entregar al Vol.' : 'Entregar Desayuno'}</span>
                            </button>
                            {user?.rol === 'admin' && item.desayuno_estado === 'EN_CUSTODIA_RESPONSABLE' && (
                              <button
                                type="button"
                                disabled={savingAction}
                                onClick={() => handleResetDesayuno(item)}
                                className="px-2 py-0.5 text-[10px] font-bold bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 rounded flex items-center gap-1 self-start transition cursor-pointer shadow-2xs disabled:opacity-50"
                              >
                                <RotateCcw className="w-2.5 h-2.5" />
                                <span>Anular Custodia</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          (user?.rol === 'admin' || sessionUndoSnapshots[`${idKey}_DESAYUNO`]) && (
                            <button
                              type="button"
                              disabled={savingAction || markingActionKey === `${idKey}_DESAYUNO`}
                              onClick={() => handleQuickUndo(item, 'DESAYUNO')}
                              className="px-2 py-0.5 text-[10px] font-bold bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 rounded flex items-center gap-1 self-start transition cursor-pointer shadow-2xs disabled:opacity-50 mt-1"
                            >
                              <RotateCcw className="w-2.5 h-2.5" />
                              <span>{sessionUndoSnapshots[`${idKey}_DESAYUNO`] ? 'Deshacer' : 'Anular'}</span>
                            </button>
                          )
                        )}
                      </div>

                      {/* 4. Cena */}
                      <div className={`p-2.5 rounded-xl border flex flex-col justify-between gap-1.5 transition-colors ${
                        item.cena_entregada 
                          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                          : item.cena_estado === 'EN_CUSTODIA_RESPONSABLE'
                          ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                          : 'bg-stone-50 border-stone-200 text-stone-700'
                      }`}>
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold block truncate">
                              {item.cena_entregada 
                                ? '🍽️ Cena Entregada' 
                                : item.cena_estado === 'EN_CUSTODIA_RESPONSABLE'
                                ? '📦 Cena en Líder'
                                : '⚪ Cena Pendiente'}
                            </span>
                            {markingActionKey === `${idKey}_CENA` && (
                              <RefreshCw className="w-3 h-3 animate-spin text-emerald-600 shrink-0" />
                            )}
                          </div>
                          {item.cena_entregada && (
                            <span className="text-[10px] text-stone-600 block truncate">
                              {item.cena_fecha ? new Date(item.cena_fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''} por {item.cena_entregada_por || 'Validador'}
                            </span>
                          )}
                          {!item.cena_entregada && item.cena_estado === 'EN_CUSTODIA_RESPONSABLE' && (
                            <span className="text-[10px] text-amber-800 block truncate">
                              Custodio: <strong>{item.cena_custodio_nombre}</strong>
                            </span>
                          )}
                        </div>

                        {!item.cena_entregada ? (
                          <div className="flex flex-col gap-1 mt-1">
                            <button
                              type="button"
                              disabled={markingActionKey === `${idKey}_CENA`}
                              onClick={() => handleQuickAction(item, 'CENA')}
                              className={`w-full py-1.5 px-2.5 text-white rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 disabled:opacity-50 ${
                                item.cena_estado === 'EN_CUSTODIA_RESPONSABLE'
                                  ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800'
                                  : 'bg-teal-600 hover:bg-teal-700 active:bg-teal-800'
                              }`}
                              title={item.cena_estado === 'EN_CUSTODIA_RESPONSABLE' ? 'Confirmar entrega final de cena al voluntario' : 'Entregar Cena en 1 clic'}
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{item.cena_estado === 'EN_CUSTODIA_RESPONSABLE' ? 'Entregar al Vol.' : 'Entregar Cena'}</span>
                            </button>
                            {user?.rol === 'admin' && item.cena_estado === 'EN_CUSTODIA_RESPONSABLE' && (
                              <button
                                type="button"
                                disabled={savingAction}
                                onClick={() => handleResetCena(item)}
                                className="px-2 py-0.5 text-[10px] font-bold bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 rounded flex items-center gap-1 self-start transition cursor-pointer shadow-2xs disabled:opacity-50"
                              >
                                <RotateCcw className="w-2.5 h-2.5" />
                                <span>Anular Custodia</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          (user?.rol === 'admin' || sessionUndoSnapshots[`${idKey}_CENA`]) && (
                            <button
                              type="button"
                              disabled={savingAction || markingActionKey === `${idKey}_CENA`}
                              onClick={() => handleQuickUndo(item, 'CENA')}
                              className="px-2 py-0.5 text-[10px] font-bold bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 rounded flex items-center gap-1 self-start transition cursor-pointer shadow-2xs disabled:opacity-50 mt-1"
                            >
                              <RotateCcw className="w-2.5 h-2.5" />
                              <span>{sessionUndoSnapshots[`${idKey}_CENA`] ? 'Deshacer' : 'Anular'}</span>
                            </button>
                          )
                        )}
                      </div>

                    </div>

                  </div>
                  );
                })}
              </div>
            )}

          </div>
        ) : (
        /* ======================================================== */
        /* MODO ESCÁNER INDIVIDUAL (ASISTENCIA, KITS, DESAYUNO, CENA)*/
        /* ======================================================== */
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
                    Apunta al código QR de la credencial
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  {isScanning && camerasList.length > 1 && (
                    <button
                      type="button"
                      onClick={switchCamera}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-stone-100 hover:bg-stone-200 text-stone-700 transition flex items-center gap-1 cursor-pointer"
                      title="Cambiar lente de la cámara"
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
                      <p className="text-xs text-stone-400">Activa la cámara para apuntar a la credencial</p>
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

              {/* Búsqueda Manual por DNI */}
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
                        <span className="text-[10px] text-stone-500 font-mono">DNI: {item.dni} • {item.tipo}: {item.detalle}</span>
                      </div>
                      <span className="text-[10px] font-mono text-stone-400 shrink-0">{item.hora}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* COLUMNA DERECHA: Panel de Estado y Modo Activo (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Mensaje de error de búsqueda */}
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

            {/* Tarjeta de Espera / Estado de la Estación */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm text-center space-y-5">
              <div className="relative inline-block">
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto border-2 shadow-inner ${
                  activeTab === 'asistencia' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                  activeTab === 'kits' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  activeTab === 'desayuno' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                  'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {activeTab === 'asistencia' && <ClipboardCheck className="w-10 h-10" />}
                  {activeTab === 'kits' && <PackageCheck className="w-10 h-10" />}
                  {activeTab === 'desayuno' && <Coffee className="w-10 h-10" />}
                  {activeTab === 'cena' && <Utensils className="w-10 h-10" />}
                </div>
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-white"></span>
                </span>
              </div>

              <div className="max-w-md mx-auto space-y-1.5">
                <h3 className="text-lg sm:text-xl font-bold font-title text-stone-900">
                  {activeTab === 'asistencia' && 'Módulo de Asistencia Activo'}
                  {activeTab === 'kits' && 'Módulo de Kits & Polos Activo'}
                  {activeTab === 'desayuno' && 'Módulo de Desayunos Activo'}
                  {activeTab === 'cena' && 'Módulo de Cenas Activo'}
                </h3>
                <p className="text-xs sm:text-sm text-stone-500">
                  {isScanning 
                    ? 'Apunta la cámara al código QR de la credencial. La ficha del voluntario se abrirá automáticamente en pantalla completa.'
                    : 'Enciende la cámara a la izquierda o digita el DNI del voluntario para abrir su ficha instantánea.'}
                </p>
              </div>

              {/* Selector de Punto de Alimentación si estamos en alimentos */}
              {(activeTab === 'desayuno' || activeTab === 'cena') && (
                <div className="max-w-xs mx-auto text-left pt-2">
                  <label className="block text-[11px] font-bold text-stone-600 mb-1">
                    Punto de Distribución / Comedor:
                  </label>
                  <select
                    value={puntoAlimentos}
                    onChange={(e) => setPuntoAlimentos(e.target.value)}
                    className="w-full py-2 px-3 bg-stone-50 border border-stone-300 rounded-xl text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-diocesis-mustard"
                  >
                    <option value="Comedor Principal / Almacén">🍽️ Comedor Principal / Almacén</option>
                    <option value="Comedor Sector Santuario">⛪ Comedor Sector Santuario</option>
                    <option value="Comedor USAT">🎓 Comedor USAT</option>
                    <option value="Punto Móvil Cuadrillas">🚚 Punto Móvil Cuadrillas</option>
                  </select>
                </div>
              )}
            </div>

            {/* Guía Rápida de Operación */}
            <div className="bg-stone-50/80 rounded-3xl p-5 border border-stone-200/80 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-diocesis-mustard" />
                Seguridad y Reglas de Entrega en Campo
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white rounded-2xl border border-stone-200 space-y-1">
                  <span className="font-bold text-stone-800 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-mono text-[10px] font-black flex items-center justify-center">1</span>
                    Desayuno y Cena Sin Horario Fijo
                  </span>
                  <p className="text-stone-500 text-[11px]">
                    El horario de comedor es continuo y flexible según disponga la comisión diocesana. Cada voluntario tiene exactamente 1 ración permitida.
                  </p>
                </div>

                <div className="p-3 bg-white rounded-2xl border border-stone-200 space-y-1">
                  <span className="font-bold text-stone-800 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-mono text-[10px] font-black flex items-center justify-center">2</span>
                    Candado Anti-Duplicado
                  </span>
                  <p className="text-stone-500 text-[11px]">
                    Si un voluntario ya recibió su kit, desayuno o cena, la pantalla se tiñe de rojo indicando la hora exacta y el validador que lo entregó.
                  </p>
                </div>

                <div className="p-3 bg-white rounded-2xl border border-stone-200 space-y-1">
                  <span className="font-bold text-stone-800 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-mono text-[10px] font-black flex items-center justify-center">3</span>
                    Cadena de Custodia
                  </span>
                  <p className="text-stone-500 text-[11px]">
                    Si el kit o alimento fue despachado en bloque a su Líder, la pantalla muestra una alerta amarilla indicando el nombre del responsable custodio.
                  </p>
                </div>

                <div className="p-3 bg-white rounded-2xl border border-stone-200 space-y-1">
                  <span className="font-bold text-stone-800 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-mono text-[10px] font-black flex items-center justify-center">4</span>
                    Atención en 1 Toque
                  </span>
                  <p className="text-stone-500 text-[11px]">
                    Al pulsar "Siguiente Voluntario", la ventana se cierra y el sensor de cámara se reactiva de inmediato sin perder tiempo.
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>
        )}

      </main>

      {/* ======================================================== */}
      {/* MODAL POPUP FLOTANTE: FICHA INMEDIATA DEL VOLUNTARIO    */}
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

            {justConfirmed ? (
              /* ======================================================== */
              /* PANTALLA DE ÉXITO TRAS CONFIRMAR ACCIÓN                  */
              /* ======================================================== */
              <div className="p-6 sm:p-8 text-center space-y-5 animate-in zoom-in-95 duration-200">
                <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner border-2 border-emerald-300">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-800 px-3 py-0.5 rounded-full inline-block">
                    ✅ {justConfirmed === 'KIT' ? 'KIT ENTREGADO' : 
                        justConfirmed === 'ASISTENCIA' ? 'ASISTENCIA REGISTRADA' : 
                        justConfirmed === 'DESAYUNO' ? 'DESAYUNO ENTREGADO' : 'CENA ENTREGADA'}
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black font-title text-stone-900 leading-tight">
                    {justConfirmed === 'KIT' && '¡Kit Entregado con Éxito!'}
                    {justConfirmed === 'ASISTENCIA' && '¡Asistencia Registrada!'}
                    {justConfirmed === 'DESAYUNO' && '¡Ración de Desayuno Registrada!'}
                    {justConfirmed === 'CENA' && '¡Ración de Cena Registrada!'}
                  </h3>
                  <p className="text-xs text-stone-500">
                    El registro se guardó correctamente en la base de datos oficial.
                  </p>
                </div>

                {/* Resumen del Voluntario */}
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-left flex items-center gap-3">
                  {scannedVoluntario.fotografia_url ? (
                    <img
                      src={formatFotoUrl(scannedVoluntario.fotografia_url)}
                      alt={scannedVoluntario.nombres_apellidos}
                      className="w-14 h-14 rounded-xl object-cover border border-stone-300 shrink-0 bg-white"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 shrink-0">
                      <User className="w-7 h-7" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-sm text-stone-900 truncate">
                      {scannedVoluntario.nombres_apellidos}
                    </h4>
                    <p className="text-xs font-mono text-stone-500">
                      DNI: <strong className="text-diocesis-redDark">{scannedVoluntario.dni || 'S/D'}</strong> • Código: <span>{scannedVoluntario.codigo || `VOL-${scannedVoluntario.dni}`}</span>
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {justConfirmed === 'KIT' && (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-200">
                          👕 Talla {scannedVoluntario.talla || 'L'} • {scannedVoluntario.kit_items_entregados}
                        </span>
                      )}
                      {justConfirmed === 'ASISTENCIA' && (
                        <span className="text-[10px] font-bold bg-blue-100 text-blue-900 px-2 py-0.5 rounded border border-blue-200">
                          📍 {scannedVoluntario.asistencia_punto}
                        </span>
                      )}
                      {justConfirmed === 'DESAYUNO' && (
                        <span className="text-[10px] font-bold bg-orange-100 text-orange-900 px-2 py-0.5 rounded border border-orange-200">
                          ☕ Desayuno • {scannedVoluntario.desayuno_punto}
                        </span>
                      )}
                      {justConfirmed === 'CENA' && (
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-950 px-2 py-0.5 rounded border border-emerald-200">
                          🍽️ Cena • {scannedVoluntario.cena_punto}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Botón Principal: Siguiente Voluntario */}
                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    onClick={handleNextVolunteer}
                    className="w-full py-4 px-6 bg-stone-900 hover:bg-black active:bg-stone-800 text-white rounded-2xl font-bold text-base shadow-lg transition flex items-center justify-center gap-2.5 cursor-pointer"
                  >
                    <QrCode className="w-5 h-5 text-diocesis-mustard" />
                    <span>Escanear Siguiente Voluntario</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleNextVolunteer}
                    className="text-xs text-stone-500 hover:text-stone-800 underline cursor-pointer"
                  >
                    Cerrar ventana y volver a la cámara
                  </button>
                </div>
              </div>
            ) : (
              <>
            {/* Banner de Estado Específico */}
            {activeTab === 'asistencia' ? (
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
            ) : activeTab === 'kits' ? (
              // MODO KITS
              scannedVoluntario.kit_entregado ? (
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
              ) : scannedVoluntario.kit_estado === 'EN_CUSTODIA_RESPONSABLE' ? (
                <div className="bg-amber-600 text-white p-4 pr-12 text-center space-y-1">
                  <span className="text-[11px] font-black uppercase tracking-widest bg-black/20 px-3 py-0.5 rounded-full inline-block">
                    📦 DESPACHADO EN BLOQUE AL LÍDER
                  </span>
                  <h3 className="text-base sm:text-lg font-black font-title">
                    KIT EN CUSTODIA DE SU RESPONSABLE
                  </h3>
                  <p className="text-xs text-amber-100">
                    El kit fue entregado en bloque a <strong>{scannedVoluntario.kit_custodio_nombre}</strong> el {scannedVoluntario.kit_fecha_despacho_lote ? new Date(scannedVoluntario.kit_fecha_despacho_lote).toLocaleString() : 'fecha registrada'}.
                  </p>
                  <p className="text-[11px] text-amber-200">
                    Debe recibirlo de su líder en cuadrilla. Si se lo entregas aquí en almacén, confirma abajo.
                  </p>
                </div>
              ) : (
                <div className="bg-emerald-600 text-white p-4 pr-12 text-center space-y-0.5">
                  <span className="text-[11px] font-black uppercase tracking-widest bg-black/20 px-3 py-0.5 rounded-full inline-block">
                    ✅ HABILITADO
                  </span>
                  <h3 className="text-base sm:text-lg font-black font-title">
                    VOLUNTARIO APROBADO PARA ENTREGA DE KIT
                  </h3>
                  <p className="text-xs text-emerald-100">
                    Verifica su identidad y entrega la prenda textil de su talla.
                  </p>
                </div>
              )
            ) : activeTab === 'desayuno' ? (
              // MODO DESAYUNO
              scannedVoluntario.desayuno_entregado ? (
                <div className="bg-rose-600 text-white p-4 pr-12 text-center space-y-1">
                  <span className="text-[11px] font-black uppercase tracking-widest bg-black/20 px-3 py-0.5 rounded-full inline-block">
                    ⚠️ ALERTA DE DUPLICADO
                  </span>
                  <h3 className="text-base sm:text-lg font-black font-title">
                    ¡ESTE VOLUNTARIO YA RECIBIÓ SU DESAYUNO!
                  </h3>
                  <p className="text-xs text-rose-100">
                    Ración entregada el {scannedVoluntario.desayuno_fecha ? new Date(scannedVoluntario.desayuno_fecha).toLocaleTimeString() : 'hora registrada'} por <strong>{scannedVoluntario.desayuno_entregado_por || 'Validador previo'}</strong>.
                  </p>
                </div>
              ) : scannedVoluntario.desayuno_estado === 'EN_CUSTODIA_RESPONSABLE' ? (
                <div className="bg-amber-600 text-white p-4 pr-12 text-center space-y-1">
                  <span className="text-[11px] font-black uppercase tracking-widest bg-black/20 px-3 py-0.5 rounded-full inline-block">
                    📦 DESPACHADO EN BLOQUE AL LÍDER
                  </span>
                  <h3 className="text-base sm:text-lg font-black font-title">
                    DESAYUNO EN CUSTODIA DE SU RESPONSABLE
                  </h3>
                  <p className="text-xs text-amber-100">
                    La ración fue entregada a <strong>{scannedVoluntario.desayuno_custodio_nombre}</strong> para distribución en cuadrilla.
                  </p>
                </div>
              ) : (
                <div className="bg-orange-600 text-white p-4 pr-12 text-center space-y-0.5">
                  <span className="text-[11px] font-black uppercase tracking-widest bg-black/20 px-3 py-0.5 rounded-full inline-block">
                    ☕ HABILITADO
                  </span>
                  <h3 className="text-base sm:text-lg font-black font-title">
                    VOLUNTARIO HABILITADO PARA DESAYUNO
                  </h3>
                  <p className="text-xs text-orange-100">
                    Confirma la entrega de la ración matutina oficial.
                  </p>
                </div>
              )
            ) : (
              // MODO CENA
              scannedVoluntario.cena_entregada ? (
                <div className="bg-rose-600 text-white p-4 pr-12 text-center space-y-1">
                  <span className="text-[11px] font-black uppercase tracking-widest bg-black/20 px-3 py-0.5 rounded-full inline-block">
                    ⚠️ ALERTA DE DUPLICADO
                  </span>
                  <h3 className="text-base sm:text-lg font-black font-title">
                    ¡ESTE VOLUNTARIO YA RECIBIÓ SU CENA!
                  </h3>
                  <p className="text-xs text-rose-100">
                    Ración entregada el {scannedVoluntario.cena_fecha ? new Date(scannedVoluntario.cena_fecha).toLocaleTimeString() : 'hora registrada'} por <strong>{scannedVoluntario.cena_entregada_por || 'Validador previo'}</strong>.
                  </p>
                </div>
              ) : scannedVoluntario.cena_estado === 'EN_CUSTODIA_RESPONSABLE' ? (
                <div className="bg-amber-600 text-white p-4 pr-12 text-center space-y-1">
                  <span className="text-[11px] font-black uppercase tracking-widest bg-black/20 px-3 py-0.5 rounded-full inline-block">
                    📦 DESPACHADO EN BLOQUE AL LÍDER
                  </span>
                  <h3 className="text-base sm:text-lg font-black font-title">
                    CENA EN CUSTODIA DE SU RESPONSABLE
                  </h3>
                  <p className="text-xs text-amber-100">
                    La ración fue entregada a <strong>{scannedVoluntario.cena_custodio_nombre}</strong> para distribución en cuadrilla.
                  </p>
                </div>
              ) : (
                <div className="bg-emerald-600 text-white p-4 pr-12 text-center space-y-0.5">
                  <span className="text-[11px] font-black uppercase tracking-widest bg-black/20 px-3 py-0.5 rounded-full inline-block">
                    🍽️ HABILITADO
                  </span>
                  <h3 className="text-base sm:text-lg font-black font-title">
                    VOLUNTARIO HABILITADO PARA CENA
                  </h3>
                  <p className="text-xs text-emerald-100">
                    Confirma la entrega de la ración vespertina oficial.
                  </p>
                </div>
              )
            )}

            {/* Aviso si el voluntario pertenece a otro sector */}
            {user?.rol === 'responsable' && !isMyVolunteer(scannedVoluntario) && (
              <div className="m-4 mb-0 p-3.5 bg-amber-50 border-2 border-amber-400 rounded-2xl flex items-start gap-2.5 shadow-2xs">
                <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-950">
                  <span className="font-bold block text-amber-900">⚠️ Voluntario de Otro Sector</span>
                  <span>
                    Este voluntario está registrado bajo la coordinación de: <strong>{scannedVoluntario.responsable_nombre || 'Otro Responsable'}</strong>.
                    Tú estás a cargo del sector de <strong>{user?.nombre || user?.responsable_nombre}</strong>.
                  </span>
                </div>
              </div>
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
            {user?.rol === 'admin' && (scannedVoluntario.kit_entregado || scannedVoluntario.asistencia_dia_d || scannedVoluntario.desayuno_entregado || scannedVoluntario.cena_entregada) && (
              <div className="m-4 mb-0 p-3.5 bg-rose-50 border-2 border-rose-300 rounded-2xl space-y-2 animate-in fade-in">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-rose-600" />
                  Opciones de Administrador (Pruebas / Reversión):
                </span>
                <div className="flex flex-wrap gap-2 pt-1">
                  {scannedVoluntario.asistencia_dia_d && (
                    <button
                      type="button"
                      disabled={savingAction}
                      onClick={() => handleResetAttendance(scannedVoluntario)}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Anular Asistencia</span>
                    </button>
                  )}
                  {scannedVoluntario.kit_entregado && (
                    <button
                      type="button"
                      disabled={savingAction}
                      onClick={() => handleResetKit(scannedVoluntario)}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Anular Kit</span>
                    </button>
                  )}
                  {scannedVoluntario.desayuno_entregado && (
                    <button
                      type="button"
                      disabled={savingAction}
                      onClick={() => handleResetDesayuno(scannedVoluntario)}
                      className="px-2.5 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Anular Desayuno</span>
                    </button>
                  )}
                  {scannedVoluntario.cena_entregada && (
                    <button
                      type="button"
                      disabled={savingAction}
                      onClick={() => handleResetCena(scannedVoluntario)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Anular Cena</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Tarjeta de Datos del Voluntario */}
            <div className="p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
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

              {/* FORMULARIO DE ACCIÓN: MODO KITS */}
              {activeTab === 'kits' && (
                <div className="space-y-3 pt-2 border-t border-stone-200">
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

                  <button
                    type="button"
                    disabled={savingAction || (!entregaKitCompleto && !entregaPolo) || scannedVoluntario.kit_entregado}
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
                        <span>
                          {scannedVoluntario.kit_entregado 
                            ? 'Kit Ya Entregado' 
                            : scannedVoluntario.kit_estado === 'EN_CUSTODIA_RESPONSABLE'
                            ? 'Confirmar Entrega Final al Voluntario (Sacar de Custodia)'
                            : 'Confirmar Entrega de Kit'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* FORMULARIO DE ACCIÓN: MODO DESAYUNO */}
              {activeTab === 'desayuno' && (
                <div className="space-y-3 pt-2 border-t border-stone-200">
                  <button
                    type="button"
                    disabled={savingAction || scannedVoluntario.desayuno_entregado}
                    onClick={handleConfirmDesayuno}
                    className="w-full py-3 px-4 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white rounded-2xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {savingAction ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>Registrando desayuno...</span>
                      </>
                    ) : (
                      <>
                        <Coffee className="w-5 h-5 text-orange-200" />
                        <span>
                          {scannedVoluntario.desayuno_entregado 
                            ? 'Desayuno Ya Entregado' 
                            : scannedVoluntario.desayuno_estado === 'EN_CUSTODIA_RESPONSABLE'
                            ? 'Confirmar Entrega Final de Desayuno (Sacar de Custodia)'
                            : 'Confirmar Entrega de Desayuno'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* FORMULARIO DE ACCIÓN: MODO CENA */}
              {activeTab === 'cena' && (
                <div className="space-y-3 pt-2 border-t border-stone-200">
                  <button
                    type="button"
                    disabled={savingAction || scannedVoluntario.cena_entregada}
                    onClick={handleConfirmCena}
                    className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-2xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {savingAction ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>Registrando cena...</span>
                      </>
                    ) : (
                      <>
                        <Utensils className="w-5 h-5 text-emerald-200" />
                        <span>
                          {scannedVoluntario.cena_entregada 
                            ? 'Cena Ya Entregada' 
                            : scannedVoluntario.cena_estado === 'EN_CUSTODIA_RESPONSABLE'
                            ? 'Confirmar Entrega Final de Cena (Sacar de Custodia)'
                            : 'Confirmar Entrega de Cena'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              )}

            </div>

            {/* Footer del Modal */}
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
            </>
          )}

          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-3 text-center text-xs text-stone-400 bg-white border-t border-stone-200">
        Diócesis de Chiclayo • Módulo de Validación de Campo y Logística 2026
      </footer>

    </div>
  );
}
