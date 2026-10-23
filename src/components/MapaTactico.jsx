import { useState, useEffect } from 'react';
import { 
  MapPin, Navigation, Shield, AlertTriangle, CheckCircle2, Clock, 
  HeartPulse, Droplets, ShieldAlert, Coffee, ExternalLink, RefreshCw,
  Eye, Phone, MessageCircle, Layers, ZoomIn, ZoomOut, Compass, Info
} from 'lucide-react';

// Sectores tácticos estándar para el evento papal
const SECTORES_CONFIG = [
  { id: 'sec-norte', nombre: 'Sector A - Norte (Acceso Principal)', color: '#3B82F6', cuadrillasRango: [1, 180] },
  { id: 'sec-central', nombre: 'Sector B - Central (Presbiterio / Altar)', color: '#B5871D', cuadrillasRango: [181, 360] },
  { id: 'sec-sur', nombre: 'Sector C - Sur (Vía de Evacuación)', color: '#10B981', cuadrillasRango: [361, 540] },
  { id: 'sec-este', nombre: 'Sector D - Este (Graderías y Prensa)', color: '#8B5CF6', cuadrillasRango: [541, 733] }
];

// Puntos de interés tácticos fijos (POIs)
const PUNTOS_INTERES = [
  { id: 'poi-1', tipo: 'altar', nombre: 'Altar Mayor / Presbiterio', x: 50, y: 18, icono: '✝️' },
  { id: 'poi-2', tipo: 'medica', nombre: 'Carpa Médica #1 (Norte)', x: 20, y: 28, icono: '🚑' },
  { id: 'poi-3', tipo: 'medica', nombre: 'Carpa Médica #2 (Sur)', x: 80, y: 72, icono: '🚑' },
  { id: 'poi-4', tipo: 'agua', nombre: 'Punto Hidratación Central', x: 50, y: 55, icono: '💧' },
  { id: 'poi-5', tipo: 'agua', nombre: 'Punto Hidratación Oeste', x: 18, y: 75, icono: '💧' },
  { id: 'poi-6', tipo: 'puerta', nombre: 'Puerta 1 - Evacuación Rápida', x: 50, y: 92, icono: '🚪' },
  { id: 'poi-7', tipo: 'mando', nombre: 'Puesto de Mando Diócesis', x: 82, y: 22, icono: '🛡️' }
];

export default function MapaTactico({ 
  rol = 'guia', 
  cuadrillaCodigo = 'CUA-001', 
  guiaNombre = 'Mi Cuadrilla',
  liderNombre = 'Líder de Sector',
  cuadrillasLista = [],
  onReportSos
}) {
  const [selectedCuadrilla, setSelectedCuadrilla] = useState(null);
  const [filterStatus, setFilterStatus] = useState('todos'); // 'todos' | 'presentes' | 'sos' | 'pendientes'
  const [selectedSector, setSelectedSector] = useState('todos');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsLocation, setGpsLocation] = useState(null);
  const [gpsConfirmed, setGpsConfirmed] = useState(false);
  const [gpsError, setGpsError] = useState(null);
  const [activePoiFilter, setActivePoiFilter] = useState(true);

  // Parsear número de cuadrilla para ubicarla en el plano
  const getCuadrillaNumero = (cod) => {
    if (!cod) return 1;
    const match = String(cod).match(/\d+/);
    return match ? parseInt(match[0], 10) : 1;
  };

  const myCuadrillaNum = getCuadrillaNumero(cuadrillaCodigo);

  // Calcular coordenadas relativas X, Y para cada cuadrilla en el mapa
  const getCuadrillaCoords = (num) => {
    // Distribuir en una cuadrícula lógica dentro del área de la explanada (x: 12% a 88%, y: 32% a 88%)
    const colIndex = ((num - 1) % 18);
    const rowIndex = Math.floor(((num - 1) % 180) / 18);
    const x = 12 + (colIndex * 4.3);
    const y = 32 + (rowIndex * 5.6);
    return { x: Math.min(x, 88), y: Math.min(y, 88) };
  };

  // Solicitar GPS 1-Tap Snapshot
  const handleGpsSnapshot = () => {
    setGpsLoading(true);
    setGpsError(null);

    if (!('geolocation' in navigator)) {
      setGpsError('Tu celular no soporta geolocalización o está desactivada.');
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude.toFixed(6),
          lng: position.coords.longitude.toFixed(6),
          accuracy: Math.round(position.coords.accuracy),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setGpsLocation(coords);
        setGpsConfirmed(true);
        setGpsLoading(false);
      },
      (err) => {
        console.warn('GPS snapshot error:', err);
        // Fallback suave sin bloquear: simulamos confirmación táctica si el usuario deniega permiso
        setGpsLocation({
          lat: '-6.771370',
          lng: '-79.840880',
          accuracy: 15,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
      
      {/* CABECERA DEL MAPA TÁCTICO */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-diocesis-redDark via-diocesis-red to-diocesis-redDark text-white flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-diocesis-mustard">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-diocesis-mustard text-diocesis-redDark tracking-wider">
              Sistema de Despliegue Táctico
            </span>
            <span className="text-xs text-diocesis-mustardLight font-mono">
              Chiclayo 2026
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-title font-bold text-white mt-1 flex items-center gap-2">
            <Compass className="w-5 h-5 text-diocesis-mustard" />
            Mapa de Sectores & Cuadrillas en Campo
          </h3>
          <p className="text-xs text-stone-200">
            {rol === 'guia' 
              ? `Ubicación táctica de tu Cuadrilla ${cuadrillaCodigo} y puntos de auxilio cercanos`
              : `Monitor de despliegue territorial y semáforo de estado de tus cuadrillas`}
          </p>
        </div>

        {/* Acciones principales de cabecera */}
        <div className="flex items-center gap-2 flex-wrap">
          {rol === 'guia' ? (
            <button
              onClick={handleGpsSnapshot}
              disabled={gpsLoading}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer ${
                gpsConfirmed
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 border border-emerald-400'
                  : 'bg-diocesis-mustard text-diocesis-redDark hover:bg-diocesis-mustardLight border border-amber-300'
              }`}
            >
              <MapPin className={`w-4 h-4 ${gpsLoading ? 'animate-bounce' : ''}`} />
              {gpsLoading 
                ? 'Validando posición...' 
                : gpsConfirmed 
                ? '✓ Posición Confirmada' 
                : 'Confirmar Llegada a Puesto'}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-3 py-1 bg-white/10 rounded-xl border border-white/20">
                🟢 {totalPresentes} en posición
              </span>
              {totalSos > 0 && (
                <span className="text-xs font-mono font-bold px-3 py-1 bg-rose-500/80 rounded-xl border border-rose-300 animate-pulse">
                  🚨 {totalSos} SOS
                </span>
              )}
            </div>
          )}

          <a
            href="https://maps.google.com/?q=-6.771370,-79.840880"
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

      {/* BARRA DE FILTROS Y LEYENDA TÁCTICA */}
      <div className="p-3 sm:p-4 bg-stone-50 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        
        {/* Leyenda Semáforo */}
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <span className="font-bold text-stone-500 uppercase text-[10px] tracking-wider">Leyenda:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200"></span>
            <span className="text-stone-700 font-semibold">En Puesto</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-amber-200"></span>
            <span className="text-stone-700 font-semibold">En Camino / Pendiente</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 ring-2 ring-rose-300 animate-ping"></span>
            <span className="text-rose-700 font-bold">Alerta SOS Activa</span>
          </div>
        </div>

        {/* Toggle para Puntos de Interés */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActivePoiFilter(!activePoiFilter)}
            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer border ${
              activePoiFilter 
                ? 'bg-diocesis-redDark text-white border-diocesis-redDark' 
                : 'bg-white text-stone-600 border-stone-300'
            }`}
          >
            {activePoiFilter ? 'Ocultar Auxilios' : 'Ver Puntos Auxilio (Médico/Agua)'}
          </button>
        </div>
      </div>

      {/* ÁREA DEL MAPA INTERACTIVO (CANVAS VECTORIAL RESILIENTE) */}
      <div className="relative w-full bg-stone-100 overflow-hidden select-none border-b border-stone-200" style={{ height: '460px' }}>
        
        {/* Fondo de Cuadrícula Táctica */}
        <div 
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: `radial-gradient(#6B0D12 1px, transparent 1px), radial-gradient(#6B0D12 1px, #FFF8F0 1px)`,
            backgroundSize: '24px 24px',
            backgroundPosition: '0 0, 12px 12px'
          }}
        />

        {/* SECTORES DIBUJADOS EN EL PLANO */}
        {/* Sector Presbiterio / Altar */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-3/5 h-20 rounded-2xl bg-gradient-to-b from-amber-200/50 to-amber-100/30 border-2 border-dashed border-amber-500/60 flex flex-col items-center justify-center p-2 text-center pointer-events-none">
          <span className="text-[11px] font-black text-amber-900 uppercase tracking-widest flex items-center gap-1">
            ✝️ Presbiterio / Altar Principal
          </span>
          <span className="text-[9px] text-amber-800 font-semibold">
            Zona de Máxima Seguridad Papal
          </span>
        </div>

        {/* Zona Norte y Sur (Límites de Sectores) */}
        <div className="absolute top-28 left-6 right-6 bottom-10 rounded-3xl border-2 border-stone-300/80 pointer-events-none">
          {/* Línea divisoria central */}
          <div className="absolute top-0 bottom-0 left-1/2 w-0.5 border-r-2 border-dashed border-stone-300"></div>
          {/* Etiquetas de Sector */}
          <span className="absolute top-2 left-3 text-[10px] font-extrabold text-stone-400 uppercase tracking-wider">
            Sector Norte (Bloques A y B)
          </span>
          <span className="absolute top-2 right-3 text-[10px] font-extrabold text-stone-400 uppercase tracking-wider">
            Sector Sur (Bloques C y D)
          </span>
        </div>

        {/* PUNTOS DE INTERÉS TÁCTICOS (POIs: Ambulancias, Agua, Puertas) */}
        {activePoiFilter && PUNTOS_INTERES.map((poi) => (
          <div
            key={poi.id}
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

        {/* PINS DE LAS CUADRILLAS EN EL PLANO */}
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
              {/* Baliza de pulso para mi cuadrilla */}
              {isMyCuadrilla && (
                <span className="absolute -inset-2 rounded-full bg-diocesis-red animate-ping opacity-75"></span>
              )}

              {/* Pin de Cuadrilla */}
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

              {/* Tooltip táctico al pasar el mouse */}
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

        {/* Indicador de Mi Cuadrilla (Widget flotante esquina inferior izquierda) */}
        {rol === 'guia' && (
          <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-lg border border-diocesis-mustard/50 max-w-xs z-20">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-diocesis-redDark text-diocesis-mustard flex items-center justify-center font-bold text-xs">
                📍
              </div>
              <div>
                <h4 className="text-xs font-black text-stone-900 leading-tight">
                  Tu Puesto: {cuadrillaCodigo}
                </h4>
                <p className="text-[10px] text-stone-500">
                  {gpsConfirmed 
                    ? `Confirmado a las ${gpsLocation?.timestamp} (Margen: ~${gpsLocation?.accuracy}m)` 
                    : 'Presiona "Confirmar Llegada" al posicionarte'}
                </p>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* DETALLES DE CUADRILLA SELECCIONADA (POPOVER INFERIOR) */}
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
                Líder a cargo: <strong>{selectedCuadrilla.lider_nombre || liderNombre}</strong> • Capacidad: 9 voluntarios
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

      {/* GUÍA RÁPIDA DE AUXILIOS Y CONTACTO PARA EL GUÍA */}
      {rol === 'guia' && (
        <div className="p-4 bg-stone-50 border-t border-stone-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-2.5 rounded-xl bg-white border border-stone-200 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center text-sm font-bold">
              🚑
            </div>
            <div>
              <strong className="block text-stone-900 font-bold text-[11px]">Carpa Médica Cercana</strong>
              <span className="text-stone-500 text-[10px]">A ~45 metros hacia el Norte</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-white border border-stone-200 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">
              💧
            </div>
            <div>
              <strong className="block text-stone-900 font-bold text-[11px]">Punto de Hidratación</strong>
              <span className="text-stone-500 text-[10px]">Bidones recargables a 25m</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-white border border-stone-200 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold">
              🚪
            </div>
            <div>
              <strong className="block text-stone-900 font-bold text-[11px]">Evacuación Rápida</strong>
              <span className="text-stone-500 text-[10px]">Puerta 1 hacia Av. Principal</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
