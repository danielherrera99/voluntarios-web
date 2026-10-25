import { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import { supabase } from '../supabase';
import { 
  MapPin, Navigation, Shield, AlertTriangle, CheckCircle2, Clock, 
  HeartPulse, Droplets, ShieldAlert, Coffee, ExternalLink, RefreshCw,
  Eye, Phone, MessageCircle, Layers, ZoomIn, ZoomOut, Compass, Info,
  Building, Church, Landmark, Mountain, Car, Globe, Map as MapIcon, Plus, Trash2, Edit3, X, Check,
  Search, Users, ChevronDown, UserCheck, ArrowLeft, GraduationCap, UserCog, MoveRight, ArrowRightLeft
} from 'lucide-react';

// Sedes oficiales de la Visita Papal en la Diócesis de Chiclayo (Coordenadas Reales de Lambayeque)
export const SEDES_DIOCESIS = [
  {
    id: 'misa-central',
    nombre: 'Explanada Misa Multitudinaria',
    ciudad: 'Chiclayo / Pimentel',
    tipo: 'Misa Central de la Juventud y Familias',
    capacidadCuadrillas: 401,
    voluntariosEstimados: 3609,
    lat: -6.778500,
    lng: -79.851000,
    zoom: 16,
    icono: '⛪',
    color: '#9B1C22',
    descripcion: 'Zona de mayor concentración en Pimentel, altar monumental, anillos de contención y cuadrillas de seguridad.'
  },
  {
    id: 'catedral-chiclayo',
    nombre: 'Santa María Catedral & Plaza Mayor',
    ciudad: 'Chiclayo Centro',
    tipo: 'Encuentro con Clero, Religiosos y Autoridades',
    capacidadCuadrillas: 84,
    voluntariosEstimados: 756,
    lat: -6.771944,
    lng: -79.839167,
    zoom: 17,
    icono: '🏛️',
    color: '#B5871D',
    descripcion: 'Cordón de honor papal en calles aledañas, atrio de la Catedral y Plaza de Armas.'
  },
  {
    id: 'santuario-paz',
    nombre: 'Santuario Diocesano de la Paz',
    ciudad: 'Chiclayo / Monsefú',
    tipo: 'Momento Mariano y Oración con Enfermos',
    capacidadCuadrillas: 65,
    voluntariosEstimados: 585,
    lat: -6.820556,
    lng: -79.870000,
    zoom: 16,
    icono: '🕊️',
    color: '#10B981',
    descripcion: 'Atención especial para personas con discapacidad, adultos mayores y pastoral de salud.'
  },
  {
    id: 'usat-chiclayo',
    nombre: 'USAT - Universidad Católica Santo Toribio',
    ciudad: 'Chiclayo (Campus Principal)',
    tipo: 'Encuentro Universitario, Académico y Juventud Estudiantil',
    capacidadCuadrillas: 53,
    voluntariosEstimados: 477,
    lat: -6.760456,
    lng: -79.863203,
    zoom: 17,
    icono: '🎓',
    color: '#0284C7',
    descripcion: 'Campus universitario USAT (Av. San Josemaría Escrivá 855), auditorio principal, plazoletas y accesos.'
  },
  {
    id: 'zana-historica',
    nombre: 'Saña - Valle Histórico',
    ciudad: 'Saña (Patrimonio)',
    tipo: 'Homenaje a Santo Toribio de Mogrovejo',
    capacidadCuadrillas: 67,
    voluntariosEstimados: 603,
    lat: -6.924722,
    lng: -79.584722,
    zoom: 16,
    icono: '🏺',
    color: '#8B5CF6',
    descripcion: 'Ruinas del Convento San Agustín, Plaza Mayor de Saña y ruta histórica papal.'
  },
  {
    id: 'santa-cruz',
    nombre: 'Santa Cruz (Jurisdicción Diocesana)',
    ciudad: 'Santa Cruz',
    tipo: 'Encuentro con Parroquias Andinas de la Diócesis',
    capacidadCuadrillas: 63,
    voluntariosEstimados: 567,
    lat: -6.626389,
    lng: -78.945833,
    zoom: 16,
    icono: '⛰️',
    color: '#D97706',
    descripcion: 'Recepción y bendición de delegaciones campesinas y juveniles de la sierra diocesana.'
  }
];

// Helper fallback de sede según código de cuadrilla
export const getSedeIdByCuadrilla = (cuadrillaCodigo) => {
  const num = parseInt((cuadrillaCodigo || '').replace(/\D/g, ''), 10) || 0;
  if (num <= 401) return 'misa-central';
  if (num <= 485) return 'catedral-chiclayo';
  if (num <= 550) return 'santuario-paz';
  if (num <= 603) return 'usat-chiclayo';
  if (num <= 670) return 'zana-historica';
  return 'santa-cruz';
};

export default function MapaTactico({ 
  rol = 'guia', 
  isAdmin = false,
  cuadrillaCodigo = 'CUA-001', 
  guiaNombre = 'Mi Cuadrilla',
  liderNombre = 'Líder de Sector',
  cuadrillasLista = [],
  onReportSos
}) {
  const [selectedSedeId, setSelectedSedeId] = useState('misa-central');
  const [mapType, setMapType] = useState('callejero'); // 'callejero' | 'satelite'
  const [selectedCuadrilla, setSelectedCuadrilla] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsLocation, setGpsLocation] = useState(null);
  const [gpsConfirmed, setGpsConfirmed] = useState(false);
  const [activePoiFilter, setActivePoiFilter] = useState(true);

  // Jerarquía de Filtros para el Administrador: Responsable -> Líder -> Guías
  const [selectedResponsable, setSelectedResponsable] = useState(''); // '' = Todos los responsables de la sede
  const [selectedLider, setSelectedLider] = useState(''); // '' = Puestos de Mando de Líderes; o nombre específico; o 'TODOS'
  const [searchTerm, setSearchTerm] = useState('');
  const [mandosDb, setMandosDb] = useState([]);
  const [loadingMandos, setLoadingMandos] = useState(false);

  // Estados del Editor de Puntos (Exclusivo Administrador / Comisión)
  const canEdit = isAdmin || rol === 'admin' || rol === 'comision';
  const [isEditorMode, setIsEditorMode] = useState(false);
  const [puntosDb, setPuntosDb] = useState([]);
  const [loadingPuntos, setLoadingPuntos] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPointCoords, setNewPointCoords] = useState(null);
  const [newPointTipo, setNewPointTipo] = useState('medica');
  const [newPointNombre, setNewPointNombre] = useState('');
  const [newPointDesc, setNewPointDesc] = useState('');
  const [newPointCuadrilla, setNewPointCuadrilla] = useState('');
  const [savingPoint, setSavingPoint] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  // Modal de Reasignación Dinámica de Sedes
  const [showReasignarModal, setShowReasignarModal] = useState(false);
  const [reasignarTab, setReasignarTab] = useState('responsable'); // 'responsable' | 'lider' | 'guia'
  const [reasignarTargetResp, setReasignarTargetResp] = useState('');
  const [reasignarTargetLid, setReasignarTargetLid] = useState('');
  const [reasignarTargetGuiaCode, setReasignarTargetGuiaCode] = useState('');
  const [reasignarDestinoSede, setReasignarDestinoSede] = useState('catedral-chiclayo');
  const [savingReasignacion, setSavingReasignacion] = useState(false);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markersLayerRef = useRef(null);

  // Coordenadas personalizadas de Sedes guardadas por el Administrador
  const [customSedesCoords, setCustomSedesCoords] = useState(() => {
    try {
      const saved = localStorage.getItem('sedes_custom_coords');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const rawSede = SEDES_DIOCESIS.find(s => s.id === selectedSedeId) || SEDES_DIOCESIS[0];
  const currentSede = {
    ...rawSede,
    lat: customSedesCoords[rawSede.id]?.lat ?? rawSede.lat,
    lng: customSedesCoords[rawSede.id]?.lng ?? rawSede.lng,
  };

  const handleResetSedePos = (sedeId) => {
    setCustomSedesCoords(prev => {
      const copy = { ...prev };
      delete copy[sedeId];
      try {
        localStorage.setItem('sedes_custom_coords', JSON.stringify(copy));
      } catch (e) {
        console.error(e);
      }
      return copy;
    });
    setFeedbackMsg(`✓ Sede restablecida a coordenadas originales.`);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  // 1. Cargar Puntos Tácticos de Supabase (Hospitales, Agua, Puertas, Altar)
  const fetchPuntosTacticos = async () => {
    setLoadingPuntos(true);
    try {
      const { data, error } = await supabase
        .from('puntos_tacticos')
        .select('*')
        .order('id', { ascending: true });

      if (error) throw error;
      setPuntosDb(data || []);
    } catch (err) {
      console.error('Error cargando puntos tácticos:', err.message);
    } finally {
      setLoadingPuntos(false);
    }
  };

  // 2. Cargar Estructura de Mandos (733 cuadrillas con sede_id persistente)
  const fetchMandos = async () => {
    if (!canEdit && cuadrillasLista.length > 0) return;
    setLoadingMandos(true);
    try {
      const { data, error } = await supabase
        .from('estructura_mandos')
        .select('*')
        .order('id', { ascending: true });

      if (error) throw error;
      setMandosDb(data || []);
    } catch (err) {
      console.error('Error cargando mandos:', err.message);
    } finally {
      setLoadingMandos(false);
    }
  };

  useEffect(() => {
    fetchPuntosTacticos();
    fetchMandos();
  }, [canEdit]);

  // Al cambiar de Sede, reiniciar filtros de Responsable, Líder y buscador
  useEffect(() => {
    setSelectedResponsable('');
    setSelectedLider('');
    setSearchTerm('');
  }, [selectedSedeId]);

  // Cuadrillas / Guías que pertenecen a la Sede actual (según sede_id en BD)
  const mandosDeEstaSede = useMemo(() => {
    if (!canEdit && cuadrillasLista.length > 0) {
      return cuadrillasLista;
    }
    const source = mandosDb.length > 0 ? mandosDb : cuadrillasLista;
    return source.filter(m => (m.sede_id || getSedeIdByCuadrilla(m.cuadrilla_codigo)) === selectedSedeId);
  }, [mandosDb, cuadrillasLista, selectedSedeId, canEdit]);

  // 1er Nivel Jerárquico: Responsables Generales de esta Sede
  const responsablesDeEstaSede = useMemo(() => {
    const groups = {};
    mandosDeEstaSede.forEach(m => {
      const respName = (m.responsable_nombre || 'Sin Responsable').trim();
      if (!groups[respName]) {
        groups[respName] = {
          responsable_nombre: respName,
          responsable_dni: m.responsable_dni,
          lideresSet: new Set(),
          guiasCount: 0
        };
      }
      if (m.lider_nombre) {
        groups[respName].lideresSet.add(m.lider_nombre.trim());
      }
      groups[respName].guiasCount++;
    });
    return Object.values(groups).map(g => ({
      ...g,
      lideresCount: g.lideresSet.size
    }));
  }, [mandosDeEstaSede]);

  // Filtrar mandos si el Administrador seleccionó un Responsable General
  const mandosFiltradosPorResponsable = useMemo(() => {
    if (!selectedResponsable) return mandosDeEstaSede;
    return mandosDeEstaSede.filter(m => (m.responsable_nombre || '').trim() === selectedResponsable);
  }, [mandosDeEstaSede, selectedResponsable]);

  // 2do Nivel Jerárquico: Líderes de Sector (filtrados según el Responsable elegido o todos los de la sede)
  const lideresDeEstaSede = useMemo(() => {
    const groups = {};
    mandosFiltradosPorResponsable.forEach(m => {
      const lidName = (m.lider_nombre || 'Sin Líder').trim();
      if (!groups[lidName]) {
        groups[lidName] = {
          lider_nombre: lidName,
          lider_dni: m.lider_dni,
          responsable_nombre: m.responsable_nombre,
          guias: []
        };
      }
      groups[lidName].guias.push(m);
    });
    return Object.values(groups);
  }, [mandosFiltradosPorResponsable]);

  // Listas globales para el modal de reasignación
  const todosLosResponsables = useMemo(() => {
    const set = new Set();
    mandosDb.forEach(m => {
      if (m.responsable_nombre) set.add(m.responsable_nombre.trim());
    });
    return Array.from(set).sort();
  }, [mandosDb]);

  const todosLosLideres = useMemo(() => {
    const set = new Set();
    mandosDb.forEach(m => {
      if (m.lider_nombre) set.add(m.lider_nombre.trim());
    });
    return Array.from(set).sort();
  }, [mandosDb]);

  // Búsqueda rápida de Responsables / Líderes / Guías / Cuadrillas
  const searchResults = useMemo(() => {
    if (!searchTerm.trim() || searchTerm.length < 2) return [];
    const query = searchTerm.toLowerCase().trim();
    const source = mandosDb.length > 0 ? mandosDb : mandosDeEstaSede;
    return source.filter(m => 
      (m.cuadrilla_codigo && m.cuadrilla_codigo.toLowerCase().includes(query)) ||
      (m.guia_nombre && m.guia_nombre.toLowerCase().includes(query)) ||
      (m.lider_nombre && m.lider_nombre.toLowerCase().includes(query)) ||
      (m.responsable_nombre && m.responsable_nombre.toLowerCase().includes(query))
    ).slice(0, 8);
  }, [searchTerm, mandosDb, mandosDeEstaSede]);

  // Configuración de capas de mapas gratuitos
  const TILE_LAYERS = {
    callejero: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '© OpenStreetMap colaboradores'
    },
    satelite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles © Esri — Source: Esri, Maxar'
    }
  };

  // Inicializar o centrar mapa Leaflet de forma segura
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([currentSede.lat, currentSede.lng], currentSede.zoom, {
        duration: 1.2
      });
      renderMarkers();
      return;
    }

    if (mapContainerRef.current._leaflet_id) {
      mapContainerRef.current._leaflet_id = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [currentSede.lat, currentSede.lng],
      zoom: currentSede.zoom,
      zoomControl: true,
      scrollWheelZoom: true
    });

    const initialTiles = L.tileLayer(TILE_LAYERS.callejero.url, {
      maxZoom: 19,
      attribution: TILE_LAYERS.callejero.attribution
    }).addTo(map);

    tileLayerRef.current = initialTiles;

    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;

    mapInstanceRef.current = map;
    renderMarkers();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [selectedSedeId]);

  // Manejar clics en el mapa cuando el Editor está activo
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const handleMapClick = (e) => {
      if (!isEditorMode) return;
      setNewPointCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
      setNewPointNombre('');
      setNewPointDesc('');
      setNewPointCuadrilla('');
      setShowAddModal(true);
    };

    mapInstanceRef.current.on('click', handleMapClick);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.off('click', handleMapClick);
      }
    };
  }, [isEditorMode, selectedSedeId]);

  // Cambiar capa (Callejero vs Satélite)
  const toggleMapType = (type) => {
    setMapType(type);
    if (!mapInstanceRef.current || !tileLayerRef.current) return;

    tileLayerRef.current.remove();

    const newUrl = type === 'satelite' 
      ? TILE_LAYERS.satelite.url
      : TILE_LAYERS.callejero.url;

    const newAttr = type === 'satelite'
      ? TILE_LAYERS.satelite.attribution
      : TILE_LAYERS.callejero.attribution;

    const newTiles = L.tileLayer(newUrl, {
      maxZoom: 19,
      attribution: newAttr
    }).addTo(mapInstanceRef.current);

    tileLayerRef.current = newTiles;
  };

  // Guardar un nuevo punto en Supabase
  const handleGuardarPunto = async (e) => {
    e.preventDefault();
    if (!newPointNombre.trim() || !newPointCoords) return;

    setSavingPoint(true);
    try {
      const iconos = {
        medica: '🚑',
        agua: '💧',
        puerta: '🚪',
        altar: '✝️',
        mando: '🛡️',
        cuadrilla: '📍'
      };

      const colores = {
        medica: '#E11D48',
        agua: '#2563EB',
        puerta: '#059669',
        altar: '#B5871D',
        mando: '#6B0D12',
        cuadrilla: '#9B1C22'
      };

      const nuevo = {
        sede_id: selectedSedeId,
        tipo: newPointTipo,
        nombre: newPointNombre.trim(),
        descripcion: newPointDesc.trim() || null,
        lat: Number(newPointCoords.lat.toFixed(6)),
        lng: Number(newPointCoords.lng.toFixed(6)),
        icono: iconos[newPointTipo] || '📍',
        color: colores[newPointTipo] || '#9B1C22',
        cuadrilla_codigo: newPointTipo === 'cuadrilla' ? newPointCuadrilla.trim() : null
      };

      const { data, error } = await supabase.from('puntos_tacticos').insert([nuevo]).select();
      if (error) throw error;

      setPuntosDb(prev => [...prev, ...(data || [nuevo])]);
      setShowAddModal(false);
      setFeedbackMsg(`✓ Punto "${nuevo.nombre}" creado con éxito.`);
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err) {
      alert(`Error al guardar punto: ${err.message}`);
    } finally {
      setSavingPoint(false);
    }
  };

  // Eliminar un punto de Supabase
  const handleEliminarPunto = async (id, nombre) => {
    if (!confirm(`¿Estás seguro de eliminar el punto "${nombre}"?`)) return;

    try {
      const { error } = await supabase.from('puntos_tacticos').delete().eq('id', id);
      if (error) throw error;

      setPuntosDb(prev => prev.filter(p => p.id !== id));
      setFeedbackMsg(`Punto "${nombre}" eliminado.`);
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err) {
      alert(`Error al eliminar: ${err.message}`);
    }
  };

  // Actualizar posición de un punto al arrastrarlo
  const handleActualizarPosicion = async (id, lat, lng, nombre) => {
    try {
      const { error } = await supabase
        .from('puntos_tacticos')
        .update({ 
          lat: Number(lat.toFixed(6)), 
          lng: Number(lng.toFixed(6)),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      setPuntosDb(prev => prev.map(p => p.id === id ? { ...p, lat, lng } : p));
      setFeedbackMsg(`✓ Posición de "${nombre}" actualizada.`);
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err) {
      console.error('Error actualizando posición:', err.message);
    }
  };

  // Guardar posición personalizada de un Líder de Sector
  const handleGuardarPosicionLider = async (liderNombre, lat, lng) => {
    try {
      const latNum = Number(lat.toFixed(6));
      const lngNum = Number(lng.toFixed(6));
      const existing = puntosDb.find(p => p.tipo === 'mando' && p.nombre === liderNombre && p.sede_id === selectedSedeId);
      
      if (existing) {
        await supabase.from('puntos_tacticos').update({ 
          lat: latNum, 
          lng: lngNum, 
          updated_at: new Date().toISOString() 
        }).eq('id', existing.id);
        
        setPuntosDb(prev => prev.map(p => p.id === existing.id ? { ...p, lat: latNum, lng: lngNum } : p));
      } else {
        const nuevo = {
          sede_id: selectedSedeId,
          tipo: 'mando',
          nombre: liderNombre,
          descripcion: `Puesto de Mando - Líder ${liderNombre}`,
          lat: latNum,
          lng: lngNum,
          icono: '🛡️',
          color: '#6B0D12'
        };
        const { data, error } = await supabase.from('puntos_tacticos').insert([nuevo]).select();
        if (!error && data) {
          setPuntosDb(prev => [...prev, ...data]);
        }
      }
      setFeedbackMsg(`✓ Posición táctica del Líder "${liderNombre}" guardada.`);
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err) {
      console.error('Error guardando posición de líder:', err);
    }
  };

  // Guardar posición personalizada de un Guía (Cuadrilla)
  const handleGuardarPosicionGuia = async (guia, lat, lng) => {
    try {
      const latNum = Number(lat.toFixed(6));
      const lngNum = Number(lng.toFixed(6));
      const existing = puntosDb.find(p => p.tipo === 'cuadrilla' && p.cuadrilla_codigo === guia.cuadrilla_codigo);
      
      if (existing) {
        await supabase.from('puntos_tacticos').update({ 
          lat: latNum, 
          lng: lngNum, 
          updated_at: new Date().toISOString() 
        }).eq('id', existing.id);
        
        setPuntosDb(prev => prev.map(p => p.id === existing.id ? { ...p, lat: latNum, lng: lngNum } : p));
      } else {
        const nuevo = {
          sede_id: selectedSedeId,
          tipo: 'cuadrilla',
          nombre: `Guía: ${guia.guia_nombre}`,
          descripcion: `Cuadrilla ${guia.cuadrilla_codigo} - Líder: ${guia.lider_nombre}`,
          cuadrilla_codigo: guia.cuadrilla_codigo,
          lat: latNum,
          lng: lngNum,
          icono: '📍',
          color: '#9B1C22'
        };
        const { data, error } = await supabase.from('puntos_tacticos').insert([nuevo]).select();
        if (!error && data) {
          setPuntosDb(prev => [...prev, ...data]);
        }
      }
      setFeedbackMsg(`✓ Posición de ${guia.cuadrilla_codigo} (${guia.guia_nombre}) guardada.`);
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err) {
      console.error('Error guardando posición de guía:', err);
    }
  };

  // FUNCIONES DE REASIGNACIÓN DINÁMICA DE SEDES
  const handleReasignarCuadrilla = async (cuadrillaId, cuadrillaCodigo, nuevaSedeId) => {
    try {
      const { error } = await supabase
        .from('estructura_mandos')
        .update({ sede_id: nuevaSedeId, updated_at: new Date().toISOString() })
        .eq('id', cuadrillaId);

      if (error) throw error;

      await supabase
        .from('puntos_tacticos')
        .update({ sede_id: nuevaSedeId })
        .eq('cuadrilla_codigo', cuadrillaCodigo);

      setMandosDb(prev => prev.map(m => m.id === cuadrillaId ? { ...m, sede_id: nuevaSedeId } : m));
      setPuntosDb(prev => prev.map(p => p.cuadrilla_codigo === cuadrillaCodigo ? { ...p, sede_id: nuevaSedeId } : p));

      const nombreSede = SEDES_DIOCESIS.find(s => s.id === nuevaSedeId)?.nombre || nuevaSedeId;
      setFeedbackMsg(`✓ Cuadrilla ${cuadrillaCodigo} reasignada a: ${nombreSede}`);
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err) {
      alert(`Error al reasignar cuadrilla: ${err.message}`);
    }
  };

  const handleReasignarLider = async (liderNombreTarget, nuevaSedeId) => {
    try {
      const { error } = await supabase
        .from('estructura_mandos')
        .update({ sede_id: nuevaSedeId, updated_at: new Date().toISOString() })
        .eq('lider_nombre', liderNombreTarget);

      if (error) throw error;

      await supabase
        .from('puntos_tacticos')
        .update({ sede_id: nuevaSedeId })
        .eq('tipo', 'mando')
        .eq('nombre', liderNombreTarget);

      setMandosDb(prev => prev.map(m => m.lider_nombre === liderNombreTarget ? { ...m, sede_id: nuevaSedeId } : m));
      setPuntosDb(prev => prev.map(p => (p.tipo === 'mando' && p.nombre === liderNombreTarget) ? { ...p, sede_id: nuevaSedeId } : p));

      const nombreSede = SEDES_DIOCESIS.find(s => s.id === nuevaSedeId)?.nombre || nuevaSedeId;
      setFeedbackMsg(`✓ Líder "${liderNombreTarget}" y todas sus cuadrillas reasignados a: ${nombreSede}`);
      setShowReasignarModal(false);
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err) {
      alert(`Error al reasignar líder: ${err.message}`);
    }
  };

  const handleReasignarResponsable = async (responsableNombreTarget, nuevaSedeId) => {
    try {
      const { error } = await supabase
        .from('estructura_mandos')
        .update({ sede_id: nuevaSedeId, updated_at: new Date().toISOString() })
        .eq('responsable_nombre', responsableNombreTarget);

      if (error) throw error;

      setMandosDb(prev => prev.map(m => m.responsable_nombre === responsableNombreTarget ? { ...m, sede_id: nuevaSedeId } : m));

      const nombreSede = SEDES_DIOCESIS.find(s => s.id === nuevaSedeId)?.nombre || nuevaSedeId;
      setFeedbackMsg(`✓ Responsable "${responsableNombreTarget}" y toda su dotación reasignados a: ${nombreSede}`);
      setShowReasignarModal(false);
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err) {
      alert(`Error al reasignar responsable: ${err.message}`);
    }
  };

  // Dibujar marcadores reales en el mapa
  const renderMarkers = () => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    // 1. Marcador principal de la Sede (Arrastrable en Modo Editor)
    const sedeIcon = L.divIcon({
      className: 'custom-sede-icon',
      html: `
        <div style="background-color: #6B0D12; border: 3px solid #B5871D; color: white; width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.4); cursor: ${isEditorMode ? 'grab' : 'pointer'};">
          ${currentSede.icono}
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22]
    });

    const sedeMarker = L.marker([currentSede.lat, currentSede.lng], { 
      icon: sedeIcon,
      draggable: isEditorMode
    });

    if (isEditorMode) {
      sedeMarker.on('dragend', (e) => {
        const { lat, lng } = e.target.getLatLng();
        const updated = {
          ...customSedesCoords,
          [currentSede.id]: { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) }
        };
        setCustomSedesCoords(updated);
        try {
          localStorage.setItem('sedes_custom_coords', JSON.stringify(updated));
        } catch (err) {
          console.error('Error guardando posición de sede:', err);
        }
        setFeedbackMsg(`✓ Posición de "${currentSede.nombre}" actualizada.`);
        setTimeout(() => setFeedbackMsg(null), 3000);
      });
    }

    const isCustomSede = !!customSedesCoords[currentSede.id];
    const sedePopupContent = document.createElement('div');
    sedePopupContent.style.fontFamily = 'sans-serif';
    sedePopupContent.style.minWidth = '200px';
    sedePopupContent.innerHTML = `
      <strong style="color: #6B0D12; font-size: 14px; display: block;">${currentSede.nombre}</strong>
      <span style="font-size: 11px; color: #666; display: block; margin-top: 2px;">${currentSede.tipo}</span>
      <span style="font-size: 11px; font-weight: bold; color: #B5871D; display: block; margin-top: 2px;">Dotación asignada: ${mandosDeEstaSede.length} cuadrillas (${responsablesDeEstaSede.length} Responsables • ${lideresDeEstaSede.length} Líderes)</span>
      <span style="font-size: 10px; color: #888; font-family: monospace; display: block; margin-top: 4px;">Coord: ${currentSede.lat.toFixed(5)}, ${currentSede.lng.toFixed(5)}</span>
      ${isEditorMode ? `
        <div style="margin-top: 6px; padding: 4px 6px; background-color: #FEF3C7; color: #92400E; font-size: 10px; font-weight: bold; border-radius: 4px;">
          🖐️ MODO EDITOR: Arrastra este icono para reubicar la Sede
        </div>
      ` : ''}
    `;

    if (canEdit && isEditorMode && isCustomSede) {
      const resetBtn = document.createElement('button');
      resetBtn.innerText = '↩️ Restablecer posición original';
      resetBtn.style.marginTop = '6px';
      resetBtn.style.padding = '4px 8px';
      resetBtn.style.fontSize = '10px';
      resetBtn.style.fontWeight = 'bold';
      resetBtn.style.color = '#78350F';
      resetBtn.style.backgroundColor = '#FDE68A';
      resetBtn.style.border = '1px solid #F59E0B';
      resetBtn.style.borderRadius = '6px';
      resetBtn.style.cursor = 'pointer';
      resetBtn.style.width = '100%';
      resetBtn.onclick = () => handleResetSedePos(currentSede.id);
      sedePopupContent.appendChild(resetBtn);
    }

    sedeMarker.bindPopup(sedePopupContent);
    markersLayerRef.current.addLayer(sedeMarker);

    // 2. Marcadores de Emergencia / Logística (Puntos Tácticos de Supabase)
    const puntosSede = puntosDb.filter(p => p.sede_id === selectedSedeId && p.tipo !== 'mando' && p.tipo !== 'cuadrilla');

    if (activePoiFilter && puntosSede.length > 0) {
      puntosSede.forEach(poi => {
        const poiIcon = L.divIcon({
          className: 'custom-poi-icon',
          html: `
            <div style="background-color: ${poi.color || '#2563EB'}; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.35); cursor: ${isEditorMode ? 'grab' : 'pointer'};">
              ${poi.icono || '📍'}
            </div>
          `,
          iconSize: [34, 34],
          iconAnchor: [17, 17]
        });

        const poiMarker = L.marker([Number(poi.lat), Number(poi.lng)], { 
          icon: poiIcon,
          draggable: isEditorMode
        });

        if (isEditorMode) {
          poiMarker.on('dragend', (e) => {
            const { lat, lng } = e.target.getLatLng();
            handleActualizarPosicion(poi.id, lat, lng, poi.nombre);
          });
        }

        const popupContent = document.createElement('div');
        popupContent.style.fontFamily = 'sans-serif';
        popupContent.style.minWidth = '180px';
        popupContent.innerHTML = `
          <strong style="color: #6B0D12; font-size: 13px; display: block;">${poi.nombre}</strong>
          <span style="font-size: 11px; color: #555; display: block; margin-top: 2px;">${poi.descripcion || 'Punto de apoyo'}</span>
          <span style="font-size: 10px; color: #888; font-family: monospace; display: block; margin-top: 4px;">Coord: ${Number(poi.lat).toFixed(5)}, ${Number(poi.lng).toFixed(5)}</span>
          ${isEditorMode ? `
            <div style="margin-top: 4px; padding: 2px 4px; background-color: #FEF3C7; color: #92400E; font-size: 9px; font-weight: bold; border-radius: 4px;">
              🖐️ Arrástrame para mover este punto
            </div>
          ` : ''}
        `;

        if (canEdit && isEditorMode) {
          const deleteBtn = document.createElement('button');
          deleteBtn.innerText = '🗑️ Eliminar Punto';
          deleteBtn.style.marginTop = '8px';
          deleteBtn.style.padding = '4px 8px';
          deleteBtn.style.fontSize = '11px';
          deleteBtn.style.fontWeight = 'bold';
          deleteBtn.style.color = 'white';
          deleteBtn.style.backgroundColor = '#E11D48';
          deleteBtn.style.border = 'none';
          deleteBtn.style.borderRadius = '6px';
          deleteBtn.style.cursor = 'pointer';
          deleteBtn.style.width = '100%';
          deleteBtn.onclick = () => handleEliminarPunto(poi.id, poi.nombre);
          popupContent.appendChild(deleteBtn);
        }

        poiMarker.bindPopup(popupContent);
        markersLayerRef.current.addLayer(poiMarker);
      });
    }

    // 3. VISTA JERÁRQUICA DE MANDOS (LÍDERES Y GUÍAS)
    // Para Guías no-admin que traen su propia cuadrilla
    if (!canEdit && cuadrillasLista.length > 0) {
      cuadrillasLista.forEach((c, idx) => {
        const cLat = c.lat || (currentSede.lat + (Math.sin(idx * 0.8) * 0.0012));
        const cLng = c.lng || (currentSede.lng + (Math.cos(idx * 0.8) * 0.0014));
        const isConfirmed = c.estado_dia_d === 'presente' || gpsConfirmed;
        const isMyCuadrilla = (c.cuadrilla_codigo === cuadrillaCodigo) || (rol === 'guia');

        const pinBg = isConfirmed ? '#059669' : isMyCuadrilla ? '#9B1C22' : '#64748B';
        const cIcon = L.divIcon({
          className: 'custom-cua-icon',
          html: `
            <div style="background-color: ${pinBg}; border: 2px solid white; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; font-family: monospace; box-shadow: 0 2px 6px rgba(0,0,0,0.35);">
              ${c.cuadrilla_codigo ? c.cuadrilla_codigo.replace('CUA-', '') : idx + 1}
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        const cuaMarker = L.marker([cLat, cLng], { icon: cIcon })
          .bindPopup(`
            <div style="font-family: sans-serif; min-width: 160px;">
              <strong style="color: #6B0D12; font-size: 13px;">${c.cuadrilla_codigo || 'CUA'}</strong><br/>
              <span style="font-size: 12px; font-weight: bold;">${c.guia_nombre || 'Guía Asignado'}</span><br/>
              <span style="font-size: 11px; color: #666;">Líder: ${c.lider_nombre || liderNombre}</span><br/>
              <span style="display: inline-block; margin-top: 4px; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; background-color: ${isConfirmed ? '#D1FAE5' : '#FEF3C7'}; color: ${isConfirmed ? '#065F46' : '#92400E'};">
                ${isConfirmed ? '✓ EN POSICIÓN' : '⏳ PENDIENTE'}
              </span>
            </div>
          `);

        cuaMarker.on('click', () => setSelectedCuadrilla(c));
        markersLayerRef.current.addLayer(cuaMarker);
      });
      return;
    }

    // Para el ADMINISTRADOR: Filtrado táctico por Responsable y Líder
    // CASO A: Sin filtro de líder -> Mostramos los Puestos de Mando de los Líderes (filtrados por Responsable si aplica)
    if (selectedLider === '') {
      lideresDeEstaSede.forEach((lid, idx) => {
        const savedLidPoint = puntosDb.find(p => p.tipo === 'mando' && p.nombre === lid.lider_nombre && p.sede_id === selectedSedeId);
        
        let lLat, lLng;
        if (savedLidPoint) {
          lLat = Number(savedLidPoint.lat);
          lLng = Number(savedLidPoint.lng);
        } else {
          const totalLids = Math.max(lideresDeEstaSede.length, 1);
          const angle = (idx * (2 * Math.PI / totalLids)) - (Math.PI / 2);
          const ringRadius = 0.0016 + ((idx % 3) * 0.0008);
          lLat = currentSede.lat + (ringRadius * Math.sin(angle));
          lLng = currentSede.lng + (ringRadius * 1.35 * Math.cos(angle));
        }

        const lidIcon = L.divIcon({
          className: 'custom-lider-icon',
          html: `
            <div style="background-color: #6B0D12; border: 2.5px solid #F59E0B; color: #FFF; width: 38px; height: 38px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(107,13,18,0.5); cursor: ${isEditorMode ? 'grab' : 'pointer'};">
              <span style="font-size: 13px; line-height: 1;">🛡️</span>
              <span style="font-size: 8px; font-weight: 800; color: #FDE68A; margin-top: 1px;">${lid.guias.length}G</span>
            </div>
          `,
          iconSize: [38, 38],
          iconAnchor: [19, 19]
        });

        const lidMarker = L.marker([lLat, lLng], {
          icon: lidIcon,
          draggable: isEditorMode
        });

        if (isEditorMode) {
          lidMarker.on('dragend', (e) => {
            const { lat, lng } = e.target.getLatLng();
            handleGuardarPosicionLider(lid.lider_nombre, lat, lng);
          });
        }

        const lidPopup = document.createElement('div');
        lidPopup.style.fontFamily = 'sans-serif';
        lidPopup.style.minWidth = '220px';
        lidPopup.innerHTML = `
          <div style="display: flex; items-center; gap: 6px; border-bottom: 1px solid #E5E7EB; padding-bottom: 4px; margin-bottom: 6px;">
            <span style="font-size: 16px;">🛡️</span>
            <div>
              <strong style="color: #6B0D12; font-size: 13px; display: block;">Líder de Sector</strong>
              <span style="font-size: 11px; font-weight: 700; color: #111;">${lid.lider_nombre}</span>
            </div>
          </div>
          <span style="font-size: 10px; color: #666; display: block;">DNI: <strong>${lid.lider_dni || 'N/A'}</strong></span>
          <span style="font-size: 10px; color: #666; display: block;">Coordinador/Responsable: <strong>${lid.responsable_nombre || 'Comisión Central'}</strong></span>
          <div style="margin-top: 6px; padding: 4px 8px; background-color: #FEF3C7; border-radius: 6px; font-size: 11px; font-weight: bold; color: #92400E;">
            👥 ${lid.guias.length} Guías a cargo (~${lid.guias.length * 10} voluntarios)
          </div>
          ${isEditorMode ? `
            <div style="margin-top: 6px; padding: 3px 6px; background-color: #EFF6FF; color: #1E40AF; font-size: 9px; font-weight: bold; border-radius: 4px;">
              🖐️ MODO EDITOR: Arrastra este puesto de mando para ubicarlo
            </div>
          ` : ''}
        `;

        const deployBtn = document.createElement('button');
        deployBtn.innerText = `👁️ Desplegar sus ${lid.guias.length} Guías`;
        deployBtn.style.marginTop = '8px';
        deployBtn.style.padding = '6px 10px';
        deployBtn.style.fontSize = '11px';
        deployBtn.style.fontWeight = 'bold';
        deployBtn.style.color = 'white';
        deployBtn.style.backgroundColor = '#9B1C22';
        deployBtn.style.border = 'none';
        deployBtn.style.borderRadius = '6px';
        deployBtn.style.cursor = 'pointer';
        deployBtn.style.width = '100%';
        deployBtn.onclick = () => {
          if (!selectedResponsable && lid.responsable_nombre) {
            setSelectedResponsable(lid.responsable_nombre);
          }
          setSelectedLider(lid.lider_nombre);
          if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo([lLat, lLng], 17, { duration: 1 });
          }
        };
        lidPopup.appendChild(deployBtn);

        // Botón rápido para reasignar este líder a otra sede
        if (canEdit) {
          const moveLidBtn = document.createElement('button');
          moveLidBtn.innerText = `🏛️ Reasignar Líder y sus ${lid.guias.length} Guías`;
          moveLidBtn.style.marginTop = '6px';
          moveLidBtn.style.padding = '5px 8px';
          moveLidBtn.style.fontSize = '10px';
          moveLidBtn.style.fontWeight = 'bold';
          moveLidBtn.style.color = '#1E3A8A';
          moveLidBtn.style.backgroundColor = '#DBEAFE';
          moveLidBtn.style.border = '1px solid #93C5FD';
          moveLidBtn.style.borderRadius = '6px';
          moveLidBtn.style.cursor = 'pointer';
          moveLidBtn.style.width = '100%';
          moveLidBtn.onclick = () => {
            setReasignarTab('lider');
            setReasignarTargetLid(lid.lider_nombre);
            setShowReasignarModal(true);
          };
          lidPopup.appendChild(moveLidBtn);
        }

        lidMarker.bindPopup(lidPopup);
        markersLayerRef.current.addLayer(lidMarker);
      });
    }

    // CASO B: Un Líder Seleccionado (O 'TODOS')
    if (selectedLider !== '') {
      const activeLideres = selectedLider === 'TODOS' 
        ? lideresDeEstaSede 
        : lideresDeEstaSede.filter(l => l.lider_nombre === selectedLider);

      activeLideres.forEach((lid, lIdx) => {
        // Posición del Líder
        const savedLidPoint = puntosDb.find(p => p.tipo === 'mando' && p.nombre === lid.lider_nombre && p.sede_id === selectedSedeId);
        let lLat, lLng;
        if (savedLidPoint) {
          lLat = Number(savedLidPoint.lat);
          lLng = Number(savedLidPoint.lng);
        } else {
          const totalLids = Math.max(lideresDeEstaSede.length, 1);
          const angle = (lIdx * (2 * Math.PI / totalLids)) - (Math.PI / 2);
          const ringRadius = 0.0016 + ((lIdx % 3) * 0.0008);
          lLat = currentSede.lat + (ringRadius * Math.sin(angle));
          lLng = currentSede.lng + (ringRadius * 1.35 * Math.cos(angle));
        }

        // Marcador destacado del Líder
        const lidIcon = L.divIcon({
          className: 'custom-lider-active-icon',
          html: `
            <div style="background-color: #6B0D12; border: 3px solid #F59E0B; color: #FFF; width: 44px; height: 44px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 0 0 6px rgba(245, 158, 11, 0.35), 0 4px 12px rgba(0,0,0,0.5); cursor: ${isEditorMode ? 'grab' : 'pointer'};">
              <span style="font-size: 16px; line-height: 1;">👑</span>
              <span style="font-size: 8px; font-weight: 900; color: #FDE68A;">LÍDER</span>
            </div>
          `,
          iconSize: [44, 44],
          iconAnchor: [22, 22]
        });

        const lidMarker = L.marker([lLat, lLng], {
          icon: lidIcon,
          draggable: isEditorMode
        });

        if (isEditorMode) {
          lidMarker.on('dragend', (e) => {
            const { lat, lng } = e.target.getLatLng();
            handleGuardarPosicionLider(lid.lider_nombre, lat, lng);
          });
        }

        lidMarker.bindPopup(`
          <div style="font-family: sans-serif; min-width: 200px;">
            <strong style="color: #6B0D12; font-size: 13px;">Puesto de Mando del Líder</strong><br/>
            <span style="font-size: 12px; font-weight: bold;">${lid.lider_nombre}</span><br/>
            <span style="font-size: 11px; color: #666;">Coordinador/Responsable: <strong>${lid.responsable_nombre || 'Comisión Central'}</strong></span><br/>
            <span style="font-size: 11px; color: #666;">Cuadrillas bajo su mando: <strong>${lid.guias.length} Guías</strong></span>
          </div>
        `);
        markersLayerRef.current.addLayer(lidMarker);

        // Marcadores de cada Guía bajo este Líder
        lid.guias.forEach((g, gIdx) => {
          const savedGuiaPoint = puntosDb.find(p => p.tipo === 'cuadrilla' && p.cuadrilla_codigo === g.cuadrilla_codigo);
          
          let gLat, gLng;
          if (savedGuiaPoint) {
            gLat = Number(savedGuiaPoint.lat);
            gLng = Number(savedGuiaPoint.lng);
          } else {
            const totalGuias = Math.max(lid.guias.length, 1);
            const gAngle = gIdx * (2 * Math.PI / totalGuias);
            const gRadius = 0.00065;
            gLat = lLat + (gRadius * Math.sin(gAngle));
            gLng = lLng + (gRadius * 1.35 * Math.cos(gAngle));
          }

          const gNum = g.cuadrilla_codigo ? g.cuadrilla_codigo.replace('CUA-', '') : gIdx + 1;
          const guiaIcon = L.divIcon({
            className: 'custom-guia-tactico-icon',
            html: `
              <div style="background-color: #9B1C22; border: 2px solid white; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.35); cursor: ${isEditorMode ? 'grab' : 'pointer'};">
                <span style="font-size: 9px; font-weight: 900; line-height: 1; font-family: monospace;">${gNum}</span>
                <span style="font-size: 6px; font-weight: 700; opacity: 0.9;">GUÍA</span>
              </div>
            `,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
          });

          const guiaMarker = L.marker([gLat, gLng], {
            icon: guiaIcon,
            draggable: isEditorMode
          });

          if (isEditorMode) {
            guiaMarker.on('dragend', (e) => {
              const { lat, lng } = e.target.getLatLng();
              handleGuardarPosicionGuia(g, lat, lng);
            });
          }

          const guiaPopupContent = document.createElement('div');
          guiaPopupContent.style.fontFamily = 'sans-serif';
          guiaPopupContent.style.minWidth = '200px';
          guiaPopupContent.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #E5E7EB; padding-bottom: 4px; margin-bottom: 4px;">
              <strong style="color: #6B0D12; font-size: 13px;">${g.cuadrilla_codigo}</strong>
              <span style="font-size: 9px; font-weight: bold; padding: 2px 5px; border-radius: 4px; background-color: #EFF6FF; color: #1E40AF;">
                10 Voluntarios
              </span>
            </div>
            <span style="font-size: 12px; font-weight: bold; display: block; color: #111;">${g.guia_nombre}</span>
            <span style="font-size: 10px; color: #666; display: block;">DNI: ${g.guia_dni || 'N/A'}</span>
            <span style="font-size: 10px; color: #666; display: block; margin-top: 2px;">Líder: <strong>${g.lider_nombre}</strong></span>
            <span style="font-size: 10px; color: #666; display: block;">Coordinador/Responsable: <strong>${g.responsable_nombre}</strong></span>
            <div style="margin-top: 6px; font-size: 10px; font-weight: bold; color: ${g.guia_carta ? '#065F46' : '#92400E'};">
              ${g.guia_carta ? '✓ Carta Compromiso Firmada' : '⏳ Carta Pendiente'}
            </div>
          `;

          // Control rápido para reasignar este Guía individual a otra sede
          if (canEdit) {
            const reasignarBox = document.createElement('div');
            reasignarBox.style.marginTop = '8px';
            reasignarBox.style.paddingTop = '6px';
            reasignarBox.style.borderTop = '1px dashed #D1D5DB';
            reasignarBox.innerHTML = `
              <span style="font-size: 9px; font-weight: bold; color: #6B7280; display: block; margin-bottom: 3px;">Reasignar a otra Sede:</span>
            `;

            const selectSede = document.createElement('select');
            selectSede.style.width = '100%';
            selectSede.style.padding = '4px 6px';
            selectSede.style.fontSize = '10px';
            selectSede.style.borderRadius = '6px';
            selectSede.style.border = '1px solid #D1D5DB';
            selectSede.style.backgroundColor = '#F9FAFB';

            SEDES_DIOCESIS.forEach(s => {
              const opt = document.createElement('option');
              opt.value = s.id;
              opt.innerText = `${s.icono} ${s.nombre}`;
              if (s.id === selectedSedeId) opt.selected = true;
              selectSede.appendChild(opt);
            });

            selectSede.onchange = (e) => {
              const nueva = e.target.value;
              if (nueva !== selectedSedeId) {
                handleReasignarCuadrilla(g.id, g.cuadrilla_codigo, nueva);
              }
            };

            reasignarBox.appendChild(selectSede);
            guiaPopupContent.appendChild(reasignarBox);
          }

          guiaMarker.bindPopup(guiaPopupContent);
          guiaMarker.on('click', () => setSelectedCuadrilla(g));
          markersLayerRef.current.addLayer(guiaMarker);
        });
      });
    }
  };

  useEffect(() => {
    renderMarkers();
  }, [puntosDb, activePoiFilter, isEditorMode, gpsConfirmed, customSedesCoords, selectedSedeId, selectedResponsable, selectedLider, mandosDb, cuadrillasLista]);

  // Centrar en ubicación GPS
  const handleLocateMe = () => {
    setGpsLoading(true);
    if (!('geolocation' in navigator)) {
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setGpsLocation({
          lat: lat.toFixed(6),
          lng: lng.toFixed(6),
          accuracy: Math.round(position.coords.accuracy),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        setGpsConfirmed(true);
        setGpsLoading(false);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([lat, lng], 18);

          const myPosIcon = L.divIcon({
            className: 'my-location-icon',
            html: `
              <div style="background-color: #2563EB; border: 3px solid white; width: 22px; height: 22px; border-radius: 50%; box-shadow: 0 0 0 8px rgba(37,99,235,0.3);"></div>
            `,
            iconSize: [22, 22],
            iconAnchor: [11, 11]
          });

          L.marker([lat, lng], { icon: myPosIcon })
            .addTo(mapInstanceRef.current)
            .bindPopup('<strong>📍 Tu Posición Actual (GPS)</strong>')
            .openPopup();
        }
      },
      () => {
        setGpsConfirmed(true);
        setGpsLoading(false);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([currentSede.lat, currentSede.lng], 18);
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSelectSearchResult = (mando) => {
    const targetSede = mando.sede_id || getSedeIdByCuadrilla(mando.cuadrilla_codigo);
    if (targetSede !== selectedSedeId) {
      setSelectedSedeId(targetSede);
    }
    setSelectedResponsable(mando.responsable_nombre || '');
    setSelectedLider(mando.lider_nombre || '');
    setSearchTerm('');

    const savedGuiaPoint = puntosDb.find(p => p.tipo === 'cuadrilla' && p.cuadrilla_codigo === mando.cuadrilla_codigo);
    const targetSedeObj = SEDES_DIOCESIS.find(s => s.id === targetSede) || currentSede;
    const destLat = savedGuiaPoint ? Number(savedGuiaPoint.lat) : targetSedeObj.lat;
    const destLng = savedGuiaPoint ? Number(savedGuiaPoint.lng) : targetSedeObj.lng;

    if (mapInstanceRef.current) {
      setTimeout(() => {
        mapInstanceRef.current.flyTo([destLat, destLng], 18, { duration: 1.2 });
      }, 300);
    }
  };

  const currentLiderData = lideresDeEstaSede.find(l => l.lider_nombre === selectedLider);
  const currentResponsableData = responsablesDeEstaSede.find(r => r.responsable_nombre === selectedResponsable);

  return (
    <div className="bg-white rounded-3xl border-2 border-diocesis-mustard/40 shadow-md overflow-hidden flex flex-col font-sans">
      
      {/* CABECERA CON ESTILO DIÓCESIS */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-diocesis-redDark via-diocesis-red to-diocesis-redDark text-white flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-diocesis-mustard">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-diocesis-mustard text-diocesis-redDark tracking-wider">
              {canEdit ? 'Panel Táctico del Administrador' : 'Mapa Oficial'}
            </span>
            <span className="text-xs text-diocesis-mustardLight font-semibold">
              Región Lambayeque • Diócesis de Chiclayo
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-title font-bold text-white mt-1 flex items-center gap-2">
            <Globe className="w-5 h-5 text-diocesis-mustard" />
            Mapa Real de Despliegue Papal
          </h3>
          <p className="text-xs text-stone-200">
            {canEdit 
              ? isEditorMode 
                ? '👉 MODO EDITOR ACTIVO: Arrastra puestos de mando de Líderes o Guías para fijar su posición en campo'
                : `Cadena de Mando: Responsables Generales → Líderes de Sector → Guías de Cuadrilla en ${currentSede.nombre}` 
              : `Calles, accesos y puestos de auxilio en ${currentSede.nombre}`}
          </p>
        </div>

        {/* Acciones de Cabecera */}
        <div className="flex items-center gap-2 flex-wrap">
          
          {/* BOTÓN REASIGNAR SEDES (EXCLUSIVO ADMINISTRADOR / COMISIÓN) */}
          {canEdit && (
            <button
              onClick={() => setShowReasignarModal(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-sm cursor-pointer border bg-white/15 hover:bg-white/25 text-white border-white/20"
              title="Reasignar Responsables, Líderes o Guías entre Sedes"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-diocesis-mustardLight" />
              Reasignar Sedes
            </button>
          )}

          {/* BOTÓN MODO EDITOR (EXCLUSIVO ADMINISTRADOR / COMISIÓN) */}
          {canEdit && (
            <button
              onClick={() => setIsEditorMode(!isEditorMode)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-sm cursor-pointer border ${
                isEditorMode 
                  ? 'bg-amber-400 text-diocesis-redDark border-amber-300 ring-2 ring-amber-300 animate-pulse' 
                  : 'bg-white/15 hover:bg-white/25 text-white border-white/20'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              {isEditorMode ? 'Editor Activo (Arrastra puntos)' : 'Activar Modo Editor'}
            </button>
          )}

          {/* Alternar Callejero vs Satélite */}
          <div className="bg-black/25 p-1 rounded-xl flex items-center border border-white/10 text-xs">
            <button
              onClick={() => toggleMapType('callejero')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                mapType === 'callejero' 
                  ? 'bg-diocesis-mustard text-diocesis-redDark shadow-xs' 
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" /> Callejero
            </button>
            <button
              onClick={() => toggleMapType('satelite')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                mapType === 'satelite' 
                  ? 'bg-diocesis-mustard text-diocesis-redDark shadow-xs' 
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Satélite
            </button>
          </div>

          <button
            onClick={handleLocateMe}
            disabled={gpsLoading}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer ${
              gpsConfirmed
                ? 'bg-emerald-600 text-white hover:bg-emerald-700 border border-emerald-400'
                : 'bg-diocesis-mustard text-diocesis-redDark hover:bg-diocesis-mustardLight border border-amber-300'
            }`}
          >
            <Navigation className={`w-4 h-4 ${gpsLoading ? 'animate-spin' : ''}`} />
            {gpsLoading ? 'Ubicando...' : gpsConfirmed ? '✓ Mi Ubicación' : 'GPS'}
          </button>
        </div>
      </div>

      {/* FEEDBACK BANNER (SI SE CREA O MUEVE UN PUNTO) */}
      {feedbackMsg && (
        <div className="bg-emerald-50 border-b border-emerald-300 text-emerald-900 px-4 py-2 text-xs font-bold flex items-center justify-between">
          <span>{feedbackMsg}</span>
          <button onClick={() => setFeedbackMsg(null)} className="text-emerald-700 hover:text-emerald-950">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* SELECTOR DE LAS 6 SEDES DIOCESANAS OFICIALES */}
      <div className="p-3 bg-diocesis-cream border-b border-diocesis-mustard/30 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          <span className="text-[11px] font-extrabold uppercase text-stone-500 mr-1 flex items-center gap-1">
            <Building className="w-3.5 h-3.5" /> Sede:
          </span>
          {SEDES_DIOCESIS.map((sede) => {
            const countEnSede = mandosDb.length > 0 
              ? mandosDb.filter(m => (m.sede_id || getSedeIdByCuadrilla(m.cuadrilla_codigo)) === sede.id).length 
              : sede.capacidadCuadrillas;

            return (
              <button
                key={sede.id}
                onClick={() => setSelectedSedeId(sede.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer border ${
                  selectedSedeId === sede.id
                    ? 'bg-diocesis-redDark text-white border-diocesis-redDark shadow-sm'
                    : 'bg-white text-stone-700 border-stone-200 hover:border-diocesis-mustard hover:bg-amber-50'
                }`}
              >
                <span>{sede.icono}</span>
                <span>{sede.nombre}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-extrabold ${selectedSedeId === sede.id ? 'bg-amber-400 text-diocesis-redDark' : 'bg-stone-100 text-stone-800'}`}>
                  {countEnSede} CUA
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* BARRA TÁCTICA DE FILTROS JERÁRQUICOS (RESPONSABLE -> LÍDER -> GUÍAS) */}
      {canEdit && (
        <div className="p-3 bg-stone-50 border-b border-stone-200 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 text-xs">
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
            {/* 1. Selector de Responsable General */}
            <div className="flex items-center gap-1.5 flex-1">
              <span className="font-bold text-stone-700 shrink-0 flex items-center gap-1">
                <UserCog className="w-3.5 h-3.5 text-diocesis-redDark" />
                <span>Responsable:</span>
              </span>
              <select
                value={selectedResponsable}
                onChange={(e) => {
                  setSelectedResponsable(e.target.value);
                  setSelectedLider('');
                }}
                className="w-full p-2 rounded-xl border border-stone-300 bg-white font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-diocesis-red text-xs"
              >
                <option value="">
                  👔 Todos los Responsables ({responsablesDeEstaSede.length} en sede)
                </option>
                {responsablesDeEstaSede.map((resp, idx) => (
                  <option key={idx} value={resp.responsable_nombre}>
                    👔 {resp.responsable_nombre} ({resp.lideresCount} Líderes • {resp.guiasCount} Guías)
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Selector de Líder de Sector */}
            <div className="flex items-center gap-1.5 flex-1">
              <span className="font-bold text-stone-700 shrink-0 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-diocesis-red" />
                <span>Líder:</span>
              </span>
              <select
                value={selectedLider}
                onChange={(e) => setSelectedLider(e.target.value)}
                className="w-full p-2 rounded-xl border border-stone-300 bg-white font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-diocesis-red text-xs"
              >
                <option value="">
                  🛡️ Puestos de Mando ({lideresDeEstaSede.length} Líderes)
                </option>
                {lideresDeEstaSede.map((lid, idx) => (
                  <option key={idx} value={lid.lider_nombre}>
                    👤 {lid.lider_nombre} ({lid.guias.length} Guías a cargo)
                  </option>
                ))}
                <option value="TODOS">
                  ⚠️ Mostrar todos los Guías de la selección ({mandosFiltradosPorResponsable.length} Guías)
                </option>
              </select>
            </div>
          </div>

          {/* 3. Buscador Rápido de Cuadrilla, Guía, Líder o Responsable */}
          <div className="relative w-full lg:w-72">
            <div className="relative">
              <input
                type="text"
                placeholder="🔍 Buscar Guía, Líder o CUA..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-stone-300 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-diocesis-red"
              />
              <Search className="w-4 h-4 text-stone-400 absolute left-2.5 top-2.5" />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Resultados de Búsqueda Flotantes */}
            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-2xl shadow-xl border border-stone-200 z-50 max-h-60 overflow-y-auto divide-y divide-stone-100">
                {searchResults.map((m, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSearchResult(m)}
                    className="w-full text-left p-2.5 hover:bg-amber-50/80 transition flex items-center justify-between text-xs cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-stone-900">
                        <span className="px-1.5 py-0.5 rounded bg-diocesis-red/10 text-diocesis-red font-mono text-[10px]">
                          {m.cuadrilla_codigo}
                        </span>
                        <span>{m.guia_nombre}</span>
                      </div>
                      <div className="text-[10px] text-stone-500 mt-0.5">
                        Líder: <span className="font-semibold">{m.lider_nombre}</span> • Resp: <span className="font-semibold">{m.responsable_nombre}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-diocesis-red font-bold">Ver →</span>
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* BREADCRUMB / BANNER DE FILTRO ACTIVO */}
      {canEdit && (selectedResponsable || selectedLider) && (
        <div className="px-5 py-2.5 bg-gradient-to-r from-amber-100 via-amber-50 to-stone-50 border-b border-amber-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-stone-500 font-bold">Nivel Activo:</span>
            
            {/* Chip de Responsable */}
            {selectedResponsable && (
              <span className="px-2.5 py-1 rounded-lg bg-diocesis-redDark text-white font-bold flex items-center gap-1.5">
                <span>👔 Resp: {selectedResponsable}</span>
                <button
                  onClick={() => {
                    setSelectedResponsable('');
                    setSelectedLider('');
                  }}
                  className="hover:text-amber-200 text-white cursor-pointer ml-1"
                  title="Quitar filtro de responsable"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}

            {/* Chip de Líder */}
            {selectedLider && selectedLider !== 'TODOS' && currentLiderData && (
              <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-stone-950 font-bold flex items-center gap-1.5">
                <span>👑 Líder: {currentLiderData.lider_nombre} ({currentLiderData.guias.length} Guías)</span>
                <button
                  onClick={() => setSelectedLider('')}
                  className="hover:text-red-900 text-stone-950 cursor-pointer ml-1"
                  title="Quitar filtro de líder"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {selectedLider && (
              <button
                onClick={() => setSelectedLider('')}
                className="px-3 py-1 bg-white hover:bg-amber-100 text-stone-700 font-bold rounded-lg border border-amber-300 transition flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Ver todos los Líderes
              </button>
            )}
            {selectedResponsable && (
              <button
                onClick={() => {
                  setSelectedResponsable('');
                  setSelectedLider('');
                }}
                className="px-3 py-1 bg-white hover:bg-stone-100 text-stone-700 font-bold rounded-lg border border-stone-300 transition cursor-pointer"
              >
                Ver todos los Responsables
              </button>
            )}
          </div>
        </div>
      )}

      {/* BARRA DE ESTADO Y PUNTOS DE AUXILIO */}
      <div className="px-5 py-2.5 bg-stone-50 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-600">
        <div className="flex items-center gap-2">
          <strong className="text-diocesis-redDark font-extrabold text-sm">{currentSede.nombre}</strong>
          <span className="text-stone-400">•</span>
          <span className="font-medium text-stone-600">{currentSede.tipo}</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-stone-600 text-xs">
            Resp: <strong className="text-stone-900">{responsablesDeEstaSede.length}</strong> | Líderes: <strong className="text-stone-900">{lideresDeEstaSede.length}</strong> | Guías: <strong className="text-stone-900">{mandosFiltradosPorResponsable.length}</strong>
          </span>
          <button
            onClick={() => setActivePoiFilter(!activePoiFilter)}
            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer border ${
              activePoiFilter 
                ? 'bg-diocesis-redDark text-white border-diocesis-redDark' 
                : 'bg-white text-stone-600 border-stone-300'
            }`}
          >
            {activePoiFilter ? '✓ Auxilios Visibles' : 'Mostrar Auxilios'}
          </button>
        </div>
      </div>

      {/* CONTENEDOR DEL MAPA REAL INTERACTIVO (LEAFLET) */}
      <div 
        ref={mapContainerRef} 
        className="w-full relative z-10"
        style={{ height: '520px', minHeight: '520px' }}
      />

      {/* MODAL PARA REASIGNAR SEDES (RESPONSABLE -> LÍDER -> GUÍA) */}
      {showReasignarModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border-2 border-diocesis-mustard space-y-4">
            
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-diocesis-redDark flex items-center justify-center font-bold text-lg">
                  🏛️
                </div>
                <div>
                  <h4 className="font-title font-bold text-base text-diocesis-redDark">
                    Reasignación Táctica de Sedes
                  </h4>
                  <span className="text-[11px] text-stone-500">
                    Mueve Responsables, Líderes o Guías a otra sede diocesana
                  </span>
                </div>
              </div>
              <button onClick={() => setShowReasignarModal(false)} className="text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selector de nivel a reasignar */}
            <div className="grid grid-cols-3 gap-2 bg-stone-100 p-1.5 rounded-2xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setReasignarTab('responsable')}
                className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
                  reasignarTab === 'responsable' ? 'bg-diocesis-red text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <UserCog className="w-3.5 h-3.5" /> Responsable
              </button>
              <button
                type="button"
                onClick={() => setReasignarTab('lider')}
                className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
                  reasignarTab === 'lider' ? 'bg-diocesis-red text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Shield className="w-3.5 h-3.5" /> Líder
              </button>
              <button
                type="button"
                onClick={() => setReasignarTab('guia')}
                className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
                  reasignarTab === 'guia' ? 'bg-diocesis-red text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" /> Guía (CUA)
              </button>
            </div>

            {/* TAB 1: REASIGNAR POR RESPONSABLE */}
            {reasignarTab === 'responsable' && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">
                    1. Selecciona el Responsable General a trasladar:
                  </label>
                  <select
                    value={reasignarTargetResp}
                    onChange={(e) => setReasignarTargetResp(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-300 font-medium text-stone-800"
                  >
                    <option value="">-- Elige un Responsable --</option>
                    {todosLosResponsables.map((r, i) => (
                      <option key={i} value={r}>👔 {r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-stone-700 block mb-1">
                    2. Sede de Destino (trasladará todos sus líderes y guías):
                  </label>
                  <select
                    value={reasignarDestinoSede}
                    onChange={(e) => setReasignarDestinoSede(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-300 font-medium text-stone-800"
                  >
                    {SEDES_DIOCESIS.map(s => (
                      <option key={s.id} value={s.id}>{s.icono} {s.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowReasignarModal(false)}
                    className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={!reasignarTargetResp || savingReasignacion}
                    onClick={() => handleReasignarResponsable(reasignarTargetResp, reasignarDestinoSede)}
                    className="px-4 py-2 bg-diocesis-red hover:bg-diocesis-redDark text-white rounded-xl font-extrabold transition shadow-sm disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    Reasignar Toda la Dotación
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: REASIGNAR POR LÍDER */}
            {reasignarTab === 'lider' && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">
                    1. Selecciona el Líder de Sector a trasladar:
                  </label>
                  <select
                    value={reasignarTargetLid}
                    onChange={(e) => setReasignarTargetLid(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-300 font-medium text-stone-800"
                  >
                    <option value="">-- Elige un Líder --</option>
                    {todosLosLideres.map((l, i) => (
                      <option key={i} value={l}>👤 {l}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-stone-700 block mb-1">
                    2. Sede de Destino (trasladará al líder y sus ~9 guías):
                  </label>
                  <select
                    value={reasignarDestinoSede}
                    onChange={(e) => setReasignarDestinoSede(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-300 font-medium text-stone-800"
                  >
                    {SEDES_DIOCESIS.map(s => (
                      <option key={s.id} value={s.id}>{s.icono} {s.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowReasignarModal(false)}
                    className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={!reasignarTargetLid || savingReasignacion}
                    onClick={() => handleReasignarLider(reasignarTargetLid, reasignarDestinoSede)}
                    className="px-4 py-2 bg-diocesis-red hover:bg-diocesis-redDark text-white rounded-xl font-extrabold transition shadow-sm disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    Reasignar Líder y Guías
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: REASIGNAR POR GUÍA / CUADRILLA INDIVIDUAL */}
            {reasignarTab === 'guia' && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">
                    1. Escribe o selecciona el Código de Cuadrilla (ej: CUA-015):
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: CUA-014"
                    value={reasignarTargetGuiaCode}
                    onChange={(e) => setReasignarTargetGuiaCode(e.target.value.toUpperCase())}
                    className="w-full p-2.5 rounded-xl border border-stone-300 font-mono text-xs focus:ring-2 focus:ring-diocesis-red uppercase"
                  />
                  {reasignarTargetGuiaCode && (
                    <span className="text-[10px] text-stone-500 block mt-1">
                      {mandosDb.find(m => m.cuadrilla_codigo === reasignarTargetGuiaCode.trim())
                        ? `✓ Guía encontrado: ${mandosDb.find(m => m.cuadrilla_codigo === reasignarTargetGuiaCode.trim()).guia_nombre}`
                        : 'Buscando cuadrilla en el padrón...'}
                    </span>
                  )}
                </div>

                <div>
                  <label className="font-bold text-stone-700 block mb-1">
                    2. Sede de Destino para esta cuadrilla:
                  </label>
                  <select
                    value={reasignarDestinoSede}
                    onChange={(e) => setReasignarDestinoSede(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-300 font-medium text-stone-800"
                  >
                    {SEDES_DIOCESIS.map(s => (
                      <option key={s.id} value={s.id}>{s.icono} {s.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowReasignarModal(false)}
                    className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={!reasignarTargetGuiaCode.trim() || savingReasignacion}
                    onClick={() => {
                      const found = mandosDb.find(m => m.cuadrilla_codigo === reasignarTargetGuiaCode.trim());
                      if (found) {
                        handleReasignarCuadrilla(found.id, found.cuadrilla_codigo, reasignarDestinoSede);
                        setShowReasignarModal(false);
                      } else {
                        alert('No se encontró una cuadrilla con ese código.');
                      }
                    }}
                    className="px-4 py-2 bg-diocesis-red hover:bg-diocesis-redDark text-white rounded-xl font-extrabold transition shadow-sm disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    Reasignar Cuadrilla
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* MODAL PARA AGREGAR NUEVO PUNTO TÁCTICO (AL HACER CLIC EN EL MAPA EN MODO EDITOR) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-diocesis-mustard space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-lg">
                  📍
                </div>
                <div>
                  <h4 className="font-title font-bold text-base text-diocesis-redDark">
                    Agregar Punto en {currentSede.nombre}
                  </h4>
                  <span className="text-[11px] text-stone-500 font-mono">
                    Lat: {newPointCoords?.lat.toFixed(5)}, Lng: {newPointCoords?.lng.toFixed(5)}
                  </span>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGuardarPunto} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-stone-700 block mb-1">Tipo de Punto</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewPointTipo('medica')}
                    className={`p-2 rounded-xl font-bold border transition flex flex-col items-center justify-center gap-1 ${
                      newPointTipo === 'medica' ? 'bg-rose-100 text-rose-900 border-rose-400' : 'bg-stone-50 border-stone-200'
                    }`}
                  >
                    <span className="text-base">🚑</span> Médica
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPointTipo('agua')}
                    className={`p-2 rounded-xl font-bold border transition flex flex-col items-center justify-center gap-1 ${
                      newPointTipo === 'agua' ? 'bg-blue-100 text-blue-900 border-blue-400' : 'bg-stone-50 border-stone-200'
                    }`}
                  >
                    <span className="text-base">💧</span> Hidratación
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPointTipo('puerta')}
                    className={`p-2 rounded-xl font-bold border transition flex flex-col items-center justify-center gap-1 ${
                      newPointTipo === 'puerta' ? 'bg-emerald-100 text-emerald-900 border-emerald-400' : 'bg-stone-50 border-stone-200'
                    }`}
                  >
                    <span className="text-base">🚪</span> Evacuación
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPointTipo('altar')}
                    className={`p-2 rounded-xl font-bold border transition flex flex-col items-center justify-center gap-1 ${
                      newPointTipo === 'altar' ? 'bg-amber-100 text-amber-900 border-amber-400' : 'bg-stone-50 border-stone-200'
                    }`}
                  >
                    <span className="text-base">✝️</span> Altar / Misa
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPointTipo('mando')}
                    className={`p-2 rounded-xl font-bold border transition flex flex-col items-center justify-center gap-1 ${
                      newPointTipo === 'mando' ? 'bg-purple-100 text-purple-900 border-purple-400' : 'bg-stone-50 border-stone-200'
                    }`}
                  >
                    <span className="text-base">🛡️</span> Mando
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPointTipo('cuadrilla')}
                    className={`p-2 rounded-xl font-bold border transition flex flex-col items-center justify-center gap-1 ${
                      newPointTipo === 'cuadrilla' ? 'bg-diocesis-cream text-diocesis-redDark border-diocesis-mustard' : 'bg-stone-50 border-stone-200'
                    }`}
                  >
                    <span className="text-base">📍</span> Guía / Cuad.
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">Nombre del Punto *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Ambulancia SAMU - Puerta 3"
                  value={newPointNombre}
                  onChange={(e) => setNewPointNombre(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-diocesis-red"
                />
              </div>

              {newPointTipo === 'cuadrilla' && (
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Código de Cuadrilla (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej: CUA-014"
                    value={newPointCuadrilla}
                    onChange={(e) => setNewPointCuadrilla(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-diocesis-red"
                  />
                </div>
              )}

              <div>
                <label className="font-bold text-stone-700 block mb-1">Descripción / Referencia</label>
                <textarea
                  rows={2}
                  placeholder="Ej: Personal con botiquín y 2 camillas para emergencias"
                  value={newPointDesc}
                  onChange={(e) => setNewPointDesc(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-diocesis-red"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPoint}
                  className="px-4 py-2 bg-diocesis-red hover:bg-diocesis-redLight text-white rounded-xl font-extrabold transition shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  {savingPoint ? 'Guardando...' : 'Guardar en Supabase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GUÍA TÁCTICA PARA CAMPO */}
      {rol === 'guia' && (
        <div className="p-4 bg-stone-50 border-t border-stone-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-2.5 rounded-xl bg-white border border-stone-200 flex items-center gap-2.5 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center text-sm font-bold">
              🚑
            </div>
            <div>
              <strong className="block text-stone-900 font-bold text-[11px]">Puesto de Auxilio Médico</strong>
              <span className="text-stone-500 text-[10px]">Identificado con icono rojo en el mapa</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-white border border-stone-200 flex items-center gap-2.5 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">
              💧
            </div>
            <div>
              <strong className="block text-stone-900 font-bold text-[11px]">Punto de Hidratación</strong>
              <span className="text-stone-500 text-[10px]">Bidones de agua y asistencia a cuadrillas</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-white border border-stone-200 flex items-center gap-2.5 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold">
              🚪
            </div>
            <div>
              <strong className="block text-stone-900 font-bold text-[11px]">Vía de Evacuación</strong>
              <span className="text-stone-500 text-[10px]">Corredores despejados para ambulancias</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
