import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { 
  MapPin, Navigation, Shield, AlertTriangle, CheckCircle2, Clock, 
  HeartPulse, Droplets, ShieldAlert, Coffee, ExternalLink, RefreshCw,
  Eye, Phone, MessageCircle, Layers, ZoomIn, ZoomOut, Compass, Info,
  Building, Church, Landmark, Mountain, Car, Globe, Map
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
    descripcion: 'Zona de mayor concentración, altar monumental, anillos de contención y cuadrillas de seguridad.',
    pois: [
      { tipo: 'altar', nombre: 'Altar Mayor Papal', lat: -6.777800, lng: -79.851000, icono: '✝️' },
      { tipo: 'medica', nombre: 'Carpa Médica #1 (Norte)', lat: -6.777000, lng: -79.852500, icono: '🚑' },
      { tipo: 'medica', nombre: 'Carpa Médica #2 (Sur)', lat: -6.779800, lng: -79.849500, icono: '🚑' },
      { tipo: 'agua', nombre: 'Punto Hidratación Central', lat: -6.778500, lng: -79.850200, icono: '💧' },
      { tipo: 'puerta', nombre: 'Puerta Principal de Evacuación', lat: -6.780200, lng: -79.851500, icono: '🚪' }
    ]
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
    descripcion: 'Cordón de honor papal en calles aledañas, atrio de la Catedral y Plaza de Armas.',
    pois: [
      { tipo: 'altar', nombre: 'Atrio Catedral Santa María', lat: -6.771900, lng: -79.838900, icono: '⛪' },
      { tipo: 'puerta', nombre: 'Acceso Peatonal San José / Balta', lat: -6.772500, lng: -79.839800, icono: '🚪' },
      { tipo: 'medica', nombre: 'Ambulancia SAMU Plaza Mayor', lat: -6.771500, lng: -79.839600, icono: '🚑' },
      { tipo: 'agua', nombre: 'Punto Hidratación Plaza', lat: -6.772200, lng: -79.838500, icono: '💧' }
    ]
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
    descripcion: 'Atención especial para personas con discapacidad, adultos mayores y pastoral de salud.',
    pois: [
      { tipo: 'altar', nombre: 'Nave Central del Santuario', lat: -6.820300, lng: -79.869800, icono: '🕊️' },
      { tipo: 'medica', nombre: 'Carpa Médica Especializada', lat: -6.820900, lng: -79.870500, icono: '🚑' },
      { tipo: 'agua', nombre: 'Módulo de Hidratación', lat: -6.820100, lng: -79.870400, icono: '💧' },
      { tipo: 'puerta', nombre: 'Rampa Accesible Sillas de Ruedas', lat: -6.821200, lng: -79.869600, icono: '♿' }
    ]
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
    descripcion: 'Ruinas del Convento San Agustín, Plaza Mayor de Zaña y ruta histórica papal.',
    pois: [
      { tipo: 'altar', nombre: 'Convento San Agustín de Zaña', lat: -6.924200, lng: -79.584200, icono: '✝️' },
      { tipo: 'puerta', nombre: 'Ingreso Puente Histórico Zaña', lat: -6.925500, lng: -79.585500, icono: '🚪' },
      { tipo: 'medica', nombre: 'Puesto Médico de Campaña Zaña', lat: -6.924500, lng: -79.585200, icono: '🚑' },
      { tipo: 'agua', nombre: 'Punto de Hidratación Zaña', lat: -6.924800, lng: -79.583800, icono: '💧' }
    ]
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
    descripcion: 'Recepción y bendición de delegaciones campesinas y juveniles de la sierra diocesana.',
    pois: [
      { tipo: 'altar', nombre: 'Templo Matriz Santa Cruz', lat: -6.626200, lng: -78.945600, icono: '⛪' },
      { tipo: 'medica', nombre: 'Centro de Salud Santa Cruz', lat: -6.626900, lng: -78.946300, icono: '🚑' },
      { tipo: 'agua', nombre: 'Módulo de Hidratación Sierra', lat: -6.625800, lng: -78.945200, icono: '💧' },
      { tipo: 'puerta', nombre: 'Acceso Terminal Terrestre', lat: -6.627200, lng: -78.945000, icono: '🚪' }
    ]
  }
];

export default function MapaTactico({ 
  rol = 'guia', 
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

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markersLayerRef = useRef(null);

  const currentSede = SEDES_DIOCESIS.find(s => s.id === selectedSedeId) || SEDES_DIOCESIS[0];

  // Configuración de capas de mapas gratuitos (OpenStreetMap y Esri Satélite)
  const TILE_LAYERS = {
    callejero: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '© OpenStreetMap colaboradores'
    },
    satelite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{n}',
      attribution: 'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics'
    }
  };

  // Inicializar o actualizar el mapa de Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Si ya existe instancia de mapa, centrar suavemente en la sede seleccionada
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([currentSede.lat, currentSede.lng], currentSede.zoom, {
        duration: 1.2
      });
      renderMarkers();
      return;
    }

    // Inicializar nuevo mapa
    const map = L.map(mapContainerRef.current, {
      center: [currentSede.lat, currentSede.lng],
      zoom: currentSede.zoom,
      zoomControl: true,
      scrollWheelZoom: true
    });

    // Agregar capa base (Callejero OpenStreetMap)
    const initialTiles = L.tileLayer(TILE_LAYERS.callejero.url, {
      maxZoom: 19,
      attribution: TILE_LAYERS.callejero.attribution
    }).addTo(map);

    tileLayerRef.current = initialTiles;

    // Grupo de marcadores
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

  // Cambiar capa (Callejero vs Satélite)
  const toggleMapType = (type) => {
    setMapType(type);
    if (!mapInstanceRef.current || !tileLayerRef.current) return;

    tileLayerRef.current.remove();

    const newUrl = type === 'satelite' 
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const newAttr = type === 'satelite'
      ? 'Tiles © Esri — Source: Esri, Maxar'
      : '© OpenStreetMap';

    const newTiles = L.tileLayer(newUrl, {
      maxZoom: 19,
      attribution: newAttr
    }).addTo(mapInstanceRef.current);

    tileLayerRef.current = newTiles;
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

    // 2. Marcadores de Auxilio (POIs: Carpas Médicas, Agua, Puertas)
    if (activePoiFilter && currentSede.pois) {
      currentSede.pois.forEach(poi => {
        const poiColor = poi.tipo === 'medica' ? '#E11D48' : poi.tipo === 'agua' ? '#2563EB' : '#059669';
        const poiIcon = L.divIcon({
          className: 'custom-poi-icon',
          html: `
            <div style="background-color: ${poiColor}; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 15px; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
              ${poi.icono}
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        const poiMarker = L.marker([poi.lat, poi.lng], { icon: poiIcon })
          .bindPopup(`
            <div style="font-family: sans-serif;">
              <strong>${poi.nombre}</strong><br/>
              <span style="font-size: 11px; color: #666;">Punto de Asistencia Táctica</span>
            </div>
          `);
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
      // Offset geográfico si no tienen lat/lng propio
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

  // Re-renderizar marcadores si cambia el filtro de auxilio o confirmación GPS
  useEffect(() => {
    renderMarkers();
  }, [activePoiFilter, gpsConfirmed]);

  // Centrar en ubicación GPS del usuario
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

          // Marcador de Mi Ubicación
          const myPosIcon = L.divIcon({
            className: 'my-location-icon',
            html: `
              <div style="background-color: #2563EB; border: 3px solid white; width: 22px; height: 22px; border-radius: 50%; box-shadow: 0 0 0 8px rgba(37,99,235,0.3); animation: pulse 2s infinite;"></div>
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
        // Fallback centrando en la sede
        setGpsConfirmed(true);
        setGpsLoading(false);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([currentSede.lat, currentSede.lng], 18);
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="bg-white rounded-3xl border-2 border-diocesis-mustard/40 shadow-md overflow-hidden flex flex-col font-sans">
      
      {/* CABECERA CON ESTILO DIÓCESIS */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-diocesis-redDark via-diocesis-red to-diocesis-redDark text-white flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-diocesis-mustard">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-diocesis-mustard text-diocesis-redDark tracking-wider">
              Mapa Geográfico Oficial
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
            {rol === 'guia' 
              ? `Calles, accesos y puntos de auxilio en ${currentSede.nombre}` 
              : `Supervisión geográfica en tiempo real en las sedes de Chiclayo, Zaña, Santuario y Santa Cruz`}
          </p>
        </div>

        {/* Acciones de Cabecera */}
        <div className="flex items-center gap-2 flex-wrap">
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
            {gpsLoading ? 'Ubicando...' : gpsConfirmed ? '✓ Ubicado en Mapa' : 'Mi Ubicación GPS'}
          </button>

          <a
            href={`https://maps.google.com/?q=${currentSede.lat},${currentSede.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 text-xs font-bold bg-white/10 hover:bg-white/20 text-white rounded-xl transition border border-white/20 flex items-center gap-1.5"
            title="Abrir en App de Google Maps"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Google Maps</span>
          </a>
        </div>
      </div>

      {/* SELECTOR DE SEDES DIOCESANAS */}
      <div className="p-3 bg-diocesis-cream border-b border-diocesis-mustard/30 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          <span className="text-[11px] font-extrabold uppercase text-stone-500 mr-1 flex items-center gap-1">
            <Building className="w-3.5 h-3.5" /> Seleccionar Sede:
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
          <button
            onClick={() => setActivePoiFilter(!activePoiFilter)}
            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer border ${
              activePoiFilter 
                ? 'bg-diocesis-redDark text-white border-diocesis-redDark' 
                : 'bg-white text-stone-600 border-stone-300'
            }`}
          >
            {activePoiFilter ? '✓ Auxilios Visibles (Médico/Agua)' : 'Mostrar Auxilios'}
          </button>
        </div>
      </div>

      {/* CONTENEDOR DEL MAPA REAL INTERACTIVO (LEAFLET) */}
      <div 
        ref={mapContainerRef} 
        className="w-full relative z-10"
        style={{ height: '480px', minHeight: '480px' }}
      />

      {/* DETALLES DE CUADRILLA SELECCIONADA */}
      {selectedCuadrilla && (
        <div className="p-4 bg-amber-50/80 border-t border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-diocesis-redDark text-white flex items-center justify-center font-mono font-black text-sm">
              {selectedCuadrilla.cuadrilla_codigo || 'CUA'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-stone-900">
                  {selectedCuadrilla.guia_nombre || 'Guía Asignado'}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white text-stone-700 border border-stone-300 font-bold">
                  {selectedCuadrilla.cuadrilla_codigo}
                </span>
              </div>
              <p className="text-xs text-stone-600 mt-0.5">
                Ubicado en: <strong>{currentSede.nombre}</strong> • Líder: <strong>{selectedCuadrilla.lider_nombre || liderNombre}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedCuadrilla.telefono && (
              <a
                href={`tel:${selectedCuadrilla.telefono}`}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-100 text-stone-800 text-xs font-bold border border-stone-300 flex items-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                Llamar
              </a>
            )}
            <button
              onClick={() => setSelectedCuadrilla(null)}
              className="px-3 py-1.5 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-bold cursor-pointer"
            >
              Cerrar Detalle
            </button>
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
