import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';

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

export default function ConsultaVoluntariado() {
  const [dniInput, setDniInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const performSearch = async (dni) => {
    const cleanDni = dni.trim();
    if (!cleanDni) return;

    setLoading(true);

    try {
      // 1. Verificar si coincide con la base demo simulada
      if (mockDatabase[cleanDni]) {
        setResult(mockDatabase[cleanDni]);
        setLoading(false);
        scrollIntoResult();
        return;
      }

      // 2. Consultar base de datos real en Supabase
      const { data, error } = await supabase
        .from('voluntarios')
        .select('*')
        .eq('dni', cleanDni)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.warn('Error al consultar Supabase:', error.message);
      }

      if (data) {
        // Mapear estado de base de datos a los 3 estados visuales
        const estadoUpper = (data.estado || '').toUpperCase();
        let mappedStatus = 'PENDING';

        if (estadoUpper.includes('SELECCIONAD') || estadoUpper.includes('APROBAD') || data.info_validada) {
          mappedStatus = 'SELECTED';
        } else if (estadoUpper.includes('NO') || estadoUpper.includes('RECHAZ')) {
          mappedStatus = 'NOT_SELECTED';
        } else {
          mappedStatus = 'PENDING';
        }

        setResult({
          status: mappedStatus,
          name: data.nombres_apellidos || 'Postulante',
          dni: data.dni,
          comision: data.servicio || 'Por Asignar',
          area: data.departamento || 'Pastoral Juvenil / Laicos',
          observacion: data.observacion || (mappedStatus === 'PENDING' ? 'Tu postulación se encuentra en proceso de validación por el equipo diocesano.' : '')
        });
      } else {
        // No encontrado ni en BD ni en Mock
        setResult({
          status: 'NOT_FOUND',
          dni: cleanDni
        });
      }
    } catch (err) {
      console.error('Error durante la búsqueda:', err);
      // Fallback amigable
      setResult({
        status: 'NOT_FOUND',
        dni: cleanDni
      });
    } finally {
      setLoading(false);
      scrollIntoResult();
    }
  };

  const scrollIntoResult = () => {
    setTimeout(() => {
      const el = document.getElementById('resultAnchor');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    performSearch(dniInput);
  };

  const setDemo = (demoDni) => {
    setDniInput(demoDni);
    performSearch(demoDni);
  };

  return (
    <div className="font-sans antialiased text-stone-800 min-h-screen flex flex-col justify-between bg-stone-100 selection:bg-diocesis-mustard selection:text-white">
      
      {/* BARRA SUPERIOR INSTITUCIONAL */}
      <div className="bg-diocesis-mustard text-white px-4 py-2 text-xs md:text-sm font-semibold text-center flex items-center justify-center gap-2 shadow-sm relative">
        <i className="fa-solid fa-cross"></i>
        <span className="font-title tracking-wide text-sm md:text-base">DIÓCESIS DE CHICLAYO Y SANTA CRUZ</span>
        <span className="hidden md:inline">• Portal Oficial de Consulta de Voluntariado</span>

        {/* Acceso discreto a Administradores */}
        <Link 
          to="/login" 
          title="Acceso administrativo"
          className="absolute right-4 text-white/80 hover:text-white transition flex items-center gap-1 text-xs"
        >
          <i className="fa-solid fa-lock text-[10px]"></i>
          <span className="hidden sm:inline">Admin</span>
        </Link>
      </div>

      {/* CABECERA CON LOGOS OFICIALES */}
      <header className="header-gradient text-white border-b-4 border-diocesis-mustard shadow-lg relative overflow-hidden greca-pattern">
        <div className="max-w-5xl mx-auto px-4 py-6 md:py-8 relative z-10 space-y-6">
          
          {/* BARRA DE LOGOTIPOS RECREADOS */}
          <div className="bg-white/95 backdrop-blur rounded-2xl p-3 md:p-4 shadow-xl border border-diocesis-mustard/30 flex flex-wrap items-center justify-between gap-4">
            
            {/* Logo 1: Diócesis de Chiclayo */}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-diocesis-red text-diocesis-mustard rounded-xl flex items-center justify-center font-bold text-xl shadow-md border border-diocesis-mustard">
                <i className="fa-solid fa-church"></i>
              </div>
              <div className="leading-tight">
                <span className="block text-[11px] font-extrabold text-diocesis-redDark uppercase tracking-tight">Diócesis de</span>
                <span className="block text-xs font-black text-stone-900 font-title uppercase">Chiclayo y Santa Cruz</span>
              </div>
            </div>

            <div className="hidden sm:block h-8 w-px bg-stone-300"></div>

            {/* Logo 2: Pastoral Juvenil */}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center font-bold text-xl shadow-md">
                <i className="fa-solid fa-hands-praying"></i>
              </div>
              <div className="leading-tight">
                <span className="block text-[10px] font-extrabold text-emerald-700 uppercase">Pastoral</span>
                <span className="block text-xs font-black text-stone-900 font-title">JUVENIL</span>
              </div>
            </div>

            <div className="hidden md:block h-8 w-px bg-stone-300"></div>

            {/* Logo 3: Comisión Diocesana */}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-sky-600 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-md">
                <i className="fa-solid fa-users-between-lines"></i>
              </div>
              <div className="leading-tight">
                <span className="block text-[9px] font-extrabold text-sky-800 uppercase">Comisión Diocesana</span>
                <span className="block text-[11px] font-black text-stone-900 font-title">DE JUVENTUD</span>
              </div>
            </div>

            <div className="hidden sm:block h-8 w-px bg-stone-300"></div>

            {/* Logo 4: Área Diocesana de Laicos */}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-diocesis-mustard text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-md">
                <i className="fa-solid fa-heart-pulse"></i>
              </div>
              <div className="leading-tight">
                <span className="block text-[9px] font-extrabold text-diocesis-mustardDark uppercase">Área Diocesana de</span>
                <span className="block text-xs font-black text-stone-900 font-title">LAICOS</span>
              </div>
            </div>

          </div>

          {/* TÍTULO PRINCIPAL */}
          <div className="text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-6 pt-2">
            <div>
              <span className="inline-block px-3 py-1 bg-diocesis-mustard text-white text-xs font-bold rounded-full uppercase tracking-wider mb-2 shadow-sm">
                Proceso de Selección
              </span>
              <h1 className="text-2xl md:text-4xl font-title font-bold text-white tracking-wide">
                DIÓCESIS DE CHICLAYO Y SANTA CRUZ
              </h1>
              <p className="text-xs md:text-sm text-stone-200 mt-1 font-medium">
                Sistema de Validación de Postulantes al Voluntariado Diocesano
              </p>
            </div>

            <a 
              href="https://wa.me/51999999999?text=Hola,%20tengo%20una%20consulta%20sobre%20el%20voluntariado%20de%20la%20Diocesis%20de%20Chiclayo%20y%20Santa%20Cruz" 
              target="_blank" 
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs md:text-sm font-bold px-5 py-3 rounded-xl transition shadow-md hover:shadow-lg border border-emerald-400/30 shrink-0"
            >
              <i className="fa-brands fa-whatsapp text-lg"></i>
              <span>Soporte Directo</span>
            </a>
          </div>

        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-4xl w-full mx-auto px-4 py-8 md:py-12 flex-grow">

        {/* CUADRO DE BÚSQUEDA */}
        <div className="bg-white rounded-3xl p-6 md:p-10 card-shadow border border-stone-200 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-diocesis-mustard/10 rounded-bl-full pointer-events-none"></div>

          <div className="text-center max-w-xl mx-auto mb-8">
            <span className="text-xs font-bold uppercase tracking-widest text-diocesis-mustard bg-stone-100 px-3 py-1 rounded-full border border-stone-200">
              Consulta en Línea
            </span>
            <h2 className="text-2xl md:text-3xl font-title font-bold text-diocesis-redDark mt-3">
              Revisa el Estado de tu Postulación
            </h2>
            <p className="text-sm md:text-base text-stone-600 mt-2 font-medium">
              Ingresa tu número de DNI o Documento de Identidad registrado para verificar si pasaste a la siguiente etapa.
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
                placeholder="Ingresa tu DNI (Ej: 72849102)" 
                maxLength="12" 
                required 
                value={dniInput}
                onChange={(e) => setDniInput(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-stone-50 border-2 border-stone-300 rounded-2xl text-stone-900 placeholder-stone-400 focus:outline-none focus:border-diocesis-red focus:bg-white transition text-base md:text-lg font-semibold shadow-inner"
              />
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

          {/* PANEL DE CONTROL PARA DEMO / PRUEBAS RÁPIDAS */}
          <div className="mt-8 pt-6 border-t border-stone-200 bg-diocesis-cream/90 rounded-2xl p-4 border border-diocesis-mustard/30">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <span className="text-xs font-bold text-diocesis-redDark uppercase tracking-wider flex items-center gap-1.5 font-title">
                <i className="fa-solid fa-flask text-diocesis-mustard"></i> Consola de Prueba (Simulador):
              </span>
              <span className="text-xs text-stone-500 font-medium">Haz clic en un botón para probar la respuesta</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <button 
                type="button" 
                onClick={() => setDemo('72849102')} 
                className="px-3 py-2 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl font-bold hover:bg-emerald-100 transition text-center shadow-sm cursor-pointer"
              >
                <i className="fa-solid fa-check-circle text-emerald-600 mr-1"></i> Seleccionado
              </button>
              <button 
                type="button" 
                onClick={() => setDemo('45102938')} 
                className="px-3 py-2 bg-amber-50 text-amber-800 border border-amber-300 rounded-xl font-bold hover:bg-amber-100 transition text-center shadow-sm cursor-pointer"
              >
                <i className="fa-solid fa-exclamation-circle text-amber-600 mr-1"></i> Pendiente Doc.
              </button>
              <button 
                type="button" 
                onClick={() => setDemo('10928374')} 
                className="px-3 py-2 bg-stone-200 text-stone-800 border border-stone-300 rounded-xl font-bold hover:bg-stone-300 transition text-center shadow-sm cursor-pointer"
              >
                <i className="fa-solid fa-circle-minus text-stone-600 mr-1"></i> No Seleccionado
              </button>
              <button 
                type="button" 
                onClick={() => setDemo('99999999')} 
                className="px-3 py-2 bg-rose-50 text-rose-800 border border-rose-300 rounded-xl font-bold hover:bg-rose-100 transition text-center shadow-sm cursor-pointer"
              >
                <i className="fa-solid fa-circle-xmark text-rose-600 mr-1"></i> No Encontrado
              </button>
            </div>
          </div>
        </div>

        <div id="resultAnchor"></div>

        {/* RESULTADOS DINÁMICOS */}
        {result && (
          <div className="space-y-6 animate-fade-in">
            
            {/* ESTADO 1: SELECCIONADO / APROBADO */}
            {result.status === 'SELECTED' && (
              <div className="bg-white rounded-3xl border-2 border-emerald-500 card-shadow overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-700 to-teal-800 p-6 md:p-8 text-white text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-white text-emerald-700 rounded-full text-3xl shadow-lg mb-3">
                    <i className="fa-solid fa-award"></i>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-title font-bold">¡Felicidades, Pasaste a la Siguiente Etapa!</h3>
                  <p className="text-emerald-100 text-sm md:text-base mt-1 font-medium">
                    Has sido seleccionado/a para formar parte del equipo de voluntariado.
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
                    <div className="md:col-span-1">
                      <span className="text-xs text-stone-500 uppercase font-bold block">Comisión Asignada</span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-diocesis-red text-white rounded-lg text-xs md:text-sm font-bold mt-1 shadow-sm">
                        <i className="fa-solid fa-users text-diocesis-mustard"></i> {result.comision || 'Logística y Protocolo'}
                      </span>
                    </div>
                    <div className="md:col-span-1">
                      <span className="text-xs text-stone-500 uppercase font-bold block">Área Diocesana</span>
                      <span className="text-stone-800 font-bold text-sm block mt-1">
                        {result.area || 'Pastoral Juvenil / Laicos'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-title font-bold text-stone-900 text-base mb-3 flex items-center gap-2">
                      <i className="fa-solid fa-list-check text-emerald-600"></i> Pasos a seguir:
                    </h4>
                    <ul className="space-y-2 text-sm text-stone-700 font-medium">
                      <li className="flex items-start gap-2">
                        <i className="fa-solid fa-check text-emerald-600 mt-1"></i>
                        <span><strong>Grupo Oficial de WhatsApp:</strong> Revisa tu correo electrónico para unirte al canal de comunicación interna.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <i className="fa-solid fa-check text-emerald-600 mt-1"></i>
                        <span><strong>Jornada de Capacitación:</strong> Asiste a la reunión presencial portando tu DNI físico.</span>
                      </li>
                    </ul>
                  </div>

                  <div className="pt-4 border-t border-stone-200 flex justify-center">
                    <button 
                      onClick={() => window.print()} 
                      className="px-6 py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-xl transition text-sm flex items-center gap-2 border border-stone-300 cursor-pointer"
                    >
                      <i className="fa-solid fa-print"></i> Imprimir Constancia de Selección
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ESTADO 2: EN REVISIÓN / PENDIENTE DE DOCUMENTO */}
            {result.status === 'PENDING' && (
              <div className="bg-white rounded-3xl border-2 border-diocesis-mustard card-shadow overflow-hidden">
                <div className="bg-gradient-to-r from-amber-600 to-diocesis-mustard p-6 md:p-8 text-white text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-white text-diocesis-mustardDark rounded-full text-3xl shadow-lg mb-3">
                    <i className="fa-solid fa-triangle-exclamation"></i>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-title font-bold">Documentos Pendientes</h3>
                  <p className="text-amber-100 text-sm md:text-base mt-1 font-medium">
                    Tu postulación está en revisión. Se requiere subsanar un documento.
                  </p>
                </div>

                <div className="p-6 md:p-8 space-y-6">
                  <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200">
                    <span className="text-xs text-amber-900 uppercase font-bold block">Postulante</span>
                    <span className="text-stone-900 font-bold text-base md:text-lg">{result.name}</span>
                    <span className="text-stone-600 text-sm block font-medium">DNI: {result.dni}</span>
                  </div>

                  <div className="bg-white border-l-4 border-diocesis-mustard p-4 rounded-r-2xl shadow-sm bg-stone-50">
                    <h4 className="font-title font-bold text-amber-900 text-sm md:text-base flex items-center gap-2">
                      <i className="fa-solid fa-folder-open text-diocesis-mustard"></i> Observación registrada:
                    </h4>
                    <p className="mt-1 text-sm text-stone-700 font-medium">
                      {result.observacion || "Falta adjuntar la fotocopia legible de tu DNI o la Ficha de Autorización firmada."}
                    </p>
                  </div>

                  <div className="text-center bg-diocesis-cream p-6 rounded-2xl border border-diocesis-mustard/30 space-y-4">
                    <p className="text-sm text-stone-700 font-semibold">
                      Sube el documento requerido mediante el formulario oficial de Google Drive:
                    </p>
                    
                    <a 
                      href="https://forms.google.com" 
                      target="_blank" 
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 bg-diocesis-mustard hover:bg-diocesis-mustardDark text-white font-title font-bold px-7 py-4 rounded-2xl transition shadow-lg hover:shadow-xl text-base border-b-4 border-diocesis-mustardDark"
                    >
                      <i className="fa-solid fa-cloud-arrow-up text-xl"></i>
                      <span>Subir Documento en Google Forms</span>
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* ESTADO 3: NO SELECCIONADO */}
            {result.status === 'NOT_SELECTED' && (
              <div className="bg-white rounded-3xl border-2 border-stone-300 card-shadow overflow-hidden">
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
                  </div>
                </div>
              </div>
            )}

            {/* ESTADO 4: NO ENCONTRADO */}
            {result.status === 'NOT_FOUND' && (
              <div className="bg-white rounded-3xl border-2 border-rose-300 card-shadow overflow-hidden">
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
                </div>
              </div>
            )}

          </div>
        )}

        {/* SECCIÓN DE PREGUNTAS FRECUENTES (FAQ) */}
        <div className="mt-12 bg-white rounded-3xl p-6 md:p-8 card-shadow border border-stone-200 space-y-6">
          <div className="text-center">
            <h3 className="text-xl md:text-2xl font-title font-bold text-diocesis-redDark">
              Preguntas Frecuentes
            </h3>
            <p className="text-xs md:text-sm text-stone-500 mt-1">Resuelve tus dudas sobre el proceso de selección</p>
          </div>

          <div className="space-y-4 text-sm">
            <details className="group bg-stone-50 rounded-2xl p-4 border border-stone-200">
              <summary className="font-bold text-stone-800 cursor-pointer flex items-center justify-between">
                <span>¿Cada cuánto tiempo se actualizan los datos?</span>
                <i className="fa-solid fa-chevron-down group-open:rotate-180 transition-transform text-diocesis-mustard"></i>
              </summary>
              <p className="mt-2 text-stone-600 font-medium leading-relaxed">
                La información se sincroniza automáticamente con la base de datos oficial del equipo diocesano. Cualquier cambio realizado por los coordinadores se refleja al instante.
              </p>
            </details>

            <details className="group bg-stone-50 rounded-2xl p-4 border border-stone-200">
              <summary className="font-bold text-stone-800 cursor-pointer flex items-center justify-between">
                <span>¿Qué hago si mi documento aparece en revisión?</span>
                <i className="fa-solid fa-chevron-down group-open:rotate-180 transition-transform text-diocesis-mustard"></i>
              </summary>
              <p className="mt-2 text-stone-600 font-medium leading-relaxed">
                Haz clic en el botón amarillo de "Subir Documento" que aparece en tu resultado para ingresar al formulario oficial y adjuntar el archivo faltante.
              </p>
            </details>
          </div>
        </div>

      </main>

      {/* PIE DE PÁGINA */}
      <footer className="bg-diocesis-redDark text-stone-300 text-xs md:text-sm py-8 border-t-4 border-diocesis-mustard mt-12">
        <div className="max-w-5xl mx-auto px-4 text-center space-y-3">
          <p className="font-title font-bold text-white text-base tracking-wide">
            DIÓCESIS DE CHICLAYO Y SANTA CRUZ
          </p>
          <p className="text-stone-300 font-medium">
            Pastoral Juvenil • Comisión Diocesana de Juventud • Área Diocesana de Laicos
          </p>
          <div className="flex items-center justify-center gap-4 text-stone-400 text-xs">
            <span>© {new Date().getFullYear()} Diócesis de Chiclayo y Santa Cruz. Todos los derechos reservados.</span>
            <span>•</span>
            <Link to="/login" className="hover:text-diocesis-mustard transition underline">Panel Administrativo</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
