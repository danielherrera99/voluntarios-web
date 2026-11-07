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
  AlertCircle,
  MapPin,
  Image as ImageIcon
} from 'lucide-react';

const DEFAULT_CONFIG = {
  id: 'capacitaciones',
  activo: false,
  modo_sedes: 'ambas',
  titulo: 'Jornadas Oficiales de Capacitación',
  subtitulo: 'Voluntariado Diocesano • Visita del Santo Padre',
  badge_texto: 'Presencial y Virtual',
  nota_transmision: 'Transmisión en vivo oficial para voluntarios que se encuentren fuera de la ciudad o no puedan asistir de forma presencial.',
  boton_principal_texto: 'Transmisión Oficial: Facebook Pastoral Juvenil Chiclayo ↗',
  boton_principal_url: 'https://www.facebook.com/pjchiclayo',
  boton_secundario_texto: 'Facebook Diócesis de Chiclayo ↗',
  boton_secundario_url: '',
  fb_diocesis_url: '',
  fb_pastoral_url: 'https://www.facebook.com/pjchiclayo',
  
  // Chiclayo
  chiclayo_titulo: 'Voluntariado Chiclayo',
  chiclayo_fecha: 'Sábado 31 de Octubre y Domingo 01 de Noviembre',
  chiclayo_hora: '04:00 p.m.',
  chiclayo_lugar: 'Coliseo del Colegio Manuel Pardo',
  chiclayo_vestimenta: 'Polo Blanco',
  chiclayo_imagen_url: '',
  
  // Santa Cruz
  santacruz_titulo: 'Voluntariado Santa Cruz',
  santacruz_fecha: 'Sábado 31 de Octubre',
  santacruz_hora: '07:30 p.m.',
  santacruz_lugar: 'Teatro Parroquial Santa Cruz',
  santacruz_vestimenta: 'Polo Blanco',
  santacruz_imagen_url: '',
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
        
        {/* SELECTOR MAESTRO DE SEDES A VISUALIZAR */}
        <div className="bg-white rounded-3xl p-6 md:p-8 card-shadow border border-stone-200 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-stone-200 pb-3">
            <div className="flex items-center gap-3">
              <MapPin className="w-6 h-6 text-diocesis-red" />
              <div>
                <h3 className="font-title font-bold text-stone-900 text-base md:text-lg">
                  ¿Qué Sedes deseas mostrar en el Banner?
                </h3>
                <p className="text-xs text-stone-500">
                  Elige con un solo clic si el banner debe mostrar solo Chiclayo, solo Santa Cruz, o ambas sedes con pestañas.
                </p>
              </div>
            </div>

            <span className="text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider bg-stone-100 text-stone-700 border border-stone-300">
              Modo actual: {config.modo_sedes === 'chiclayo' ? '🏛️ Solo Chiclayo' : config.modo_sedes === 'santacruz' ? '⛪ Solo Santa Cruz' : '👥 Ambas Sedes'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            
            {/* OPCIÓN 1: SOLO CHICLAYO */}
            <button
              type="button"
              onClick={() => setConfig({ ...config, modo_sedes: 'chiclayo' })}
              className={`p-4 rounded-2xl border-2 text-left transition flex flex-col justify-between gap-3 cursor-pointer ${
                config.modo_sedes === 'chiclayo'
                  ? 'border-diocesis-red bg-red-50/70 shadow-sm text-diocesis-redDark'
                  : 'border-stone-200 bg-stone-50/50 hover:bg-stone-100/70 text-stone-700'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-2xl">🏛️</span>
                <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  config.modo_sedes === 'chiclayo' ? 'border-diocesis-red bg-diocesis-red' : 'border-stone-400'
                }`}>
                  {config.modo_sedes === 'chiclayo' && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                </span>
              </div>
              <div>
                <span className="font-title font-bold text-sm block">Solo Sede Chiclayo</span>
                <p className="text-[11px] text-stone-500 mt-0.5 leading-snug">
                  Muestra únicamente la capacitación y afiche de Chiclayo. Oculta Santa Cruz.
                </p>
              </div>
            </button>

            {/* OPCIÓN 2: SOLO SANTA CRUZ */}
            <button
              type="button"
              onClick={() => setConfig({ ...config, modo_sedes: 'santacruz' })}
              className={`p-4 rounded-2xl border-2 text-left transition flex flex-col justify-between gap-3 cursor-pointer ${
                config.modo_sedes === 'santacruz'
                  ? 'border-emerald-600 bg-emerald-50/70 shadow-sm text-emerald-950'
                  : 'border-stone-200 bg-stone-50/50 hover:bg-stone-100/70 text-stone-700'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-2xl">⛪</span>
                <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  config.modo_sedes === 'santacruz' ? 'border-emerald-600 bg-emerald-600' : 'border-stone-400'
                }`}>
                  {config.modo_sedes === 'santacruz' && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                </span>
              </div>
              <div>
                <span className="font-title font-bold text-sm block">Solo Sede Santa Cruz</span>
                <p className="text-[11px] text-stone-500 mt-0.5 leading-snug">
                  Muestra únicamente la capacitación y afiche de Santa Cruz. Oculta Chiclayo.
                </p>
              </div>
            </button>

            {/* OPCIÓN 3: AMBAS SEDES */}
            <button
              type="button"
              onClick={() => setConfig({ ...config, modo_sedes: 'ambas' })}
              className={`p-4 rounded-2xl border-2 text-left transition flex flex-col justify-between gap-3 cursor-pointer ${
                (!config.modo_sedes || config.modo_sedes === 'ambas')
                  ? 'border-amber-500 bg-amber-50/70 shadow-sm text-amber-950'
                  : 'border-stone-200 bg-stone-50/50 hover:bg-stone-100/70 text-stone-700'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-2xl">👥</span>
                <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  (!config.modo_sedes || config.modo_sedes === 'ambas') ? 'border-amber-500 bg-amber-500' : 'border-stone-400'
                }`}>
                  {(!config.modo_sedes || config.modo_sedes === 'ambas') && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                </span>
              </div>
              <div>
                <span className="font-title font-bold text-sm block">Ambas Sedes (Con Pestañas)</span>
                <p className="text-[11px] text-stone-500 mt-0.5 leading-snug">
                  Los voluntarios pueden alternar libremente entre Chiclayo y Santa Cruz.
                </p>
              </div>
            </button>

          </div>
        </div>
        
        {/* BLOQUE 0: TÍTULOS Y CABECERA DEL BANNER */}
        <div className="bg-white rounded-3xl p-6 md:p-8 card-shadow border border-stone-200 space-y-4">
          <div className="flex items-center gap-3 border-b border-stone-200 pb-3">
            <Sparkles className="w-6 h-6 text-amber-500" />
            <div>
              <h3 className="font-title font-bold text-stone-900 text-base md:text-lg">
                Títulos y Textos de la Cabecera del Banner
              </h3>
              <p className="text-xs text-stone-500">
                Personaliza el título institucional, subtítulo e insignia de modalidad del banner.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Título del Banner
              </label>
              <input
                type="text"
                value={config.titulo || ''}
                onChange={(e) => setConfig({ ...config, titulo: e.target.value })}
                placeholder="Ej: Jornadas Oficiales de Capacitación"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 text-sm font-bold focus:ring-2 focus:ring-diocesis-red focus:bg-white outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Subtítulo Institucional
              </label>
              <input
                type="text"
                value={config.subtitulo || ''}
                onChange={(e) => setConfig({ ...config, subtitulo: e.target.value })}
                placeholder="Ej: Voluntariado Diocesano • Visita del Santo Padre"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 text-sm focus:ring-2 focus:ring-diocesis-red focus:bg-white outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Insignia de Modalidad (Badge superior)
              </label>
              <input
                type="text"
                value={config.badge_texto || ''}
                onChange={(e) => setConfig({ ...config, badge_texto: e.target.value })}
                placeholder="Ej: Presencial y Virtual / 100% Virtual / Encuentro Diocesano"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 text-sm font-semibold focus:ring-2 focus:ring-diocesis-red focus:bg-white outline-none"
              />
            </div>
          </div>
        </div>

        {/* BLOQUE 1: NOTA Y BOTONES DE TRANSMISIÓN / ENLACES */}
        <div className="bg-white rounded-3xl p-6 md:p-8 card-shadow border border-stone-200 space-y-4">
          <div className="flex items-center gap-3 border-b border-stone-200 pb-3">
            <Share2 className="w-6 h-6 text-[#1877F2]" />
            <div>
              <h3 className="font-title font-bold text-stone-900 text-base md:text-lg">
                Botones de Acción, Enlaces y Nota Explicativa
              </h3>
              <p className="text-xs text-stone-500">
                Personaliza la descripción de la transmisión en vivo y los botones con sus enlaces.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Nota / Descripción de Transmisión
            </label>
            <textarea
              rows={2}
              value={config.nota_transmision || ''}
              onChange={(e) => setConfig({ ...config, nota_transmision: e.target.value })}
              placeholder="Ej: Transmisión en vivo oficial para voluntarios que se encuentren fuera de la ciudad o no puedan asistir de forma presencial."
              className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 text-xs focus:ring-2 focus:ring-diocesis-red focus:bg-white outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Texto Botón Principal
              </label>
              <input
                type="text"
                value={config.boton_principal_texto || ''}
                onChange={(e) => setConfig({ ...config, boton_principal_texto: e.target.value })}
                placeholder="Ej: Transmisión Oficial: Facebook Pastoral Juvenil Chiclayo ↗"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 text-xs font-bold focus:ring-2 focus:ring-diocesis-red focus:bg-white outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Enlace Botón Principal (URL)
              </label>
              <input
                type="url"
                value={config.boton_principal_url || config.fb_pastoral_url || ''}
                onChange={(e) => setConfig({ ...config, boton_principal_url: e.target.value, fb_pastoral_url: e.target.value })}
                placeholder="https://www.facebook.com/pjchiclayo"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 text-xs font-mono focus:ring-2 focus:ring-diocesis-red focus:bg-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Texto Botón Secundario (Opcional)
              </label>
              <input
                type="text"
                value={config.boton_secundario_texto || ''}
                onChange={(e) => setConfig({ ...config, boton_secundario_texto: e.target.value })}
                placeholder="Ej: Facebook Diócesis de Chiclayo ↗"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 text-xs font-bold focus:ring-2 focus:ring-diocesis-red focus:bg-white outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Enlace Botón Secundario (Opcional)
              </label>
              <input
                type="url"
                value={config.boton_secundario_url || config.fb_diocesis_url || ''}
                onChange={(e) => setConfig({ ...config, boton_secundario_url: e.target.value, fb_diocesis_url: e.target.value })}
                placeholder="https://www.facebook.com/DiocesisChiclayo (dejar vacío si no se usa)"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 text-xs font-mono focus:ring-2 focus:ring-diocesis-red focus:bg-white outline-none"
              />
            </div>
          </div>
        </div>
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
              {config.chiclayo_imagen_url ? (
                <img 
                  src={config.chiclayo_imagen_url} 
                  alt="Afiche Chiclayo"
                  className="w-16 h-20 object-cover rounded-xl shadow-xs border border-stone-300 shrink-0"
                />
              ) : (
                <div className="w-16 h-20 bg-stone-100 rounded-xl border border-dashed border-stone-300 flex flex-col items-center justify-center text-stone-400 shrink-0 text-center p-1">
                  <ImageIcon size={20} className="mb-0.5" />
                  <span className="text-[9px] font-bold">Sin foto</span>
                </div>
              )}
              <div className="flex-grow space-y-2">
                <label className="block text-[11px] font-bold text-stone-700 uppercase">
                  URL de Imagen (Cloudinary o ruta externa)
                </label>
                <input
                  type="text"
                  value={config.chiclayo_imagen_url || ''}
                  onChange={(e) => setConfig({ ...config, chiclayo_imagen_url: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono"
                  placeholder="Opcional: https://res.cloudinary.com/..."
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
              {config.santacruz_imagen_url ? (
                <img 
                  src={config.santacruz_imagen_url} 
                  alt="Afiche Santa Cruz"
                  className="w-16 h-20 object-cover rounded-xl shadow-xs border border-stone-300 shrink-0"
                />
              ) : (
                <div className="w-16 h-20 bg-stone-100 rounded-xl border border-dashed border-stone-300 flex flex-col items-center justify-center text-stone-400 shrink-0 text-center p-1">
                  <ImageIcon size={20} className="mb-0.5" />
                  <span className="text-[9px] font-bold">Sin foto</span>
                </div>
              )}
              <div className="flex-grow space-y-2">
                <label className="block text-[11px] font-bold text-stone-700 uppercase">
                  URL de Imagen (Cloudinary o ruta externa)
                </label>
                <input
                  type="text"
                  value={config.santacruz_imagen_url || ''}
                  onChange={(e) => setConfig({ ...config, santacruz_imagen_url: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono"
                  placeholder="Opcional: https://res.cloudinary.com/..."
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
