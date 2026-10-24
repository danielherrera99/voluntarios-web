import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { supabase } from '../supabase';
import { 
  MapPin, Navigation, Shield, AlertTriangle, CheckCircle2, Clock, 
  HeartPulse, Droplets, ShieldAlert, Coffee, ExternalLink, RefreshCw,
  Eye, Phone, MessageCircle, Layers, ZoomIn, ZoomOut, Compass, Info,
  Building, Church, Landmark, Mountain, Car, Globe, Map, Plus, Trash2, Edit3, X, Check
} from 'lucide-react';

// Sedes oficiales de la Visita Papal en la Diócesis de Chiclayo (Coordenadas Reales de Lambayeque)
export const SEDES_DIOCESIS = [
  {
    id: 'misa-central',
    nombre: 'Explanada Misa Multitudinaria',
    ciudad: 'Chiclayo',
    tipo: 'Misa Central de la Juventud y Familias',
    capacidadCuadrillas: 450,
    voluntariosEstimados: 4050,
    lat: -6.778500,
    lng: -79.851000,
    zoom: 16,
    icono: '⛪',
    color: '#9B1C22',
    descripcion: 'Zona de mayor concentración, altar monumental, anillos de contención y cuadrillas de seguridad.'
  },
  {
    id: 'catedral-chiclayo',
    nombre: 'Catedral Santa María & Plaza Mayor',
    ciudad: 'Chiclayo Centro',
    tipo: 'Encuentro con Clero, Religiosos y Autoridades',
    capacidadCuadrillas: 85,
    voluntariosEstimados: 765,
    lat: -6.771944,
    lng: -79.839167,
    zoom: 17,
    icono: '🏛️',
    color: '#B5871D',
    descripcion: 'Cordón de honor papal en calles aledañas, atrio de la Catedral y Plaza de Armas.'
  },
  {
    id: 'santuario-paz',
    nombre: 'Santuario Diocesano',
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
    id: 'zana-historica',
    nombre: 'Zaña - Valle Histórico',
    ciudad: 'Zaña (Patrimonio)',
    tipo: 'Homenaje a Santo Toribio de Mogrovejo',
    capacidadCuadrillas: 75,
    voluntariosEstimados: 675,
    lat: -6.924722,
    lng: -79.584722,
    zoom: 16,
    icono: '🏺',
    color: '#8B5CF6',
    descripcion: 'Ruinas del Convento San Agustín, Plaza Mayor de Zaña y ruta histórica papal.'
  },
  {
    id: 'santa-cruz',
    nombre: 'Santa Cruz (Jurisdicción Diocesana)',
    ciudad: 'Santa Cruz',
    tipo: 'Encuentro con Parroquias Andinas de la Diócesis',
    capacidadCuadrillas: 58,
    voluntariosEstimados: 522,
    lat: -6.626389,
    lng: -78.945833,
    zoom: 16,
    icono: '⛰️',
    color: '#D97706',
    descripcion: 'Recepción y bendición de delegaciones campesinas y juveniles de la sierra diocesana.'
  }
];

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

  // Estados del Editor de Puntos (Exclusivo Administrador)
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

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markersLayerRef = useRef(null);

  const currentSede = SEDES_DIOCESIS.find(s => s.id === selectedSedeId) || SEDES_DIOCESIS[0];

  // 1. Cargar Puntos Tácticos de Supabase
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

  useEffect(() => {
    fetchPuntosTacticos();
  }, []);

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

  // Inicializar o centrar mapa Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([currentSede.lat, currentSede.lng], currentSede.zoom, {
        duration: 1.2
      });
      renderMarkers();
      return;
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

  // Dibujar marcadores reales en el mapa
  const renderMarkers = () => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    // 1. Marcador principal de la Sede
    const sedeIcon = L.divIcon({
      className: 'custom-sede-icon',
      html: `
        <div style="background-color: #6B0D12; border: 3px solid #B5871D; color: white; width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.4);">
          ${currentSede.icono}
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22]
    });

    const sedeMarker = L.marker([currentSede.lat, currentSede.lng], { icon: sedeIcon })
      .bindPopup(`
        <div style="font-family: sans-serif; padding: 4px;">
          <strong style="color: #6B0D12; font-size: 14px;">${currentSede.nombre}</strong><br/>
          <span style="font-size: 12px; color: #666;">${currentSede.tipo}</span><br/>
          <span style="font-size: 11px; font-weight: bold; color: #B5871D;">Capacidad: ${currentSede.capacidadCuadrillas} cuadrillas</span>
        </div>
      `);
    markersLayerRef.current.addLayer(sedeMarker);

    // 2. Marcadores Dinámicos de Supabase para esta Sede
    const puntosSede = puntosDb.filter(p => p.sede_id === selectedSedeId);

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

        // Evento arrastrar si está en modo editor
        if (isEditorMode) {
          poiMarker.on('dragend', (e) => {
            const { lat, lng } = e.target.getLatLng();
            handleActualizarPosicion(poi.id, lat, lng, poi.nombre);
          });
        }

        // Popup con opción de eliminar si es Administrador
        const popupContent = document.createElement('div');
        popupContent.style.fontFamily = 'sans-serif';
        popupContent.style.minWidth = '180px';
        popupContent.innerHTML = `
          <strong style="color: #6B0D12; font-size: 13px; display: block;">${poi.nombre}</strong>
          <span style="font-size: 11px; color: #555; display: block; margin-top: 2px;">${poi.descripcion || 'Punto táctico de campo'}</span>
          <span style="font-size: 10px; color: #888; font-family: monospace; display: block; margin-top: 4px;">Coord: ${Number(poi.lat).toFixed(5)}, ${Number(poi.lng).toFixed(5)}</span>
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

    // 3. Marcadores de Cuadrillas en la zona
    const cuadrillas = cuadrillasLista.length > 0 ? cuadrillasLista : [
      {
        id: 1,
        cuadrilla_codigo: cuadrillaCodigo,
        guia_nombre: guiaNombre,
        lider_nombre: liderNombre,
        lat: currentSede.lat + 0.0008,
        lng: currentSede.lng + 0.0006,
        estado_dia_d: gpsConfirmed ? 'presente' : 'pendiente'
      }
    ];

    cuadrillas.forEach((c, idx) => {
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
  };

  useEffect(() => {
    renderMarkers();
  }, [puntosDb, activePoiFilter, isEditorMode, gpsConfirmed]);

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

  const puntosDeEstaSede = puntosDb.filter(p => p.sede_id === selectedSedeId);

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
                ? '👉 MODO EDITOR ACTIVO: Haz clic en el mapa para añadir un punto o arrástralo para moverlo'
                : `Planifica y ubica ambulancias, puntos de agua y zonas en ${currentSede.nombre}` 
              : `Calles, accesos y puntos de auxilio en ${currentSede.nombre}`}
          </p>
        </div>

        {/* Acciones de Cabecera */}
        <div className="flex items-center gap-2 flex-wrap">
          
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
              {isEditorMode ? 'Editor Activo (Clic en mapa)' : 'Activar Modo Editor'}
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
              <Map className="w-3.5 h-3.5" /> Callejero
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

      {/* SELECTOR DE SEDES DIOCESANAS */}
      <div className="p-3 bg-diocesis-cream border-b border-diocesis-mustard/30 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          <span className="text-[11px] font-extrabold uppercase text-stone-500 mr-1 flex items-center gap-1">
            <Building className="w-3.5 h-3.5" /> Sede:
          </span>
          {SEDES_DIOCESIS.map((sede) => (
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
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/10">
                {sede.ciudad}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* BARRA DE ESTADO Y PUNTOS DE AUXILIO */}
      <div className="px-5 py-3 bg-stone-50 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-600">
        <div className="flex items-center gap-2">
          <strong className="text-diocesis-redDark font-extrabold text-sm">{currentSede.nombre}</strong>
          <span className="text-stone-400">•</span>
          <span className="font-medium text-stone-600">{currentSede.tipo}</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-stone-600 text-xs">
            Puntos guardados en sede: <strong className="text-stone-900">{puntosDeEstaSede.length}</strong>
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
        style={{ height: '500px', minHeight: '500px' }}
      />

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
                    <span className="text-base">📍</span> Cuadrilla
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
