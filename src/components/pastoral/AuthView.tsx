import {ArrowLeft, Lock, ShieldCheck, UserPlus} from 'lucide-react';
import {useEffect, useState, type FormEvent} from 'react';
import {api, setAuthToken} from '../../lib/api';
import type {AuthUser} from '../../types';

interface AuthViewProps {
  onAuthenticated: (user: AuthUser) => void;
  onBackToPublic: () => void;
}

export function AuthView({onAuthenticated, onBackToPublic}: AuthViewProps) {
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api
      .getAuthStatus()
      .then((res) => {
        if (!active) return;
        setNeedsSetup(res.needsSetup);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'No se pudo verificar el estado del sistema.');
      })
      .finally(() => {
        if (active) setLoadingStatus(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = needsSetup
        ? await api.bootstrapAdmin({name, email, password})
        : await api.login({email, password});
      setAuthToken(result.token);
      onAuthenticated(result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="h-1 w-full flex">
        <div className="flex-1 bg-[#8D4999]" />
        <div className="flex-1 bg-[#E6332A]" />
        <div className="flex-1 bg-[#109A51]" />
      </div>

      <div className="px-6 py-5 flex items-center justify-between max-w-6xl w-full mx-auto">
        <button
          type="button"
          onClick={onBackToPublic}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al Portal Público
        </button>
        <div className="flex items-center gap-3">
          <img
            src="/assets/aistudio/PJ_8x_b40a6c17.png"
            alt="Pastoral Juvenil Diócesis de Chiclayo"
            className="h-8 w-auto object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      <main className="flex-1 flex items-center justify-center px-4 pb-16 pt-4">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
            <img
              src="/assets/aistudio/CDJ_8x_082c8e32.png"
              alt="Comisión Diocesana de Juventud"
              className="h-14 w-14 object-contain shrink-0"
              referrerPolicy="no-referrer"
            />
            <div>
              <p className="text-xs font-medium text-[#0A6EB4]">
                Diócesis de Chiclayo · ERP & CRM Pastoral
              </p>
              <h1 className="text-xl font-bold text-slate-900 mt-0.5">
                {needsSetup ? 'Configuración Inicial' : 'Acceso al Sistema Diocesano'}
              </h1>
            </div>
          </div>

          {loadingStatus ? (
            <div className="py-12 space-y-3">
              <div className="h-10 w-full rounded-lg bg-slate-100 animate-pulse" />
              <div className="h-10 w-full rounded-lg bg-slate-100 animate-pulse" />
              <div className="h-10 w-full rounded-lg bg-slate-100 animate-pulse" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {needsSetup ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-600 leading-relaxed">
                  <p className="font-semibold text-slate-800 flex items-center gap-1.5 mb-1">
                    <ShieldCheck className="h-4 w-4 text-[#109A51]" />
                    Primer acceso administrativo
                  </p>
                  Crea la cuenta principal del <strong>Administrador Diocesano</strong> para gestionar las pastorales, el CRM de prospectos y los usuarios de cada decanato.
                </div>
              ) : (
                <p className="text-sm text-slate-600">
                  Ingresa con tu cuenta de coordinador diocesano, secretario o tesorero pastoral.
                </p>
              )}

              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700"
                >
                  {error}
                </div>
              )}

              {needsSetup && (
                <div>
                  <label htmlFor="auth-name" className="block text-xs font-medium text-slate-700 mb-1.5">
                    Nombre completo del administrador
                  </label>
                  <input
                    id="auth-name"
                    type="text"
                    required
                    minLength={3}
                    placeholder="Ej. Fátima Gonzales / Pbro. Luis Vásquez"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0A6EB4] focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label htmlFor="auth-email" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Correo institucional o personal
                </label>
                <input
                  id="auth-email"
                  type="email"
                  required
                  placeholder="coordinacion@pjchiclayo.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0A6EB4] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="auth-password" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Contraseña {needsSetup && '(mínimo 8 caracteres)'}
                </label>
                <input
                  id="auth-password"
                  type="password"
                  required
                  minLength={needsSetup ? 8 : 1}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0A6EB4] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#0A6EB4] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#085A94] disabled:opacity-60 transition-colors cursor-pointer"
              >
                {needsSetup ? <UserPlus className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                {submitting
                  ? 'Verificando...'
                  : needsSetup
                    ? 'Crear Administrador y Entrar'
                    : 'Ingresar al ERP Diocesano'}
              </button>
            </form>
          )}

          {/* Enlaces al Sistema Histórico de Voluntariado Visita León */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col gap-2.5 text-center">
            <a
              href="/loginleon"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3.5 py-2 text-xs font-semibold text-red-800 hover:bg-red-100 transition-colors"
            >
              <span>🏛️</span> Acceso Sistema Voluntarios León (Papa Francisco)
            </a>
            <a
              href="/visitaleon"
              className="text-xs text-slate-500 hover:text-slate-800 transition-colors"
            >
              ¿Deseas validar tu postulación por DNI? Consulta aquí
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
