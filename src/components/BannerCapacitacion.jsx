import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

const resolveImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const clean = url.startsWith('/') ? url.slice(1) : url;
  return import.meta.env.BASE_URL + clean;
};

const DEFAULT_CONFIG = {
  activo: true,
  titulo: 'Jornadas Oficiales de Capacitación',
  subtitulo: 'Voluntariado Diocesano • Visita del Santo Padre',
  fb_diocesis_url: '',
  fb_pastoral_url: 'https://www.facebook.com/pjchiclayo',
  
  // Chiclayo
  chiclayo_titulo: 'Voluntariado Chiclayo',
  chiclayo_fecha: 'Sábado 31 de Octubre y Domingo 01 de Noviembre',
  chiclayo_hora: '04:00 p.m.',
  chiclayo_lugar: 'Coliseo del Colegio Manuel Pardo',
  chiclayo_vestimenta: 'Polo Blanco',
  chiclayo_imagen_url: import.meta.env.BASE_URL + 'banners/banner_chiclayo.png',
  
  // Santa Cruz
  santacruz_titulo: 'Voluntariado Santa Cruz',
  santacruz_fecha: 'Sábado 31 de Octubre',
  santacruz_hora: '07:30 p.m.',
  santacruz_lugar: 'Teatro Parroquial Santa Cruz',
  santacruz_vestimenta: 'Polo Blanco',
  santacruz_imagen_url: import.meta.env.BASE_URL + 'banners/banner_santacruz.jpg',
};

export default function BannerCapacitacion() {
  const [sede, setSede] = useState('chiclayo');
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [modalImagen, setModalImagen] = useState(null);
  const [minimizado, setMinimizado] = useState(false);

  useEffect(() => {
    async function loadConfig() {
      try {
        const { data, error } = await supabase
          .from('configuracion_banners')
          .select('*')
          .eq('id', 'capacitaciones')
          .maybeSingle();

        if (data && !error) {
          setConfig({
            ...DEFAULT_CONFIG,
            ...data,
            chiclayo_imagen_url: data.chiclayo_imagen_url || DEFAULT_CONFIG.chiclayo_imagen_url,
            santacruz_imagen_url: data.santacruz_imagen_url || DEFAULT_CONFIG.santacruz_imagen_url,
          });
        }
      } catch (err) {
        console.warn('Usando configuración por defecto de capacitaciones:', err);
      }
    }
    loadConfig();
  }, []);

  // Si el administrador desactivó el banner, no renderizar nada
  if (!config.activo) return null;

  const isChiclayo = sede === 'chiclayo';
  const rawImg = isChiclayo ? config.chiclayo_imagen_url : config.santacruz_imagen_url;
  const currentImg = resolveImageUrl(rawImg);
  const currentTitulo = isChiclayo ? config.chiclayo_titulo : config.santacruz_titulo;
  const currentFecha = isChiclayo ? config.chiclayo_fecha : config.santacruz_fecha;
  const currentHora = isChiclayo ? config.chiclayo_hora : config.santacruz_hora;
  const currentLugar = isChiclayo ? config.chiclayo_lugar : config.santacruz_lugar;
  const currentVestimenta = isChiclayo ? config.chiclayo_vestimenta : config.santacruz_vestimenta;

  if (minimizado) {
    return (
      <div className="mb-6 bg-gradient-to-r from-red-900 to-amber-900 text-white rounded-2xl p-3.5 px-5 shadow-md flex items-center justify-between animate-fade-in no-print border border-amber-400/40">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <p className="text-xs md:text-sm font-bold">
            🎓 Jornadas de Capacitación Disponibles: Chiclayo y Santa Cruz
          </p>
        </div>
        <button
          onClick={() => setMinimizado(false)}
          className="text-xs font-bold text-amber-300 hover:text-white underline cursor-pointer transition ml-4 shrink-0"
        >
          Ver Información y Enlaces ↗
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-3xl border-2 border-amber-400/90 shadow-xl overflow-hidden mb-8 no-print transition-all duration-200">
        
        {/* CABECERA INSTITUCIONAL */}
        <div className="bg-gradient-to-r from-diocesis-redDark via-diocesis-red to-amber-900 px-5 py-3 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-400 text-red-950 text-sm font-black shadow-xs">
              ★
            </span>
            <div>
              <span className="text-[11px] uppercase tracking-wider font-extrabold text-amber-200 block leading-tight">
                {config.titulo || 'Jornadas Oficiales de Capacitación'}
              </span>
              <span className="text-xs text-stone-100 font-medium">
                {config.subtitulo || 'Voluntariado Diocesano • Visita del Santo Padre'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/30 border border-amber-400/40 text-xs font-bold text-amber-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Presencial y Virtual
            </span>
            <button
              onClick={() => setMinimizado(true)}
              className="text-white/70 hover:text-white p-1 rounded-lg transition text-xs cursor-pointer"
              title="Minimizar aviso"
            >
              <i className="fa-solid fa-minus"></i>
            </button>
          </div>
        </div>

        {/* SELECTOR DE PESTAÑAS (TABS) */}
        <div className="bg-stone-100 p-2 border-b border-stone-200 flex gap-2">
          <button
            type="button"
            onClick={() => setSede('chiclayo')}
            className={`flex-1 py-2.5 px-4 rounded-2xl font-title font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
              isChiclayo
                ? 'bg-white text-diocesis-redDark shadow-sm border border-stone-300'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            <span>🏛️</span>
            <span>Sede Chiclayo</span>
            <span className={`w-2 h-2 rounded-full ${isChiclayo ? 'bg-amber-500' : 'bg-stone-300'}`}></span>
          </button>

          <button
            type="button"
            onClick={() => setSede('santacruz')}
            className={`flex-1 py-2.5 px-4 rounded-2xl font-title font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
              !isChiclayo
                ? 'bg-white text-emerald-900 shadow-sm border border-stone-300'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            <span>⛪</span>
            <span>Sede Santa Cruz</span>
            <span className={`w-2 h-2 rounded-full ${!isChiclayo ? 'bg-emerald-500' : 'bg-stone-300'}`}></span>
          </button>
        </div>

        {/* CONTENIDO DE LA SEDE SELECCIONADA */}
        <div className="p-5 sm:p-6">
          <div className="flex flex-col md:flex-row gap-6 items-center">
            
            {/* AFICHE GRÁFICO (CLIC PARA AMPLIAR) */}
            <div 
              onClick={() => setModalImagen(currentImg)}
              className="w-full md:w-56 aspect-[3/4] bg-stone-100 rounded-2xl overflow-hidden relative shadow-md group cursor-pointer border border-stone-200 shrink-0 hover:shadow-xl transition-all"
              title="Haz clic para ver el afiche en tamaño completo"
            >
              <img 
                src={currentImg} 
                alt={`Afiche de Capacitación ${currentTitulo}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  // Fallback preventivo
                  const fallback = isChiclayo 
                    ? import.meta.env.BASE_URL + 'banners/banner_chiclayo.png'
                    : import.meta.env.BASE_URL + 'banners/banner_santacruz.jpg';
                  if (e.target.src !== fallback) {
                    e.target.src = fallback;
                  }
                }}
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white p-3 text-center">
                <i className="fa-solid fa-magnifying-glass-plus text-2xl mb-1 text-amber-300"></i>
                <span className="text-xs font-bold">Clic para ampliar afiche</span>
              </div>
              <span className="absolute bottom-2 left-2 right-2 bg-black/75 backdrop-blur-xs text-white text-[11px] font-bold py-1 px-2 rounded-lg text-center shadow-xs flex items-center justify-center gap-1.5">
                <i className="fa-solid fa-expand text-[10px] text-amber-400"></i>
                <span>Ver Afiche Oficial</span>
              </span>
            </div>

            {/* INFORMACIÓN DEL EVENTO Y ENLACES DE FACEBOOK */}
            <div className="flex-grow space-y-4 w-full">
              
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 mb-1.5">
                  {isChiclayo ? 'Capacitación en Chiclayo' : 'Capacitación en Santa Cruz'}
                </span>
                <h3 className="text-xl md:text-2xl font-title font-extrabold text-stone-900">
                  {currentTitulo}
                </h3>
              </div>

              {/* DETALLES EN GRILLA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
                <div className="flex items-start gap-2">
                  <i className="fa-solid fa-calendar-days text-diocesis-red mt-0.5 text-sm"></i>
                  <div>
                    <span className="font-bold text-stone-500 uppercase block text-[10px]">Fecha</span>
                    <span className="font-bold text-stone-900">{currentFecha}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <i className="fa-solid fa-clock text-amber-600 mt-0.5 text-sm"></i>
                  <div>
                    <span className="font-bold text-stone-500 uppercase block text-[10px]">Hora</span>
                    <span className="font-bold text-stone-900">{currentHora}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <i className="fa-solid fa-location-dot text-emerald-600 mt-0.5 text-sm"></i>
                  <div>
                    <span className="font-bold text-stone-500 uppercase block text-[10px]">Lugar Presencial</span>
                    <span className="font-bold text-stone-900">{currentLugar}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <i className="fa-solid fa-shirt text-blue-600 mt-0.5 text-sm"></i>
                  <div>
                    <span className="font-bold text-stone-500 uppercase block text-[10px]">Vestimenta</span>
                    <span className="font-bold text-stone-900">{currentVestimenta}</span>
                  </div>
                </div>
              </div>

              {/* NOTA DE TRANSMISIÓN */}
              <p className="text-xs text-stone-600 leading-relaxed font-medium">
                <i className="fa-solid fa-tower-broadcast text-rose-600 mr-1.5"></i>
                Transmisión en vivo oficial para voluntarios que se encuentren fuera de la ciudad o no puedan asistir de forma presencial.
              </p>

              {/* BOTÓN DE TRANSMISIÓN DE FACEBOOK */}
              <div className="pt-1 flex flex-col sm:flex-row gap-2.5">
                {config.fb_diocesis_url ? (
                  <>
                    <a
                      href={config.fb_diocesis_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-[#1877F2] hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition cursor-pointer"
                    >
                      <i className="fa-brands fa-facebook text-base"></i>
                      <span>Facebook Diócesis de Chiclayo ↗</span>
                    </a>
                    <a
                      href={config.fb_pastoral_url || 'https://www.facebook.com/pjchiclayo'}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-[#0866FF] hover:bg-blue-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition cursor-pointer"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
                      <i className="fa-brands fa-facebook text-base"></i>
                      <span>Facebook Pastoral Juvenil ↗</span>
                    </a>
                  </>
                ) : (
                  <a
                    href={config.fb_pastoral_url || 'https://www.facebook.com/pjchiclayo'}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2.5 px-6 py-3 bg-[#1877F2] hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition cursor-pointer"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
                    <i className="fa-brands fa-facebook text-lg"></i>
                    <span>Transmisión Oficial: Facebook Pastoral Juvenil Chiclayo ↗</span>
                  </a>
                )}
              </div>

            </div>

          </div>
        </div>

      </div>

      {/* MODAL LIGHTBOX PARA VER AFICHE EN GRANDE */}
      {modalImagen && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in"
          onClick={() => setModalImagen(null)}
        >
          <div className="relative max-w-xl w-full max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setModalImagen(null)}
              className="absolute -top-11 right-0 text-white hover:text-amber-300 text-2xl font-bold bg-white/20 hover:bg-white/30 rounded-full w-9 h-9 flex items-center justify-center transition cursor-pointer"
              title="Cerrar (Esc)"
            >
              ✕
            </button>
            <img 
              src={modalImagen} 
              alt="Afiche en tamaño completo" 
              className="max-h-[82vh] w-auto rounded-2xl shadow-2xl object-contain border-2 border-white/20"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="mt-3 flex gap-2">
              <a
                href={modalImagen}
                target="_blank"
                rel="noreferrer"
                download
                className="px-4 py-2 bg-white text-stone-900 rounded-xl text-xs font-bold shadow-md hover:bg-amber-100 transition inline-flex items-center gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <i className="fa-solid fa-download text-diocesis-red"></i>
                <span>Descargar Afiche</span>
              </a>
              <button
                onClick={() => setModalImagen(null)}
                className="px-4 py-2 bg-stone-800 text-stone-200 rounded-xl text-xs font-bold hover:bg-stone-700 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
