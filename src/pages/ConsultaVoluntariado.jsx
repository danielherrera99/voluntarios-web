import React, { useState } from 'react';
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

// Enlace al Formulario Oficial de Google Forms (Etapa 2)
const GOOGLE_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSfO_z7lnEDjQR37y7V7uh9gEsFs5ZNlznvM6_GyeKiAljmlmA/viewform";

export default function ConsultaVoluntariado() {
  const [dniInput, setDniInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const performSearch = async (dni) => {
    const cleanDni = dni.trim();
    if (!cleanDni) return;

    setLoading(true);

    try {
      // 1. Consultar Fase 2 (voluntarios)
      const { data: f2Data, error: f2Error } = await supabase
        .from('voluntarios')
        .select('*')
        .eq('dni', cleanDni)
        .maybeSingle();

      if (f2Error && f2Error.code !== 'PGRST116') {
        console.warn('Aviso en consulta Fase 2:', f2Error.message);
      }

      if (f2Data) {
        const valStr = String(f2Data.estado || '').toUpperCase();
        let mappedStatus = 'PENDING';
        const isVerificar = valStr.includes('REVISI') || valStr.includes('OBSERV') || valStr.includes('VERIFICAR');

        if (f2Data.info_validada || valStr.includes('SELECCIONAD') || valStr.includes('APROBAD')) {
          mappedStatus = 'SELECTED';
        } else if (isVerificar) {
          mappedStatus = 'PENDING';
        } else if (valStr.includes('NO') || valStr.includes('RECHAZ')) {
          mappedStatus = 'NOT_SELECTED';
        }

        setResult({
          status: mappedStatus,
          fase: f2Data.fase || '2',
          name: f2Data.nombres_apellidos || 'Postulante',
          dni: f2Data.dni,
          codigo: f2Data.codigo,
          comision: f2Data.servicio || 'Servicio Diocesano Asignado',
          area: f2Data.departamento || 'Diócesis de Chiclayo y Santa Cruz',
          esVerificar: isVerificar,
          observacion: f2Data.observacion || null
        });
        return;
      }

      // 2. Si no está en Fase 2, consultar en Fase 1 (voluntarios_general)
      const { data: f1Data, error: f1Error } = await supabase
        .from('voluntarios_general')
        .select('*')
        .eq('dni', cleanDni)
        .maybeSingle();

      if (f1Error && f1Error.code !== 'PGRST116') {
        console.warn('Aviso en consulta Fase 1:', f1Error.message);
      }

      if (f1Data) {
        setResult({
          status: 'FASE1',
          fase: '1',
          name: f1Data.nombres_apellidos || 'Postulante',
          dni: f1Data.dni,
          codigo: f1Data.codigo,
          comision: f1Data.servicio || 'Servicio Solicitado',
          area: f1Data.departamento || 'Diócesis de Chiclayo y Santa Cruz',
          observacion: 'Te encuentras registrado/a en el Padrón General inicial (Fase 1). Si completaste tu ficha o documentos de la Fase 2 recientemente, tu expediente está en proceso de validación.'
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

  return (
    <div className="font-sans antialiased text-stone-800 min-h-screen flex flex-col justify-between bg-stone-100 selection:bg-diocesis-mustard selection:text-white">
      
      {/* BARRA SUPERIOR INSTITUCIONAL */}
      <div className="bg-diocesis-mustard text-white px-4 py-2 text-xs md:text-sm font-semibold text-center flex items-center justify-center gap-2 shadow-sm">
        <i className="fa-solid fa-cross"></i>
        <span className="font-title tracking-wide text-sm md:text-base">DIÓCESIS DE CHICLAYO "CHICLAYO Y SANTA CRUZ"</span>
        <span className="hidden md:inline">• Portal Oficial de Consulta de Voluntariado</span>
      </div>

      {/* CABECERA CON LOGOS OFICIALES */}
      <header className="header-gradient text-white border-b-4 border-diocesis-mustard shadow-lg relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 py-6 md:py-8 relative z-10 space-y-6">
          
          {/* BARRA DE LOGOTIPOS RECREADOS */}
          <div className="bg-white/95 backdrop-blur rounded-2xl p-3 md:p-4 shadow-xl border border-diocesis-mustard/30 flex flex-wrap items-center justify-between gap-4">
            
            {/* Logo 1: Diócesis de Chiclayo */}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-diocesis-red text-diocesis-mustard rounded-xl flex items-center justify-center font-bold text-xl shadow-md border border-diocesis-mustard">
                <i className="fa-solid fa-church"></i>
              </div>
              <div className="leading-tight">
                <span className="block text-[11px] font-extrabold text-diocesis-redDark uppercase tracking-tight">Diócesis de Chiclayo</span>
                <span className="block text-xs font-black text-stone-900 font-title uppercase">"Chiclayo y Santa Cruz"</span>
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
              <h1 className="text-2xl md:text-4xl font-title font-bold text-white tracking-wide" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                DIÓCESIS DE CHICLAYO "CHICLAYO Y SANTA CRUZ"
              </h1>
              <p className="text-xs md:text-sm text-stone-100 mt-1 font-semibold" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
                Sistema de Validación de Postulantes al Voluntariado Diocesano
              </p>
            </div>

            <a 
              href="https://wa.me/51945854083?text=Hola,%20tengo%20una%20consulta%20sobre%20el%20voluntariado%20de%20la%20Diócesis%20de%20Chiclayo" 
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

          {/* NOTA INSTITUCIONAL DE CONSULTA */}
          <div className="mt-8 pt-4 border-t border-stone-200 text-center">
            <p className="text-xs text-stone-500 font-medium flex items-center justify-center gap-1.5">
              <i className="fa-solid fa-shield-halved text-emerald-600"></i>
              <span>Sistema Oficial de Consulta • Diócesis de Chiclayo "Chiclayo y Santa Cruz"</span>
            </p>
          </div>
        </div>

        <div id="resultAnchor"></div>

        {/* RESULTADOS DINÁMICOS */}
        {result && (
          <div className="space-y-6 animate-fade-in">
            
            {/* ESTADO 1: SELECCIONADO / PASA A FASE 3 */}
            {result.status === 'SELECTED' && (
              <div className="bg-white rounded-3xl border-2 border-emerald-500 card-shadow overflow-hidden">
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
                      <div>
                        <span className="text-xs text-stone-500 uppercase font-bold block">Código Oficial</span>
                        <span className="text-emerald-800 font-mono font-bold text-base">{result.codigo}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-xs text-stone-500 uppercase font-bold block">Comisión Asignada</span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-diocesis-red text-white rounded-lg text-xs md:text-sm font-bold mt-1 shadow-sm">
                        <i className="fa-solid fa-users text-diocesis-mustard"></i> {result.comision || 'Servicio Diocesano'}
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

            {/* ESTADO 2: ETAPA 2 EN REVISIÓN */}
            {result.status === 'PENDING' && (
              <div className="bg-white rounded-3xl border-2 border-diocesis-mustard card-shadow overflow-hidden">
                <div className="bg-gradient-to-r from-amber-600 to-diocesis-mustard p-6 md:p-8 text-white text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-white text-diocesis-mustardDark rounded-full text-3xl shadow-lg mb-3">
                    <i className="fa-solid fa-clock-rotate-left"></i>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-title font-bold">Estás en la Etapa 2</h3>
                  <p className="text-amber-100 text-sm md:text-base mt-1 font-medium">
                    Tus documentos están siendo revisados por el equipo diocesano.
                  </p>
                </div>

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
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-200 text-amber-900 rounded-lg text-xs font-bold mt-1">
                        <i className="fa-solid fa-file-circle-check"></i> Etapa 2: Documentos en Revisión
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-amber-900 uppercase font-bold block">Asignación de Comisión</span>
                      <span className="text-stone-800 font-bold text-sm block mt-1">
                        {result.comision || 'Aún sin asignación de comisión'}
                      </span>
                    </div>
                  </div>

                  {result.esVerificar && result.observacion ? (
                    <div className="bg-white border-l-4 border-amber-500 p-4 rounded-r-2xl shadow-sm bg-stone-50 space-y-2">
                      <h4 className="font-title font-bold text-amber-900 text-sm md:text-base flex items-center gap-2">
                        <i className="fa-solid fa-folder-open text-amber-600"></i> Observación registrada por la comisión:
                      </h4>
                      <p className="text-sm text-stone-700 font-medium">
                        {result.observacion}
                      </p>
                      <div className="pt-2">
                        <a 
                          href={GOOGLE_FORM_URL} 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 bg-diocesis-mustard hover:bg-diocesis-mustardDark text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-sm"
                        >
                          <i className="fa-solid fa-cloud-arrow-up"></i>
                          <span>Subsanar Documento en Google Forms</span>
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
                      ¿Tienes alguna consulta sobre tu evaluación?
                    </p>
                    <a 
                      href={`https://wa.me/51945854083?text=Hola,%20figuro%20en%20la%20Etapa%202%20con%20DNI%20${result.dni}%20y%20quisiera%20consultar%20sobre%20mi%20revisión`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-emerald-700 font-bold text-sm hover:underline mt-1"
                    >
                      <i className="fa-brands fa-whatsapp text-base"></i>
                      <span>Escribir al Soporte Diocesano (+51 945 854 083)</span>
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* ESTADO 2.5: REGISTRADO EN PADRÓN GENERAL (FASE 1) */}
            {result.status === 'FASE1' && (
              <div className="bg-white rounded-3xl border-2 border-sky-500 card-shadow overflow-hidden">
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

                    <a 
                      href={GOOGLE_FORM_URL} 
                      target="_blank" 
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2.5 bg-diocesis-red hover:bg-diocesis-redDark text-white font-title font-bold px-8 py-4 rounded-2xl transition shadow-lg hover:shadow-xl text-base border-b-4 border-diocesis-redDark cursor-pointer"
                    >
                      <i className="fa-solid fa-cloud-arrow-up text-xl text-diocesis-mustard"></i>
                      <span>Subir Documentación en Google Forms</span>
                    </a>
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
            DIÓCESIS DE CHICLAYO "CHICLAYO Y SANTA CRUZ"
          </p>
          <p className="text-stone-300 font-medium">
            Pastoral Juvenil • Comisión Diocesana de Juventud • Área Diocesana de Laicos
          </p>
          <p className="text-stone-400 text-xs">
            © {new Date().getFullYear()} Diócesis de Chiclayo y Santa Cruz. Todos los derechos reservados.
          </p>
        </div>
      </footer>

    </div>
  );
}
