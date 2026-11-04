import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { 
  Megaphone, 
  Globe, 
  Sparkles, 
  Save, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Upload, 
  ExternalLink, 
  HelpCircle,
  Smartphone,
  Monitor,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  Palette
} from 'lucide-react';
import GestionCapacitacion from './GestionCapacitacion';

const DEFAULT_POPUP = {
  id: 1,
  activo: false,
  titulo: '¡Consulta tu Responsable de Cuadrilla!',
  mensaje: 'Revisa con tu DNI el estado de tu postulación y el equipo territorial o sede especial a la que has sido asignado para el servicio de la visita papal.',
  imagen_url: '',
  boton_texto: 'Consultar mi DNI Ahora',
  boton_link: '#consulta',
  estilo_color: 'diocesis', // 'diocesis' | 'esperanza' | 'vaticano'
  frecuencia: 'UNA_VEZ',   // 'UNA_VEZ' | 'SIEMPRE'
};

export default function AdministracionWeb() {
  const [subTab, setSubTab] = useState('popup'); // 'popup' | 'capacitaciones'
  const [popupConfig, setPopupConfig] = useState(DEFAULT_POPUP);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [msg, setMsg] = useState(null);
  const [previewDevice, setPreviewDevice] = useState('desktop'); // 'mobile' | 'desktop'
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchPopupConfig();
  }, []);

  const fetchPopupConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('portal_popup')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (data && !error) {
        setPopupConfig({ ...DEFAULT_POPUP, ...data });
      }
    } catch (err) {
      console.warn('Error cargando portal_popup:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePopup = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setMsg(null);

    try {
      const payload = {
        ...popupConfig,
        id: 1,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('portal_popup')
        .upsert(payload, { onConflict: 'id' });

      if (error) throw error;

      setMsg({ type: 'success', text: '✅ ¡Anuncio flotante guardado exitosamente! Los cambios ya están reflejados en el portal público.' });
      setTimeout(() => setMsg(null), 5000);
    } catch (err) {
      console.error('Error guardando portal_popup:', err);
      setMsg({ type: 'error', text: `❌ Error al guardar anuncio: ${err.message}` });
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
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
            sede: 'popup_anuncio'
          })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Error al subir imagen');
        }

        setPopupConfig(prev => ({ ...prev, imagen_url: data.url }));
        setMsg({ type: 'success', text: '☁️ ¡Afiche subido con éxito a Cloudinary y asociado al pop-up!' });
      } catch (err) {
        console.error('Error subiendo afiche:', err);
        setMsg({ type: 'error', text: `❌ No se pudo subir a Cloudinary: ${err.message}` });
      } finally {
        setUploadingImage(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Selector de estilo según el tema
  const getHeaderGradient = (color) => {
    switch (color) {
      case 'esperanza':
        return 'from-emerald-800 via-emerald-700 to-teal-900 border-emerald-500';
      case 'vaticano':
        return 'from-sky-900 via-indigo-900 to-amber-900 border-amber-400';
      case 'diocesis':
      default:
        return 'from-red-950 via-red-900 to-amber-950 border-amber-500';
    }
  };

  const getButtonBg = (color) => {
    switch (color) {
      case 'esperanza':
        return 'bg-emerald-600 hover:bg-emerald-700 text-white';
      case 'vaticano':
        return 'bg-amber-500 hover:bg-amber-600 text-stone-900';
      case 'diocesis':
      default:
        return 'bg-diocesis-red hover:bg-diocesis-redDark text-white';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      
      {/* CABECERA MAESTRA DEL MÓDULO */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-red-950 rounded-3xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-stone-700">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-400 text-red-950 rounded-full text-xs font-black uppercase tracking-wider mb-2 shadow">
            <Sparkles className="w-3.5 h-3.5" />
            Control Central del Portal
          </div>
          <h2 className="text-2xl md:text-3xl font-title font-black flex items-center gap-3">
            <Globe className="w-8 h-8 text-amber-400" />
            Administración Web y Banners
          </h2>
          <p className="text-stone-300 text-xs md:text-sm mt-1 max-w-2xl leading-relaxed">
            Gestiona en un solo lugar el anuncio pop-up flotante que reciben los voluntarios al ingresar, y los afiches y jornadas oficiales de capacitación.
          </p>
        </div>

        {/* NAVEGACIÓN INTERNA ENTRE SUB-PESTAÑAS */}
        <div className="flex bg-stone-950/80 p-1.5 rounded-2xl border border-stone-700/80 self-start md:self-center shrink-0">
          <button
            onClick={() => setSubTab('popup')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold transition cursor-pointer ${
              subTab === 'popup'
                ? 'bg-amber-500 text-stone-950 shadow-md font-black'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <Megaphone className="w-4 h-4" />
            📢 Anuncio Pop-up
          </button>
          <button
            onClick={() => setSubTab('capacitaciones')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold transition cursor-pointer ${
              subTab === 'capacitaciones'
                ? 'bg-amber-500 text-stone-950 shadow-md font-black'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            🎓 Banners Capacitación
          </button>
        </div>
      </div>

      {/* SUB-PESTAÑA 1: GESTIÓN DEL ANUNCIO POP-UP */}
      {subTab === 'popup' && (
        <div className="space-y-6">
          {msg && (
            <div className={`p-4 rounded-2xl text-xs md:text-sm font-bold flex items-center gap-2 shadow-sm animate-fade-in ${
              msg.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-300' : 'bg-red-50 text-red-900 border border-red-300'
            }`}>
              {msg.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />}
              <span>{msg.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* FORMULARIO DE EDICIÓN (7 COLS) */}
            <div className="lg:col-span-7 bg-white rounded-3xl p-6 md:p-8 border border-stone-200 shadow-md space-y-6">
              
              {/* SWITCH MAESTRO ACTIVAR / DESACTIVAR */}
              <div className={`p-5 rounded-2xl border-2 transition flex items-center justify-between ${
                popupConfig.activo 
                  ? 'bg-emerald-50/80 border-emerald-400 text-emerald-950' 
                  : 'bg-stone-50 border-stone-300 text-stone-600'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-sm ${
                    popupConfig.activo ? 'bg-emerald-600 text-white' : 'bg-stone-300 text-stone-600'
                  }`}>
                    {popupConfig.activo ? <Eye className="w-6 h-6" /> : <EyeOff className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="font-title font-bold text-base md:text-lg">
                      {popupConfig.activo ? 'Pop-up Activo en el Portal' : 'Pop-up Desactivado'}
                    </h3>
                    <p className="text-xs font-medium opacity-90">
                      {popupConfig.activo 
                        ? 'Los visitantes ven este anuncio al abrir la página web.' 
                        : 'El pop-up no se mostrará a nadie hasta que lo actives.'}
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={popupConfig.activo}
                    onChange={(e) => setPopupConfig({ ...popupConfig, activo: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-8 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* TÍTULO Y MENSAJE */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Título Principal del Anuncio
                  </label>
                  <input
                    type="text"
                    value={popupConfig.titulo}
                    onChange={(e) => setPopupConfig({ ...popupConfig, titulo: e.target.value })}
                    placeholder="Ej: ¡Consulta tu Responsable de Cuadrilla!"
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-300 rounded-xl font-bold text-stone-900 focus:outline-none focus:border-amber-500 focus:bg-white transition text-sm md:text-base"
                  />
                  {/* Atajos de Títulos */}
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className="text-[10px] text-stone-400 font-bold uppercase">Sugerencias:</span>
                    <button
                      type="button"
                      onClick={() => setPopupConfig(p => ({ ...p, titulo: '¡Consulta tu Responsable de Cuadrilla!' }))}
                      className="text-[11px] bg-stone-100 hover:bg-stone-200 text-stone-700 px-2 py-0.5 rounded-md font-semibold cursor-pointer transition"
                    >
                      Cadena de Mandos
                    </button>
                    <button
                      type="button"
                      onClick={() => setPopupConfig(p => ({ ...p, titulo: '¡Reunión General de Capacitación!' }))}
                      className="text-[11px] bg-stone-100 hover:bg-stone-200 text-stone-700 px-2 py-0.5 rounded-md font-semibold cursor-pointer transition"
                    >
                      Capacitación
                    </button>
                    <button
                      type="button"
                      onClick={() => setPopupConfig(p => ({ ...p, titulo: '¡Entrega Oficial de Credenciales!' }))}
                      className="text-[11px] bg-stone-100 hover:bg-stone-200 text-stone-700 px-2 py-0.5 rounded-md font-semibold cursor-pointer transition"
                    >
                      Credenciales
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Mensaje / Comunicado Oficial
                  </label>
                  <textarea
                    rows={4}
                    value={popupConfig.mensaje}
                    onChange={(e) => setPopupConfig({ ...popupConfig, mensaje: e.target.value })}
                    placeholder="Escribe el texto detallado que se mostrará en el cuerpo del pop-up..."
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-300 rounded-xl text-stone-800 focus:outline-none focus:border-amber-500 focus:bg-white transition text-sm leading-relaxed"
                  />
                </div>
              </div>

              {/* IMAGEN / AFICHE FLYER */}
              <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-amber-600" />
                    Afiche o Flyer Promocional (Opcional)
                  </label>
                  {popupConfig.imagen_url && (
                    <button
                      type="button"
                      onClick={() => setPopupConfig(p => ({ ...p, imagen_url: '' }))}
                      className="text-xs text-red-600 hover:text-red-700 font-bold underline cursor-pointer"
                    >
                      Quitar imagen
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="url"
                    value={popupConfig.imagen_url}
                    onChange={(e) => setPopupConfig({ ...popupConfig, imagen_url: e.target.value })}
                    placeholder="https://... o sube una imagen con el botón"
                    className="flex-1 px-4 py-2.5 bg-white border border-stone-300 rounded-xl text-xs md:text-sm font-mono text-stone-800 focus:outline-none focus:border-amber-500"
                  />
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    accept="image/*" 
                    className="hidden" 
                  />
                  <button
                    type="button"
                    disabled={uploadingImage}
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2.5 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {uploadingImage ? <RefreshCw className="w-4 h-4 animate-spin text-amber-400" /> : <Upload className="w-4 h-4 text-amber-400" />}
                    <span>{uploadingImage ? 'Subiendo...' : 'Subir Flyer'}</span>
                  </button>
                </div>
              </div>

              {/* BOTÓN DE ACCIÓN (CTA) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Texto del Botón
                  </label>
                  <input
                    type="text"
                    value={popupConfig.boton_texto}
                    onChange={(e) => setPopupConfig({ ...popupConfig, boton_texto: e.target.value })}
                    placeholder="Ej: Consultar mi DNI Ahora"
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl font-bold text-stone-900 text-sm focus:outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Enlace de Destino
                  </label>
                  <input
                    type="text"
                    value={popupConfig.boton_link}
                    onChange={(e) => setPopupConfig({ ...popupConfig, boton_link: e.target.value })}
                    placeholder="Ej: #consulta o link externo"
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl font-mono text-stone-800 text-sm focus:outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* CONFIGURACIONES ADICIONALES: ESTILO Y FRECUENCIA */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-amber-600" />
                    Estilo Visual
                  </label>
                  <select
                    value={popupConfig.estilo_color}
                    onChange={(e) => setPopupConfig({ ...popupConfig, estilo_color: e.target.value })}
                    className="w-full px-3 py-2.5 bg-stone-50 border border-stone-300 rounded-xl font-bold text-stone-800 text-sm focus:outline-none focus:border-amber-500"
                  >
                    <option value="diocesis">Diocesano (Rojo & Granate)</option>
                    <option value="esperanza">Esperanza (Verde & Esmeralda)</option>
                    <option value="vaticano">Vaticano (Azul & Oro)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                    Frecuencia de Aparición
                  </label>
                  <select
                    value={popupConfig.frecuencia}
                    onChange={(e) => setPopupConfig({ ...popupConfig, frecuencia: e.target.value })}
                    className="w-full px-3 py-2.5 bg-stone-50 border border-stone-300 rounded-xl font-bold text-stone-800 text-sm focus:outline-none focus:border-amber-500"
                  >
                    <option value="UNA_VEZ">Una vez por sesión (Recomendado)</option>
                    <option value="SIEMPRE">Siempre que abran o recarguen la página</option>
                  </select>
                </div>
              </div>

              {/* BOTÓN PRINCIPAL DE GUARDAR */}
              <div className="pt-4 border-t border-stone-200">
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSavePopup}
                  className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-title font-bold rounded-2xl shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2 text-base md:text-lg cursor-pointer disabled:opacity-75"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Guardando en la Web...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      <span>Guardar y Publicar Anuncio Pop-up</span>
                    </>
                  )}
                </button>
              </div>

            </div>

            {/* SIMULADOR EN VIVO / LIVE PREVIEW (5 COLS) */}
            <div className="lg:col-span-5 bg-stone-100 rounded-3xl p-6 border border-stone-300 shadow-inner space-y-4 lg:sticky lg:top-6">
              
              <div className="flex items-center justify-between border-b border-stone-300/80 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                  <h4 className="font-title font-bold text-stone-800 text-sm uppercase tracking-wide">
                    Simulador en Vivo (Live Preview)
                  </h4>
                </div>

                <div className="flex items-center bg-white p-1 rounded-xl border border-stone-300">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('desktop')}
                    className={`p-1.5 rounded-lg transition ${previewDevice === 'desktop' ? 'bg-stone-800 text-white' : 'text-stone-500'}`}
                    title="Vista en Computadora"
                  >
                    <Monitor className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('mobile')}
                    className={`p-1.5 rounded-lg transition ${previewDevice === 'mobile' ? 'bg-stone-800 text-white' : 'text-stone-500'}`}
                    title="Vista en Celular"
                  >
                    <Smartphone className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* MAQUETA DEL POPUP FLOTANTE */}
              <div className="py-4 flex justify-center">
                <div 
                  className={`bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-stone-300 transition-all duration-300 ${
                    previewDevice === 'mobile' ? 'w-[320px]' : 'w-full max-w-[420px]'
                  }`}
                >
                  {/* Cabecera del Popup en Preview */}
                  <div className={`p-4 text-white text-center bg-gradient-to-r relative ${getHeaderGradient(popupConfig.estilo_color)}`}>
                    <span className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/30 text-white flex items-center justify-center text-xs font-bold">
                      ✕
                    </span>
                    <span className="inline-block px-2.5 py-0.5 bg-white/20 backdrop-blur rounded-full text-[10px] font-black uppercase tracking-wider mb-1">
                      ✞ Diócesis de Chiclayo ✞
                    </span>
                    <h4 className="font-title font-bold text-sm md:text-base leading-snug">
                      {popupConfig.titulo || 'Título del Anuncio'}
                    </h4>
                  </div>

                  {/* Imagen / Afiche si existe */}
                  {popupConfig.imagen_url && (
                    <div className="bg-stone-900 p-2 text-center">
                      <img 
                        src={popupConfig.imagen_url} 
                        alt="Afiche oficial" 
                        className="max-h-48 w-auto mx-auto rounded-xl object-contain shadow"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </div>
                  )}

                  {/* Mensaje / Cuerpo */}
                  <div className="p-5 space-y-4 text-center">
                    <p className="text-xs md:text-sm text-stone-700 leading-relaxed font-medium whitespace-pre-line">
                      {popupConfig.mensaje || 'Texto del comunicado oficial diocesano...'}
                    </p>

                    {/* Botón de Acción CTA */}
                    <div className="space-y-2 pt-2">
                      {popupConfig.boton_texto && (
                        <div className={`w-full py-2.5 px-4 rounded-xl font-title font-bold text-xs md:text-sm shadow transition flex items-center justify-center gap-1.5 ${getButtonBg(popupConfig.estilo_color)}`}>
                          <span>{popupConfig.boton_texto}</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </div>
                      )}
                      <div className="text-[11px] text-stone-400 font-bold hover:underline cursor-pointer">
                        Entendido, continuar a la web
                      </div>
                    </div>
                  </div>

                  {/* Pie institucional */}
                  <div className="bg-stone-50 p-2.5 border-t border-stone-200 text-center">
                    <span className="text-[9px] font-bold text-stone-500 uppercase tracking-wider">
                      Comisión Diocesana de Voluntariado 2026
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-center text-[11px] text-stone-500">
                Así es exactamente como se desplegará el pop-up cuando los voluntarios ingresen a la página web.
              </p>

            </div>

          </div>
        </div>
      )}

      {/* SUB-PESTAÑA 2: GESTIÓN DE BANNERS DE CAPACITACIONES (CHICLAYO & SANTA CRUZ) */}
      {subTab === 'capacitaciones' && (
        <GestionCapacitacion embedded={true} />
      )}

    </div>
  );
}
