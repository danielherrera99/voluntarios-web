/* src/components/FloatingChat.jsx */
import { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { MessageSquare, X, Send, ExternalLink, HelpCircle } from 'lucide-react';
import './FloatingChat.css';

// Constantes y enlaces oficiales
const GOOGLE_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSfO_z7lnEDjQR37y7V7uh9gEsFs5ZNlznvM6_GyeKiAljmlmA/viewform";
const PORTAL_URL = "https://amigosdeleoncix.onrender.com/";
const MTPE_CUL_URL = "https://www.empleosperu.gob.pe/CertificadoUnicoLaboral/";
const WHATSAPP_SOPORTE_URL = "https://wa.me/51945854083?text=Hola,%20tengo%20una%20consulta%20sobre%20mis%20documentos%20de%20la%20Fase%202";

const CARTA_RECOMENDACION_URL = "https://drive.google.com/file/d/1S4yGZY9iC65vW2m9q4u5VGMtcS9wh_kn/view?usp=sharing";

// Respuestas inmediatas para preguntas frecuentes (cero latencia)
const QUICK_FAQ_ANSWERS = {
  docs_fase2: {
    question: "📄 ¿Qué documentos piden en Fase 2?",
    answer: `Para la **Fase 2** debes subir obligatoriamente estos 3 documentos en el formulario:\n\n1. 🆔 **DNI o Pasaporte:** Escaneado o fotografiado por ambos lados, totalmente nítido y legible.\n2. 📄 **Carta de Recomendación / Compromiso:** Impresa, con tus datos completos y firma manuscrita.\n3. 📋 **CertiAdulto (CUL):** Certificado Único Laboral expedido gratis por el Ministerio de Trabajo (MTPE).\n\n🔗 Puedes subirlos aquí: [Formulario Oficial de Fase 2](${GOOGLE_FORM_URL})`
  },
  carta_compromiso: {
    question: "📥 ¿Dónde descargo la Carta de Compromiso?",
    answer: `La **Carta de Recomendación / Compromiso** oficial es obligatoria para validar tu postulación.\n\n👉 Debes descargarla, imprimirla, llenarla, firmarla a mano y subirla en formato PDF o imagen legible.\n\n📥 [Descargar Formato Oficial en Google Drive](${CARTA_RECOMENDACION_URL})\n\n💬 Si tienes alguna duda, escríbenos a WhatsApp: [Contactar Soporte por WhatsApp](${WHATSAPP_SOPORTE_URL})`
  },
  certiadulto_cul: {
    question: "🆔 ¿Cómo tramito el CertiAdulto (CUL)?",
    answer: `El **CertiAdulto (Certificado Único Laboral)** es un documento oficial, 100% gratuito y emitido por el Estado Peruano (MTPE).\n\n📌 **Pasos para tramitarlo en 5 minutos:**\n1. Ingresa al portal de Empleos Perú: [https://www.empleosperu.gob.pe/CertificadoUnicoLaboral/](${MTPE_CUL_URL})\n2. Inicia sesión con tu DNI o regístrate con tu verificación de identidad.\n3. Ve a la opción **"Solicitar Certificado Único Laboral"**.\n4. Descarga el archivo PDF y súbelo tal cual en el formulario de Fase 2.`
  },
  link_formulario: {
    question: "🔗 Link de Google Forms",
    answer: `El formulario oficial para cargar tus 3 documentos de la Fase 2 es:\n\n👉 [Abrir Formulario Oficial de Google Forms](${GOOGLE_FORM_URL})\n\n💡 *Recuerda tener listos tu DNI escaneado, la Carta de Compromiso firmada y tu CertiAdulto en PDF.*`
  },
  estados_explicacion: {
    question: "🔍 ¿Qué significa mi estado?",
    answer: `Al consultar tu DNI en el portal (${PORTAL_URL}), puedes tener uno de estos estados:\n\n* 🟢 **SELECCIONADO:** Tus documentos fueron aprobados con éxito y pasaste a la siguiente etapa.\n* 🟡 **EN REVISIÓN / OBSERVADO:** El equipo detectó algún detalle en tus documentos (ejemplo: foto borrosa, falta firma o falta el CUL). Revisa la observación y vuelve a subirlos.\n* 🟠 **SIN ENVIAR FASE 2:** Estás en el Padrón General inicial, pero aún no envías tus 3 documentos en Google Forms.\n* 🔴 **NO SELECCIONADO:** No cumple con los criterios de admisión diocesanos.`
  },
  soporte_humano: {
    question: "📞 Hablar con un asesor",
    answer: `Si tienes un caso especial, dudas con tu DNI o inconvenientes para cargar tus archivos, nuestro equipo diocesano está listo para ayudarte:\n\n💬 [Escribir por WhatsApp a Soporte Diocesano](${WHATSAPP_SOPORTE_URL})`
  }
};

export default function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      content: `¡Hola! 👋 Te damos la bienvenida al asistente virtual del **Voluntariado Diocesano**.\n\n¿Tienes alguna duda sobre tus **documentos de la Fase 2**, el **CertiAdulto (CUL)**, la **Carta de Compromiso** o tu estado de postulación? Elige una opción rápida o escribe tu consulta.`,
      time: 'Ahora'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Convertir texto con markdown links [texto](url) o URLs a enlaces interactivos
  const renderMessageContent = (text) => {
    const parts = [];
    const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s]+)/g;
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      if (match[1] && match[2]) {
        // Enlace markdown [texto](url)
        parts.push(
          <a key={match.index} href={match[2]} target="_blank" rel="noopener noreferrer">
            {match[1]} ↗
          </a>
        );
      } else if (match[3]) {
        // URL directa
        parts.push(
          <a key={match.index} href={match[3]} target="_blank" rel="noopener noreferrer">
            {match[3]}
          </a>
        );
      }
      lastIndex = linkRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return (
      <div style={{ whiteSpace: 'pre-wrap' }}>
        {parts.map((p, i) => (typeof p === 'string' ? renderBoldText(p, i) : p))}
      </div>
    );
  };

  // Resaltado de negrita simple con **texto**
  const renderBoldText = (text, keyPrefix) => {
    const boldParts = text.split(/(\*\*[^*]+\*\*)/g);
    return boldParts.map((bp, j) => {
      if (bp.startsWith('**') && bp.endsWith('**')) {
        return <strong key={`${keyPrefix}-${j}`}>{bp.slice(2, -2)}</strong>;
      }
      return bp;
    });
  };

  // Manejar click en chip rápido
  const handleQuickQuestion = (key) => {
    const faq = QUICK_FAQ_ANSWERS[key];
    if (!faq) return;

    const userMsg = { role: 'user', content: faq.question, time: 'Ahora' };
    const botMsg = { role: 'bot', content: faq.answer, time: 'Ahora' };

    setMessages(prev => [...prev, userMsg, botMsg]);
  };

  // Enviar consulta libre a Gemini
  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage, time: 'Ahora' }]);
    setIsLoading(true);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyBEzT7ylX6W6u0A_-JP1wHk3BN4vC3SpvU';
      const genAI = new GoogleGenerativeAI(apiKey);

      const systemInstruction = `Eres el "Asistente Diocesano" del Padrón de Voluntariado para la Diócesis de Chiclayo.
Tu función EXCLUSIVA es guiar y resolver dudas sobre el proceso de documentación y validación de la FASE 2 de los voluntarios.

INFORMACIÓN OFICIAL Y VERIFICADA QUE DEBES USAR:
1. DOCUMENTOS REQUERIDOS EN FASE 2:
   - DNI o Pasaporte escaneado por ambos lados (nítido y legible).
   - Carta de Compromiso oficial (impresa, con datos completos y firmada a mano).
   - CertiAdulto (CUL - Certificado Único Laboral) emitido gratis por el Ministerio de Trabajo y Promoción del Empleo (MTPE).
   - Enlace oficial del Formulario Google Forms para subir documentos: ${GOOGLE_FORM_URL}
2. CÓMO TRAMITAR EL CERTIADULTO (CUL):
   - Es 100% gratuito por internet en la web del MTPE: ${MTPE_CUL_URL}
   - Se requiere DNI vigente y registro con verificación facial o de datos. Se descarga en 5 minutos en formato PDF.
3. ESTADOS DE POSTULACIÓN EN EL PADRÓN (Consulta en ${PORTAL_URL}):
   - "SELECCIONADO": Documentos aprobados, avanza a la siguiente etapa.
   - "EN REVISIÓN / OBSERVADO": El equipo detectó alguna observación en sus archivos (DNI borroso, falta firma en la carta o falta el CUL). Debe corregirlo y volver a subir sus documentos al formulario de Google Forms.
   - "SIN ENVIAR FASE 2": Está registrado en el Padrón General inicial, pero todavía no ha enviado los 3 documentos en Google Forms.
   - "NO SELECCIONADO": No admitido según los requisitos de admisión diocesanos.
4. SOPORTE HUMANO POR WHATSAPP:
   - Si tienen problemas específicos o casos particulares, indícales amablemente que pueden escribir al WhatsApp de Soporte: ${WHATSAPP_SOPORTE_URL}

REGLAS DE RESPUESTA:
- Sé conciso, muy amable, respetuoso y fraterno.
- NO respondas sobre comisiones, agendas de visitas papales ni detalles organizativos fuera de la documentación. Si te preguntan sobre esos temas, indícales cortésmente que tu función es orientar sobre la documentación y estado de postulación de la Fase 2, y que para otros temas sigan los canales diocesanos oficiales.
- Siempre que menciones enlaces, usa los enlaces oficiales proporcionados arriba.
- Responde en español peruano claro.`;

      // Intentar modelos con fallback automático
      const modelsToTry = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
      let responseText = null;

      for (const mName of modelsToTry) {
        try {
          const model = genAI.getGenerativeModel({
            model: mName,
            systemInstruction: systemInstruction
          });

          const prompt = `Pregunta del voluntario: ${userMessage}`;
          const result = await model.generateContent(prompt);
          const response = await result.response;
          responseText = response.text();
          if (responseText) break;
        } catch (modelErr) {
          console.warn(`Error con modelo ${mName}, intentando siguiente...`, modelErr.message);
        }
      }

      if (!responseText) {
        throw new Error('El servicio de asistente está experimentando alta demanda momentánea.');
      }

      setMessages(prev => [...prev, { role: 'bot', content: responseText, time: 'Ahora' }]);
    } catch (error) {
      console.error('Error en Asistente Virtual:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'bot',
          content: `No pude procesar tu mensaje en este instante. Por favor intenta con los botones de opciones rápidas o comunícate directo con nosotros: [Contactar Soporte por WhatsApp](${WHATSAPP_SOPORTE_URL})`,
          time: 'Ahora'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="floating-chat-container no-print">
      {/* Botón Flotante Launcher */}
      <button
        type="button"
        className="chat-launcher-btn"
        onClick={() => setIsOpen(!isOpen)}
        title={isOpen ? 'Cerrar Asistente' : '¿Dudas con tus documentos? Consulta aquí'}
        aria-label="Abrir asistente virtual de consultas"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
        {!isOpen && <span className="chat-badge-pulse" />}
      </button>

      {/* Ventana de Chat */}
      {isOpen && (
        <div className="chat-window-card">
          {/* Cabecera */}
          <div className="chat-window-header">
            <div className="chat-header-details">
              <div className="chat-avatar-circle">🕊️</div>
              <div>
                <h4 className="chat-header-title">Asistente Diocesano</h4>
                <div className="chat-header-subtitle">
                  <span className="status-indicator-dot" />
                  <span>En línea • Documentos Fase 2</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              className="chat-close-button"
              onClick={() => setIsOpen(false)}
              title="Cerrar chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Área de Mensajes */}
          <div className="chat-messages-area">
            {messages.map((msg, idx) => (
              <div key={idx} className={`chat-msg-row ${msg.role}`}>
                <div className="chat-bubble-content">
                  {renderMessageContent(msg.content)}
                </div>
                <span className="chat-time-tag">{msg.time}</span>
              </div>
            ))}

            {isLoading && (
              <div className="chat-typing-box">
                <div className="chat-typing-dot" />
                <div className="chat-typing-dot" />
                <div className="chat-typing-dot" />
              </div>
            )}

            {/* Chips de Preguntas Frecuentes Rápidas */}
            <div className="pt-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                Preguntas Rápidas:
              </span>
              <div className="quick-questions-scroll">
                <button
                  type="button"
                  className="quick-chip-button"
                  onClick={() => handleQuickQuestion('docs_fase2')}
                >
                  📄 Documentos pedidos
                </button>
                <button
                  type="button"
                  className="quick-chip-button"
                  onClick={() => handleQuickQuestion('carta_compromiso')}
                >
                  📥 Carta de Compromiso
                </button>
                <button
                  type="button"
                  className="quick-chip-button"
                  onClick={() => handleQuickQuestion('certiadulto_cul')}
                >
                  🆔 Tramitar CUL (CertiAdulto)
                </button>
                <button
                  type="button"
                  className="quick-chip-button"
                  onClick={() => handleQuickQuestion('link_formulario')}
                >
                  🔗 Formulario Google Forms
                </button>
                <button
                  type="button"
                  className="quick-chip-button"
                  onClick={() => handleQuickQuestion('estados_explicacion')}
                >
                  🔍 Explicar mi estado
                </button>
                <button
                  type="button"
                  className="quick-chip-button"
                  onClick={() => handleQuickQuestion('soporte_humano')}
                >
                  💬 Soporte por WhatsApp
                </button>
              </div>
            </div>

            <div ref={messagesEndRef} />
          </div>

          {/* Enlace inferior de soporte */}
          <div className="chat-support-footer-link">
            ¿Inconvenientes? <a href={WHATSAPP_SOPORTE_URL} target="_blank" rel="noreferrer">Escríbenos a WhatsApp directo</a>
          </div>

          {/* Barra de Entrada de Texto */}
          <form className="chat-input-bar" onSubmit={handleSend}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu consulta aquí..."
              className="chat-text-input"
              disabled={isLoading}
            />
            <button
              type="submit"
              className="chat-send-submit"
              disabled={isLoading || !input.trim()}
              title="Enviar mensaje"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
