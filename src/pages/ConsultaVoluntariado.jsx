import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import FloatingChat from '../components/FloatingChat';
import BannerCapacitacion from '../components/BannerCapacitacion';

// Base de datos de prueba / demo institucional
const mockDatabase = {
  "72849102": {
    status: "SELECTED",
    name: "María Elena Flores Ramos",
    dni: "72849102",
    comision: "Logística y Protocolo",
    area: "Pastoral Juvenil / Laicos"
  },
  "45102938": {
    status: "PENDING",
    name: "Carlos Alberto Mendoza Ruiz",
    dni: "45102938",
    comision: "Revisión Documentaria",
    area: "Comisión Diocesana",
    observacion: "Falta adjuntar la fotocopia legible de tu DNI o la Ficha de Autorización firmada."
  },
  "10928374": {
    status: "NOT_SELECTED",
    name: "Jorge Luis Gutierrez S.",
    dni: "10928374"
  }
};

// Enlace al Formulario Oficial de Google Forms (Etapa 2)
const GOOGLE_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSfO_z7lnEDjQR37y7V7uh9gEsFs5ZNlznvM6_GyeKiAljmlmA/viewform";

// Formato Oficial de la Carta de Recomendación (Google Drive)
const CARTA_RECOMENDACION_URL = "https://drive.google.com/file/d/1S4yGZY9iC65vW2m9q4u5VGMtcS9wh_kn/view?usp=sharing";

// Canales oficiales de soporte directo por WhatsApp
const SOPORTE_CONTACTOS = [
  {
    id: 1,
    titulo: 'Línea de Atención 1',
    telefono: '+51 936 550 460',
    waNumber: '51936550460',
    descripcion: 'Consultas generales y orientación',
  },
  {
    id: 2,
    titulo: 'Línea de Atención 2',
    telefono: '+51 945 854 083',
    waNumber: '51945854083',
    descripcion: 'Consultas generales y orientación',
  },
  {
    id: 3,
    titulo: 'Línea de Atención 3',
    telefono: '+51 981 349 410',
    waNumber: '51981349410',
    descripcion: 'Consultas generales y orientación',
  },
  {
    id: 4,
    titulo: 'Línea de Atención 4',
    telefono: '+51 947 429 053',
    waNumber: '51947429053',
    descripcion: 'Consultas generales y orientación',
  },
  {
    id: 5,
    titulo: 'Línea de Atención 5',
    telefono: '+51 981 574 685',
    waNumber: '51981574685',
    descripcion: 'Consultas generales y orientación',
  },
];

const formatearSedeEspecial = (sede) => {
  if (!sede) return 'Sede Diocesana';
  const s = String(sede).toUpperCase().trim();
  if (s.includes('USAT')) return 'Sede Universitaria USAT';
  if (s.includes('SANTUARIO')) return 'Sede Santuario Diocesano';
  if (s.includes('ZAÑA')) return 'Sede Histórica Zaña';
  if (s.includes('SANTA CRUZ')) return 'Sede Territorial Santa Cruz';
  if (s.includes('COMUNIÓN') || s.includes('COMUNION')) return 'Comisión de Sagrada Comunión';
  if (s.includes('TRADUCTOR')) return 'Comisión de Traductores y Lengua de Señas';
  if (s.includes('COMISIÓN CENTRAL') || s.includes('COMISION CENTRAL')) return 'Comisión Central Organizadora';
  if (s.includes('CAJAMARCA')) return 'Delegación Universidad de Cajamarca';
  return sede;
};

export default function ConsultaVoluntariado() {
  const [dniInput, setDniInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [popupConfig, setPopupConfig] = useState(null);
  const [showPopupModal, setShowPopupModal] = useState(false);
  const [zoomPopupImage, setZoomPopupImage] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const [captchaError, setCaptchaError] = useState(null);

  const recaptchaContainerRef = useRef(null);
  const widgetIdRef = useRef(null);

  const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6Lde1vctAAAAAPSQWvEDDFmSTYP9rTux28z48aTQ';

  // Cargar anuncio pop-up flotante
  useEffect(() => {
    async function checkPopup() {
      try {
        const { data, error } = await supabase
          .from('portal_popup')
          .select('*')
          .eq('id', 1)
          .maybeSingle();

        if (data && data.activo && !error) {
          const yaVisto = data.frecuencia === 'UNA_VEZ' && sessionStorage.getItem('portal_popup_visto_v1');
          if (!yaVisto) {
            setPopupConfig(data);
            setTimeout(() => {
              setShowPopupModal(true);
            }, 600);
          }
        }
      } catch (e) {
        console.warn('Aviso popup:', e);
      }
    }
    checkPopup();
  }, []);

  const handleClosePopup = () => {
    setShowPopupModal(false);
    if (popupConfig?.frecuencia === 'UNA_VEZ') {
      sessionStorage.setItem('portal_popup_visto_v1', 'true');
    }
  };

  const handleActionPopup = () => {
    handleClosePopup();
    if (popupConfig?.boton_link) {
      if (popupConfig.boton_link === '#consulta' || popupConfig.boton_link.startsWith('#')) {
        const el = document.getElementById('dniInput') || document.querySelector(popupConfig.boton_link);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
          setTimeout(() => el.focus(), 500);
        }
      } else {
        window.open(popupConfig.boton_link, '_blank');
      }
    }
  };

  useEffect(() => {
    // Función para inicializar el widget de reCAPTCHA
    const initRecaptcha = () => {
      if (window.grecaptcha && window.grecaptcha.render && recaptchaContainerRef.current && widgetIdRef.current === null) {
        try {
          widgetIdRef.current = window.grecaptcha.render(recaptchaContainerRef.current, {
            sitekey: SITE_KEY,
            callback: (token) => {
              setCaptchaToken(token);
              setCaptchaError(null);
            },
            'expired-callback': () => {
              setCaptchaToken(null);
            }
          });
        } catch (e) {
          console.warn('Aviso reCAPTCHA:', e);
        }
      }
    };

    if (window.grecaptcha && window.grecaptcha.render) {
      initRecaptcha();
    } else {
      window.onRecaptchaLoaded = () => {
        initRecaptcha();
      };
      const existingScript = document.getElementById('google-recaptcha-v2-script');
      if (!existingScript) {
        const script = document.createElement('script');
        script.id = 'google-recaptcha-v2-script';
        script.src = 'https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoaded&render=explicit';
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
    }
  }, [SITE_KEY]);

  const performSearch = async (dni, token) => {
    const cleanDni = dni.trim();
    if (!cleanDni) return;

    setLoading(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://voluntarios-backend.vercel.app';

      // 1. Intentar a través del Endpoint Seguro del Backend (con Rate Limiting y Sanitización)
      try {
        const res = await fetch(`${apiUrl}/api/consulta/${cleanDni}`, {
          headers: token ? { 'x-recaptcha-token': token } : {}
        });
        if (res.status === 429) {
          setResult({
            status: 'NOT_FOUND',
            dni: cleanDni,
            observacion: '⚠️ Has realizado demasiadas consultas seguidas. Por seguridad diocesana, por favor espera 1 minuto antes de volver a consultar.'
          });
          return;
        }

        if (res.ok) {
          const apiData = await res.json();
          if (apiData.found) {
            const isObserved = Boolean(apiData.esVerificar) || Boolean(apiData.observacion) || (apiData.estado && String(apiData.estado).toUpperCase().includes('REVISI'));
            setResult({
              status: apiData.status === 'FASE1_REGISTRADO' ? 'FASE1' : apiData.status,
              fase: apiData.fase || '1',
              name: apiData.name || 'Postulante',
              dni: apiData.dni,
              codigo: apiData.codigo,
              comision: apiData.comision || 'Servicio General',
              area: apiData.area || 'Diócesis de Chiclayo y Santa Cruz',
              esVerificar: apiData.status === 'PENDING' && isObserved,
              observacion: apiData.observacion || null,
              lugarAsignado: apiData.lugar_asignado || null,
              responsableAsignado: apiData.responsable_asignado || null,
              tipoAsignacion: apiData.tipo_asignacion || null
            });
            return;
          } else {
            setResult({
              status: 'NOT_FOUND',
              dni: cleanDni
            });
            return;
          }
        }
      } catch (backendErr) {
        console.warn('Backend temporalmente no disponible, usando respaldo a Supabase:', backendErr);
      }

      // 2. Respaldo directo a Supabase (consultando ÚNICAMENTE campos públicos, sin datos personales sensibles)
      const { data: f2Data, error: f2Error } = await supabase
        .from('voluntarios')
        .select('dni, nombres_apellidos, codigo, servicio, departamento, estado, fase, observacion, info_validada, lugar_asignado')
        .eq('dni', cleanDni)
        .maybeSingle();

      if (f2Error && f2Error.code !== 'PGRST116') {
        console.warn('Aviso en consulta Fase 2:', f2Error.message);
      }

      if (f2Data) {
        const valStr = String(f2Data.estado || '').toUpperCase();
        const isRejected = valStr.includes('NO') || valStr.includes('RECHAZ');
        const isApproved = !isRejected && (f2Data.info_validada || valStr.includes('SELECCIONAD') || valStr.includes('APROBAD'));
        const isVerificar = !isRejected && (valStr.includes('REVISI') || valStr.includes('OBSERV') || valStr.includes('VERIFICAR') || Boolean(f2Data.observacion));

        let mappedStatus = 'PENDING';
        if (isRejected) {
          mappedStatus = 'NOT_SELECTED';
        } else if (isApproved) {
          mappedStatus = 'SELECTED';
        } else if (isVerificar) {
          mappedStatus = 'PENDING';
        }

        const lugarAsignado = f2Data.lugar_asignado || null;
        const isEquipo = lugarAsignado && /^Equipo\s+/i.test(lugarAsignado);
        const responsableAsignado = isEquipo ? lugarAsignado.replace(/^Equipo\s+/i, '').trim() : null;
        const tipoAsignacion = lugarAsignado ? (isEquipo ? 'EQUIPO_LIDER' : 'SEDE_ESPECIAL') : null;

        setResult({
          status: mappedStatus,
          fase: f2Data.fase || '2',
          name: f2Data.nombres_apellidos || 'Postulante',
          dni: f2Data.dni,
          codigo: f2Data.codigo,
          comision: f2Data.servicio || 'Servicio Diocesano Asignado',
          area: f2Data.departamento || 'Diócesis de Chiclayo y Santa Cruz',
          esVerificar: isVerificar,
          observacion: f2Data.observacion || null,
          lugarAsignado,
          responsableAsignado,
          tipoAsignacion
        });
        return;
      }

      // Consultar en Fase 1 (únicamente campos necesarios)
      const { data: f1Data, error: f1Error } = await supabase
        .from('voluntarios_general')
        .select('dni, nombres_apellidos, codigo, servicio, departamento, estado, fase, lugar_asignado')
        .eq('dni', cleanDni)
        .maybeSingle();

      if (f1Error && f1Error.code !== 'PGRST116') {
        console.warn('Aviso en consulta Fase 1:', f1Error.message);
      }

      if (f1Data) {
        const lugarAsignadoF1 = f1Data.lugar_asignado || null;
        const isEquipoF1 = lugarAsignadoF1 && /^Equipo\s+/i.test(lugarAsignadoF1);
        const responsableAsignadoF1 = isEquipoF1 ? lugarAsignadoF1.replace(/^Equipo\s+/i, '').trim() : null;
        const tipoAsignacionF1 = lugarAsignadoF1 ? (isEquipoF1 ? 'EQUIPO_LIDER' : 'SEDE_ESPECIAL') : null;

        setResult({
          status: 'FASE1',
          fase: '1',
          name: f1Data.nombres_apellidos || 'Postulante',
          dni: f1Data.dni,
          codigo: f1Data.codigo,
          comision: f1Data.servicio || 'Servicio Solicitado',
          area: f1Data.departamento || 'Diócesis de Chiclayo y Santa Cruz',
          observacion: 'Te encuentras registrado/a en el Padrón General inicial (Fase 1). Si completaste tu ficha o documentos de la Fase 2 recientemente, tu expediente está en proceso de validación.',
          lugarAsignado: lugarAsignadoF1,
          responsableAsignado: responsableAsignadoF1,
          tipoAsignacion: tipoAsignacionF1
        });
        return;
      }

      // 3. No encontrado en ninguna base
      setResult({
        status: 'NOT_FOUND',
        dni: cleanDni
      });

    } catch (err) {
      console.error('Error durante la búsqueda:', err);
      setResult({
        status: 'NOT_FOUND',
        dni: cleanDni
      });
    } finally {
      setLoading(false);
      // Resetear widget de reCAPTCHA para la siguiente consulta
      if (widgetIdRef.current !== null && window.grecaptcha) {
        try {
          window.grecaptcha.reset(widgetIdRef.current);
          setCaptchaToken(null);
        } catch (e) {}
      }
    }
  };

  const handleCloseModal = () => {
    setResult(null);
    setLoading(false);
    setDniInput('');
  };

  // Bloquear scroll de fondo y permitir cerrar con tecla Escape cuando algún modal está abierto
  useEffect(() => {
    if (result || showSupportModal) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          if (showSupportModal) setShowSupportModal(false);
          else if (result) handleCloseModal();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = 'auto';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = 'auto';
    }
  }, [result, showSupportModal]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!dniInput.trim()) return;

    if (!captchaToken) {
      setCaptchaError('Por favor marca la casilla "No soy un robot" antes de consultar.');
      return;
    }
    setCaptchaError(null);
    performSearch(dniInput, captchaToken);
  };

  return (
    <div className="font-sans antialiased text-stone-800 min-h-screen flex flex-col justify-between bg-stone-100 selection:bg-diocesis-mustard selection:text-white">

      {/* BARRA SUPERIOR INSTITUCIONAL */}
      <div className="bg-diocesis-mustard text-white px-4 py-2 text-xs md:text-sm font-semibold text-center flex items-center justify-center gap-2 shadow-sm no-print">
        <i className="fa-solid fa-cross"></i>
        <span className="font-title tracking-wide text-sm md:text-base font-bold">Voluntariado Amigos de León</span>
      </div>

      {/* CABECERA CON LOGOS OFICIALES */}
      <header className="header-gradient text-white border-b-4 border-diocesis-mustard shadow-lg relative overflow-hidden no-print">
        <div className="max-w-5xl mx-auto px-4 py-6 md:py-8 relative z-10 space-y-6">

          {/* BARRA DE LOGOTIPOS OFICIALES */}
          <div className="bg-white/95 backdrop-blur rounded-2xl p-3 md:p-4 shadow-xl border border-diocesis-mustard/30 flex flex-wrap items-center justify-around gap-4 sm:gap-6">

            {/* Logo 1: Diócesis de Chiclayo */}
            <div className="flex items-center gap-2 hover:scale-105 transition-transform duration-200">
              <img 
                src={import.meta.env.BASE_URL + 'logos/logo_diocesis.png'} 
                alt="Diócesis de Chiclayo" 
                className="h-10 sm:h-12 md:h-14 w-auto object-contain"
              />
            </div>

            <div className="hidden sm:block h-8 w-px bg-stone-200"></div>

            {/* Logo 2: Pastoral Juvenil */}
            <div className="flex items-center gap-2 hover:scale-105 transition-transform duration-200">
              <img 
                src={import.meta.env.BASE_URL + 'logos/logo_pastoral_juvenil.png'} 
                alt="Pastoral Juvenil - Diócesis de Chiclayo" 
                className="h-10 sm:h-12 md:h-14 w-auto object-contain"
              />
            </div>

            <div className="hidden md:block h-8 w-px bg-stone-200"></div>

            {/* Logo 3: Comisión Diocesana de Juventud */}
            <div className="flex items-center gap-2.5 hover:scale-105 transition-transform duration-200">
              <img 
                src={import.meta.env.BASE_URL + 'logos/logo_comision_juventud.png'} 
                alt="Comisión Diocesana de Juventud" 
                className="h-10 sm:h-12 md:h-14 w-auto object-contain drop-shadow-sm"
              />
              <div className="leading-tight hidden sm:block">
                <span className="block text-[9px] font-extrabold text-diocesis-redDark uppercase tracking-tight">Comisión Diocesana</span>
                <span className="block text-[11px] font-black text-stone-900 font-title uppercase">de Juventud</span>
              </div>
            </div>

            <div className="hidden sm:block h-8 w-px bg-stone-200"></div>

            {/* Logo 4: Área Diocesana de Laicos */}
            <div className="flex items-center gap-2 hover:scale-105 transition-transform duration-200">
              <img 
                src={import.meta.env.BASE_URL + 'logos/logo_laicos.png'} 
                alt="Área Diocesana de Laicos" 
                className="h-10 sm:h-12 md:h-14 w-auto object-contain"
              />
            </div>

          </div>

          {/* TÍTULO PRINCIPAL */}
          <div className="text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-6 pt-2">
            <div>
              <span className="inline-block px-3 py-1 bg-diocesis-mustard text-white text-xs font-bold rounded-full uppercase tracking-wider mb-2 shadow-sm">
                Proceso de Selección
              </span>
              <h1 className="text-2xl md:text-4xl font-title font-bold text-white tracking-wide" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                DIÓCESIS DE CHICLAYO "CHICLAYO Y SANTA CRUZ"
              </h1>
              <p className="text-xs md:text-sm text-stone-100 mt-1 font-semibold" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
                Visita del Santo Padre a nuestra Diócesis
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowSupportModal(true)}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs md:text-sm font-bold px-5 py-3 rounded-xl transition shadow-md hover:shadow-lg border border-emerald-400/30 shrink-0 cursor-pointer"
              title="Ver canales de atención diocesanos por WhatsApp"
            >
              <i className="fa-brands fa-whatsapp text-lg"></i>
              <span>Soporte Directo</span>
            </button>
          </div>

        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-4xl w-full mx-auto px-4 py-8 md:py-12 flex-grow">

        {/* BANNER OFICIAL DE CAPACITACIONES */}
        <BannerCapacitacion />

        {/* CUADRO DE BÚSQUEDA */}
        <div className="bg-white rounded-3xl p-6 md:p-10 card-shadow border border-stone-200 mb-8 relative overflow-hidden no-print">
          <div className="absolute top-0 right-0 w-24 h-24 bg-diocesis-mustard/10 rounded-bl-full pointer-events-none"></div>

          <div className="text-center max-w-xl mx-auto mb-8">
            <span className="text-xs font-bold uppercase tracking-widest text-diocesis-mustard bg-stone-100 px-3 py-1 rounded-full border border-stone-200">
              Consulta en Línea
            </span>
            <h2 className="text-2xl md:text-3xl font-title font-bold text-diocesis-redDark mt-3">
              Revisa el Estado de tu Postulación
            </h2>
            <p className="text-sm md:text-base text-stone-600 mt-2 font-medium">
              Ingresa tu número de Documento de Identidad (DNI) o Pasaporte registrado para verificar si pasaste a la siguiente etapa.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-diocesis-red">
                <i className="fa-solid fa-id-card text-lg"></i>
              </div>
              <input
                type="text"
                id="dniInput"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Ingresa tu DNI o Pasaporte"
                maxLength="9"
                required
                value={dniInput}
                onChange={(e) => setDniInput(e.target.value.replace(/\D/g, ''))}
                className="w-full pl-12 pr-4 py-4 bg-stone-50 border-2 border-stone-300 rounded-2xl text-stone-900 placeholder-stone-400 focus:outline-none focus:border-diocesis-red focus:bg-white transition text-base md:text-lg font-semibold shadow-inner"
              />
            </div>

            {/* WIDGET GOOGLE reCAPTCHA v2 */}
            <div className="flex flex-col items-center justify-center my-4">
              <div ref={recaptchaContainerRef} className="shadow-xs rounded-xl overflow-hidden min-h-[78px] flex items-center justify-center"></div>
              {captchaError && (
                <p className="text-xs text-rose-600 font-bold mt-2 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 text-center animate-bounce">
                  <i className="fa-solid fa-circle-exclamation mr-1.5"></i>
                  {captchaError}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-diocesis-red hover:bg-diocesis-redDark disabled:opacity-75 text-white font-title font-bold py-4 px-6 rounded-2xl transition shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-base md:text-lg border-b-4 border-diocesis-redDark cursor-pointer"
            >
              {loading ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin text-diocesis-mustard"></i>
                  <span>Consultando...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-magnifying-glass text-diocesis-mustard"></i>
                  <span>Consultar Estado</span>
                </>
              )}
            </button>
          </form>

          {/* NOTA INSTITUCIONAL DE CONSULTA */}
          <div className="mt-8 pt-4 border-t border-stone-200 text-center">
            <p className="text-xs text-stone-500 font-medium flex items-center justify-center gap-1.5">
              <i className="fa-solid fa-shield-halved text-emerald-600"></i>
              <span>Sistema Oficial de Consulta • Diócesis de Chiclayo "Chiclayo y Santa Cruz"</span>
            </p>
          </div>
        </div>

        {/* MODAL DE ANUNCIO POP-UP FLOTANTE AL INGRESAR */}
        {showPopupModal && popupConfig && (
          <div 
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in no-print"
            onClick={(e) => {
              if (e.target === e.currentTarget) handleClosePopup();
            }}
          >
            <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden my-auto border border-stone-200 animate-in fade-in zoom-in-95 duration-200">
              {/* Botón flotante para cerrar (X) */}
              <button
                type="button"
                onClick={handleClosePopup}
                className="absolute top-3.5 right-3.5 z-30 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition backdrop-blur-xs cursor-pointer shadow-md"
                title="Cerrar ventana (Esc)"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>

              {/* Cabecera del Popup */}
              <div className={`p-5 text-white text-center bg-gradient-to-r relative ${
                popupConfig.estilo_color === 'esperanza' 
                  ? 'from-emerald-900 via-emerald-800 to-teal-950'
                  : popupConfig.estilo_color === 'vaticano'
                  ? 'from-sky-950 via-indigo-900 to-amber-950'
                  : 'from-diocesis-redDark via-diocesis-red to-amber-950'
              }`}>
                <span className="inline-block px-3 py-0.5 bg-white/20 backdrop-blur rounded-full text-[10px] font-black uppercase tracking-wider mb-1.5 border border-white/20">
                  ✞ Diócesis de Chiclayo ✞
                </span>
                <h3 className="text-xl md:text-2xl font-title font-bold leading-tight">
                  {popupConfig.titulo}
                </h3>
              </div>

              {/* Imagen opcional con zoom al hacer clic */}
              {popupConfig.imagen_url && (
                <div 
                  onClick={() => setZoomPopupImage(true)}
                  className="bg-stone-950 p-2 sm:p-3 text-center border-b border-stone-200 cursor-zoom-in relative group transition hover:opacity-95"
                  title="Haz clic para ver la imagen en grande"
                >
                  <img 
                    src={popupConfig.imagen_url} 
                    alt="Comunicado oficial" 
                    className="max-h-64 sm:max-h-72 w-auto mx-auto rounded-xl object-contain shadow-md group-hover:scale-[1.01] transition-transform"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <div className="absolute bottom-4 right-4 bg-black/75 hover:bg-black/90 text-white text-[11px] font-bold px-3 py-1.5 rounded-full backdrop-blur-xs flex items-center gap-1.5 shadow-lg border border-white/20 pointer-events-none transition-all">
                    <i className="fa-solid fa-magnifying-glass-plus text-xs text-amber-400"></i>
                    <span>Clic para ampliar</span>
                  </div>
                </div>
              )}

              {/* Contenido / Mensaje */}
              <div className="p-6 md:p-7 text-center space-y-4">
                <p className="text-sm md:text-base text-stone-700 leading-relaxed font-medium whitespace-pre-line">
                  {popupConfig.mensaje}
                </p>

                {/* Acciones */}
                <div className="space-y-3 pt-2">
                  {popupConfig.boton_texto && (
                    <button
                      type="button"
                      onClick={handleActionPopup}
                      className={`w-full py-3.5 px-6 rounded-2xl font-title font-bold text-sm md:text-base shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2 cursor-pointer ${
                        popupConfig.estilo_color === 'esperanza'
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : popupConfig.estilo_color === 'vaticano'
                          ? 'bg-amber-500 hover:bg-amber-600 text-stone-900'
                          : 'bg-diocesis-red hover:bg-diocesis-redDark text-white border-b-4 border-diocesis-redDark'
                      }`}
                    >
                      <span>{popupConfig.boton_texto}</span>
                      <i className="fa-solid fa-arrow-right text-xs"></i>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleClosePopup}
                    className="text-xs md:text-sm font-bold text-stone-500 hover:text-stone-800 transition cursor-pointer"
                  >
                    Entendido, ingresar al portal
                  </button>
                </div>
              </div>

              {/* Pie institucional */}
              <div className="bg-stone-50 p-3 border-t border-stone-200 text-center">
                <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">
                  Comisión Diocesana de Voluntariado • Diócesis de Chiclayo
                </p>
              </div>
            </div>
          </div>
        )}

        {/* MODAL LIGHTBOX DE IMAGEN AMPLIADA EN ALTA RESOLUCIÓN */}
        {zoomPopupImage && popupConfig?.imagen_url && (
          <div 
            className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fade-in no-print"
            onClick={() => setZoomPopupImage(false)}
          >
            <div className="relative max-w-5xl max-h-[95vh] flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-200">
              {/* Botón flotante para cerrar lightbox */}
              <button
                type="button"
                onClick={() => setZoomPopupImage(false)}
                className="absolute -top-12 right-0 sm:top-2 sm:right-2 z-80 w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center text-xl transition cursor-pointer backdrop-blur-md shadow-2xl border border-white/30"
                title="Cerrar imagen ampliada (Esc o clic afuera)"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
              
              <img 
                src={popupConfig.imagen_url} 
                alt="Afiche oficial en alta resolución" 
                className="max-h-[85vh] max-w-[95vw] object-contain rounded-2xl shadow-2xl cursor-default border border-white/10"
                onClick={(e) => e.stopPropagation()}
              />
              
              <p className="text-stone-300 text-xs mt-3 font-semibold text-center drop-shadow-md flex items-center gap-1.5">
                <i className="fa-solid fa-circle-info text-amber-400"></i>
                <span>Haz clic afuera de la imagen o en la ✕ para regresar</span>
              </p>
            </div>
          </div>
        )}

        {/* MODAL DE SOPORTE DIRECTO (5 CANALES DE ATENCIÓN) */}
        {showSupportModal && (
          <div 
            className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in no-print"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowSupportModal(false);
            }}
          >
            <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden my-auto border border-stone-200 animate-in fade-in zoom-in-95 duration-200">
              {/* Botón flotante para cerrar (X) */}
              <button
                type="button"
                onClick={() => setShowSupportModal(false)}
                className="absolute top-4 right-4 z-30 w-9 h-9 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition backdrop-blur-xs cursor-pointer shadow-md"
                title="Cerrar ventana (Esc)"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>

              {/* Cabecera del Modal */}
              <div className="bg-gradient-to-r from-diocesis-redDark via-diocesis-red to-stone-900 p-6 text-white text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-500 text-white rounded-2xl text-2xl shadow-lg mb-3">
                  <i className="fa-brands fa-whatsapp"></i>
                </div>
                <h3 className="text-xl md:text-2xl font-title font-bold">Canales de Soporte Directo</h3>
                <p className="text-stone-200 text-xs md:text-sm mt-1 font-medium">
                  Equipo de Voluntariado Diocesano • Visita del Santo Padre 2026
                </p>
              </div>

              {/* Contenido / Lista de contactos */}
              <div className="p-5 md:p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 text-emerald-950 text-xs md:text-sm leading-relaxed flex items-start gap-3">
                  <i className="fa-solid fa-circle-info text-emerald-600 text-base mt-0.5 shrink-0"></i>
                  <div>
                    <span className="font-bold block">¿Tienes alguna duda con tu proceso o expediente?</span>
                    Comunícate con cualquiera de nuestras 5 líneas oficiales habilitadas para brindarte asistencia rápida por WhatsApp:
                  </div>
                </div>

                <div className="space-y-3">
                  {SOPORTE_CONTACTOS.map((contacto) => (
                    <a
                      key={contacto.id}
                      href={`https://wa.me/${contacto.waNumber}?text=${encodeURIComponent('Hola, me comunico desde el portal de voluntarios de la Diócesis de Chiclayo para realizar una consulta.')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border border-stone-200 bg-white hover:border-emerald-500 hover:bg-emerald-50/40 transition-all duration-200 shadow-2xs hover:shadow-md"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-lg shrink-0 transition-transform group-hover:scale-105 group-hover:bg-emerald-600 group-hover:text-white">
                          <i className="fa-brands fa-whatsapp"></i>
                        </div>
                        <div className="text-left">
                          <span className="font-title font-bold text-stone-900 text-sm md:text-base block">
                            {contacto.titulo}
                          </span>
                          <span className="text-xs text-stone-700 font-semibold block font-mono">
                            {contacto.telefono}
                          </span>
                          <span className="text-[11px] text-stone-500 font-medium block">
                            {contacto.descripcion}
                          </span>
                        </div>
                      </div>

                      <div className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 group-hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shrink-0 shadow-xs">
                        <span>Escribir</span>
                        <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                      </div>
                    </a>
                  ))}
                </div>
              </div>

              {/* Pie del modal */}
              <div className="p-4 bg-stone-50 border-t border-stone-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowSupportModal(false)}
                  className="w-full sm:w-auto px-5 py-2.5 bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold rounded-xl text-sm transition cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL DE RESULTADO DINÁMICO */}
        {result && (
          <div 
            className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in modal-backdrop-print"
            onClick={(e) => {
              if (e.target === e.currentTarget) handleCloseModal();
            }}
          >
            <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden my-auto border border-stone-200 animate-in fade-in zoom-in-95 duration-200">

              {/* Botón flotante para cerrar (X) */}
              <button
                type="button"
                onClick={handleCloseModal}
                className="absolute top-4 right-4 z-30 w-9 h-9 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition backdrop-blur-xs cursor-pointer shadow-md no-print"
                title="Cerrar ventana (Esc)"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>

              {/* ESTADO 1: SELECCIONADO / PASA A FASE 3 */}
              {result.status === 'SELECTED' && (
                <div id="constanciaImprimible" className="bg-white overflow-hidden">

                {/* CABECERA EXCLUSIVA PARA IMPRESIÓN OFICIAL */}
                <div className="print-only p-6 border-b-2 border-emerald-600 bg-emerald-50 text-center">
                  <div className="flex items-center justify-center gap-6 mb-3">
                    <img src={import.meta.env.BASE_URL + 'logos/logo_diocesis.png'} alt="Diócesis de Chiclayo" className="h-12 w-auto object-contain" />
                    <img src={import.meta.env.BASE_URL + 'logos/logo_comision_juventud.png'} alt="Comisión Diocesana de Juventud" className="h-12 w-auto object-contain" />
                    <img src={import.meta.env.BASE_URL + 'logos/logo_pastoral_juvenil.png'} alt="Pastoral Juvenil" className="h-12 w-auto object-contain" />
                  </div>
                  <p className="text-xs font-bold text-emerald-800 tracking-widest uppercase mb-1">
                    ✞ DIÓCESIS DE CHICLAYO "CHICLAYO Y SANTA CRUZ" ✞
                  </p>
                  <h2 className="text-xl font-bold font-title text-stone-900 uppercase tracking-wide">
                    CONSTANCIA OFICIAL DE SELECCIÓN
                  </h2>
                  <p className="text-xs text-stone-600 uppercase font-semibold tracking-wider mt-0.5">
                    Comisión Diocesana de Voluntariado • Pastoral Juvenil • Laicos
                  </p>
                </div>

                <div className="bg-gradient-to-r from-emerald-700 to-teal-800 p-6 md:p-8 text-white text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-white text-emerald-700 rounded-full text-3xl shadow-lg mb-3">
                    <i className="fa-solid fa-award"></i>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-title font-bold">¡Felicidades, Pasaste a la Tercera Etapa!</h3>
                  <p className="text-emerald-100 text-sm md:text-base mt-1 font-medium">
                    Has sido seleccionado/a para formar parte del equipo oficial de voluntariado diocesano.
                  </p>
                </div>

                <div className="p-6 md:p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-emerald-50/70 rounded-2xl p-5 border border-emerald-200">
                    <div>
                      <span className="text-xs text-stone-500 uppercase font-bold block">Postulante</span>
                      <span className="text-stone-900 font-bold text-base md:text-lg">{result.name}</span>
                    </div>
                    <div>
                      <span className="text-xs text-stone-500 uppercase font-bold block">Documento</span>
                      <span className="text-stone-800 font-semibold text-base">DNI: {result.dni}</span>
                    </div>
                    {result.codigo && (
                      <div className="md:col-span-2">
                        <span className="text-xs text-stone-500 uppercase font-bold block">Código Oficial</span>
                        <span className="text-emerald-800 font-mono font-bold text-base md:text-lg">{result.codigo}</span>
                      </div>
                    )}
                  </div>

                  {/* ASIGNACIÓN DE RESPONSABLE / EQUIPO DIOCESANO */}
                  {result.lugarAsignado ? (
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50/60 rounded-2xl p-5 md:p-6 border-2 border-amber-200/80 shadow-sm space-y-4">
                      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-amber-200/60 pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center text-sm shadow">
                            <i className="fa-solid fa-users-viewfinder"></i>
                          </span>
                          <div>
                            <h4 className="font-title font-bold text-amber-950 text-base leading-tight">
                              Tu Asignación y Cadena de Mandos
                            </h4>
                            <p className="text-xs text-amber-800/80 font-medium">
                              Distribución oficial aprobada para el servicio papal
                            </p>
                          </div>
                        </div>
                        <span className="text-[11px] font-bold bg-amber-200 text-amber-900 px-3 py-1 rounded-full uppercase tracking-wider">
                          {result.tipoAsignacion === 'SEDE_ESPECIAL' ? '🏛️ Comisión / Sede' : '🎖️ Equipo Asignado'}
                        </span>
                      </div>

                      {result.tipoAsignacion === 'SEDE_ESPECIAL' ? (
                        <div className="bg-white/90 rounded-xl p-4 border border-amber-200/80 flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-2xl shrink-0 shadow-sm">
                            🏛️
                          </div>
                          <div className="space-y-1">
                            <span className="text-xs text-stone-500 uppercase font-bold tracking-wider">Comisión o Sede Asignada</span>
                            <h5 className="text-lg md:text-xl font-title font-bold text-stone-900">
                              {formatearSedeEspecial(result.lugarAsignado)}
                            </h5>
                            <p className="text-xs text-stone-600 leading-relaxed">
                              Has sido pre-asignado/a a esta comisión especial. Los coordinadores de dicha sede se pondrán en contacto contigo para las directivas y reuniones previas.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white/90 rounded-xl p-4 border border-amber-200/80 space-y-3">
                          <div className="flex items-start gap-3.5">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center text-2xl shrink-0 shadow-sm">
                              🎖️
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-xs text-amber-800 uppercase font-bold tracking-wider">Responsable General Asignado</span>
                              <h5 className="text-lg md:text-xl font-title font-bold text-stone-900">
                                {result.responsableAsignado || result.lugarAsignado.replace(/^Equipo\s+/i, '')}
                              </h5>
                              <span className="inline-block text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-md">
                                ✓ Coordinación de Sector y Cuadrillas
                              </span>
                            </div>
                          </div>
                          <div className="bg-amber-50/80 rounded-lg p-3 border border-amber-100 text-xs text-stone-700 leading-relaxed">
                            <strong>Próximo paso:</strong> Tu Responsable General, junto con los líderes y guías de cuadrilla, te estarán contactando directamente vía WhatsApp o llamada para coordinar tu cuadrilla, lugar exacto de encuentro y entrega de credenciales.
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-stone-50 rounded-2xl p-4 md:p-5 border border-stone-200 flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-stone-200 text-stone-600 flex items-center justify-center text-lg shrink-0">
                        <i className="fa-solid fa-hourglass-half"></i>
                      </div>
                      <div className="space-y-1">
                        <h5 className="font-title font-bold text-stone-800 text-sm md:text-base">
                          Asignación de Responsable y Cuadrilla en Proceso
                        </h5>
                        <p className="text-xs text-stone-600 leading-relaxed">
                          La Comisión Central Diocesana está culminando la distribución territorial de cuadrillas. Vuelve a consultar tu DNI en los próximos días para conocer a tu responsable asignado.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* COMUNICADO PARA TERCERA FASE */}
                  <div className="bg-emerald-50/80 rounded-2xl p-5 border border-emerald-200 text-stone-800 space-y-2">
                    <h4 className="font-title font-bold text-emerald-900 text-base flex items-center gap-2">
                      <i className="fa-solid fa-bullhorn text-emerald-700"></i> Información Importante:
                    </h4>
                    <p className="text-sm text-stone-700 font-medium leading-relaxed">
                      Para las personas que han pasado a tercera fase, nos comunicaremos oportunamente con cada una de ellas para brindarles información sobre los procesos que se deben realizar.
                    </p>
                    <p className="text-sm text-emerald-900 font-semibold leading-relaxed">
                      Les pedimos que tengan paciencia, mantengan la calma y sobre todo que recen mucho. 🙏✨
                    </p>
                  </div>

                  {/* NOTA INSTITUCIONAL EXCLUSIVA PARA IMPRESIÓN (SIN FIRMAS) */}
                  <div className="print-only pt-6 mt-6 border-t border-stone-200 text-center">
                    <p className="text-xs text-stone-700 font-bold uppercase tracking-wider">
                      Comisión Diocesana de Voluntariado • Diócesis de Chiclayo "Chiclayo y Santa Cruz"
                    </p>
                    <p className="text-[10px] text-stone-500 mt-1">
                      Documento oficial de selección emitido a través del Portal Diocesano de Voluntariado.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3 no-print">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="w-full sm:w-auto px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition text-sm cursor-pointer"
                    >
                      Cerrar
                    </button>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="w-full sm:w-auto px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl transition text-sm flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                    >
                      <i className="fa-solid fa-print"></i> Imprimir Constancia de Selección
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ESTADO 2: ETAPA 2 EN REVISIÓN / OBSERVACIÓN */}
            {result.status === 'PENDING' && (
              <div className="bg-white overflow-hidden">
                {result.esVerificar ? (
                  /* CABECERA PARA CASO OBSERVADO / EN VERIFICACIÓN */
                  <div className="bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 p-6 md:p-8 text-white text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-white text-amber-700 rounded-full text-3xl shadow-lg mb-3">
                      <i className="fa-solid fa-triangle-exclamation"></i>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-title font-bold">Documentación en Observación</h3>
                    <p className="text-amber-100 text-sm md:text-base mt-1 font-medium">
                      El equipo diocesano ha revisado tu expediente y requiere subsanación para continuar.
                    </p>
                  </div>
                ) : (
                  /* CABECERA PARA CASO PENDIENTE DE REVISIÓN REGULAR */
                  <div className="bg-gradient-to-r from-amber-600 to-diocesis-mustard p-6 md:p-8 text-white text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-white text-diocesis-mustardDark rounded-full text-3xl shadow-lg mb-3">
                      <i className="fa-solid fa-clock-rotate-left"></i>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-title font-bold">Estás en la Etapa 2</h3>
                    <p className="text-amber-100 text-sm md:text-base mt-1 font-medium">
                      Tus documentos están siendo revisados por el equipo diocesano.
                    </p>
                  </div>
                )}

                <div className="p-6 md:p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-amber-50/70 rounded-2xl p-5 border border-amber-200">
                    <div>
                      <span className="text-xs text-amber-900 uppercase font-bold block">Postulante</span>
                      <span className="text-stone-900 font-bold text-base md:text-lg">{result.name}</span>
                    </div>
                    <div>
                      <span className="text-xs text-amber-900 uppercase font-bold block">Documento</span>
                      <span className="text-stone-800 font-semibold text-base">DNI: {result.dni}</span>
                    </div>
                    <div>
                      <span className="text-xs text-amber-900 uppercase font-bold block">Estado de Etapa</span>
                      {result.esVerificar ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-200 text-amber-950 border border-amber-400 rounded-lg text-xs font-black mt-1">
                          <i className="fa-solid fa-triangle-exclamation text-amber-800"></i> Etapa 2: Observada / Por Subsanar
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-200 text-amber-900 rounded-lg text-xs font-bold mt-1">
                          <i className="fa-solid fa-file-circle-check"></i> Etapa 2: Documentos en Revisión
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-xs text-amber-900 uppercase font-bold block">Equipo / Responsable Preliminar</span>
                      <span className="text-stone-800 font-bold text-sm block mt-1">
                        {result.responsableAsignado 
                          ? `Equipo ${result.responsableAsignado}` 
                          : (result.lugarAsignado ? formatearSedeEspecial(result.lugarAsignado) : (result.comision || 'En proceso'))}
                      </span>
                    </div>
                  </div>

                  {result.esVerificar ? (
                    <div className="bg-amber-50/90 border-2 border-amber-400 p-5 rounded-2xl shadow-sm space-y-3">
                      <h4 className="font-title font-bold text-amber-950 text-sm md:text-base flex items-center gap-2">
                        <i className="fa-solid fa-folder-open text-amber-700 text-lg"></i> Observación registrada por la comisión diocesana:
                      </h4>
                      <div className="bg-white p-3.5 rounded-xl border border-amber-200 font-extrabold text-amber-900 text-sm md:text-base flex items-center gap-2 shadow-2xs">
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
                        <span>{result.observacion || 'Documentación en observación pendiente de subsanar'}</span>
                      </div>
                      <p className="text-xs text-amber-900 font-medium leading-relaxed">
                        Para continuar con tu proceso hacia la Visita del Santo Padre, por favor ingresa al formulario oficial y vuelve a adjuntar o actualizar el documento indicado.
                      </p>
                      <div className="pt-2 flex flex-wrap gap-2">
                        <a
                          href={GOOGLE_FORM_URL}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 bg-diocesis-redDark hover:bg-diocesis-red text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-md hover:shadow-lg"
                        >
                          <i className="fa-solid fa-cloud-arrow-up"></i>
                          <span>Subsanar Documentos en Google Forms ↗</span>
                        </a>
                        <a
                          href={CARTA_RECOMENDACION_URL}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 bg-white hover:bg-stone-100 text-stone-800 text-xs font-bold px-3.5 py-2.5 rounded-xl border border-stone-300 transition shadow-2xs"
                        >
                          <i className="fa-solid fa-download text-diocesis-mustard"></i>
                          <span>Descargar Formato Carta ↗</span>
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-stone-50 border-l-4 border-diocesis-mustard p-4 rounded-r-2xl shadow-sm">
                      <h4 className="font-title font-bold text-diocesis-redDark text-sm md:text-base flex items-center gap-2">
                        <i className="fa-solid fa-circle-info text-diocesis-mustard"></i> Información de tu proceso:
                      </h4>
                      <p className="mt-1 text-sm text-stone-700 font-medium leading-relaxed">
                        Tu ficha de la Segunda Etapa ha sido recibida con éxito. El comité diocesano se encuentra verificando tu documentación para definir tu asignación oficial y el pase a la <strong>Tercera Etapa</strong>.
                      </p>
                    </div>
                  )}

                  <div className="text-center bg-stone-50 p-4 rounded-2xl border border-stone-200">
                    <p className="text-xs text-stone-600 font-medium">
                      {result.esVerificar 
                        ? '¿Tienes alguna consulta sobre la subsanación de tus documentos observados?' 
                        : '¿Tienes alguna consulta sobre tu evaluación?'}
                    </p>

                    {result.esVerificar ? (
                      <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                        <a
                          href={`https://wa.me/51981349410?text=Hola,%20figuro%20en%20la%20Etapa%202%20(Documentación%20Observada)%20con%20DNI%20${result.dni}%20y%20quisiera%20consultar%20sobre%20mi%20subsanación`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs sm:text-sm font-bold transition shadow-2xs hover:shadow"
                        >
                          <i className="fa-brands fa-whatsapp text-emerald-600 text-base"></i>
                          <span>Soporte Diocesano (+51 981 349 410)</span>
                        </a>
                        <a
                          href={`https://wa.me/51947429053?text=Hola,%20figuro%20en%20la%20Etapa%202%20(Documentación%20Observada)%20con%20DNI%20${result.dni}%20y%20quisiera%20consultar%20sobre%20mi%20subsanación`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs sm:text-sm font-bold transition shadow-2xs hover:shadow"
                        >
                          <i className="fa-brands fa-whatsapp text-emerald-600 text-base"></i>
                          <span>Soporte Diocesano (+51 947 429 053)</span>
                        </a>
                      </div>
                    ) : (
                      <a
                        href={`https://wa.me/51945854083?text=Hola,%20figuro%20en%20la%20Etapa%202%20con%20DNI%20${result.dni}%20y%20quisiera%20consultar%20sobre%20mi%20revisión`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-emerald-700 font-bold text-sm hover:underline mt-1"
                      >
                        <i className="fa-brands fa-whatsapp text-base"></i>
                        <span>Escribir al Soporte Diocesano (+51 945 854 083)</span>
                      </a>
                    )}
                  </div>

                  <div className="pt-3 border-t border-stone-200 flex justify-end no-print">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="w-full sm:w-auto px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-sm transition cursor-pointer"
                    >
                      Cerrar Consulta
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ESTADO 2.5: REGISTRADO EN PADRÓN GENERAL (FASE 1) */}
            {result.status === 'FASE1' && (
              <div className="bg-white overflow-hidden">
                <div className="bg-gradient-to-r from-sky-800 to-indigo-900 p-6 md:p-8 text-white text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-white text-sky-800 rounded-full text-3xl shadow-lg mb-3">
                    <i className="fa-solid fa-clipboard-check"></i>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-title font-bold">Inscrito en Padrón Inicial (Fase 1)</h3>
                  <p className="text-sky-100 text-sm md:text-base mt-1 font-medium">
                    Confirmamos que te encuentras registrado/a en el Padrón General de Voluntariado.
                  </p>
                </div>

                <div className="p-6 md:p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-sky-50/70 rounded-2xl p-5 border border-sky-200">
                    <div>
                      <span className="text-xs text-stone-500 uppercase font-bold block">Postulante</span>
                      <span className="text-stone-900 font-bold text-base md:text-lg">{result.name}</span>
                    </div>
                    <div>
                      <span className="text-xs text-stone-500 uppercase font-bold block">Documento</span>
                      <span className="text-stone-800 font-semibold text-base">DNI: {result.dni}</span>
                    </div>
                    {result.codigo && (
                      <div>
                        <span className="text-xs text-stone-500 uppercase font-bold block">Código de Postulante</span>
                        <span className="text-sky-900 font-mono font-bold text-base">{result.codigo}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-xs text-stone-500 uppercase font-bold block">Servicio Solicitado</span>
                      <span className="text-stone-900 font-bold text-sm block mt-0.5">
                        {result.comision || 'Servicio General'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white border-l-4 border-sky-600 p-4 rounded-r-2xl shadow-sm bg-stone-50">
                    <h4 className="font-title font-bold text-sky-900 text-sm md:text-base flex items-center gap-2">
                      <i className="fa-solid fa-circle-info text-sky-600"></i> Estado actual del expediente:
                    </h4>
                    <p className="mt-1 text-sm text-stone-700 font-medium">
                      Te encuentras registrado/a en el Padrón General inicial (Fase 1). Para completar tu evaluación y tener opción de pase a la <strong>Tercera Etapa</strong>, debes adjuntar tus documentos requeridos (DNI/Pasaporte, CUL y Carta de Recomendación).
                    </p>
                  </div>

                  {/* LLAMADO A SUBIR DOCUMENTACIÓN EN GOOGLE FORMS */}
                  <div className="text-center bg-diocesis-cream p-6 rounded-2xl border-2 border-diocesis-mustard/40 shadow-sm space-y-4">
                    <div>
                      <span className="inline-block px-3 py-1 bg-diocesis-mustard text-white text-xs font-bold rounded-full uppercase tracking-wider mb-2 shadow-sm">
                        Paso Requerido: Etapa 2
                      </span>
                      <h4 className="font-title font-bold text-diocesis-redDark text-lg md:text-xl">
                        Sube tu Documentación para Continuar
                      </h4>
                      <p className="text-xs md:text-sm text-stone-700 font-medium max-w-lg mx-auto mt-1">
                        Ingresa al formulario oficial de Google Forms para adjuntar tu copia de DNI, CUL y carta de recomendación.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                      <a
                        href={GOOGLE_FORM_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-diocesis-red hover:bg-diocesis-redDark text-white font-title font-bold px-7 py-3.5 rounded-2xl transition shadow-lg hover:shadow-xl text-sm md:text-base border-b-4 border-diocesis-redDark cursor-pointer"
                      >
                        <i className="fa-solid fa-cloud-arrow-up text-lg text-diocesis-mustard"></i>
                        <span>Subir Documentación en Google Forms</span>
                      </a>

                      <a
                        href={CARTA_RECOMENDACION_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-stone-50 text-stone-800 font-bold px-5 py-3.5 rounded-2xl transition shadow-sm hover:shadow border border-stone-300 text-sm cursor-pointer"
                        title="Descargar plantilla oficial de la Carta de Recomendación"
                      >
                        <i className="fa-solid fa-file-arrow-down text-diocesis-red"></i>
                        <span>Descargar Formato de Carta</span>
                      </a>
                    </div>
                  </div>

                  <div className="text-center bg-stone-50 p-4 rounded-2xl border border-stone-200">
                    <p className="text-xs text-stone-600 font-medium">
                      ¿Tienes dudas sobre el proceso o tus documentos? Escríbenos directamente por WhatsApp:
                    </p>
                    <a
                      href={`https://wa.me/51945854083?text=Hola,%20figuro%20en%20el%20Padrón%20Fase%201%20con%20DNI%20${result.dni}%20y%20quisiera%20consultar%20sobre%20mi%20evaluación`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-emerald-700 font-bold text-sm hover:underline mt-2"
                    >
                      <i className="fa-brands fa-whatsapp text-base"></i>
                      <span>Consultar con el Equipo Diocesano (+51 945 854 083)</span>
                    </a>
                  </div>

                  <div className="pt-2 border-t border-stone-200 flex justify-end no-print">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="w-full sm:w-auto px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-sm transition cursor-pointer"
                    >
                      Cerrar Consulta
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ESTADO 3: NO SELECCIONADO */}
            {result.status === 'NOT_SELECTED' && (
              <div className="bg-white overflow-hidden">
                <div className="bg-diocesis-redDark p-6 md:p-8 text-white text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 text-diocesis-mustard rounded-full text-3xl shadow-lg mb-3">
                    <i className="fa-solid fa-heart"></i>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-title font-bold">Gracias por tu Disposición</h3>
                  <p className="text-stone-300 text-sm md:text-base mt-1 font-medium">
                    Diócesis de Chiclayo y Santa Cruz
                  </p>
                </div>

                <div className="p-6 md:p-8 space-y-6 text-center max-w-2xl mx-auto">
                  <div className="text-stone-700 text-sm md:text-base leading-relaxed space-y-3 font-medium">
                    <p>
                      Estimado/a <strong className="text-stone-900">{result.name}</strong>, agradecemos sinceramente tu postulación y espíritu de servicio para las actividades diocesanas.
                    </p>
                    <p>
                      En esta oportunidad, debido a la capacidad máxima de aforo alcanzada en los equipos, no ha sido posible incluirte en este grupo. Te animamos a continuar participando activamente en las comisiones de tu parroquia.
                    </p>
                    {result.observacion && (
                      <div className="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-left text-xs md:text-sm text-rose-900">
                        <span className="font-bold block mb-1">Observación del comité:</span>
                        <p className="text-rose-800">{result.observacion}</p>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-stone-200 flex justify-center no-print">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="px-6 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-sm transition cursor-pointer"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ESTADO 4: NO ENCONTRADO */}
            {result.status === 'NOT_FOUND' && (
              <div className="bg-white overflow-hidden">
                <div className="p-8 text-center space-y-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-rose-100 text-rose-700 rounded-full text-3xl">
                    <i className="fa-solid fa-magnifying-glass-minus"></i>
                  </div>
                  <h3 className="text-2xl font-title font-bold text-stone-900">Documento No Registrado</h3>
                  <p className="text-sm md:text-base text-stone-600 max-w-md mx-auto font-medium">
                    No encontramos registros asociados al DNI <strong className="text-stone-900">{result.dni}</strong> en la base de datos de la Diócesis de Chiclayo y Santa Cruz.
                  </p>

                  <div className="bg-rose-50 rounded-2xl p-4 text-left max-w-md mx-auto border border-rose-200 text-xs md:text-sm text-rose-900 space-y-1">
                    <p className="font-bold">Sugerencias:</p>
                    <ul className="list-disc list-inside space-y-1 text-rose-800 font-medium">
                      <li>Revisa haber escrito correctamente los 8 dígitos de tu DNI.</li>
                      <li>Si acabas de completar el formulario, espera unos minutos a que el sistema sincronice los datos.</li>
                    </ul>
                  </div>

                  <div className="pt-4 flex justify-center no-print">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="px-6 py-2.5 bg-stone-800 hover:bg-stone-900 text-white font-bold rounded-xl text-sm transition cursor-pointer shadow-sm"
                    >
                      Cerrar e Intentar de Nuevo
                    </button>
                  </div>
                </div>
              </div>
            )}

            </div>
          </div>
        )}

        {/* SECCIÓN DE PREGUNTAS FRECUENTES (FAQ) */}
        <div className="mt-12 bg-white rounded-3xl p-6 md:p-8 card-shadow border border-stone-200 space-y-6 no-print">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-diocesis-mustard bg-stone-100 px-3 py-1 rounded-full border border-stone-200">
              Centro de Ayuda
            </span>
            <h3 className="text-xl md:text-2xl font-title font-bold text-diocesis-redDark mt-2">
              Preguntas Frecuentes
            </h3>
            <p className="text-xs md:text-sm text-stone-500 mt-1">
              Todo lo que necesitas saber sobre las etapas de selección y tus documentos
            </p>
          </div>

          <div className="space-y-4 text-sm">
            {/* FAQ 1 */}
            <details className="group bg-stone-50 rounded-2xl p-4 border border-stone-200" open>
              <summary className="font-bold text-stone-800 cursor-pointer flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <i className="fa-solid fa-circle-question text-diocesis-red"></i>
                  <span>Si ya envié mi documentación en la Etapa 2, ¿qué debo hacer? ¿Me van a llamar?</span>
                </span>
                <i className="fa-solid fa-chevron-down group-open:rotate-180 transition-transform text-diocesis-mustard"></i>
              </summary>
              <p className="mt-2 text-stone-600 font-medium leading-relaxed pl-6">
                Una vez enviada tu documentación a través del formulario oficial de Google Forms, el comité diocesano se encuentra en pleno proceso de revisión y validación de tus archivos. <strong>No es necesario que vuelvas a enviar el formulario ni que te acerques a ninguna oficina; solo debes esperar.</strong> Los resultados se publicarán directamente en este portal oficial ingresando tu DNI y se notificará a tu correo electrónico registrado.
              </p>
            </details>

            {/* FAQ 2 */}
            <details className="group bg-stone-50 rounded-2xl p-4 border border-stone-200">
              <summary className="font-bold text-stone-800 cursor-pointer flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <i className="fa-solid fa-circle-question text-diocesis-red"></i>
                  <span>No me llegó el correo de confirmación, ¿qué debo hacer?</span>
                </span>
                <i className="fa-solid fa-chevron-down group-open:rotate-180 transition-transform text-diocesis-mustard"></i>
              </summary>
              <p className="mt-2 text-stone-600 font-medium leading-relaxed pl-6">
                En primer lugar, revisa tu carpeta de <em>Spam</em> o <em>Promociones</em>. Si estás inscrito/a en el Padrón General inicial (Fase 1) pero no recibiste el correo con el enlace, puedes hacer clic directamente en el botón <strong>"Subir Documentación en Google Forms"</strong> que aparece en tu resultado de consulta. Recuerda que es requisito indispensable ser mayor de edad; si cumples con ello y tienes alguna dificultad técnica, contáctanos a través del botón de <button type="button" onClick={() => setShowSupportModal(true)} className="inline font-bold text-emerald-700 underline hover:text-emerald-800 cursor-pointer">Soporte Directo por WhatsApp</button>.
              </p>
            </details>

            {/* FAQ 3 */}
            <details className="group bg-stone-50 rounded-2xl p-4 border border-stone-200">
              <summary className="font-bold text-stone-800 cursor-pointer flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <i className="fa-solid fa-circle-question text-diocesis-red"></i>
                  <span>¿Cómo sé si fui seleccionado/a para la Tercera Etapa?</span>
                </span>
                <i className="fa-solid fa-chevron-down group-open:rotate-180 transition-transform text-diocesis-mustard"></i>
              </summary>
              <p className="mt-2 text-stone-600 font-medium leading-relaxed pl-6">
                Al ingresar tu número de DNI en este portal, si tus documentos fueron validados satisfactoriamente aparecerá el mensaje <strong>"¡Felicidades, Pasaste a la Tercera Etapa!"</strong> (en tarjeta verde). Allí podrás descargar tu <strong>Constancia Oficial de Selección</strong>, obtener tu código oficial y conocer las instrucciones para la jornada presencial de capacitación y tu integración al canal oficial de WhatsApp.
              </p>
            </details>
          </div>
        </div>

      </main>

      {/* PIE DE PÁGINA */}
      <footer className="bg-diocesis-redDark text-stone-300 text-xs md:text-sm py-8 border-t-4 border-diocesis-mustard mt-12 no-print">
        <div className="max-w-5xl mx-auto px-4 text-center space-y-3">
          <p className="font-title font-bold text-white text-base tracking-wide">
            DIÓCESIS DE CHICLAYO "CHICLAYO Y SANTA CRUZ"
          </p>
          <p className="text-stone-300 font-medium">
            Pastoral Juvenil • Comisión Diocesana de Juventud • Área Diocesana de Laicos
          </p>
          <p className="text-stone-400 text-xs flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
            <span>© {new Date().getFullYear()} Diócesis de Chiclayo "Chiclayo y Santa Cruz". Todos los derechos reservados.</span>
            <span className="text-stone-500 hidden sm:inline">•</span>
            <span className="text-stone-300 font-medium">Desarrollado por: Daniel Herrera</span>
          </p>
        </div>
      </footer>
      
      {/* Asistente Virtual Flotante */}
      <FloatingChat />

    </div>
  );
}
