import {ArrowRight, Calendar, CheckCircle2, MapPin, Send, Users} from 'lucide-react';
import {useEffect, useState, type FormEvent} from 'react';
import {api, getAssetUrl} from '../../lib/api';
import type {PastoralStatus, PublicOverviewResponse} from '../../types';

interface PublicPortalProps {
  onOpenLogin: () => void;
  isAuthenticated: boolean;
}

const ZONAS_CHICLAYO = [
  'Zona Chiclayo Centro',
  'Zona Chiclayo Norte',
  'Zona Chiclayo Sur',
  'Zona La Victoria',
  'Zona José Leonardo Ortiz',
  'Zona Lambayeque',
  'Zona Ferreñafe',
  'Zona Costa / Circuito Mochica',
  'Zona Sierra / Santa Cruz',
  'Zona Olmos / Motupe',
];

export function PublicPortal({onOpenLogin, isAuthenticated}: PublicPortalProps) {
  const [data, setData] = useState<PublicOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [pastoralFilter, setPastoralFilter] = useState<'Todas' | PastoralStatus>('Todas');

  // Public CRM Prospect Form state
  const [fullName, setFullName] = useState('');
  const [parish, setParish] = useState('');
  const [zona, setZona] = useState(ZONAS_CHICLAYO[0]);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [pastoralId, setPastoralId] = useState('pas-juvenil');
  const [notes, setNotes] = useState('');
  const [submittingLead, setSubmittingLead] = useState(false);
  const [leadSuccess, setLeadSuccess] = useState<string | null>(null);
  const [leadError, setLeadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api
      .getPublicOverview()
      .then((res) => {
        if (!active) return;
        setData(res);
        if (res.pastorals.length > 0) {
          setPastoralId(res.pastorals[0].id);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleLeadSubmit(e: FormEvent) {
    e.preventDefault();
    setLeadError(null);
    setLeadSuccess(null);
    setSubmittingLead(true);
    try {
      const res = await api.submitPublicLead({
        fullName,
        parish,
        decanato: zona,
        phone,
        email,
        pastoralId,
        notes,
      });
      setLeadSuccess(res.message);
      setFullName('');
      setParish('');
      setPhone('');
      setEmail('');
      setNotes('');
    } catch (err) {
      setLeadError(err instanceof Error ? err.message : 'No se pudo enviar el registro.');
    } finally {
      setSubmittingLead(false);
    }
  }

  const visiblePastorals = (data?.pastorals ?? []).filter((p) =>
    pastoralFilter === 'Todas' ? true : p.status === pastoralFilter,
  );

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Subtle 3-color Pastoral Juvenil ribbon */}
      <div className="h-1 w-full flex">
        <div className="flex-1 bg-[#8D4999]" />
        <div className="flex-1 bg-[#E6332A]" />
        <div className="flex-1 bg-[#109A51]" />
      </div>

      {/* Top Bar Contract: 3 zones, gap-8, single-line controls */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-6 py-3.5">
          {/* Zone 1: Brand wordmark */}
          <a
            href="#inicio"
            className="flex items-center gap-3 text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            <img
              src={getAssetUrl('assets/aistudio/PJ_8x_b40a6c17.png')}
              alt="Logo Pastoral Juvenil Diócesis de Chiclayo"
              className="h-9 w-auto object-contain"
              referrerPolicy="no-referrer"
            />
            <span>Pastoral Juvenil Chiclayo</span>
          </a>

          {/* Zone 2: 4 concise nav links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a
              href="#pastorales"
              className="hover:text-[#0A6EB4] transition-colors whitespace-nowrap shrink-0"
            >
              Pastorales
            </a>
            <a
              href="#agenda"
              className="hover:text-[#0A6EB4] transition-colors whitespace-nowrap shrink-0"
            >
              Agenda
            </a>
            <a
              href="#celebraciones"
              className="hover:text-[#0A6EB4] transition-colors whitespace-nowrap shrink-0"
            >
              Celebraciones
            </a>
            <a
              href="#inscripcion"
              className="hover:text-[#0A6EB4] transition-colors whitespace-nowrap shrink-0"
            >
              Participar
            </a>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={onOpenLogin}
              className="rounded-lg bg-[#0A6EB4] px-4 py-2 text-xs font-semibold text-white hover:bg-[#085A94] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isAuthenticated ? 'Ir al ERP Diocesano' : 'Acceso ERP'}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="inicio" className="border-b border-slate-200 bg-slate-50/70 halftone-subtle">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:py-24">
          <div className="grid grid-cols-1 items-stretch gap-12 lg:grid-cols-12">
            <div className="flex flex-col justify-center lg:col-span-7">
              <p className="text-xs font-semibold tracking-wide text-[#0A6EB4]">
                Comisión Diocesana de Juventud · Diócesis de Chiclayo
              </p>
              <h1
                className="mt-4 font-serif text-slate-900 font-semibold leading-[1.12] tracking-tight text-balance"
                style={{fontSize: 'clamp(2.25rem, 4vw, 3.6rem)'}}
              >
                Juventud en comunión, formación y{' '}
                <span className="italic text-[#8D4999]">misión diocesana</span>.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600">
                Articulamos a los grupos juveniles, parroquias, movimientos y áreas pastorales de
                toda la Diócesis de Chiclayo. Conoce nuestras pastorales vigentes, participa en los
                próximos encuentros o registra tu comunidad en el directorio diocesano.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <a
                  href="#inscripcion"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#0A6EB4] px-5 py-3 text-sm font-semibold text-white hover:bg-[#085A94] transition-colors whitespace-nowrap shrink-0"
                >
                  Inscribir a mi Parroquia o Grupo
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href="#pastorales"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:border-slate-400 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
                >
                  Explorar Pastorales
                </a>
              </div>
            </div>

            {/* Institutional Visual Frame featuring Official Emblems */}
            <div className="lg:col-span-5">
              <div className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white p-8">
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-6">
                  <img
                    src={getAssetUrl('assets/aistudio/PJ_8x_b40a6c17.png')}
                    alt="Pastoral Juvenil Diócesis de Chiclayo"
                    className="h-24 w-auto object-contain"
                    referrerPolicy="no-referrer"
                  />
                  <img
                    src={getAssetUrl('assets/aistudio/CDJ_8x_082c8e32.png')}
                    alt="Comisión Diocesana de Juventud"
                    className="h-24 w-24 object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="py-6 space-y-2">
                  <p className="text-xs font-medium text-slate-500">
                    Identidad Institucional · Cruz, Palabra y Juventud
                  </p>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    Bajo el amparo de Nuestra Señora Inmaculada Concepción, acompañamos la vida
                    juvenil en las zonas pastorales de Chiclayo, Lambayeque, Ferreñafe y Santa Cruz.
                  </p>
                </div>

                {/* Clean hairline summary metrics */}
                <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-6">
                  <div>
                    <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums">
                      {loading ? '—' : data?.stats.activePastorals ?? 8}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">Pastorales Activas</p>
                  </div>
                  <div>
                    <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums">
                      {loading ? '—' : data?.stats.parishesReached ?? 34}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">Parroquias Articuladas</p>
                  </div>
                  <div>
                    <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums">
                      {loading ? '—' : data?.stats.registeredMembers ?? 6}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">Coordinadores Activos</p>
                  </div>
                  <div>
                    <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums">
                      {loading ? '—' : data?.stats.upcomingEvents ?? 3}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">Actividades Próximas</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 01: Pastorales de la Diócesis */}
      <section id="pastorales" className="mx-auto max-w-7xl px-6 py-20">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between border-b border-slate-200 pb-6">
          <div>
            <h2 className="font-serif text-3xl font-semibold text-slate-900">
              01. Pastorales de la Diócesis
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Catálogo diocesano administrado desde el sistema ERP. Cada área articula parroquias,
              asesores sacerdotales y equipos juveniles de servicio.
            </p>
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 self-start">
            {(['Todas', 'Activa', 'En Formación'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setPastoralFilter(tab)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  pastoralFilter === tab
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-48 rounded-xl border border-slate-200 bg-slate-50 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
            {visiblePastorals.map((pastoral) => (
              <article
                key={pastoral.id}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 hover:border-slate-300 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-mono font-medium tabular-nums">{pastoral.code}</span>
                    <span>{pastoral.status}</span>
                  </div>
                  <div
                    className="mt-3 h-0.5 w-10 rounded-full"
                    style={{backgroundColor: pastoral.accentColor}}
                  />
                  <h3 className="mt-3 text-base font-semibold text-slate-900 leading-snug">
                    {pastoral.name}
                  </h3>
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                    {pastoral.description}
                  </p>
                </div>

                <div className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-500 space-y-1">
                  <p className="truncate">
                    <span className="text-slate-400">Coord.:</span>{' '}
                    <span className="font-medium text-slate-700">{pastoral.coordinatorName}</span>
                  </p>
                  <p className="flex items-center gap-1.5 font-mono tabular-nums">
                    <span>{pastoral.parishCount} parroquias</span>
                    <span aria-hidden="true">·</span>
                    <span className="truncate font-sans">{pastoral.adviserName}</span>
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Section 02: Agenda & Celebraciones Diocesanas */}
      <section id="agenda" className="border-y border-slate-200 bg-slate-50/60">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
            {/* Agenda de Encuentros */}
            <div className="lg:col-span-7">
              <h2 className="font-serif text-3xl font-semibold text-slate-900">
                02. Agenda Diocesana
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Jornadas, vigilias, asambleas de coordinadores y misiones juveniles abiertas a las
                parroquias.
              </p>

              <div className="mt-8 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
                {(data?.events ?? []).map((evt) => (
                  <div key={evt.id} className="p-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="font-medium text-[#0A6EB4]">{evt.eventType}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{evt.date}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{evt.time} h</span>
                        <span aria-hidden="true">·</span>
                        <span>{evt.status}</span>
                      </div>
                      <h3 className="text-base font-semibold text-slate-900">{evt.title}</h3>
                      <p className="text-xs text-slate-600 flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{evt.location}</span>
                      </p>
                    </div>
                    <div className="shrink-0 text-left sm:text-right">
                      <p className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
                        {evt.registeredCount}/{evt.capacity}
                      </p>
                      <p className="text-xs text-slate-500">Inscritos</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Celebraciones & Aniversarios (inspired by user's uploaded designs) */}
            <div id="celebraciones" className="lg:col-span-5">
              <h2 className="font-serif text-3xl font-semibold text-slate-900">
                Vida Comunitaria
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Aniversarios parroquiales y cumpleaños de quienes sirven en la Pastoral Juvenil.
              </p>

              <div className="mt-8 space-y-4">
                {(data?.celebrations ?? []).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-200 bg-white p-5 halftone-subtle"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span
                        className={`font-semibold ${
                          item.kind === 'anniversary' ? 'text-[#109A51]' : 'text-[#8D4999]'
                        }`}
                      >
                        {item.kind === 'anniversary' ? 'Aniversario Parroquial' : 'Cumpleaños Pastoral'}
                      </span>
                      <span className="font-mono tabular-nums">{item.dateLabel}</span>
                    </div>
                    <h3 className="mt-2 text-base font-bold text-slate-900">{item.title}</h3>
                    <p className="mt-1 text-xs text-slate-600">
                      {item.subtitle} · {item.parishOrRole}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 03: Prospecto & Registro CRM Público */}
      <section id="inscripcion" className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5 space-y-4">
            <h2 className="font-serif text-3xl font-semibold text-slate-900">
              03. Súmate a una Pastoral
            </h2>
            <p className="text-sm leading-relaxed text-slate-600">
              ¿Deseas integrarte a un grupo juvenil, inscribir a tu parroquia en el directorio
              diocesano o solicitar acompañamiento para tu comunidad? Completa este prospecto de
              contacto y tu solicitud ingresará directamente al CRM de la Comisión Diocesana.
            </p>

            <div className="border-t border-slate-200 pt-6 space-y-3 text-xs text-slate-600">
              <p className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[#0A6EB4] shrink-0" />
                <span>Derivación automática al coordinador de la pastoral seleccionada.</span>
              </p>
              <p className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#109A51] shrink-0" />
                <span>Invitación directa a las próximas jornadas y asambleas de tu zona pastoral.</span>
              </p>
            </div>
          </div>

          <div className="lg:col-span-7">
            <form
              onSubmit={handleLeadSubmit}
              className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 space-y-4"
            >
              {leadSuccess && (
                <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-medium text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-[#109A51]" />
                  <span>{leadSuccess}</span>
                </div>
              )}

              {leadError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-700">
                  {leadError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="lead-name" className="block text-xs font-medium text-slate-700 mb-1">
                    Nombre completo
                  </label>
                  <input
                    id="lead-name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ej. María Fernanda Quispe"
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#0A6EB4] focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="lead-parish" className="block text-xs font-medium text-slate-700 mb-1">
                    Parroquia o Movimiento
                  </label>
                  <input
                    id="lead-parish"
                    type="text"
                    required
                    value={parish}
                    onChange={(e) => setParish(e.target.value)}
                    placeholder="Ej. P. San José Obrero"
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#0A6EB4] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="lead-zona" className="block text-xs font-medium text-slate-700 mb-1">
                    Zona Pastoral
                  </label>
                  <select
                    id="lead-zona"
                    value={zona}
                    onChange={(e) => setZona(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#0A6EB4] focus:outline-none"
                  >
                    {ZONAS_CHICLAYO.map((z) => (
                      <option key={z} value={z}>
                        {z}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="lead-pastoral" className="block text-xs font-medium text-slate-700 mb-1">
                    Pastoral de interés
                  </label>
                  <select
                    id="lead-pastoral"
                    value={pastoralId}
                    onChange={(e) => setPastoralId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#0A6EB4] focus:outline-none"
                  >
                    {(data?.pastorals ?? []).map((pas) => (
                      <option key={pas.id} value={pas.id}>
                        {pas.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="lead-phone" className="block text-xs font-medium text-slate-700 mb-1">
                    WhatsApp / Teléfono
                  </label>
                  <input
                    id="lead-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="979 000 000"
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#0A6EB4] focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="lead-email" className="block text-xs font-medium text-slate-700 mb-1">
                    Correo electrónico
                  </label>
                  <input
                    id="lead-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="correo@ejemplo.pe"
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#0A6EB4] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="lead-notes" className="block text-xs font-medium text-slate-700 mb-1">
                  Mensaje o consulta
                </label>
                <textarea
                  id="lead-notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Cuéntanos si ya participas en un grupo juvenil o cómo te gustaría colaborar."
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#0A6EB4] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submittingLead}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0A6EB4] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#085A94] disabled:opacity-60 transition-colors cursor-pointer"
              >
                <Send className="h-4 w-4" />
                {submittingLead ? 'Enviando registro...' : 'Enviar Prospecto Pastoral'}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Quiet Institutional Footer */}
      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <img
              src={getAssetUrl('assets/aistudio/PJ_8x_b40a6c17.png')}
              alt="Logo Pastoral Juvenil"
              className="h-10 w-auto object-contain"
              referrerPolicy="no-referrer"
            />
            <img
              src={getAssetUrl('assets/aistudio/CDJ_8x_082c8e32.png')}
              alt="Comisión Diocesana de Juventud"
              className="h-10 w-10 object-contain"
              referrerPolicy="no-referrer"
            />
            <div className="text-xs text-slate-600">
              <p className="font-semibold text-slate-900">
                Pastoral Juvenil · Diócesis de Chiclayo
              </p>
              <p>Comisión Diocesana de Juventud · Lambayeque, Perú</p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-500">
            <a href="#pastorales" className="hover:text-slate-900 transition-colors">
              Pastorales
            </a>
            <a href="#agenda" className="hover:text-slate-900 transition-colors">
              Agenda
            </a>
            <button
              type="button"
              onClick={onOpenLogin}
              className="font-medium text-[#0A6EB4] hover:underline cursor-pointer"
            >
              Acceso Coordinadores (ERP)
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
