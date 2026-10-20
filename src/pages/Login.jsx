import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, UserPlus, Clock, CheckCircle2, AlertCircle, Phone, Mail, Lock, User, ShieldCheck, CreditCard, Search } from 'lucide-react';

export default function Login() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Register State
  const [regDni, setRegDni] = useState('');
  const [regNombre, setRegNombre] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regTelefono, setRegTelefono] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regSuccess, setRegSuccess] = useState(false);
  const [regSuccessMsg, setRegSuccessMsg] = useState('');
  const [verifyingDni, setVerifyingDni] = useState(false);
  const [dniFeedback, setDniFeedback] = useState(null);

  // General States
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  // Verificación dinámica de DNI con el Padrón de Voluntarios
  const handleDniChange = async (val) => {
    const clean = val.replace(/\D/g, '').slice(0, 8);
    setRegDni(clean);
    setDniFeedback(null);

    if (clean.length === 8) {
      setVerifyingDni(true);
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'https://voluntarios-backend.onrender.com';
        const res = await fetch(`${apiUrl}/api/auth/verificar-dni/${clean}`);
        if (res.ok) {
          const data = await res.json();
          if (data.hasAccount) {
            setDniFeedback({
              type: 'warning',
              text: data.msg || 'Este DNI ya tiene una cuenta o solicitud en curso.'
            });
          } else if (data.existsInPadrón && data.voluntario?.nombres) {
            const cleanName = data.voluntario.nombres.replace(/^\d{1,2}\/\d{1,2}\/\d{2,4}\s*[-–—:]*\s*/, '').trim();
            setRegNombre(cleanName);
            if (data.voluntario.correo) {
              setRegEmail(data.voluntario.correo);
            }
            if (data.voluntario.telefono) {
              setRegTelefono(data.voluntario.telefono);
            }
            const infoExtra = [data.voluntario.distrito, data.voluntario.fase].filter(Boolean).join(' • ');
            setDniFeedback({
              type: 'success',
              text: `✓ Encontrado en el Padrón: ${cleanName}${infoExtra ? ` (${infoExtra})` : ''}`
            });
          } else {
            setDniFeedback({
              type: 'info',
              text: 'DNI no encontrado en el Padrón previo. Completa tus nombres manualmente.'
            });
          }
        } else {
          setDniFeedback({
            type: 'info',
            text: 'DNI no encontrado en el Padrón previo. Completa tus datos manualmente.'
          });
        }
      } catch (e) {
        console.error(e);
        setDniFeedback({
          type: 'info',
          text: 'Completa tus datos para enviar tu solicitud.'
        });
      } finally {
        setVerifyingDni(false);
      }
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await login(email, password);
      if (res?.error) {
        setError(res.error);
        return;
      }
      navigate('/dashboard');
    } catch (err) {
      setError('Error inesperado al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);

    const cleanDni = regDni.replace(/\D/g, '').trim();
    if (cleanDni.length !== 8) {
      setError('Por favor ingresa un número de DNI válido de 8 dígitos.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError('Las contraseñas no coinciden. Por favor verifícalas.');
      return;
    }

    if (regPassword.length < 6) {
      setError('La contraseña debe tener un mínimo de 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const res = await register({
        dni: cleanDni,
        nombre: regNombre,
        email: regEmail,
        password: regPassword,
        telefono: regTelefono
      });

      if (res?.error) {
        setError(res.error);
      } else {
        setRegSuccess(true);
        setRegSuccessMsg(res.msg || 'Solicitud enviada con éxito.');
        // Limpiar formulario
        setRegDni('');
        setRegNombre('');
        setRegEmail('');
        setRegTelefono('');
        setRegPassword('');
        setRegConfirmPassword('');
        setDniFeedback(null);
      }
    } catch (err) {
      setError('Error al enviar la solicitud de registro.');
    } finally {
      setLoading(false);
    }
  };

  const isPendingError = error && (error.includes('pendiente') || error.includes('aprobación'));

  return (
    <div className="auth-layout min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950 font-sans">
      <div className="auth-card w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-stone-200">
        
        {/* ENCABEZADO Y LOGO */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-amber-50 rounded-2xl border border-amber-200 mb-3 shadow-inner">
            <img 
              src="/logos/logo_comision_juventud.png" 
              alt="Comisión Diocesana de Juventud" 
              className="w-14 h-14 object-contain drop-shadow"
            />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            Portal de Voluntariado
          </h2>
          <p className="text-xs text-stone-500 font-medium mt-0.5">
            Diócesis de Chiclayo • Visita del Santo Padre
          </p>
        </div>

        {/* PESTAÑAS (LOGIN vs REGISTRO) */}
        {!regSuccess && (
          <div className="grid grid-cols-2 p-1 bg-stone-100 rounded-2xl mb-6 border border-stone-200">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); }}
              className={`py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(null); }}
              className={`py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'register'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Solicitar Acceso
            </button>
          </div>
        )}

        {/* MENSAJES DE ERROR / ADVERTENCIA */}
        {error && (
          <div 
            className={`p-3.5 rounded-2xl mb-5 text-xs font-medium flex items-start gap-2.5 border ${
              isPendingError 
                ? 'bg-amber-50 text-amber-900 border-amber-300 shadow-sm' 
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {isPendingError ? (
              <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="leading-relaxed">
              {error}
            </div>
          </div>
        )}

        {/* CASO: SOLICITUD ENVIADA CON ÉXITO (ESTILO JUFRA POMALCA) */}
        {regSuccess ? (
          <div className="text-center py-4 space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto border-4 border-emerald-200 shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <h3 className="text-base font-extrabold text-stone-900">
                ¡Solicitud de Acceso Enviada!
              </h3>
              <p className="text-xs text-stone-600 mt-2 leading-relaxed px-2">
                {regSuccessMsg}
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-[11px] text-amber-900 text-left flex items-start gap-2">
              <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Modo de aprobación activa:</strong> Tu cuenta ha quedado vinculada a tu DNI. El Administrador revisará tus datos y activará tus permisos para que puedas iniciar sesión.
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setRegSuccess(false);
                setMode('login');
                setError(null);
              }}
              className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition shadow cursor-pointer"
            >
              Entendido, volver a Iniciar Sesión
            </button>
          </div>
        ) : mode === 'login' ? (
          /* FORMULARIO DE INICIO DE SESIÓN */
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Correo Electrónico o DNI
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                <input 
                  type="text" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@amigosdelpapa.pe o DNI"
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                <input 
                  type="password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full py-2.5 bg-diocesis-red hover:bg-diocesis-redDark text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 mt-2 disabled:opacity-50 cursor-pointer"
              disabled={loading}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Iniciar Sesión
                </>
              )}
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => { setMode('register'); setError(null); }}
                className="text-xs text-stone-600 hover:text-amber-600 font-semibold transition cursor-pointer"
              >
                ¿Eres miembro del equipo y no tienes cuenta? <span className="underline font-bold text-stone-900">Solicitar acceso</span>
              </button>
            </div>
          </form>
        ) : (
          /* FORMULARIO DE SOLICITUD DE ACCESO VINCULADA A DNI */
          <form onSubmit={handleRegister} className="space-y-3.5">
            
            {/* Campo DNI */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-stone-700">
                  DNI (Documento de Identidad)
                </label>
                {verifyingDni && (
                  <span className="text-[10px] text-amber-700 font-bold animate-pulse flex items-center gap-1">
                    <Search className="w-3 h-3" /> Verificando padrón...
                  </span>
                )}
              </div>
              <div className="relative">
                <CreditCard className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                <input 
                  type="text" 
                  required 
                  maxLength={8}
                  value={regDni}
                  onChange={(e) => handleDniChange(e.target.value)}
                  placeholder="8 dígitos numéricos"
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white font-mono font-bold transition"
                />
              </div>

              {/* Feedback dinámico de DNI */}
              {dniFeedback && (
                <div className={`mt-1.5 p-2 rounded-xl text-[11px] font-semibold leading-tight flex items-start gap-1.5 border ${
                  dniFeedback.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300' 
                    : dniFeedback.type === 'warning'
                    ? 'bg-amber-50 text-amber-900 border-amber-300'
                    : 'bg-stone-50 text-stone-700 border-stone-200'
                }`}>
                  {dniFeedback.type === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />}
                  {dniFeedback.type === 'warning' && <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />}
                  <span>{dniFeedback.text}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Nombres y Apellidos
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                <input 
                  type="text" 
                  required 
                  value={regNombre}
                  onChange={(e) => setRegNombre(e.target.value)}
                  placeholder="Ej. Daniel Herrera"
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                <input 
                  type="email" 
                  required 
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="tu.correo@ejemplo.com"
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Teléfono / WhatsApp
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                <input 
                  type="tel" 
                  value={regTelefono}
                  onChange={(e) => setRegTelefono(e.target.value)}
                  placeholder="Ej. 987654321"
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                  <input 
                    type="password" 
                    required 
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Mínimo 6"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Confirmar
                </label>
                <div className="relative">
                  <ShieldCheck className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                  <input 
                    type="password" 
                    required 
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Repite clave"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
                  />
                </div>
              </div>
            </div>

            <div className="text-[11px] text-stone-500 leading-tight pt-1">
              🔒 Tu cuenta quedará amarrada a tu DNI y requerirá autorización del Administrador antes de activarse.
            </div>

            <button 
              type="submit" 
              className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              disabled={loading}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Enviar Solicitud de Acceso
                </>
              )}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
