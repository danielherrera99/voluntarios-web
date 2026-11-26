import {ArrowRight, Calendar, CheckCircle2, MapPin, Search, Send, Users} from 'lucide-react';
import {useEffect, useState, type FormEvent} from 'react';
import {api, getAssetUrl} from '../../lib/api';
import {
  ZONAS_ARCIPRESTALES,
  ZONAS_PARROQUIALES,
  type PublicOverviewResponse,
} from '../../types';

interface PublicPortalProps {
  onOpenLogin: () => void;
  isAuthenticated: boolean;
}

export function PublicPortal({onOpenLogin, isAuthenticated}: PublicPortalProps) {
  const [data, setData] = useState<PublicOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [catalogMode, setCatalogMode] = useState<'comunidades' | 'parroquias'>('comunidades');
  const [zonaFilter, setZonaFilter] = useState<'Todas' | string>('Todas');
  const [pastoralSearch, setPastoralSearch] = useState('');
  const [showAllCatalog, setShowAllCatalog] = useState(false);

  // Public CRM Prospect Form state
  const [fullName, setFullName] = useState('');
  const [parish, setParish] = useState('');
  const [zonaArciprestal, setZonaArciprestal] = useState<string>(ZONAS_ARCIPRESTALES[0]);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [pastoralId, setPastoralId] = useState('pas-catedral');
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
          setZonaArciprestal(res.pastorals[0].zonaArciprestal);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function handleSelectParticipacion(nextId: string) {
    setPastoralId(nextId);
    const found = data?.pastorals.find((p) => p.id === nextId);
    if (found) {
      setZonaArciprestal(found.zonaArciprestal);
      if (found.parishId) {
        const linkedParish = data?.parishes?.find((par) => par.id === found.parishId);
        setParish(linkedParish ? `${linkedParish.name} (${linkedParish.locality})` : '');
      } else {
        setParish('');
      }
    }
  }

  async function handleLeadSubmit(e: FormEvent) {
    e.preventDefault();
    setLeadError(null);
    setLeadSuccess(null);
    setSubmittingLead(true);
    try {
      const matched = data?.pastorals.find((p) => p.id === pastoralId);
      const res = await api.submitPublicLead({
        fullName,
        parish: parish.trim() || matched?.name || '',
        zonaArciprestal,
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

  const allPastorals = data?.pastorals ?? [];
  const allParishes = data?.parishes ?? [];
  const parishMap = new Map(allParishes.map((par) => [par.id, par]));
  const searchLower = pastoralSearch.trim().toLowerCase();

  const filteredPastorals = allPastorals.filter((p) => {
    const linkedParish = p.parishId ? parishMap.get(p.parishId) : undefined;
    const matchZona = zonaFilter === 'Todas' ? true : p.zonaArciprestal === zonaFilter;
    const matchSearch =
      !searchLower ||
      p.name.toLowerCase().includes(searchLower) ||
      p.shortName.toLowerCase().includes(searchLower) ||
      p.zonaArciprestal.toLowerCase().includes(searchLower) ||
      p.coordinatorName.toLowerCase().includes(searchLower) ||
      (linkedParish &&
        `${linkedParish.name} ${linkedParish.locality}`.toLowerCase().includes(searchLower));
    return matchZona && matchSearch;
  });

  const filteredParishes = allParishes.filter((par) => {
    const matchZona = zonaFilter === 'Todas' ? true : par.zonaArciprestal === zonaFilter;
    const matchSearch =
      !searchLower ||
      par.name.toLowerCase().includes(searchLower) ||
      par.locality.toLowerCase().includes(searchLower) ||
      par.pastorName.toLowerCase().includes(searchLower) ||
      par.zonaArciprestal.toLowerCase().includes(searchLower);
    return matchZona && matchSearch;
  });

  const isUnfilteredView = zonaFilter === 'Todas' && !searchLower;
  const visiblePastorals =
    isUnfilteredView && !showAllCatalog
      ? filteredPastorals.slice(0, 12)
      : filteredPastorals;
  const visibleParishes =
    isUnfilteredView && !showAllCatalog
      ? filteredParishes.slice(0, 12)
      : filteredParishes;

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
              alt="Logo Pastoral Juvenil DiÃ³cesis de Chiclayo"
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
                ComisiÃ³n Diocesana de Juventud Â· DiÃ³cesis de Chiclayo
              </p>
              <h1
                className="mt-4 font-serif text-slate-900 font-semibold leading-[1.12] tracking-tight text-balance"
                style={{fontSize: 'clamp(2.25rem, 4vw, 3.6rem)'}}
              >
                Juventud en comuniÃ³n, formaciÃ³n y{' '}
                <span className="italic text-[#8D4999]">misiÃ³n diocesana</span>.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600">
                Articulamos a los grupos juveniles, parroquias, movimientos y Ã¡reas pastorales de
                toda la DiÃ³cesis de Chiclayo. Conoce nuestras pastorales vigentes, participa en los
                prÃ³ximos encuentros o registra tu comunidad en el directorio diocesano.
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
                    alt="Pastoral Juvenil DiÃ³cesis de Chiclayo"
                    className="h-24 w-auto object-contain"
                    referrerPolicy="no-referrer"
                  />
                  <img
                    src={getAssetUrl('assets/aistudio/CDJ_8x_082c8e32.png')}
                    alt="ComisiÃ³n Diocesana de Juventud"
                    className="h-24 w-24 object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="py-6 space-y-2">
                  <p className="text-xs font-medium text-slate-500">
                    Identidad Institucional Â· Cruz, Palabra y Juventud
                  </p>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    Bajo el amparo de Nuestra SeÃ±ora Inmaculada ConcepciÃ³n, acompaÃ±amos la vida
                    juvenil en todas las zonas arciprestales, movimientos y universidades de la
                    DiÃ³cesis de Chiclayo.
                  </p>
                </div>

                {/* Clean hairline summary metrics */}
                <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-6">
                  <div>
                    <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums">
                      {loading ? 'â€”' : data?.stats.activePastorals ?? 65}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">Parroquias y Movimientos</p>
                  </div>
                  <div>
                    <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums">
                      {loading ? 'â€”' : data?.stats.parishesReached ?? 8}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">Zonas Arciprestales</p>
                  </div>
                  <div>
                    <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums">
                      {loading ? 'â€”' : data?.stats.registeredMembers ?? 6}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">Coordinadores Activos</p>
                  </div>
                  <div>
                    <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums">
                      {loading ? 'â€”' : data?.stats.upcomingEvents ?? 3}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">Actividades PrÃ³ximas</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 01: Parroquias, Movimientos y Zonas Arciprestales */}
      <section id="pastorales" className="mx-auto max-w-7xl px-6 py-20">
        <div className="flex flex-col gap-6 border-b border-slate-200 pb-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="font-serif text-3xl font-semibold text-slate-900">
                01. Parroquias, Movimientos y Zonas
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Directorio diocesano de comunidades juveniles, movimientos y pastoral universitaria,
                junto al catÃ¡logo oficial de las {allParishes.length || 50} parroquias por Zona Arciprestal.
              </p>
            </div>

            <div className="relative w-full md:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={pastoralSearch}
                onChange={(e) => setPastoralSearch(e.target.value)}
                placeholder={
                  catalogMode === 'parroquias'
                    ? 'Buscar parroquia, distrito o pÃ¡rroco...'
                    : 'Buscar comunidad, movimiento o parroquia...'
                }
                className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#0A6EB4] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1 w-fit">
              {(catalogMode === 'parroquias'
                ? (['Todas', ...ZONAS_PARROQUIALES] as const)
                : (['Todas', ...ZONAS_ARCIPRESTALES] as const)
              ).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setZonaFilter(tab);
                    setShowAllCatalog(false);
                  }}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    zonaFilter === tab
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 w-fit">
              <button
                type="button"
                onClick={() => {
                  setCatalogMode('comunidades');
                  setZonaFilter('Todas');
                  setShowAllCatalog(false);
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  catalogMode === 'comunidades'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Comunidades y Movimientos ({allPastorals.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setCatalogMode('parroquias');
                  setZonaFilter('Todas');
                  setShowAllCatalog(false);
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  catalogMode === 'parroquias'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Parroquias Oficiales ({allParishes.length})
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-48 rounded-xl border border-slate-200 bg-slate-50 animate-pulse" />
            ))}
          </div>
        ) : catalogMode === 'comunidades' ? (
          visiblePastorals.length === 0 ? (
            <div className="mt-8 rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
              No se encontraron comunidades o movimientos que coincidan con "{pastoralSearch}".
            </div>
          ) : (
            <>
              <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
                {visiblePastorals.map((pastoral) => {
                  const linkedParish = pastoral.parishId
                    ? parishMap.get(pastoral.parishId)
                    : undefined;
                  return (
                    <article
                      key={pastoral.id}
                      className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 hover:border-slate-300 transition-colors"
                    >
                      <div>
                        <div className="flex items-center justify-between text-xs text-slate-500 gap-2">
                          <span className="font-mono font-medium tabular-nums whitespace-nowrap shrink-0">
                            {pastoral.code}
                          </span>
                          <span className="whitespace-nowrap shrink-0">
                            {pastoral.communityKind ?? pastoral.status}
                          </span>
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

                      <div className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-500 space-y-1.5">
                        <p className="truncate">
                          <span className="text-slate-400">Parroquia:</span>{' '}
                          <span className="font-medium text-slate-700">
                            {linkedParish
                              ? `${linkedParish.name} (${linkedParish.locality})`
                              : 'Ãmbito diocesano (opcional)'}
                          </span>
                        </p>
                        <p className="truncate">
                          <span className="text-slate-400">Coord.:</span>{' '}
                          <span className="font-medium text-slate-700">{pastoral.coordinatorName}</span>
                        </p>
                        <div className="flex items-center justify-between gap-2 pt-0.5">
                          <span className="font-medium text-slate-700 whitespace-nowrap shrink-0">
                            {pastoral.zonaArciprestal}
                          </span>
                          <a
                            href="#inscripcion"
                            onClick={() => handleSelectParticipacion(pastoral.id)}
                            className="text-xs font-medium text-[#0A6EB4] hover:underline whitespace-nowrap shrink-0"
                          >
                            Participar â†’
                          </a>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {isUnfilteredView && filteredPastorals.length > 12 && (
                <div className="mt-8 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setShowAllCatalog((v) => !v)}
                    className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 hover:border-slate-400 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    {showAllCatalog
                      ? 'Mostrar vista resumida (12)'
                      : `Ver todas las comunidades (${filteredPastorals.length})`}
                  </button>
                </div>
              )}
            </>
          )
        ) : visibleParishes.length === 0 ? (
          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
            No se encontraron parroquias que coincidan con "{pastoralSearch}".
          </div>
        ) : (
          <>
            <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
              {visibleParishes.map((par) => {
                const linkedCommunities = allPastorals.filter((pas) => pas.parishId === par.id);
                return (
                  <article
                    key={par.id}
                    className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 hover:border-slate-300 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-500 gap-2">
                        <span className="font-medium text-[#109A51] whitespace-nowrap shrink-0">
                          {par.zonaArciprestal}
                        </span>
                        <span className="whitespace-nowrap shrink-0">{par.locality}</span>
                      </div>
                      <h3 className="mt-3 text-base font-semibold text-slate-900 leading-snug">
                        "{par.name}"
                      </h3>
                      <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                        <span className="text-slate-400">PÃ¡rroco:</span> {par.pastorName}
                      </p>
                    </div>

                    <div className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-500 space-y-1.5">
                      <p className="truncate">
                        <span className="text-slate-400">Comunidades:</span>{' '}
                        <span className="font-medium text-slate-800">
                          {linkedCommunities.length > 0
                            ? linkedCommunities.map((c) => c.shortName).join(', ')
                            : 'Sin grupo vinculado aÃºn'}
                        </span>
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>

            {isUnfilteredView && filteredParishes.length > 12 && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowAllCatalog((v) => !v)}
                  className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 hover:border-slate-400 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  {showAllCatalog
                    ? 'Mostrar vista resumida (12)'
                    : `Ver las ${filteredParishes.length} parroquias oficiales`}
                </button>
              </div>
            )}
          </>
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
                        <span aria-hidden="true">Â·</span>
                        <span className="font-mono tabular-nums">{evt.date}</span>
                        <span aria-hidden="true">Â·</span>
                        <span className="font-mono tabular-nums">{evt.time} h</span>
                        <span aria-hidden="true">Â·</span>
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
                Aniversarios parroquiales y cumpleaÃ±os de quienes sirven en la Pastoral Juvenil.
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
                        {item.kind === 'anniversary' ? 'Aniversario Parroquial' : 'CumpleaÃ±os Pastoral'}
                      </span>
                      <span className="font-mono tabular-nums">{item.dateLabel}</span>
                    </div>
                    <h3 className="mt-2 text-base font-bold text-slate-900">{item.title}</h3>
                    <p className="mt-1 text-xs text-slate-600">
                      {item.subtitle} Â· {item.parishOrRole}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 03: Prospecto & Registro CRM PÃºblico */}
      <section id="inscripcion" className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5 space-y-4">
            <h2 className="font-serif text-3xl font-semibold text-slate-900">
              03. SÃºmate a una Pastoral
            </h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Â¿Deseas integrarte a un grupo juvenil, inscribir a tu parroquia en el directorio
              diocesano o solicitar acompaÃ±amiento para tu comunidad? Completa este prospecto de
              contacto y tu solicitud ingresarÃ¡ directamente al CRM de la ComisiÃ³n Diocesana.
            </p>

            <div className="border-t border-slate-200 pt-6 space-y-3 text-xs text-slate-600">
              <p className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[#0A6EB4] shrink-0" />
                <span>DerivaciÃ³n automÃ¡tica al coordinador de la pastoral seleccionada.</span>
              </p>
              <p className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#109A51] shrink-0" />
                <span>InvitaciÃ³n directa a las prÃ³ximas jornadas y asambleas de tu zona arciprestal.</span>
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
                    placeholder="Ej. MarÃ­a Fernanda Quispe"
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#0A6EB4] focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="lead-pastoral" className="block text-xs font-medium text-slate-700 mb-1">
                    Indica en cuÃ¡l participas
                  </label>
                  <select
                    id="lead-pastoral"
                    value={pastoralId}
                    onChange={(e) => handleSelectParticipacion(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#0A6EB4] focus:outline-none"
                  >
                    {ZONAS_ARCIPRESTALES.map((zona) => {
                      const items = allPastorals.filter((p) => p.zonaArciprestal === zona);
                      if (items.length === 0) return null;
                      return (
                        <optgroup key={zona} label={`Zona ${zona}`}>
                          {items.map((pas) => (
                            <option key={pas.id} value={pas.id}>
                              {pas.name}
                            </option>
                          ))}
                        </optgroup>
                      );
                    })}
                    {allPastorals
                      .filter((p) => !ZONAS_ARCIPRESTALES.includes(p.zonaArciprestal as typeof ZONAS_ARCIPRESTALES[number]))
                      .map((pas) => (
                        <option key={pas.id} value={pas.id}>
                          {pas.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="lead-zona" className="block text-xs font-medium text-slate-700 mb-1">
                    Zona Arciprestal
                  </label>
                  <select
                    id="lead-zona"
                    value={zonaArciprestal}
                    onChange={(e) => setZonaArciprestal(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#0A6EB4] focus:outline-none"
                  >
                    {ZONAS_ARCIPRESTALES.map((zona) => (
                      <option key={zona} value={zona}>
                        {zona}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="lead-parish" className="block text-xs font-medium text-slate-700 mb-1">
                    Parroquia de pertenencia (opcional)
                  </label>
                  <select
                    id="lead-parish"
                    value={parish}
                    onChange={(e) => setParish(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#0A6EB4] focus:outline-none"
                  >
                    <option value="">Sin parroquia especÃ­fica (en blanco / movimiento)</option>
                    {ZONAS_PARROQUIALES.map((zona) => {
                      const items = allParishes.filter((par) => par.zonaArciprestal === zona);
                      if (items.length === 0) return null;
                      return (
                        <optgroup key={zona} label={`Zona ${zona}`}>
                          {items.map((par) => (
                            <option key={par.id} value={`${par.name} (${par.locality})`}>
                              {par.name} Â· {par.locality}
                            </option>
                          ))}
                        </optgroup>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="lead-phone" className="block text-xs font-medium text-slate-700 mb-1">
                    WhatsApp / TelÃ©fono
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
                    Correo electrÃ³nico
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
                  placeholder="CuÃ©ntanos si ya participas en un grupo juvenil o cÃ³mo te gustarÃ­a colaborar."
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
              alt="ComisiÃ³n Diocesana de Juventud"
              className="h-10 w-10 object-contain"
              referrerPolicy="no-referrer"
            />
            <div className="text-xs text-slate-600">
              <p className="font-semibold text-slate-900">
                Pastoral Juvenil Â· DiÃ³cesis de Chiclayo
              </p>
              <p>ComisiÃ³n Diocesana de Juventud Â· Lambayeque, PerÃº</p>
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
