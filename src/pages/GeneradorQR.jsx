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
  Share2,
  Printer,
  FileCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { encryptVolunteerQrPayload } from '../utils/qrCrypto';

export default function GeneradorQR() {
  const [dniInput, setDniInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [volunteer, setVolunteer] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const credentialRef = useRef(null);

  const formatFotoUrl = (url) => {
    if (!url) return null;
    const m1 = url.match(/id=([a-zA-Z0-9_-]+)/);
    if (m1) return `https://lh3.googleusercontent.com/d/${m1[1]}`;
    const m2 = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (m2) return `https://lh3.googleusercontent.com/d/${m2[1]}`;
    return url;
  };

  // Generar QR cifrado cuando se carga el voluntario (sin exponer DNI ni nombres en texto plano)
  useEffect(() => {
    if (volunteer) {
      const qrPayload = encryptVolunteerQrPayload({
        dni: volunteer.dni,
        codigo: volunteer.codigo || `VOL-${volunteer.dni}`
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

  const [generatingImage, setGeneratingImage] = useState(false);

  // Descarga del fotocheck oficial completo en Canvas (alta resolución 700x1050 px)
  const handleDownloadCredentialImage = async () => {
    if (!volunteer || !qrDataUrl) return;
    setGeneratingImage(true);

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const width = 700;
      const height = 1050;
      canvas.width = width;
      canvas.height = height;

      // 1. Fondo blanco de la tarjeta con borde sutil
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      // 2. Encabezado en Rojo Diocesano (#851C1D a #5B1314)
      const grad = ctx.createLinearGradient(0, 0, width, 120);
      grad.addColorStop(0, '#851C1D');
      grad.addColorStop(1, '#5B1314');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, 120);

      // Franja de oro (#F59E0B)
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(0, 120, width, 8);

      // Textos del Encabezado
      ctx.fillStyle = '#FEF3C7';
      ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('VISITA DEL SANTO PADRE • 2026', width / 2, 38);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 24px system-ui, -apple-system, sans-serif';
      ctx.fillText('DIÓCESIS DE CHICLAYO', width / 2, 70);

      ctx.fillStyle = '#FDE68A';
      ctx.font = '600 13px system-ui, -apple-system, sans-serif';
      ctx.fillText('CREDENCIAL OFICIAL DE VOLUNTARIO ACREDITADO', width / 2, 96);

      // 3. Foto / Avatar del Voluntario
      const photoX = 45;
      const photoY = 150;
      const photoSize = 115;
      let photoLoaded = false;

      if (volunteer.fotografia_url) {
        try {
          const img = new window.Image();
          img.crossOrigin = 'anonymous';
          const apiUrl = import.meta.env.VITE_API_URL || 'https://voluntarios-backend.vercel.app';
          const proxyUrl = `${apiUrl}/api/proxy-image?url=${encodeURIComponent(volunteer.fotografia_url)}`;
          
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            setTimeout(reject, 3500); // timeout preventivo
            img.src = proxyUrl;
          });

          // Dibujar foto con esquinas redondeadas
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(photoX, photoY, photoSize, photoSize, 18);
          ctx.clip();
          ctx.drawImage(img, photoX, photoY, photoSize, photoSize);
          ctx.restore();

          // Borde dorado
          ctx.strokeStyle = '#F59E0B';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.roundRect(photoX, photoY, photoSize, photoSize, 18);
          ctx.stroke();

          photoLoaded = true;
        } catch (e) {
          console.warn('Fallback a monograma por CORS o conexión lenta:', e);
        }
      }

      // Si no hay foto o falló la carga, avatar monograma
      if (!photoLoaded) {
        ctx.fillStyle = '#FEF3C7';
        ctx.beginPath();
        ctx.roundRect(photoX, photoY, photoSize, photoSize, 18);
        ctx.fill();

        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.fillStyle = '#92400E';
        ctx.font = 'bold 44px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        const initial = volunteer.nombres_apellidos?.charAt(0) || 'V';
        ctx.fillText(initial, photoX + photoSize / 2, photoY + photoSize / 2 + 16);
      }

      // 4. Datos del Voluntario (a la derecha de la foto)
      const textX = 180;
      ctx.textAlign = 'left';

      // Badge Acreditado
      ctx.fillStyle = '#059669';
      ctx.beginPath();
      ctx.roundRect(textX, photoY + 2, 175, 22, 6);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
      ctx.fillText('✓ VOLUNTARIO ACREDITADO', textX + 12, photoY + 17);

      // Nombre del Voluntario (máximo 2 líneas)
      ctx.fillStyle = '#851C1D';
      ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
      const words = (volunteer.nombres_apellidos || '').toUpperCase().split(' ');
      let line1 = '';
      let line2 = '';
      for (const w of words) {
        if ((line1 + ' ' + w).length <= 22) line1 += (line1 ? ' ' : '') + w;
        else line2 += (line2 ? ' ' : '') + w;
      }
      ctx.fillText(line1, textX, photoY + 48);
      if (line2) ctx.fillText(line2, textX, photoY + 74);

      // DNI y Código
      ctx.fillStyle = '#44403C';
      ctx.font = 'bold 12px ui-monospace, SFMono-Regular, monospace';
      const dniText = `DNI: ${volunteer.dni || 'Sin DNI'}  •  CÓD: ${volunteer.codigo || `VOL-${volunteer.dni}`}`;
      ctx.fillText(dniText, textX, photoY + (line2 ? 102 : 82));

      // 5. Contenedor del Código QR (Centro)
      const qrBoxX = 45;
      const qrBoxY = 295;
      const qrBoxW = 610;
      const qrBoxH = 390;

      ctx.fillStyle = '#FFFBEB';
      ctx.beginPath();
      ctx.roundRect(qrBoxX, qrBoxY, qrBoxW, qrBoxH, 20);
      ctx.fill();

      ctx.strokeStyle = '#FDE68A';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#92400E';
      ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CÓDIGO OFICIAL PARA CONTROL DE ASISTENCIA Y KITS', width / 2, qrBoxY + 32);

      // Dibujar QR desde qrDataUrl
      const qrImg = new window.Image();
      await new Promise(r => {
        qrImg.onload = r;
        qrImg.src = qrDataUrl;
      });

      const qrSize = 250;
      const qrX = width / 2 - qrSize / 2;
      const qrY = qrBoxY + 52;
      
      // Fondo blanco del QR
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 16);
      ctx.fill();
      ctx.strokeStyle = '#E7E5E4';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

      ctx.fillStyle = '#44403C';
      ctx.font = 'bold 13px ui-monospace, SFMono-Regular, monospace';
      ctx.fillText(volunteer.codigo || `VOL-${volunteer.dni}`, width / 2, qrBoxY + qrBoxH - 30);

      ctx.fillStyle = '#78716C';
      ctx.font = 'italic 10px system-ui, -apple-system, sans-serif';
      ctx.fillText('Presenta este fotocheck digital desde tu celular o impreso', width / 2, qrBoxY + qrBoxH - 12);

      // 6. Tarjetas de Información Operativa (2x2 Grid)
      const gridY = 705;
      const cardW = 295;
      const cardH = 68;

      const drawInfoBox = (x, y, label, val, isHighlight = false) => {
        ctx.fillStyle = isHighlight ? '#FEF3C7' : '#F5F5F4';
        ctx.beginPath();
        ctx.roundRect(x, y, cardW, cardH, 12);
        ctx.fill();

        ctx.strokeStyle = isHighlight ? '#F59E0B' : '#E7E5E4';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = isHighlight ? '#92400E' : '#78716C';
        ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(label.toUpperCase(), x + 14, y + 24);

        ctx.fillStyle = isHighlight ? '#78350F' : '#1C1917';
        ctx.font = isHighlight ? '900 17px ui-monospace, monospace' : 'bold 13px system-ui, -apple-system, sans-serif';
        let displayVal = val || 'No especificado';
        if (displayVal.length > 28) displayVal = displayVal.substring(0, 26) + '...';
        ctx.fillText(displayVal, x + 14, y + 50);
      };

      // Fila 1
      drawInfoBox(45, gridY, 'Comisión / Servicio', volunteer.servicio || 'Servicio General');
      drawInfoBox(360, gridY, 'Talla de Polo Oficial', `TALLA: ${volunteer.talla || 'M'}`, true);

      // Fila 2
      drawInfoBox(45, gridY + 80, 'Sector / Responsable', volunteer.responsable_nombre || volunteer.lugar_asignado || 'Comisión Central');
      drawInfoBox(360, gridY + 80, 'Jurisdicción', volunteer.jurisdiccion || 'Chiclayo');

      // 7. Pie de Página Institucional
      const footerY = 880;
      ctx.fillStyle = '#F5F5F4';
      ctx.fillRect(0, footerY, width, height - footerY);

      ctx.fillStyle = '#E7E5E4';
      ctx.fillRect(0, footerY, width, 1);

      ctx.fillStyle = '#57534E';
      ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('DIÓCESIS DE CHICLAYO  •  COMISIÓN DIOCESANA DE VOLUNTARIADO', width / 2, footerY + 45);

      ctx.fillStyle = '#78716C';
      ctx.font = '11px system-ui, -apple-system, sans-serif';
      ctx.fillText('Válido exclusivamente para las jornadas y actividades de la Visita Papal 2026', width / 2, footerY + 70);

      ctx.fillStyle = '#A8A29E';
      ctx.font = '9px system-ui, -apple-system, sans-serif';
      ctx.fillText(`Credencial emitida digitalmente el ${new Date().toLocaleDateString('es-PE')}`, width / 2, footerY + 95);

      // Descargar como PNG
      const link = document.createElement('a');
      link.download = `Credencial_Oficial_${volunteer.dni}_${(volunteer.nombres_apellidos?.split(' ')[0] || 'Voluntario')}.png`;
      link.href = canvas.toDataURL('image/png', 0.95);
      link.click();
    } catch (err) {
      console.error('Error generando credencial:', err);
      handleDownloadQrOnly();
    } finally {
      setGeneratingImage(false);
    }
  };

  // Descargar exclusivamente el código QR como imagen
  const handleDownloadQrOnly = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `QR_${volunteer.dni}_${volunteer.nombres_apellidos?.split(' ')[0] || 'Voluntario'}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col font-sans selection:bg-amber-200">
      
      {/* Header Institucional */}
      <header className="bg-diocesis-redDark text-white shadow-md border-b-4 border-diocesis-mustard no-print">
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
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200 space-y-4 no-print">
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
              id="credencialImprimible"
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
                        src={formatFotoUrl(volunteer.fotografia_url)}
                        alt={volunteer.nombres_apellidos}
                        className="w-24 h-24 rounded-2xl object-cover border-4 border-amber-400 shadow-md bg-stone-100"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
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
            <div className="space-y-2.5 no-print">
              <button
                type="button"
                disabled={generatingImage}
                onClick={handleDownloadCredentialImage}
                className="w-full py-3.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl font-black text-xs sm:text-sm shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {generatingImage ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-200" />
                    <span>Generando Fotocheck Oficial en alta calidad...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-emerald-200" />
                    <span>Descargar Fotocheck Completo (Imagen PNG)</span>
                  </>
                )}
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="py-2.5 px-3 bg-white hover:bg-stone-50 text-stone-800 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer border border-stone-300 shadow-2xs"
                  title="Imprimir o guardar en PDF"
                >
                  <Printer className="w-3.5 h-3.5 text-stone-600" />
                  <span>Imprimir / PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadQrOnly}
                  className="py-2.5 px-3 bg-white hover:bg-stone-50 text-stone-700 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer border border-stone-300 shadow-2xs"
                  title="Descargar solo el recuadro del código QR"
                >
                  <QrCode className="w-3.5 h-3.5 text-stone-500" />
                  <span>Solo QR</span>
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
                      handleDownloadCredentialImage();
                    }
                  }}
                  className="py-2.5 px-3 bg-white hover:bg-stone-50 text-stone-700 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer border border-stone-300 shadow-2xs"
                  title="Compartir"
                >
                  <Share2 className="w-3.5 h-3.5 text-stone-500" />
                  <span>Compartir</span>
                </button>
              </div>
            </div>

            <p className="text-[11px] text-center text-stone-500 leading-relaxed no-print">
              💡 <strong>Consejo:</strong> Descarga la imagen a tu galería o guárdala en PDF para que la puedas mostrar sin necesidad de internet cuando recojas tu kit o en las puertas del evento.
            </p>
          </div>
        )}
      </main>

      {/* Footer Discreto */}
      <footer className="py-4 text-center text-xs text-stone-400 no-print">
        Comisión Diocesana de Voluntariado • Chiclayo 2026
      </footer>
    </div>
  );
}

