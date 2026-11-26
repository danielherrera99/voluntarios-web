import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  User,
  UserPlus,
} from 'lucide-react';
import {useState, type FormEvent} from 'react';
import {api, getAssetUrl} from '../../lib/api';
import type {AuthUser} from '../../types';
import {COMUNIDADES_SELECT_OPTIONS} from '../../data/diocesisCatalogo';

interface AuthViewProps {
  onAuthenticated: (user: AuthUser) => void;
  onBackToPublic: () => void;
}

type AuthTab = 'login' | 'register' | 'forgot';

export function AuthView({onAuthenticated, onBackToPublic}: AuthViewProps) {
  const [tab, setTab] = useState<AuthTab>('login');

  // Estados Formulario Login
  const [loginInput, setLoginInput] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Estados Formulario Registro (Nueva tabla usuarios_pj)
  const [regNombreCompleto, setRegNombreCompleto] = useState('');
  const [regUsuario, setRegUsuario] = useState('');
  const [regCorreo, setRegCorreo] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regPastoralId, setRegPastoralId] = useState('general');
  const [regParroquia, setRegParroquia] = useState('');
  const [regTelefono, setRegTelefono] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Estados Formulario Recuperación Contraseña
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);
  const [forgotLogin, setForgotLogin] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotGeneratedCode, setForgotGeneratedCode] = useState<string | null>(null);

  // Estados de control y feedback
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  function resetFeedback() {
    setError(null);
    setSuccessMsg(null);
  }

  function handleTabChange(nextTab: AuthTab) {
    resetFeedback();
    setTab(nextTab);
  }

  // Submit Login
  async function handleLoginSubmit(e: FormEvent) {
    e.preventDefault();
    resetFeedback();
    setSubmitting(true);
    try {
      const res = await api.loginPJ({
        login: loginInput.trim(),
        password: loginPassword,
      });
      onAuthenticated(res.user);
    } catch (err: any) {
      setError(err?.message || 'Usuario o contraseña incorrectos.');
    } finally {
      setSubmitting(false);
    }
  }

  // Submit Registro (usuarios_pj)
  async function handleRegisterSubmit(e: FormEvent) {
    e.preventDefault();
    resetFeedback();

    if (regPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError('Las contraseñas ingresadas no coinciden.');
      return;
    }

    const selectedOption = COMUNIDADES_SELECT_OPTIONS.find((p) => p.id === regPastoralId);
    const pastoralNombre = selectedOption ? selectedOption.nombre : 'Coordinación General';
    const parroquia = selectedOption?.parroquiaNombre || 'Sin parroquia territorial';
    const zona = selectedOption?.zona || 'Centro-Este';

    setSubmitting(true);
    try {
      const res = await api.registerPJ({
        usuario: regUsuario.trim(),
        nombreCompleto: regNombreCompleto.trim(),
        correo: regCorreo.trim(),
        password: regPassword,
        pastoralId: regPastoralId,
        pastoralNombre,
        parroquia,
        zona,
        telefono: regTelefono.trim(),
        rol: 'miembro',
      });
      if (res.user?.estado === 'pendiente' || res.message?.includes('aprobación') || res.message?.includes('pendiente')) {
        setSuccessMsg(
          '¡Solicitud registrada con bendición! Tu cuenta está a la espera de aprobación por tu Coordinador o el Administrador Diocesano.'
        );
        setTimeout(() => setTab('login'), 3500);
      } else {
        onAuthenticated(res.user);
      }
    } catch (err: any) {
      setError(err?.message || 'Error al registrar tu cuenta. Verifica los datos.');
    } finally {
      setSubmitting(false);
    }
  }

  // Paso 1: Solicitar Código Recuperación
  async function handleForgotRequestCode(e: FormEvent) {
    e.preventDefault();
    resetFeedback();
    setSubmitting(true);
    try {
      const res = await api.forgotPasswordPJ({ login: forgotLogin.trim() });
      if (res.code) {
        setForgotGeneratedCode(res.code);
        setForgotCode(res.code);
      }
      setSuccessMsg(res.message || 'Código de recuperación generado con éxito.');
      setForgotStep(2);
    } catch (err: any) {
      setError(err?.message || 'No se encontró la cuenta solicitada.');
    } finally {
      setSubmitting(false);
    }
  }

  // Paso 2: Verificar Código antes de permitir crear contraseña
  async function handleVerifyCodeSubmit(e: FormEvent) {
    e.preventDefault();
    resetFeedback();

    if (!forgotCode.trim() || forgotCode.trim().length < 6) {
      setError('Por favor ingresa el código de 6 dígitos enviado a tu correo.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.verifyResetCodePJ({
        login: forgotLogin.trim(),
        code: forgotCode.trim(),
      });
      setSuccessMsg(res.message || '¡Código verificado con éxito! Ahora ingresa tu nueva contraseña.');
      setForgotStep(3);
    } catch (err: any) {
      setError(err?.message || 'El código de verificación ingresado es incorrecto o ha expirado.');
    } finally {
      setSubmitting(false);
    }
  }

  // Paso 3: Restablecer Contraseña
  async function handleResetPasswordSubmit(e: FormEvent) {
    e.preventDefault();
    resetFeedback();

    if (forgotNewPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.resetPasswordPJ({
        login: forgotLogin.trim(),
        code: forgotCode.trim(),
        newPassword: forgotNewPassword,
      });
      setSuccessMsg(res.message || '¡Contraseña actualizada exitosamente! Redirigiendo...');
      // Tras 2 segundos regresar a login
      setTimeout(() => {
        setTab('login');
        setLoginInput(forgotLogin.trim());
        setForgotStep(1);
        setForgotCode('');
        setForgotNewPassword('');
        setForgotConfirmPassword('');
        resetFeedback();
      }, 2500);
    } catch (err: any) {
      setError(err?.message || 'Código incorrecto o expirado.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-[#0A6EB4] selection:text-white">
      {/* Barra Tricolor Institucional */}
      <div className="h-1.5 w-full flex">
        <div className="flex-1 bg-[#8D4999]" />
        <div className="flex-1 bg-[#E6332A]" />
        <div className="flex-1 bg-[#109A51]" />
        <div className="flex-1 bg-[#0A6EB4]" />
      </div>

      {/* Barra superior de navegación */}
      <div className="px-6 py-4 flex items-center justify-between max-w-6xl w-full mx-auto">
        <button
          type="button"
          onClick={onBackToPublic}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer group"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          <span>Volver al Portal Público</span>
        </button>
        <div className="flex items-center gap-3">
          <img
            src={getAssetUrl('assets/aistudio/PJ_8x_b40a6c17.png')}
            alt="Pastoral Juvenil Diócesis de Chiclayo"
            className="h-9 w-auto object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      {/* Contenedor Principal Centrado */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-7 sm:p-9 shadow-md transition-all">
          {/* Cabecera del Card */}
          <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
            <img
              src={getAssetUrl('assets/aistudio/CDJ_8x_082c8e32.png')}
              alt="Comisión Diocesana de Juventud"
              className="h-14 w-14 object-contain shrink-0 drop-shadow-xs"
              referrerPolicy="no-referrer"
            />
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-[#0A6EB4] border border-blue-100 mb-1">
                <Sparkles className="h-3 w-3" /> Diócesis de Chiclayo
              </span>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                {tab === 'login' && 'Portal de Acceso Diocesano'}
                {tab === 'register' && 'Crear Cuenta Diocesana'}
                {tab === 'forgot' && 'Recuperar Contraseña'}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Comisión Diocesana de Juventud · Lambayeque & Santa Cruz
              </p>
            </div>
          </div>

          {/* Navegación por Tabs */}
          <div className="mt-5 grid grid-cols-3 gap-1 p-1 bg-slate-100/80 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => handleTabChange('login')}
              className={`py-2 rounded-lg transition-all cursor-pointer ${
                tab === 'login'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('register')}
              className={`py-2 rounded-lg transition-all cursor-pointer ${
                tab === 'register'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Crear Cuenta
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('forgot')}
              className={`py-2 rounded-lg transition-all cursor-pointer ${
                tab === 'forgot'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Recuperar
            </button>
          </div>

          {/* Mensajes de Alerta y Éxito */}
          {error && (
            <div
              role="alert"
              className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 flex items-start gap-2 animate-in fade-in"
            >
              <span className="text-sm">⚠️</span>
              <p className="flex-1">{error}</p>
            </div>
          )}

          {successMsg && (
            <div
              role="status"
              className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-medium text-emerald-800 flex items-start gap-2 animate-in fade-in"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p>{successMsg}</p>
                {forgotGeneratedCode && (
                  <div className="mt-2 p-2 bg-white rounded-lg border border-emerald-200 inline-block font-mono font-bold text-sm text-emerald-900">
                    Tu código temporal: <span className="underline tracking-wider">{forgotGeneratedCode}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 1: INICIAR SESIÓN */}
          {/* ========================================================= */}
          {tab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Usuario o Correo Electrónico
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Ej. danielh o juan@pjchiclayo.org"
                    value={loginInput}
                    onChange={(e) => setLoginInput(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0A6EB4] focus:ring-2 focus:ring-[#0A6EB4]/10 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Contraseña
                  </label>
                  <button
                    type="button"
                    onClick={() => handleTabChange('forgot')}
                    className="text-xs font-semibold text-[#0A6EB4] hover:underline cursor-pointer"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0A6EB4] focus:ring-2 focus:ring-[#0A6EB4]/10 focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A6EB4] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#085A94] disabled:opacity-60 transition-all shadow-sm cursor-pointer"
              >
                <Lock className="h-4 w-4" />
                {submitting ? 'Verificando credenciales...' : 'Ingresar al Portal Diocesano'}
              </button>

              <div className="pt-4 text-center border-t border-slate-100">
                <p className="text-xs text-slate-500">
                  ¿Aún no tienes una cuenta registrada?{' '}
                  <button
                    type="button"
                    onClick={() => handleTabChange('register')}
                    className="font-semibold text-[#0A6EB4] hover:underline cursor-pointer"
                  >
                    Crear cuenta diocesana
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* ========================================================= */}
          {/* TAB 2: CREAR CUENTA (usuarios_pj) */}
          {/* ========================================================= */}
          {tab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="mt-5 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre Completo *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <User className="h-3.5 w-3.5" />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Fátima Gonzales"
                      value={regNombreCompleto}
                      onChange={(e) => setRegNombreCompleto(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0A6EB4] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Usuario * (Sin espacios)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-mono text-xs">
                      @
                    </div>
                    <input
                      type="text"
                      required
                      minLength={3}
                      placeholder="fatimag"
                      value={regUsuario}
                      onChange={(e) => setRegUsuario(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                      className="w-full rounded-xl border border-slate-200 pl-8 pr-3 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0A6EB4] focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Correo Electrónico *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="h-3.5 w-3.5" />
                    </div>
                    <input
                      type="email"
                      required
                      placeholder="correo@ejemplo.com"
                      value={regCorreo}
                      onChange={(e) => setRegCorreo(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0A6EB4] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Teléfono / WhatsApp
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Phone className="h-3.5 w-3.5" />
                    </div>
                    <input
                      type="tel"
                      placeholder="978 123 456"
                      value={regTelefono}
                      onChange={(e) => setRegTelefono(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0A6EB4] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Selector Simple y Unificado de Comunidad / Pastoral / Movimiento */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ¿A qué Comunidad, Pastoral o Movimiento perteneces? *
                </label>
                <select
                  value={regPastoralId}
                  onChange={(e) => setRegPastoralId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 bg-white focus:border-[#0A6EB4] focus:outline-none cursor-pointer"
                >
                  <optgroup label="Coordinación Central">
                    {COMUNIDADES_SELECT_OPTIONS.filter((c) => c.categoria === 'Comisión Diocesana').map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Movimientos Eclesiales Diocesanos">
                    {COMUNIDADES_SELECT_OPTIONS.filter((c) => c.categoria === 'Movimiento').map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Pastorales Universitarias">
                    {COMUNIDADES_SELECT_OPTIONS.filter((c) => c.categoria === 'Pastoral Universitaria').map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Pastorales Parroquiales Territoriales">
                    {COMUNIDADES_SELECT_OPTIONS.filter((c) => c.categoria === 'Pastoral Parroquial').map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} ({p.zona})
                      </option>
                    ))}
                  </optgroup>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Tu zona y jurisdicción se asignarán automáticamente según la comunidad elegida.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contraseña * (mínimo 6)
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      placeholder="••••••••"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0A6EB4] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirmar Contraseña *
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      placeholder="••••••••"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0A6EB4] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showRegPassword}
                    onChange={(e) => setShowRegPassword(e.target.checked)}
                    className="rounded text-[#0A6EB4] focus:ring-0"
                  />
                  <span>Mostrar contraseñas</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-[#8D4999] hover:bg-[#783984] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 transition-all shadow-sm cursor-pointer"
              >
                <UserPlus className="h-4 w-4" />
                {submitting ? 'Creando cuenta en usuarios_pj...' : 'Crear Mi Cuenta Diocesana'}
              </button>

              <div className="pt-3 text-center border-t border-slate-100">
                <p className="text-xs text-slate-500">
                  ¿Ya tienes tu cuenta creada?{' '}
                  <button
                    type="button"
                    onClick={() => handleTabChange('login')}
                    className="font-semibold text-[#0A6EB4] hover:underline cursor-pointer"
                  >
                    Iniciar Sesión
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* ========================================================= */}
          {/* TAB 3: RECUPERAR CONTRASEÑA */}
          {/* ========================================================= */}
          {tab === 'forgot' && (
            <div className="mt-5 space-y-4">
              {forgotStep === 1 ? (
                <form onSubmit={handleForgotRequestCode} className="space-y-4">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Ingresa el correo electrónico o nombre de usuario registrado en la base de datos diocesana. Te enviaremos un código de verificación para restablecer tu contraseña.
                  </p>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Correo o Usuario
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Mail className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="tu_correo@ejemplo.com o tu_usuario"
                        value={forgotLogin}
                        onChange={(e) => setForgotLogin(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0A6EB4] focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A6EB4] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#085A94] disabled:opacity-60 transition-all cursor-pointer shadow-sm"
                  >
                    <KeyRound className="h-4 w-4" />
                    {submitting ? 'Verificando cuenta...' : 'Generar Código de Recuperación'}
                  </button>
                </form>
              ) : forgotStep === 2 ? (
                <form onSubmit={handleVerifyCodeSubmit} className="space-y-4">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Hemos enviado un código de 6 dígitos a tu correo registrado. Ingrésalo a continuación para verificar tu identidad:
                  </p>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Código de Verificación (6 dígitos)
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="123456"
                      value={forgotCode}
                      onChange={(e) => setForgotCode(e.target.value.trim())}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-center font-mono text-xl font-bold text-slate-900 tracking-widest focus:border-[#0A6EB4] focus:outline-none bg-slate-50/50"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A6EB4] hover:bg-[#085A94] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 transition-all cursor-pointer shadow-sm"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    {submitting ? 'Verificando código...' : 'Verificar Código'}
                  </button>

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setForgotStep(1);
                        resetFeedback();
                      }}
                      className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                    >
                      Solicitar otro código
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5">
                  <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-[#0A6EB4] font-medium flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Código verificado correctamente. Ingresa tu nueva contraseña:</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nueva Contraseña * (mínimo 6)
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      placeholder="••••••••"
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0A6EB4] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Confirmar Nueva Contraseña *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      placeholder="••••••••"
                      value={forgotConfirmPassword}
                      onChange={(e) => setForgotConfirmPassword(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0A6EB4] focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 transition-all cursor-pointer shadow-sm"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    {submitting ? 'Guardando contraseña...' : 'Guardar Nueva Contraseña'}
                  </button>

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setForgotStep(2);
                        resetFeedback();
                      }}
                      className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                    >
                      ← Cambiar código
                    </button>
                  </div>
                </form>
              )}

              <div className="pt-3 text-center border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleTabChange('login')}
                  className="text-xs font-semibold text-[#0A6EB4] hover:underline cursor-pointer flex items-center justify-center gap-1 mx-auto"
                >
                  <ArrowLeft className="h-3 w-3" /> Volver a Iniciar Sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
