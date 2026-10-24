import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LogIn, UserPlus, Clock, CheckCircle2, AlertCircle, Phone, Mail, Lock, User, 
  ShieldCheck, CreditCard, Search, Check, X, ArrowLeft, KeyRound, Eye, EyeOff, RefreshCw 
} from 'lucide-react';

export default function Login() {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'
  
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

  // Forgot Password State (Estilo Jufra Pomalca - OTP 6 dígitos)
  const [forgotStep, setForgotStep] = useState(1); // 1: Solicitar, 2: Código OTP, 3: Nueva contraseña, 4: Éxito
  const [forgotUserOrEmail, setForgotUserOrEmail] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotMaskedEmail, setForgotMaskedEmail] = useState('');
  const [forgotSuccessMsg, setForgotSuccessMsg] = useState('');
  const [showForgotPass, setShowForgotPass] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // General States
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  // Temporizador para reenvío de código OTP
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Mostrar mensaje si se cerró sesión automáticamente (ej. expiración de 8 horas)
  useEffect(() => {
    const reason = sessionStorage.getItem('logout_reason');
    if (reason) {
      setError(reason);
      sessionStorage.removeItem('logout_reason');
    }
  }, []);

  // Validación de seguridad de contraseña en tiempo real
  const hasMinLength = regPassword.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(regPassword);
  const hasNumber = /\d/.test(regPassword);
  const passwordsMatch = regPassword.length > 0 && regPassword === regConfirmPassword;
  const isPasswordValid = hasMinLength && hasLetter && hasNumber;

  // Validación de contraseña para recuperación
  const forgotHasMinLength = forgotNewPassword.length >= 8;
  const forgotHasLetter = /[a-zA-Z]/.test(forgotNewPassword);
  const forgotHasNumber = /\d/.test(forgotNewPassword);
  const forgotPasswordsMatch = forgotNewPassword.length > 0 && forgotNewPassword === forgotConfirmPassword;
  const isForgotPassValid = forgotHasMinLength && forgotHasLetter && forgotHasNumber && forgotPasswordsMatch;

  // Verificación dinámica de DNI con el Padrón de Voluntarios
  const handleDniChange = async (val) => {
    const clean = val.replace(/\D/g, '').slice(0, 8);
    setRegDni(clean);
    setDniFeedback(null);

    if (clean.length === 8) {
      setVerifyingDni(true);
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'https://voluntarios-backend.vercel.app';
        const res = await fetch(`${apiUrl}/api/auth/verificar-dni/${clean}`);
        if (res.ok) {
          const data = await res.json();
          if (data.hasAccount) {
            setDniFeedback({
              type: 'warning',
              text: data.msg || 'Este DNI ya tiene una cuenta o solicitud en curso.'
            });
          } else if (data.esMando && data.mandoInfo) {
            setRegNombre(data.mandoInfo.nombre);
            if (data.voluntario?.correo) {
              setRegEmail(data.voluntario.correo);
            }
            if (data.voluntario?.telefono) {
              setRegTelefono(data.voluntario.telefono);
            }
            setDniFeedback({
              type: 'mando',
              cargo: data.mandoInfo.cargo,
              text: `✓ Reconocido en la Cadena de Mandos Oficial: ${data.mandoInfo.etiqueta}`
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

    if (!isPasswordValid) {
      setError('La contraseña debe tener al menos 8 caracteres y combinar letras y números.');
      return;
    }

    if (!passwordsMatch) {
      setError('Las contraseñas no coinciden. Por favor verifícalas.');
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

  // Manejador 1: Solicitar código de recuperación (Paso 1)
  const handleForgotRequestCode = async (e) => {
    if (e) e.preventDefault();
    setError(null);

    const cleanInput = forgotUserOrEmail.trim();
    if (!cleanInput) {
      setError('Por favor ingresa tu DNI o Correo electrónico registrado.');
      return;
    }

    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://voluntarios-backend.vercel.app';
      const res = await fetch(`${apiUrl}/api/auth/recuperar-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrEmail: cleanInput })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.msg || 'No se pudo enviar el código. Verifica los datos ingresados.');
        return;
      }

      setForgotMaskedEmail(data.maskedEmail || cleanInput);
      setForgotStep(2);
      setCountdown(60);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  // Manejador 2: Verificar código de 6 dígitos (Paso 2)
  const handleForgotVerifyCode = async (e) => {
    e.preventDefault();
    setError(null);

    const cleanCode = forgotCode.trim();
    if (cleanCode.length !== 6) {
      setError('Por favor ingresa el código completo de 6 dígitos.');
      return;
    }

    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://voluntarios-backend.vercel.app';
      const res = await fetch(`${apiUrl}/api/auth/verificar-codigo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usernameOrEmail: forgotUserOrEmail.trim(),
          codigo: cleanCode
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.msg || 'Código inválido o expirado.');
        return;
      }

      setForgotStep(3);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Error al verificar el código.');
    } finally {
      setLoading(false);
    }
  };

  // Manejador 3: Restablecer contraseña con código (Paso 3)
  const handleForgotResetPassword = async (e) => {
    e.preventDefault();
    setError(null);

    if (!isForgotPassValid) {
      setError('Verifica que la contraseña cumpla los requisitos de seguridad y que ambas coincidan.');
      return;
    }

    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://voluntarios-backend.vercel.app';
      const res = await fetch(`${apiUrl}/api/auth/reset-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usernameOrEmail: forgotUserOrEmail.trim(),
          codigo: forgotCode.trim(),
          newPassword: forgotNewPassword
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.msg || 'Error al restablecer la contraseña.');
        return;
      }

      setForgotSuccessMsg(data.msg || '¡Contraseña restablecida exitosamente!');
      setForgotStep(4);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Error inesperado al restablecer la contraseña.');
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
        {!regSuccess && mode !== 'forgot' && (
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
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-stone-700">
                  Contraseña
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setForgotStep(1);
                    setError(null);
                    setForgotUserOrEmail(email);
                  }}
                  className="text-[11px] font-semibold text-diocesis-red hover:text-diocesis-redDark hover:underline cursor-pointer"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
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
        ) : mode === 'forgot' ? (
          /* ================================================================= */
          /* MÓDULO DE RECUPERACIÓN / CAMBIO DE CONTRASEÑA (ESTILO JUFRA POMALCA) */
          /* ================================================================= */
          <div className="space-y-4">
            
            {/* Botón superior Volver */}
            {forgotStep !== 4 && (
              <button
                type="button"
                onClick={() => {
                  if (forgotStep === 1) {
                    setMode('login');
                    setError(null);
                  } else {
                    setForgotStep(forgotStep - 1);
                    setError(null);
                  }
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-stone-900 transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                {forgotStep === 1 ? 'Volver a Iniciar Sesión' : 'Atrás'}
              </button>
            )}

            {/* PASO 1: SOLICITAR CÓDIGO */}
            {forgotStep === 1 && (
              <form onSubmit={handleForgotRequestCode} className="space-y-4">
                <div className="text-center pb-2">
                  <div className="w-12 h-12 bg-amber-100 text-amber-800 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-amber-200 shadow-xs">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-extrabold text-stone-900">
                    Recuperar Contraseña
                  </h3>
                  <p className="text-xs text-stone-500 mt-1 leading-relaxed px-2">
                    Ingresa tu <strong>DNI o Correo electrónico</strong> registrado para enviarte un código de seguridad de 6 dígitos.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    DNI o Correo Electrónico
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={forgotUserOrEmail}
                      onChange={(e) => setForgotUserOrEmail(e.target.value)}
                      placeholder="Ej. 72849102 o correo@ejemplo.com"
                      className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-diocesis-red hover:bg-diocesis-redDark text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      Enviar Código de Seguridad
                    </>
                  )}
                </button>
              </form>
            )}

            {/* PASO 2: VERIFICAR CÓDIGO OTP (6 DÍGITOS) */}
            {forgotStep === 2 && (
              <form onSubmit={handleForgotVerifyCode} className="space-y-4">
                <div className="text-center pb-2">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-emerald-200 shadow-xs">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-extrabold text-stone-900">
                    Ingresa el Código de 6 Dígitos
                  </h3>
                  <p className="text-xs text-stone-600 mt-1 leading-relaxed px-2">
                    Enviamos un código de seguridad a <strong className="text-stone-900">{forgotMaskedEmail}</strong>. Revisa tu bandeja de entrada o spam.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1 text-center">
                    Código de Seguridad
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={forgotCode}
                    onChange={(e) => setForgotCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    className="w-full text-center py-2.5 text-xl tracking-[0.4em] font-mono font-black bg-stone-50 border-2 border-stone-300 focus:border-amber-500 rounded-xl focus:outline-none focus:bg-white transition"
                  />
                  <p className="text-[11px] text-stone-400 text-center mt-1">
                    Validez por 15 minutos
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || forgotCode.length !== 6}
                  className="w-full py-2.5 bg-diocesis-red hover:bg-diocesis-redDark text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Verificar Código
                    </>
                  )}
                </button>

                {/* Opción de reenvío con temporizador */}
                <div className="text-center pt-1">
                  {countdown > 0 ? (
                    <span className="text-xs text-stone-400 flex items-center justify-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5" /> Reenviar código en {countdown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleForgotRequestCode}
                      className="text-xs text-diocesis-red hover:underline font-bold transition cursor-pointer"
                    >
                      ¿No te llegó el correo? Reenviar código
                    </button>
                  )}
                </div>
              </form>
            )}

            {/* PASO 3: NUEVA CONTRASEÑA */}
            {forgotStep === 3 && (
              <form onSubmit={handleForgotResetPassword} className="space-y-4">
                <div className="text-center pb-2">
                  <div className="w-12 h-12 bg-amber-100 text-amber-800 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-amber-200 shadow-xs">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-extrabold text-stone-900">
                    Crea tu Nueva Contraseña
                  </h3>
                  <p className="text-xs text-stone-500 mt-1 leading-relaxed px-2">
                    Ingresa una nueva contraseña segura para acceder a tu cuenta.
                  </p>
                </div>

                {/* Nueva Contraseña */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Nueva Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type={showForgotPass ? 'text' : 'password'}
                      required
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      className="w-full pl-9 pr-10 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotPass(!showForgotPass)}
                      className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600"
                    >
                      {showForgotPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirmar Nueva Contraseña */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Confirmar Nueva Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type={showForgotPass ? 'text' : 'password'}
                      required
                      value={forgotConfirmPassword}
                      onChange={(e) => setForgotConfirmPassword(e.target.value)}
                      placeholder="Repite la contraseña"
                      className="w-full pl-9 pr-10 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
                    />
                  </div>
                </div>

                {/* Checklist de requisitos de seguridad */}
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-2xl text-[11px] space-y-1.5">
                  <div className={`flex items-center gap-1.5 font-medium ${forgotHasMinLength ? 'text-emerald-700 font-bold' : 'text-stone-500'}`}>
                    {forgotHasMinLength ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-stone-400" />}
                    <span>Mínimo 8 caracteres</span>
                  </div>
                  <div className={`flex items-center gap-1.5 font-medium ${forgotHasLetter && forgotHasNumber ? 'text-emerald-700 font-bold' : 'text-stone-500'}`}>
                    {forgotHasLetter && forgotHasNumber ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-stone-400" />}
                    <span>Contiene letras y números</span>
                  </div>
                  <div className={`flex items-center gap-1.5 font-medium ${forgotPasswordsMatch ? 'text-emerald-700 font-bold' : 'text-stone-500'}`}>
                    {forgotPasswordsMatch ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-stone-400" />}
                    <span>Las contraseñas coinciden</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !isForgotPassValid}
                  className="w-full py-2.5 bg-diocesis-red hover:bg-diocesis-redDark text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      Restablecer Contraseña
                    </>
                  )}
                </button>
              </form>
            )}

            {/* PASO 4: ÉXITO */}
            {forgotStep === 4 && (
              <div className="text-center py-4 space-y-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto border-4 border-emerald-200 shadow-inner">
                  <CheckCircle2 className="w-9 h-9" />
                </div>

                <div>
                  <h3 className="text-base font-extrabold text-stone-900">
                    ¡Contraseña Restablecida!
                  </h3>
                  <p className="text-xs text-stone-600 mt-2 leading-relaxed px-2">
                    {forgotSuccessMsg || 'Tu contraseña ha sido actualizada con éxito.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEmail(forgotUserOrEmail);
                    setPassword('');
                    setMode('login');
                    setForgotStep(1);
                    setError(null);
                  }}
                  className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition shadow cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <LogIn className="w-4 h-4" />
                  Iniciar Sesión Ahora
                </button>
              </div>
            )}
          </div>
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
                  dniFeedback.type === 'mando'
                    ? 'bg-amber-100 text-amber-950 border-amber-400 font-bold shadow-xs'
                    : dniFeedback.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300' 
                    : dniFeedback.type === 'warning'
                    ? 'bg-amber-50 text-amber-900 border-amber-300'
                    : 'bg-stone-50 text-stone-700 border-stone-200'
                }`}>
                  {dniFeedback.type === 'mando' && <ShieldCheck className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />}
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
                    placeholder="Mínimo 8 carac."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Confirmar Contraseña
                </label>
                <div className="relative">
                  <ShieldCheck className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                  <input 
                    type="password" 
                    required 
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Repite tu clave"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
                  />
                </div>
              </div>
            </div>

            {/* Checklist visual de requisitos de seguridad de contraseña */}
            {regPassword.length > 0 && (
              <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-[11px] space-y-1">
                <p className="font-bold text-stone-600 mb-1">Requisitos de seguridad:</p>
                <div className="grid grid-cols-2 gap-1.5 font-medium">
                  <span className={`flex items-center gap-1 ${hasMinLength ? 'text-emerald-700 font-bold' : 'text-stone-400'}`}>
                    {hasMinLength ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-stone-300" />}
                    Mín. 8 caracteres
                  </span>
                  <span className={`flex items-center gap-1 ${hasLetter ? 'text-emerald-700 font-bold' : 'text-stone-400'}`}>
                    {hasLetter ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-stone-300" />}
                    Incluye letras
                  </span>
                  <span className={`flex items-center gap-1 ${hasNumber ? 'text-emerald-700 font-bold' : 'text-stone-400'}`}>
                    {hasNumber ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-stone-300" />}
                    Incluye números
                  </span>
                  <span className={`flex items-center gap-1 ${passwordsMatch ? 'text-emerald-700 font-bold' : 'text-stone-400'}`}>
                    {passwordsMatch ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-stone-300" />}
                    Coinciden
                  </span>
                </div>
              </div>
            )}

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
