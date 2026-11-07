import { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabase';
import QRCode from 'qrcode';
import { 
  QrCode, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  ArrowLeft, 
  ShieldCheck, 
  User, 
  MapPin, 
  Shirt, 
  Users, 
  Calendar,
  Sparkles,
  RefreshCw,
  Share2
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function GeneradorQR() {
  const [dniInput, setDniInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [volunteer, setVolunteer] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const credentialRef = useRef(null);

  // Generar QR cuando se carga el voluntario
  useEffect(() => {
    if (volunteer) {
      // El QR codifica un identificador único seguro verificable
      const qrPayload = JSON.stringify({
        tipo: 'VOLUNTARIO_PAPA_2026',
        dni: volunteer.dni,
        codigo: volunteer.codigo || `VOL-${volunteer.dni}`,
        nombre: volunteer.nombres_apellidos
      });

      QRCode.toDataURL(qrPayload, {
        width: 300,
        margin: 2,
        color: {
          dark: '#1c1917', // stone-900
          light: '#ffffff'
        },
        errorCorrectionLevel: 'H'
      })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('Error generando QR:', err));
    } else {
      setQrDataUrl('');
    }
  }, [volunteer]);

  const handleSearch = async (e) => {
    e?.preventDefault();
    const cleanDni = dniInput.trim().replace(/\D/g, '');
    if (cleanDni.length < 8) {
      setErrorMsg('Por favor ingresa un número de documento o DNI válido (mínimo 8 dígitos).');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setVolunteer(null);

    try {
      // 1. Buscar primero en Fase 2 (voluntarios con ficha completa y estado oficial)
      const { data: f2Data, error: f2Err } = await supabase
        .from('voluntarios')
        .select('*')
        .or(`dni.eq.${cleanDni},dni.ilike.%${cleanDni}%`)
        .maybeSingle();

      if (f2Err) console.warn('Aviso búsqueda Fase 2:', f2Err.message);

      let record = f2Data;

      // 2. Si no está en Fase 2, buscar en Padrón General (Fase 1)
      if (!record) {
        const { data: f1Data, error: f1Err } = await supabase
          .from('voluntarios_general')
          .select('*')
          .or(`dni.eq.${cleanDni},dni.ilike.%${cleanDni}%`)
          .maybeSingle();

        if (f1Err) console.warn('Aviso búsqueda Fase 1:', f1Err.message);
        record = f1Data;
      }

      if (!record) {
        setErrorMsg('No encontramos ningún registro con ese DNI. Verifica el número o asegúrate de haber postulado en el formulario oficial.');
        return;
      }

      // 3. Validar si está en estado habilitado
      const isRejected = record.estado === 'NO SELECCIONADO' || (record.estado && record.estado.toUpperCase().includes('NO '));
      if (isRejected) {
        setErrorMsg('Tu postulación no figura en estado SELECCIONADO. La credencial oficial con QR solo se habilita para voluntarios aprobados.');
        return;
      }

      setVolunteer(record);
    } catch (err) {
      console.error('Error consultando voluntario para QR:', err);
      setErrorMsg('Ocurrió un error al consultar el sistema. Por favor intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `Credencial_QR_${volunteer.dni}_${volunteer.nombres_apellidos?.split(' ')[0] || 'Voluntario'}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col font-sans selection:bg-amber-200">
      
      {/* Header Institucional */}
      <header className="bg-diocesis-redDark text-white shadow-md border-b-4 border-diocesis-mustard">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 text-diocesis-mustard">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-diocesis-mustard block">
                Diócesis de Chiclayo • Visita Papal 2026
              </span>
              <h1 className="text-base sm:text-lg font-bold font-title leading-tight">
                Acreditación Digital & Código QR
              </h1>
            </div>
          </div>

          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-stone-200 transition"
            title="Volver a la consulta pública"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Volver</span>
          </Link>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {/* Formulario de Consulta */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200 space-y-4">
          <div className="text-center space-y-1">
            <span className="text-[10px] uppercase font-extrabold tracking-wider bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-0.5 rounded-full inline-block">
              Generador Oficial
            </span>
            <h2 className="text-xl font-bold font-title text-stone-900">
              Genera tu Credencial con Código QR
            </h2>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Ingresa tu DNI para generar tu código QR único. Te servirá para la entrega de tu kit/polo y tu acceso el Día D.
            </p>
          </div>

          <form onSubmit={handleSearch} className="space-y-3">
            <div className="relative">
              <Search className="w-5 h-5 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                maxLength={9}
                value={dniInput}
                onChange={(e) => setDniInput(e.target.value)}
                placeholder="Ingresa tu DNI..."
                className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-300 rounded-2xl text-base font-mono font-bold tracking-wider text-stone-900 placeholder:font-sans placeholder:font-normal placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-diocesis-mustard focus:bg-white transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-diocesis-redDark hover:bg-[#5a1215] active:bg-[#480e10] text-white rounded-2xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-diocesis-mustard" />
                  <span>Consultando Padrón Oficial...</span>
                </>
              ) : (
                <>
                  <QrCode className="w-4 h-4 text-diocesis-mustard" />
                  <span>Generar mi Credencial con QR</span>
                </>
              )}
            </button>
          </form>

          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Aviso del Sistema</span>
                <span>{errorMsg}</span>
              </div>
            </div>
          )}
        </div>

        {/* Credencial Digital Oficial Resultante */}
        {volunteer && (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
            
            <div 
              ref={credentialRef}
              className="bg-white rounded-3xl shadow-xl border-2 border-stone-300 overflow-hidden relative"
            >
              {/* Encabezado del Fotocheck */}
              <div className="bg-gradient-to-r from-diocesis-redDark via-[#70161b] to-diocesis-redDark text-white p-5 text-center relative border-b-4 border-diocesis-mustard">
                <div className="absolute top-3 left-4 text-[9px] font-mono tracking-widest text-diocesis-mustard font-bold uppercase">
                  OFICIAL 2026
                </div>
                <div className="inline-block px-2.5 py-0.5 rounded-full bg-white/10 text-diocesis-mustard border border-white/20 text-[10px] font-bold uppercase tracking-wider mb-1">
                  Visita del Santo Padre
                </div>
                <h3 className="text-lg font-black font-title tracking-wide">
                  DIÓCESIS DE CHICLAYO
                </h3>
                <p className="text-[11px] text-stone-200 font-medium">
                  Credencial Oficial de Voluntario Acreditado
                </p>
              </div>

              {/* Cuerpo de la Credencial */}
              <div className="p-6 space-y-5">
                
                {/* Foto / Avatar & Nombre */}
                <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                  <div className="relative">
                    {volunteer.fotografia_url ? (
                      <img
                        src={volunteer.fotografia_url}
                        alt={volunteer.nombres_apellidos}
                        className="w-24 h-24 rounded-2xl object-cover border-4 border-amber-400 shadow-md"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-2xl bg-amber-100 border-4 border-amber-400 flex items-center justify-center text-amber-900 shadow-md">
                        <User className="w-12 h-12 text-amber-700/80" />
                      </div>
                    )}
                    <span className="absolute -bottom-2 -right-1 bg-emerald-600 text-white rounded-full p-1 shadow-sm">
                      <CheckCircle2 className="w-4 h-4" />
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md inline-block">
                      {volunteer.estado === 'SELECCIONADO' ? '✅ Acreditado / Seleccionado' : '✅ En Padrón Oficial'}
                    </span>
                    <h4 className="text-xl font-black font-title text-diocesis-redDark leading-tight">
                      {volunteer.nombres_apellidos}
                    </h4>
                    <p className="text-xs font-mono font-bold text-stone-600">
                      DNI: <span className="text-stone-900">{volunteer.dni}</span> • Código: <span className="text-diocesis-redDark">{volunteer.codigo || `VOL-${volunteer.dni}`}</span>
                    </p>
                  </div>
                </div>

                {/* Código QR Centralizado */}
                <div className="bg-amber-50/60 border-2 border-dashed border-amber-300 rounded-3xl p-5 text-center space-y-2">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-amber-900 block">
                    Escanea este código en los puntos de control
                  </span>

                  {qrDataUrl ? (
                    <div className="inline-block p-2 bg-white rounded-2xl shadow-sm border border-stone-200">
                      <img 
                        src={qrDataUrl} 
                        alt="Código QR del Voluntario" 
                        className="w-48 h-48 mx-auto"
                      />
                    </div>
                  ) : (
                    <div className="w-48 h-48 mx-auto flex items-center justify-center text-stone-400">
                      <RefreshCw className="w-8 h-8 animate-spin text-diocesis-mustard" />
                    </div>
                  )}

                  <p className="text-[11px] font-mono text-stone-600 font-semibold">
                    {volunteer.codigo || `VOL-2026-${volunteer.dni}`}
                  </p>
                </div>

                {/* Datos Operativos & Talla */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                    <span className="text-[10px] uppercase font-bold text-stone-400 block">Comisión / Servicio</span>
                    <span className="font-bold text-stone-800">{volunteer.servicio || 'Servicio General'}</span>
                  </div>

                  <div className="p-3 bg-amber-100/70 border border-amber-300 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-amber-900 block">Talla Oficial</span>
                      <span className="text-base font-black text-amber-950 font-mono">{volunteer.talla || 'No especificada'}</span>
                    </div>
                    <Shirt className="w-5 h-5 text-amber-700" />
                  </div>

                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                    <span className="text-[10px] uppercase font-bold text-stone-400 block">Sector / Responsable</span>
                    <span className="font-bold text-stone-800 truncate block">
                      {volunteer.responsable_nombre || volunteer.lugar_asignado || 'Comisión Central'}
                    </span>
                  </div>

                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                    <span className="text-[10px] uppercase font-bold text-stone-400 block">Jurisdicción</span>
                    <span className="font-bold text-stone-800 truncate block">
                      {volunteer.jurisdiccion || 'Chiclayo'}
                    </span>
                  </div>
                </div>

                {/* Estado de Entrega de Kit si ya lo tiene */}
                {volunteer.kit_entregado && (
                  <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      <strong>Kit Entregado:</strong> Registrado el{' '}
                      {volunteer.kit_fecha_entrega ? new Date(volunteer.kit_fecha_entrega).toLocaleDateString() : 'oficialmente'}.
                    </span>
                  </div>
                )}
              </div>

              {/* Pie de Fotocheck */}
              <div className="bg-stone-50 border-t border-stone-200 px-6 py-3 flex items-center justify-between text-[11px] text-stone-500 font-medium">
                <span>Diócesis de Chiclayo</span>
                <span>Válido para Visita Papal 2026</span>
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={handleDownload}
                className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-200" />
                <span>Descargar Código QR para mi Galería</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: 'Mi Credencial Oficial - Visita Papal 2026',
                      text: `Soy voluntario oficial acreditado de la Visita Papal 2026. DNI: ${volunteer.dni}`,
                      url: window.location.href
                    }).catch(() => {});
                  } else {
                    handleDownload();
                  }
                }}
                className="w-full sm:w-auto py-3 px-4 bg-stone-800 hover:bg-stone-900 text-white rounded-2xl font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <Share2 className="w-4 h-4 text-stone-300" />
                <span>Compartir</span>
              </button>
            </div>

            <p className="text-[11px] text-center text-stone-500 leading-relaxed">
              💡 <strong>Consejo:</strong> Toma una captura de pantalla o descarga la imagen a tu galería para que puedas mostrarla sin necesidad de conexión a internet el día que recojas tu kit o en las puertas del evento.
            </p>
          </div>
        )}
      </main>

      {/* Footer Discreto */}
      <footer className="py-4 text-center text-xs text-stone-400">
        Comisión Diocesana de Voluntariado • Chiclayo 2026
      </footer>
    </div>
  );
}
