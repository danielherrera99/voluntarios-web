import { useState, useMemo, useEffect } from 'react';
import { supabase } from '../supabase';
import {
  X, Search, Users, ArrowLeftRight, AlertTriangle, CheckCircle2, RefreshCw, UserMinus
} from 'lucide-react';

/**
 * Modal compartido para asignar, reasignar de cuadrilla o pasar a "No Asignado" a un voluntario.
 * Sincroniza simultáneamente `voluntarios` (Fase 2) y `voluntarios_general` (Fase 1) por DNI.
 */
export default function ReasignarCuadrillaModal({
  voluntario,
  mandos = [],
  volsByCuadrilla = {},
  allowCrossResponsable = false,
  onClose,
  onSaved
}) {
  const currentCua = String(voluntario?.cuadrilla_codigo || '').trim().toUpperCase();

  const responsablesList = useMemo(() => {
    const set = new Set(mandos.map(m => m.responsable_nombre).filter(Boolean));
    return Array.from(set).sort();
  }, [mandos]);

  const [selectedResp, setSelectedResp] = useState(() => {
    if (!allowCrossResponsable) return '';
    const matchM = mandos.find(m => String(m.cuadrilla_codigo || '').trim().toUpperCase() === currentCua);
    if (matchM?.responsable_nombre) return matchM.responsable_nombre;
    if (voluntario?.responsable_nombre && responsablesList.includes(voluntario.responsable_nombre)) {
      return voluntario.responsable_nombre;
    }
    return responsablesList[0] || '';
  });

  const [mode, setMode] = useState('assign'); // 'assign' | 'unassign'
  const [selectedCua, setSelectedCua] = useState(currentCua || '');
  const [searchGuia, setSearchGuia] = useState('');
  const [clearRespToo, setClearRespToo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (!voluntario) return;
    setErrorMsg(null);
    setSearchGuia('');
    setMode('assign');
    setClearRespToo(false);
    const cua = String(voluntario.cuadrilla_codigo || '').trim().toUpperCase();
    setSelectedCua(cua);
    if (allowCrossResponsable) {
      const matchM = mandos.find(m => String(m.cuadrilla_codigo || '').trim().toUpperCase() === cua);
      if (matchM?.responsable_nombre) setSelectedResp(matchM.responsable_nombre);
      else if (voluntario.responsable_nombre && responsablesList.includes(voluntario.responsable_nombre)) {
        setSelectedResp(voluntario.responsable_nombre);
      } else {
        setSelectedResp(responsablesList[0] || '');
      }
    }
  }, [voluntario, mandos, allowCrossResponsable, responsablesList]);

  const filteredMandos = useMemo(() => {
    let pool = mandos;
    if (allowCrossResponsable && selectedResp) {
      pool = pool.filter(m => m.responsable_nombre === selectedResp);
    }
    if (searchGuia.trim()) {
      const t = searchGuia.toLowerCase().trim();
      pool = pool.filter(m =>
        String(m.cuadrilla_codigo || '').toLowerCase().includes(t) ||
        String(m.guia_nombre || '').toLowerCase().includes(t) ||
        String(m.lider_nombre || '').toLowerCase().includes(t)
      );
    }
    return pool;
  }, [mandos, allowCrossResponsable, selectedResp, searchGuia]);

  const targetMando = useMemo(() => {
    if (mode !== 'assign' || !selectedCua) return null;
    return mandos.find(m => String(m.cuadrilla_codigo || '').trim().toUpperCase() === selectedCua) || null;
  }, [mandos, mode, selectedCua]);

  if (!voluntario) return null;

  const handleSave = async () => {
    const cleanDni = String(voluntario.dni || '').trim();
    if (!cleanDni) {
      setErrorMsg('El voluntario no tiene DNI registrado para sincronizar.');
      return;
    }
    if (mode === 'assign' && !targetMando) {
      setErrorMsg('Selecciona una cuadrilla / guía de destino o elige "Pasar a No Asignado".');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      const patch = mode === 'unassign'
        ? {
            cuadrilla_codigo: null,
            guia_nombre: null,
            lider_nombre: null,
            ...(allowCrossResponsable && clearRespToo ? { responsable_nombre: null } : {})
          }
        : {
            cuadrilla_codigo: targetMando.cuadrilla_codigo,
            guia_nombre: targetMando.guia_nombre,
            lider_nombre: targetMando.lider_nombre,
            ...((allowCrossResponsable || !voluntario.responsable_nombre)
              ? { responsable_nombre: targetMando.responsable_nombre }
              : {})
          };

      const [resF2, resF1] = await Promise.all([
        supabase.from('voluntarios').update(patch).eq('dni', cleanDni),
        supabase.from('voluntarios_general').update(patch).eq('dni', cleanDni)
      ]);

      if (resF2.error) throw resF2.error;
      if (resF1.error) throw resF1.error;

      if (onSaved) onSaved(cleanDni, patch);
      onClose();
    } catch (err) {
      console.error('Error reasignando cuadrilla:', err);
      setErrorMsg(err.message || 'No se pudo guardar el cambio en base de datos.');
    } finally {
      setSaving(false);
    }
  };

  const targetCount = targetMando
    ? (volsByCuadrilla[String(targetMando.cuadrilla_codigo || '').trim().toUpperCase()]?.length || 0)
    : 0;
  const targetCupo = targetMando?.total_voluntarios || 9;
  const isAlreadyAtCap = targetMando && selectedCua !== currentCua && targetCount >= targetCupo;

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-stone-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-diocesis-redDark to-diocesis-red p-4 sm:p-5 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <ArrowLeftRight className="w-4 h-4 text-diocesis-mustardLight" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-extrabold truncate">
                Asignar / Reasignar Cuadrilla
              </h3>
              <p className="text-[11px] text-amber-100/90 truncate">
                Cambio opcional en tiempo real (sincroniza Padrón General y Fase 2)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/15 transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[78vh] overflow-y-auto">
          {/* Voluntario card */}
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3.5 space-y-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="font-extrabold text-sm text-stone-900">
                {voluntario.nombres_apellidos}
              </span>
              <span className="font-mono text-xs font-bold bg-white px-2 py-0.5 rounded border border-stone-300 text-stone-700">
                DNI: {voluntario.dni}
              </span>
            </div>
            <div className="text-xs text-stone-600 flex flex-wrap items-center gap-2 pt-0.5">
              <span>Ubicación actual:</span>
              {currentCua ? (
                <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[11px]">
                  {currentCua} • {voluntario.guia_nombre || 'Guía asignado'}
                </span>
              ) : (
                <span className="font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300 text-[11px]">
                  No Asignado (Sin Cuadrilla)
                </span>
              )}
            </div>
          </div>

          {/* Mode selector */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode('assign')}
              className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition cursor-pointer ${
                mode === 'assign'
                  ? 'bg-diocesis-redDark text-white border-diocesis-redDark shadow-xs'
                  : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Asignar / Mover a Cuadrilla</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('unassign')}
              disabled={!currentCua && !allowCrossResponsable}
              className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                mode === 'unassign'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : 'bg-white text-stone-700 border-stone-300 hover:bg-amber-50'
              }`}
            >
              <UserMinus className="w-3.5 h-3.5" />
              <span>Pasar a No Asignado</span>
            </button>
          </div>

          {mode === 'assign' ? (
            <div className="space-y-3">
              {allowCrossResponsable && (
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                    Responsable Territorial de Destino
                  </label>
                  <select
                    value={selectedResp}
                    onChange={(e) => {
                      setSelectedResp(e.target.value);
                      setSelectedCua('');
                    }}
                    className="w-full px-3 py-2 text-xs font-semibold bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-diocesis-red"
                  >
                    {responsablesList.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                  Buscar Guía, Líder o Código de Cuadrilla
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchGuia}
                    onChange={(e) => setSearchGuia(e.target.value)}
                    placeholder="Ej. CUA-233, Juan, Estefania..."
                    className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-diocesis-red"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                  Selecciona Cuadrilla / Guía ({filteredMandos.length} disponibles)
                </label>
                <div className="border border-stone-200 rounded-2xl max-h-56 overflow-y-auto divide-y divide-stone-100 bg-stone-50/40">
                  {filteredMandos.length === 0 ? (
                    <div className="p-4 text-center text-xs text-stone-500">
                      No se encontraron cuadrillas con ese filtro.
                    </div>
                  ) : (
                    filteredMandos.map(m => {
                      const code = String(m.cuadrilla_codigo || '').trim().toUpperCase();
                      const count = volsByCuadrilla[code]?.length || 0;
                      const cupo = m.total_voluntarios || 9;
                      const isSel = selectedCua === code;
                      const isCur = currentCua === code;
                      return (
                        <button
                          key={m.id || code}
                          type="button"
                          onClick={() => setSelectedCua(code)}
                          className={`w-full text-left px-3 py-2.5 flex items-center justify-between gap-2 transition cursor-pointer ${
                            isSel ? 'bg-amber-50 border-l-4 border-l-diocesis-redDark' : 'hover:bg-white'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-[10px] font-black px-1.5 py-0.5 rounded bg-white text-diocesis-redDark border border-stone-300">
                                {code}
                              </span>
                              <span className="text-xs font-bold text-stone-900 truncate">
                                {m.guia_nombre}
                              </span>
                              {isCur && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-stone-200 text-stone-700">
                                  Actual
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-stone-500 truncate mt-0.5">
                              Líder: {m.lider_nombre || 'Sin líder'}
                            </p>
                          </div>
                          <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            count >= cupo
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}>
                            {count} / {cupo}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {isAlreadyAtCap && (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-2.5 flex items-start gap-2 text-[11px] text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Aviso opcional: la cuadrilla <strong>{targetMando.cuadrilla_codigo}</strong> ya tiene{' '}
                    <strong>{targetCount} / {targetCupo}</strong> voluntarios asignados, pero puedes moverlo igualmente si lo necesitas.
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-2.5 text-xs text-amber-950">
              <p className="font-semibold">
                Al confirmar, el voluntario dejará su cuadrilla actual y pasará a la sección de{' '}
                <strong>No Asignados (Sin Cuadrilla / Guía)</strong>.
              </p>
              {allowCrossResponsable && (
                <label className="flex items-center gap-2 cursor-pointer text-[11px] font-bold text-amber-900 pt-1">
                  <input
                    type="checkbox"
                    checked={clearRespToo}
                    onChange={(e) => setClearRespToo(e.target.checked)}
                    className="rounded border-amber-400 text-diocesis-red focus:ring-diocesis-red"
                  />
                  <span>También quitar su Responsable Territorial (enviar a No Asignados Generales)</span>
                </label>
              )}
            </div>
          )}

          {errorMsg && (
            <div className="bg-rose-50 border border-rose-300 text-rose-800 rounded-xl p-2.5 text-xs font-bold">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-xs font-bold text-stone-600 hover:text-stone-900 bg-white border border-stone-300 rounded-xl transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || (mode === 'assign' && (!selectedCua || selectedCua === currentCua))}
            className="px-4 py-2 text-xs font-bold text-white bg-diocesis-redDark hover:bg-diocesis-red rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirmar Cambio</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
