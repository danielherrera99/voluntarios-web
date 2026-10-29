import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { 
  Save, 
  Eye, 
  EyeOff, 
  Check, 
  RefreshCw, 
  ExternalLink, 
  Upload, 
  Share2,
  Sparkles,
  AlertCircle
} from 'lucide-react';

const DEFAULT_CONFIG = {
  id: 'capacitaciones',
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
  chiclayo_imagen_url: '/banners/banner_chiclayo.png',
  
  // Santa Cruz
  santacruz_titulo: 'Voluntariado Santa Cruz',
  santacruz_fecha: 'Sábado 31 de Octubre',
  santacruz_hora: '07:30 p.m.',
  santacruz_lugar: 'Teatro Parroquial Santa Cruz',
  santacruz_vestimenta: 'Polo Blanco',
  santacruz_imagen_url: '/banners/banner_santacruz.jpg',
};

export default function GestionCapacitacion() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingSede, setUploadingSede] = useState(null);
  const [msg, setMsg] = useState(null);

  const fileInputChiclayo = useRef(null);
  const fileInputSantaCruz = useRef(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('configuracion_banners')
        .select('*')
        .eq('id', 'capacitaciones')
        .maybeSingle();

      if (data && !error) {
        setConfig({ ...DEFAULT_CONFIG, ...data });
      }
    } catch (err) {
      console.warn('Error cargando configuración:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e, sedeKey) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingSede(sedeKey);
    setMsg(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result;
        const apiUrl = import.meta.env.VITE_API_URL || 'https://voluntarios-backend.vercel.app';
        
        const res = await fetch(`${apiUrl}/api/upload-banner-cloudinary`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64Data,
            sede: sedeKey
          })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Error al subir imagen');
        }

        if (sedeKey === 'chiclayo') {
          setConfig(prev => ({ ...prev, chiclayo_imagen_url: data.url }));
        } else {
          setConfig(prev => ({ ...prev, santacruz_imagen_url: data.url }));
        }

        setMsg({ type: 'success', text: `☁️ ¡Imagen de ${sedeKey === 'chiclayo' ? 'Chiclayo' : 'Santa Cruz'} subida con éxito a Cloudinary!` });
      } catch (err) {
        console.error('Error subiendo imagen:', err);
        setMsg({ type: 'error', text: `❌ No se pudo subir a Cloudinary: ${err.message}` });
      } finally {
        setUploadingSede(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    try {
      const payload = {
        ...config,
        id: 'capacitaciones',
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('configuracion_banners')
        .upsert(payload, { onConflict: 'id' });

      if (error) throw error;

      setMsg({ type: 'success', text: '✅ ¡Configuración guardada exitosamente! Ya está activa en la web pública.' });
      setTimeout(() => setMsg(null), 5000);
    } catch (err) {
      console.error('Error guardando configuración:', err);
      setMsg({ type: 'error', text: `❌ Error al guardar: ${err.message}` });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center text-stone-500 border border-stone-200">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-diocesis-mustard mb-3" />
        <p className="font-bold">Cargando configuración de banners...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      
      {/* CABECERA DE GESTIÓN */}
      <div className="bg-gradient-to-r from-red-900 via-red-800 to-amber-900 rounded-3xl p-6 md:p-8 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-400 text-red-950 rounded-full text-xs font-black uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Panel de Administración
          </div>
          <h2 className="text-2xl md:text-3xl font-title font-black">
            Gestión de Banners & Capacitaciones
          </h2>
          <p className="text-stone-200 text-xs md:text-sm mt-1 max-w-2xl leading-relaxed">
            Personaliza los afiches (con Cloudinary), enlaces a Facebook Live, fechas y lugares que se muestran a todos los voluntarios en el portal público.
          </p>
        </div>

        {/* INTERRUPTOR PRINCIPAL (ON / OFF) */}
        <div className="bg-black/30 backdrop-blur-xs p-4 rounded-2xl border border-white/20 flex items-center justify-between md:flex-col md:items-end gap-3 shrink-0">
          <div className="text-left md:text-right">
            <span className="block text-[11px] uppercase tracking-wider font-extrabold text-amber-200">
              Estado en la Web
            </span>
            <span className={`text-sm font-black flex items-center gap-1.5 ${config.activo ? 'text-emerald-400' : 'text-rose-400'}`}>
              {config.activo ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Visible al Público
                </>
              ) : (
                <>
                  <EyeOff className="w-4 h-4" />
                  Oculto (Inactivo)
                </>
              )}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setConfig(prev => ({ ...prev, activo: !prev.activo }))}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer ${
              config.activo
                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {config.activo ? (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                <span>Ocultar Banner</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>Activar Banner</span>
              </>
            )}
          </button>
        </div>
      </div>

      {msg && (
        <div className={`p-4 rounded-2xl border font-bold text-sm flex items-center gap-3 ${
          msg.type === 'success' 
            ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
            : 'bg-rose-50 border-rose-300 text-rose-900'
        }`}>
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{msg.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* BLOQUE 1: ENLACE OFICIAL DE FACEBOOK LIVE */}
        <div className="bg-white rounded-3xl p-6 md:p-8 card-shadow border border-stone-200 space-y-4">
          <div className="flex items-center gap-3 border-b border-stone-200 pb-3">
            <Share2 className="w-6 h-6 text-[#1877F2]" />
            <div>
              <h3 className="font-title font-bold text-stone-900 text-base md:text-lg">
                Página Oficial de Transmisión (Facebook Live)
              </h3>
              <p className="text-xs text-stone-500">
                Canal oficial de Pastoral Juvenil Chiclayo por donde se transmitirá la jornada de capacitación.
              </p>
            </div>
          </div>

          <div className="pt-2 max-w-xl">
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Página de Facebook: Pastoral Juvenil Chiclayo
            </label>
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={config.fb_pastoral_url}
                onChange={(e) => setConfig({ ...config, fb_pastoral_url: e.target.value })}
                placeholder="https://www.facebook.com/pjchiclayo"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 text-xs font-medium focus:ring-2 focus:ring-diocesis-red focus:bg-white outline-none"
                required
              />
              <a
                href={config.fb_pastoral_url}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl transition shrink-0"
                title="Abrir enlace"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* BLOQUE 2: DETALLES DE LAS 2 SEDES (CHICLAYO Y SANTA CRUZ) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* SEDE CHICLAYO */}
          <div className="bg-white rounded-3xl p-6 card-shadow border-2 border-amber-300/80 space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🏛️</span>
                <div>
                  <h4 className="font-title font-bold text-diocesis-redDark text-base">
                    Sede Chiclayo
                  </h4>
                  <span className="text-[11px] text-stone-500 font-medium">Configuración del afiche y sede</span>
                </div>
              </div>
            </div>

            {/* Subida y Vista Previa de la Imagen */}
            <div className="flex items-center gap-4 bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
              <img 
                src={config.chiclayo_imagen_url || '/banners/banner_chiclayo.png'} 
                alt="Afiche Chiclayo"
                className="w-16 h-20 object-cover rounded-xl shadow-xs border border-stone-300 shrink-0"
              />
              <div className="flex-grow space-y-2">
                <label className="block text-[11px] font-bold text-stone-700 uppercase">
                  URL de Imagen (Cloudinary o ruta local)
                </label>
                <input
                  type="text"
                  value={config.chiclayo_imagen_url}
                  onChange={(e) => setConfig({ ...config, chiclayo_imagen_url: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono"
                  placeholder="https://res.cloudinary.com/... o /banners/..."
                  required
                />
                <div>
                  <input
                    type="file"
                    ref={fileInputChiclayo}
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'chiclayo')}
                  />
                  <button
                    type="button"
                    disabled={uploadingSede === 'chiclayo'}
                    onClick={() => fileInputChiclayo.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition cursor-pointer disabled:opacity-50"
                  >
                    {uploadingSede === 'chiclayo' ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Subiendo a Cloudinary...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3 h-3" />
                        <span>Subir nuevo afiche a Cloudinary</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-stone-700 block mb-1">Título del Evento</label>
                <input
                  type="text"
                  value={config.chiclayo_titulo}
                  onChange={(e) => setConfig({ ...config, chiclayo_titulo: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">Fecha(s)</label>
                <input
                  type="text"
                  value={config.chiclayo_fecha}
                  onChange={(e) => setConfig({ ...config, chiclayo_fecha: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Hora</label>
                  <input
                    type="text"
                    value={config.chiclayo_hora}
                    onChange={(e) => setConfig({ ...config, chiclayo_hora: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-700 block mb-1">Vestimenta</label>
                  <input
                    type="text"
                    value={config.chiclayo_vestimenta}
                    onChange={(e) => setConfig({ ...config, chiclayo_vestimenta: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">Lugar Presencial</label>
                <input
                  type="text"
                  value={config.chiclayo_lugar}
                  onChange={(e) => setConfig({ ...config, chiclayo_lugar: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl"
                  required
                />
              </div>
            </div>
          </div>

          {/* SEDE SANTA CRUZ */}
          <div className="bg-white rounded-3xl p-6 card-shadow border-2 border-emerald-300/80 space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">⛪</span>
                <div>
                  <h4 className="font-title font-bold text-emerald-900 text-base">
                    Sede Santa Cruz
                  </h4>
                  <span className="text-[11px] text-stone-500 font-medium">Configuración del afiche y sede</span>
                </div>
              </div>
            </div>

            {/* Subida y Vista Previa de la Imagen */}
            <div className="flex items-center gap-4 bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
              <img 
                src={config.santacruz_imagen_url || '/banners/banner_santacruz.jpg'} 
                alt="Afiche Santa Cruz"
                className="w-16 h-20 object-cover rounded-xl shadow-xs border border-stone-300 shrink-0"
              />
              <div className="flex-grow space-y-2">
                <label className="block text-[11px] font-bold text-stone-700 uppercase">
                  URL de Imagen (Cloudinary o ruta local)
                </label>
                <input
                  type="text"
                  value={config.santacruz_imagen_url}
                  onChange={(e) => setConfig({ ...config, santacruz_imagen_url: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono"
                  placeholder="https://res.cloudinary.com/... o /banners/..."
                  required
                />
                <div>
                  <input
                    type="file"
                    ref={fileInputSantaCruz}
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'santacruz')}
                  />
                  <button
                    type="button"
                    disabled={uploadingSede === 'santacruz'}
                    onClick={() => fileInputSantaCruz.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition cursor-pointer disabled:opacity-50"
                  >
                    {uploadingSede === 'santacruz' ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Subiendo a Cloudinary...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3 h-3" />
                        <span>Subir nuevo afiche a Cloudinary</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-stone-700 block mb-1">Título del Evento</label>
                <input
                  type="text"
                  value={config.santacruz_titulo}
                  onChange={(e) => setConfig({ ...config, santacruz_titulo: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">Fecha(s)</label>
                <input
                  type="text"
                  value={config.santacruz_fecha}
                  onChange={(e) => setConfig({ ...config, santacruz_fecha: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Hora</label>
                  <input
                    type="text"
                    value={config.santacruz_hora}
                    onChange={(e) => setConfig({ ...config, santacruz_hora: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-700 block mb-1">Vestimenta</label>
                  <input
                    type="text"
                    value={config.santacruz_vestimenta}
                    onChange={(e) => setConfig({ ...config, santacruz_vestimenta: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">Lugar Presencial</label>
                <input
                  type="text"
                  value={config.santacruz_lugar}
                  onChange={(e) => setConfig({ ...config, santacruz_lugar: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl"
                  required
                />
              </div>
            </div>
          </div>

        </div>

        {/* BOTÓN DE GUARDAR */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3.5 bg-gradient-to-r from-diocesis-redDark to-diocesis-red hover:from-diocesis-red hover:to-diocesis-redLight text-white rounded-2xl font-title font-bold text-sm shadow-lg hover:shadow-xl transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-diocesis-mustard" />
                <span>Guardando en Servidor...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-diocesis-mustard" />
                <span>Guardar Cambios de Capacitaciones</span>
              </>
            )}
          </button>
        </div>

      </form>

    </div>
  );
}
