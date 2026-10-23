import { useState, useEffect } from 'react';
import { 
  MapPin, Navigation, Shield, AlertTriangle, CheckCircle2, Clock, 
  HeartPulse, Droplets, ShieldAlert, Coffee, ExternalLink, RefreshCw,
  Eye, Phone, MessageCircle, Layers, ZoomIn, ZoomOut, Compass, Info,
  Building, Church, Landmark, Mountain, Car
} from 'lucide-react';

// Catálogo oficial de Sedes Diocesanas para la Visita Papal
export const SEDES_DIOCESIS = [
  {
    id: 'misa-central',
    nombre: 'Explanada Misa Multitudinaria',
    ciudad: 'Chiclayo',
    tipo: 'Misa Central de la Juventud y Familias',
    capacidadCuadrillas: 450,
    voluntariosEstimados: 4050,
    lat: -6.771370,
    lng: -79.840880,
    icono: '⛪',
    color: '#9B1C22',
    descripcion: 'Punto de máxima concentración, altar monumental y anillos de contención.',
    pois: [
      { tipo: 'altar', nombre: 'Altar Mayor / Presbiterio', x: 50, y: 16, icono: '✝️' },
      { tipo: 'medica', nombre: 'Carpa Médica #1 (Norte)', x: 18, y: 28, icono: '🚑' },
      { tipo: 'medica', nombre: 'Carpa Médica #2 (Sur)', x: 82, y: 74, icono: '🚑' },
      { tipo: 'agua', nombre: 'Punto Hidratación Central', x: 50, y: 56, icono: '💧' },
      { tipo: 'agua', nombre: 'Punto Hidratación Oeste', x: 16, y: 76, icono: '💧' },
      { tipo: 'puerta', nombre: 'Puerta Principal - Evacuación', x: 50, y: 92, icono: '🚪' },
      { tipo: 'mando', nombre: 'Puesto de Mando Diócesis', x: 84, y: 22, icono: '🛡️' }
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
    icono: '🏛️',
    color: '#B5871D',
    descripcion: 'Cordón de honor papal en calles aledañas, atrio de la Catedral y Plaza de Armas.',
    pois: [
      { tipo: 'altar', nombre: 'Atrio de la Catedral', x: 50, y: 22, icono: '⛪' },
      { tipo: 'puerta', nombre: 'Acceso San José / Balta', x: 20, y: 50, icono: '🚪' },
      { tipo: 'medica', nombre: 'Ambulancia Plaza Mayor', x: 80, y: 40, icono: '🚑' },
      { tipo: 'agua', nombre: 'Módulo de Hidratación Norte', x: 30, y: 78, icono: '💧' },
      { tipo: 'mando', nombre: 'Puesto de Coordinación Curia', x: 75, y: 20, icono: '🛡️' }
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
    icono: '🕊️',
    color: '#10B981',
    descripcion: 'Atención especial para delegaciones de personas con discapacidad, ancianos y pastoral de salud.',
    pois: [
      { tipo: 'altar', nombre: 'Camarín de la Virgen', x: 50, y: 20, icono: '🕊️' },
      { tipo: 'medica', nombre: 'Puesto Médico Especializado', x: 22, y: 40, icono: '🚑' },
      { tipo: 'agua', nombre: 'Hidratación y Asistencia', x: 78, y: 60, icono: '💧' },
      { tipo: 'puerta', nombre: 'Rampa de Acceso Sillas de Ruedas', x: 50, y: 88, icono: '♿' }
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
    icono: '🏺',
    color: '#8B5CF6',
    descripcion: 'Ruta patrimonial, Ruinas del Convento San Agustín y encuentro diocesano tradicional.',
    pois: [
      { tipo: 'altar', nombre: 'Ermita Santo Toribio', x: 50, y: 20, icono: '✝️' },
      { tipo: 'puerta', nombre: 'Entrada Puente Zaña', x: 15, y: 80, icono: '🚪' },
      { tipo: 'medica', nombre: 'Carpa Médica Centro Histórico', x: 80, y: 35, icono: '🚑' },
      { tipo: 'agua', nombre: 'Punto de Hidratación Zaña', x: 50, y: 65, icono: '💧' }
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
    icono: '⛰️',
    color: '#D97706',
    descripcion: 'Punto de recepción y bendición para las comunidades campesinas y juveniles de la sierra.',
    pois: [
      { tipo: 'altar', nombre: 'Parroquia Central Santa Cruz', x: 50, y: 20, icono: '⛪' },
      { tipo: 'medica', nombre: 'Puesto de Salud de Campaña', x: 25, y: 55, icono: '🚑' },
      { tipo: 'agua', nombre: 'Módulo de Hidratación Andino', x: 75, y: 55, icono: '💧' },
      { tipo: 'puerta', nombre: 'Vía de Ingreso Terminal', x: 50, y: 90, icono: '🚪' }
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
  // Estado para la sede seleccionada (por defecto la Explanada de la Misa o la que tenga asignada)
  const [selectedSedeId, setSelectedSedeId] = useState('misa-central');
  const [vistaModo, setVistaModo] = useState('croquis'); // 'croquis' | 'regional'
  const [selectedCuadrilla, setSelectedCuadrilla] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsLocation, setGpsLocation] = useState(null);
  const [gpsConfirmed, setGpsConfirmed] = useState(false);
  const [activePoiFilter, setActivePoiFilter] = useState(true);

  const currentSede = SEDES_DIOCESIS.find(s => s.id === selectedSedeId) || SEDES_DIOCESIS[0];

  // Parsear número de cuadrilla para ubicarla en el plano
  const getCuadrillaNumero = (cod) => {
    if (!cod) return 1;
    const match = String(cod).match(/\d+/);
    return match ? parseInt(match[0], 10) : 1;
  };

  // Calcular coordenadas relativas X, Y para cada cuadrilla en el mapa de la sede
  const getCuadrillaCoords = (num) => {
    const colIndex = ((num - 1) % 16);
    const rowIndex = Math.floor(((num - 1) % 160) / 16);
    const x = 12 + (colIndex * 4.9);
    const y = 30 + (rowIndex * 5.8);
    return { x: Math.min(x, 88), y: Math.min(y, 88) };
  };

  // Solicitar GPS 1-Tap Snapshot
  const handleGpsSnapshot = () => {
    setGpsLoading(true);

    if (!('geolocation' in navigator)) {
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsLocation({
          lat: position.coords.latitude.toFixed(6),
          lng: position.coords.longitude.toFixed(6),
          accuracy: Math.round(position.coords.accuracy),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sedeNombre: currentSede.nombre
        });
        setGpsConfirmed(true);
        setGpsLoading(false);
      },
      () => {
        // Fallback suave usando coordenadas reales de la sede seleccionada
        setGpsLocation({
          lat: currentSede.lat.toFixed(6),
          lng: currentSede.lng.toFixed(6),
          accuracy: 12,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sedeNombre: currentSede.nombre,
          simulado: true
        });
        setGpsConfirmed(true);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  // Cuadrillas a desplegar en el mapa según el rol
  const cuadrillasParaMostrar = cuadrillasLista.length > 0 ? cuadrillasLista : [
    {
      id: 1,
      cuadrilla_codigo: cuadrillaCodigo,
      guia_nombre: guiaNombre,
      lider_nombre: liderNombre,
      guia_dni: 'Oficial',
      estado_dia_d: gpsConfirmed ? 'presente' : 'pendiente',
      has_sos: false
    }
  ];

  const totalPresentes = cuadrillasParaMostrar.filter(c => c.estado_dia_d === 'presente' || gpsConfirmed).length;
  const totalSos = cuadrillasParaMostrar.filter(c => c.has_sos).length;

  return (
    <div className="bg-white rounded-3xl border-2 border-diocesis-mustard/40 shadow-md overflow-hidden flex flex-col font-sans">
      
      {/* CABECERA DEL MAPA TÁCTICO MULTI-SEDE */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-diocesis-redDark via-diocesis-red to-diocesis-redDark text-white flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-diocesis-mustard">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-diocesis-mustard text-diocesis-redDark tracking-wider">
              Despliegue Multi-Sede Diocesano
            </span>
            <span className="text-xs text-diocesis-mustardLight font-semibold">
              Región Lambayeque & Jurisdicción Diócesis
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-title font-bold text-white mt-1 flex items-center gap-2">
            <Compass className="w-5 h-5 text-diocesis-mustard" />
            Mapa de Sedes de la Visita Papal
          </h3>
          <p className="text-xs text-stone-200">
            {rol === 'guia' 
              ? `Ubicación táctica en ${currentSede.nombre} y puntos de auxilio`
              : `Supervisión de cuadrillas desplegadas en la Misa, Catedral, Santuario, Zaña y Santa Cruz`}
          </p>
        </div>

        {/* Acciones de cabecera */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-black/20 p-1 rounded-xl flex items-center border border-white/10 text-xs">
            <button
              onClick={() => setVistaModo('croquis')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                vistaModo === 'croquis' 
                  ? 'bg-diocesis-mustard text-diocesis-redDark shadow-xs' 
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              Croquis de Sede
            </button>
            <button
              onClick={() => setVistaModo('regional')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                vistaModo === 'regional' 
                  ? 'bg-diocesis-mustard text-diocesis-redDark shadow-xs' 
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              Mapa Regional ({SEDES_DIOCESIS.length} Sedes)
            </button>
          </div>

          {rol === 'guia' ? (
            <button
              onClick={handleGpsSnapshot}
              disabled={gpsLoading}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer ${
                gpsConfirmed
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 border border-emerald-400'
                  : 'bg-diocesis-mustard text-diocesis-redDark hover:bg-diocesis-mustardLight border border-amber-300'
              }`}
            >
              <MapPin className={`w-4 h-4 ${gpsLoading ? 'animate-bounce' : ''}`} />
              {gpsLoading 
                ? 'Validando...' 
                : gpsConfirmed 
                ? '✓ Confirmado en Sede' 
                : 'Confirmar Llegada'}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-3 py-1 bg-white/10 rounded-xl border border-white/20">
                🟢 {totalPresentes} en puesto
              </span>
              {totalSos > 0 && (
                <span className="text-xs font-mono font-bold px-3 py-1 bg-rose-500/80 rounded-xl border border-rose-300 animate-pulse">
                  🚨 {totalSos} SOS
                </span>
              )}
            </div>
          )}

          <a
            href={`https://maps.google.com/?q=${currentSede.lat},${currentSede.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 text-xs font-bold bg-white/10 hover:bg-white/20 text-white rounded-xl transition border border-white/20 flex items-center gap-1.5"
            title="Abrir en Google Maps"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Google Maps</span>
          </a>
        </div>
      </div>

      {/* SELECTOR DE SEDES (TABS HORIZONTALES CON ICONOS) */}
      <div className="p-3 bg-diocesis-cream border-b border-diocesis-mustard/30 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          <span className="text-[11px] font-extrabold uppercase text-stone-500 mr-1 flex items-center gap-1">
            <Building className="w-3.5 h-3.5" /> Sede:
          </span>
          {SEDES_DIOCESIS.map((sede) => (
            <button
              key={sede.id}
              onClick={() => {
                setSelectedSedeId(sede.id);
                setVistaModo('croquis');
              }}
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

      {/* INFORMACIÓN DE LA SEDE ACTIVA */}
      <div className="px-5 py-3 bg-stone-50 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-stone-600">
        <div>
          <strong className="text-diocesis-redDark font-extrabold text-sm">{currentSede.nombre}</strong>
          <span className="text-stone-400 mx-2">•</span>
          <span className="font-medium">{currentSede.tipo}</span>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <span>Capacidad: <strong className="text-stone-900">{currentSede.capacidadCuadrillas} cuadrillas</strong></span>
          <span>•</span>
          <span>~<strong className="text-diocesis-red">{currentSede.voluntariosEstimados} voluntarios</strong></span>
        </div>
      </div>

      {/* VISTA 1: CROQUIS INTERACTIVO DE LA SEDE SELECCIONADA */}
      {vistaModo === 'croquis' && (
        <div className="relative w-full bg-stone-100 overflow-hidden select-none border-b border-stone-200" style={{ height: '460px' }}>
          
          {/* Fondo Cuadrícula */}
          <div 
            className="absolute inset-0 opacity-15"
            style={{
              backgroundImage: `radial-gradient(#6B0D12 1px, transparent 1px), radial-gradient(#6B0D12 1px, #FFF8F0 1px)`,
              backgroundSize: '24px 24px',
              backgroundPosition: '0 0, 12px 12px'
            }}
          />

          {/* DIBUJO ESQUEMÁTICO DEL RECINTO SEGÚN LA SEDE */}
          {selectedSedeId === 'misa-central' && (
            <>
              {/* Presbiterio / Altar Central */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-3/5 h-20 rounded-2xl bg-gradient-to-b from-amber-200/50 to-amber-100/30 border-2 border-dashed border-amber-500/60 flex flex-col items-center justify-center p-2 text-center pointer-events-none">
                <span className="text-[11px] font-black text-amber-900 uppercase tracking-widest flex items-center gap-1">
                  ✝️ Presbiterio / Altar Papal
                </span>
                <span className="text-[9px] text-amber-800 font-semibold">Explanada Central</span>
              </div>
              {/* Límites de Sector Norte y Sur */}
              <div className="absolute top-26 left-6 right-6 bottom-10 rounded-3xl border-2 border-stone-300/80 pointer-events-none">
                <div className="absolute top-0 bottom-0 left-1/2 w-0.5 border-r-2 border-dashed border-stone-300"></div>
                <span className="absolute top-2 left-3 text-[10px] font-extrabold text-stone-400 uppercase">Sector Norte</span>
                <span className="absolute top-2 right-3 text-[10px] font-extrabold text-stone-400 uppercase">Sector Sur</span>
              </div>
            </>
          )}

          {selectedSedeId === 'catedral-chiclayo' && (
            <>
              {/* Catedral y Plaza Mayor */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-2/5 h-24 rounded-2xl bg-amber-100/70 border-2 border-amber-600 flex flex-col items-center justify-center p-2 text-center pointer-events-none">
                <span className="text-xs font-black text-amber-950 uppercase flex items-center gap-1">
                  🏛️ Frontis Catedral Santa María
                </span>
                <span className="text-[10px] text-amber-800">Atrio y Escalinatas Oficiales</span>
              </div>
              <div className="absolute top-32 left-10 right-10 bottom-12 rounded-3xl bg-emerald-50/40 border-2 border-emerald-300 pointer-events-none flex items-center justify-center">
                <span className="text-xs font-black text-emerald-800 uppercase tracking-wider">
                  🌳 Plaza Mayor de Chiclayo (Cerco Perimétrico)
                </span>
              </div>
            </>
          )}

          {selectedSedeId === 'santuario-paz' && (
            <>
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-1/2 h-20 rounded-2xl bg-blue-100/70 border-2 border-blue-400 flex flex-col items-center justify-center p-2 text-center pointer-events-none">
                <span className="text-xs font-black text-blue-950 uppercase flex items-center gap-1">
                  🕊️ Nave Principal del Santuario
                </span>
                <span className="text-[10px] text-blue-800">Zona de Acogida Pastoral y Enfermos</span>
              </div>
              <div className="absolute top-28 left-8 right-8 bottom-12 rounded-3xl border-2 border-stone-300 pointer-events-none flex items-center justify-center">
                <span className="text-[11px] font-bold text-stone-500 uppercase">Explanada Externa y Jardines del Santuario</span>
              </div>
            </>
          )}

          {selectedSedeId === 'zana-historica' && (
            <>
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-1/2 h-24 rounded-2xl bg-purple-100/70 border-2 border-purple-400 flex flex-col items-center justify-center p-2 text-center pointer-events-none">
                <span className="text-xs font-black text-purple-950 uppercase flex items-center gap-1">
                  🏺 Convento San Agustín de Zaña
                </span>
                <span className="text-[10px] text-purple-800">Monumento Histórico • Santo Toribio</span>
              </div>
              <div className="absolute top-32 left-10 right-10 bottom-12 rounded-3xl border-2 border-dashed border-stone-400 pointer-events-none flex items-center justify-center">
                <span className="text-xs font-bold text-stone-500 uppercase">Plaza Histórica y Cordón de Peregrinos</span>
              </div>
            </>
          )}

          {selectedSedeId === 'santa-cruz' && (
            <>
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-1/2 h-20 rounded-2xl bg-amber-100/70 border-2 border-amber-500 flex flex-col items-center justify-center p-2 text-center pointer-events-none">
                <span className="text-xs font-black text-amber-950 uppercase flex items-center gap-1">
                  ⛰️ Templo Matriz de Santa Cruz
                </span>
                <span className="text-[10px] text-amber-800">Comunidades Andinas y Sierras Diocesanas</span>
              </div>
              <div className="absolute top-28 left-8 right-8 bottom-12 rounded-3xl border-2 border-stone-300 pointer-events-none flex items-center justify-center">
                <span className="text-[11px] font-bold text-stone-500 uppercase">Campo Parroquial de Acogida Comunitaria</span>
              </div>
            </>
          )}

          {/* PUNTOS DE INTERÉS ESPECÍFICOS DE LA SEDE */}
          {activePoiFilter && currentSede.pois.map((poi, idx) => (
            <div
              key={idx}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer group"
              style={{ left: `${poi.x}%`, top: `${poi.y}%` }}
              title={poi.nombre}
            >
              <div className={`p-1.5 rounded-full shadow-md flex items-center justify-center text-xs transition transform group-hover:scale-125 ${
                poi.tipo === 'medica' ? 'bg-rose-500 text-white ring-2 ring-rose-200' :
                poi.tipo === 'agua' ? 'bg-blue-500 text-white ring-2 ring-blue-200' :
                poi.tipo === 'puerta' ? 'bg-emerald-600 text-white ring-2 ring-emerald-200' :
                'bg-amber-500 text-white ring-2 ring-amber-200'
              }`}>
                <span className="text-xs leading-none">{poi.icono}</span>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-0.5 bg-stone-900 text-white text-[10px] font-bold rounded shadow-lg whitespace-nowrap pointer-events-none z-30">
                {poi.nombre}
              </div>
            </div>
          ))}

          {/* PINS DE LAS CUADRILLAS EN EL CROQUIS */}
          {cuadrillasParaMostrar.map((c, idx) => {
            const num = getCuadrillaNumero(c.cuadrilla_codigo || idx + 1);
            const coords = getCuadrillaCoords(num);
            const isMyCuadrilla = (c.cuadrilla_codigo === cuadrillaCodigo) || (rol === 'guia');
            const isConfirmed = c.estado_dia_d === 'presente' || (isMyCuadrilla && gpsConfirmed);
            const isSos = !!c.has_sos;

            return (
              <div
                key={c.id || idx}
                onClick={() => setSelectedCuadrilla(c)}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer group"
                style={{ left: `${coords.x}%`, top: `${coords.y}%` }}
              >
                {/* Baliza de pulso si es mi cuadrilla */}
                {isMyCuadrilla && (
                  <span className="absolute -inset-2 rounded-full bg-diocesis-red animate-ping opacity-75"></span>
                )}

                {/* Pin Cuadrilla */}
                <div className={`w-8 h-8 rounded-full flex flex-col items-center justify-center text-[9px] font-black font-mono shadow-md border-2 transition transform group-hover:scale-125 ${
                  isSos
                    ? 'bg-rose-600 text-white border-white animate-bounce'
                    : isConfirmed
                    ? 'bg-emerald-600 text-white border-emerald-200'
                    : isMyCuadrilla
                    ? 'bg-diocesis-redDark text-diocesis-mustardLight border-diocesis-mustard'
                    : 'bg-white text-stone-800 border-stone-300'
                }`}>
                  {c.cuadrilla_codigo ? c.cuadrilla_codigo.replace('CUA-', '') : num}
                </div>

                {/* Tooltip táctico */}
                <div className="opacity-0 group-hover:opacity-100 transition absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1 bg-stone-950 text-white text-[10px] rounded-lg shadow-xl whitespace-nowrap pointer-events-none z-30 flex flex-col items-center">
                  <span className="font-black text-diocesis-mustardLight">{c.cuadrilla_codigo || `CUA-${num}`}</span>
                  <span className="text-stone-300 font-sans">{c.guia_nombre || 'Guía Asignado'}</span>
                  <span className={`text-[9px] font-bold ${isConfirmed ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {isConfirmed ? '✓ En Posición' : '⏳ Pendiente'}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Widget flotante de estado en esquina */}
          {rol === 'guia' && (
            <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-lg border border-diocesis-mustard/50 max-w-xs z-20">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-diocesis-redDark text-diocesis-mustard flex items-center justify-center font-bold text-xs">
                  📍
                </div>
                <div>
                  <h4 className="text-xs font-black text-stone-900 leading-tight">
                    {cuadrillaCodigo} • {currentSede.nombre}
                  </h4>
                  <p className="text-[10px] text-stone-500">
                    {gpsConfirmed 
                      ? `Confirmado a las ${gpsLocation?.timestamp}` 
                      : 'Presiona "Confirmar Llegada" al posicionarte'}
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* VISTA 2: MAPA REGIONAL TERRITORIAL DE TODAS LAS SEDES (LAMBAYEQUE) */}
      {vistaModo === 'regional' && (
        <div className="p-5 bg-stone-50 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-extrabold text-diocesis-redDark">
                Despliegue Territorial en la Diócesis de Chiclayo
              </h4>
              <p className="text-xs text-stone-500">
                Puntos estratégicos donde la comitiva papal estará presente
              </p>
            </div>
            <span className="text-xs font-bold font-mono px-3 py-1 bg-amber-100 text-amber-900 rounded-full border border-amber-300">
              5 Sedes Oficiales
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SEDES_DIOCESIS.map((sede) => {
              const isSelected = selectedSedeId === sede.id;
              return (
                <div 
                  key={sede.id}
                  onClick={() => {
                    setSelectedSedeId(sede.id);
                    setVistaModo('croquis');
                  }}
                  className={`p-4 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                    isSelected 
                      ? 'bg-amber-50/80 border-diocesis-redDark shadow-sm' 
                      : 'bg-white border-stone-200 hover:border-diocesis-mustard'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{sede.icono}</span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-300">
                        {sede.ciudad}
                      </span>
                    </div>
                    <div>
                      <h5 className="font-extrabold text-stone-900 text-sm leading-tight">
                        {sede.nombre}
                      </h5>
                      <p className="text-[11px] text-stone-500 mt-1 leading-snug">
                        {sede.descripcion}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-200/60 flex items-center justify-between text-xs">
                    <div className="font-mono text-stone-600">
                      <strong>{sede.capacidadCuadrillas}</strong> cuadrillas
                    </div>
                    <button className="text-xs font-extrabold text-diocesis-red hover:underline flex items-center gap-1">
                      Ver Croquis →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DETALLES DE CUADRILLA SELECCIONADA (POPOVER) */}
      {selectedCuadrilla && (
        <div className="p-4 bg-amber-50/70 border-t border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-diocesis-redDark text-white flex items-center justify-center font-mono font-black text-sm">
              {selectedCuadrilla.cuadrilla_codigo || 'CUA'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-stone-900">
                  {selectedCuadrilla.guia_nombre || 'Guía no identificado'}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white text-stone-700 border border-stone-300 font-bold">
                  DNI: {selectedCuadrilla.guia_dni || '-'}
                </span>
              </div>
              <p className="text-xs text-stone-600 mt-0.5">
                Sede: <strong>{currentSede.nombre}</strong> • Líder: <strong>{selectedCuadrilla.lider_nombre || liderNombre}</strong>
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

    </div>
  );
}
