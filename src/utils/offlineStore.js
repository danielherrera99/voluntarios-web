// Almacenamiento local persistente (IndexedDB + localStorage) para operación offline en campo.
// Guarda una copia del padrón consultable sin señal y encola marcaciones pendientes hasta que vuelva internet.

const IDB_NAME = 'voluntarios_cix_offline_db';
const IDB_VERSION = 1;
const IDB_STORE = 'kv_store';
const ROSTER_CACHE_KEY = 'roster_cache_v1';
const MANDOS_CACHE_KEY = 'mandos_cache_v1';
const QUEUE_STORAGE_KEY = 'voluntarios_offline_queue_v1';

const openOfflineDb = () =>
  new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB no disponible'));
      return;
    }
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Error abriendo IndexedDB'));
  });

const idbGet = async (key) => {
  try {
    const db = await openOfflineDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
};

const idbSet = async (key, value) => {
  try {
    const db = await openOfflineDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const req = tx.objectStore(IDB_STORE).put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    return true;
  } catch {
    return false;
  }
};

export const isNetworkError = (err) => {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  if (!err) return false;
  if (err instanceof TypeError) return true;
  const text = `${err.message || ''} ${err.details || ''} ${err.hint || ''} ${err.name || ''}`.toLowerCase();
  return (
    text.includes('failed to fetch') ||
    text.includes('networkerror') ||
    text.includes('network request failed') ||
    text.includes('load failed') ||
    text.includes('internet disconnected') ||
    text.includes('err_network') ||
    text.includes('abort') ||
    text.includes('timeout')
  );
};

// Parche directo en Supabase sincronizando Fase 2 (voluntarios) y Fase 1 (voluntarios_general)
export const applyPatchToSupabase = async (supabase, voluntario, patchData) => {
  if (voluntario?.dni) {
    const results = await Promise.all([
      supabase.from('voluntarios').update(patchData).eq('dni', voluntario.dni),
      supabase.from('voluntarios_general').update(patchData).eq('dni', voluntario.dni)
    ]);
    const err = results.find((r) => r.error)?.error;
    if (err) throw err;
  } else {
    const tbl = voluntario?._origenTabla || (voluntario?.fase === '3' ? 'voluntarios' : 'voluntarios_general');
    const { error } = await supabase.from(tbl).update(patchData).eq('id', voluntario.id);
    if (error) throw error;
  }
};

// ========================================================
// PADRÓN EN CACHÉ LOCAL (IndexedDB)
// ========================================================

export const getOfflineRosterBundle = async () => {
  const data = await idbGet(ROSTER_CACHE_KEY);
  if (!data || !Array.isArray(data.records)) {
    return { records: [], updatedAt: null, scopeLabel: '' };
  }
  return data;
};

const getRecordKey = (r) => (r?.dni ? `dni:${String(r.dni).trim()}` : `id:${r?._origenTabla || 'g'}:${r?.id}`);

export const saveOfflineRoster = async (records, { mode = 'merge', scopeLabel = '' } = {}) => {
  if (!Array.isArray(records)) return { count: 0, updatedAt: null };
  let finalRecords = records;

  if (mode === 'merge') {
    const existing = await getOfflineRosterBundle();
    const map = new Map();
    existing.records.forEach((item) => map.set(getRecordKey(item), item));
    records.forEach((item) => {
      const k = getRecordKey(item);
      const prev = map.get(k);
      map.set(k, prev ? { ...prev, ...item } : item);
    });
    finalRecords = Array.from(map.values());
  }

  // Aplicar encima operaciones pendientes en cola para no sobrescribir avances offline
  const queue = getOfflineQueue();
  if (queue.length > 0) {
    const byKey = new Map(finalRecords.map((r) => [getRecordKey(r), r]));
    queue.forEach((op) => {
      const matchKey = op.dni ? `dni:${String(op.dni).trim()}` : `id:${op.origenTabla || 'g'}:${op.id}`;
      const cur = byKey.get(matchKey);
      if (cur) {
        byKey.set(matchKey, { ...cur, ...op.patchData });
      }
    });
    finalRecords = Array.from(byKey.values());
  }

  const updatedAt = new Date().toISOString();
  await idbSet(ROSTER_CACHE_KEY, {
    records: finalRecords,
    updatedAt,
    scopeLabel: scopeLabel || 'Padrón local'
  });

  return { count: finalRecords.length, updatedAt };
};

export const patchOfflineRosterRecord = async (voluntario, patchData) => {
  const bundle = await getOfflineRosterBundle();
  if (!bundle.records.length) return;
  const targetDni = voluntario?.dni ? String(voluntario.dni).trim() : null;

  let changed = false;
  const nextRecords = bundle.records.map((item) => {
    const matchByDni = targetDni && item.dni && String(item.dni).trim() === targetDni;
    const matchById = !targetDni && voluntario?.id && item.id === voluntario.id;
    if (matchByDni || matchById) {
      changed = true;
      return { ...item, ...patchData };
    }
    return item;
  });

  if (changed) {
    await idbSet(ROSTER_CACHE_KEY, {
      ...bundle,
      records: nextRecords
    });
  }
};

export const findOfflineVolunteer = async (queryTerm) => {
  const clean = (queryTerm || '').trim();
  if (!clean) return null;
  const { records } = await getOfflineRosterBundle();
  if (!records.length) return null;

  const lower = clean.toLowerCase();
  const isDigits = /^\d+$/.test(clean);

  const exactMatch = records.find(
    (r) => String(r.dni || '').trim() === clean || String(r.codigo || '').trim().toLowerCase() === lower
  );
  if (exactMatch) return exactMatch;

  if (isDigits) {
    return (
      records.find(
        (r) => String(r.dni || '').includes(clean) || String(r.codigo || '').toLowerCase().includes(lower)
      ) || null
    );
  }

  return (
    records.find(
      (r) =>
        String(r.codigo || '').toLowerCase().includes(lower) ||
        String(r.dni || '').toLowerCase().includes(lower) ||
        String(r.nombres_apellidos || '').toLowerCase().includes(lower)
    ) || null
  );
};

export const saveOfflineMandos = async (mandosRows) => {
  if (!Array.isArray(mandosRows)) return;
  await idbSet(MANDOS_CACHE_KEY, mandosRows);
};

export const getOfflineMandos = async () => {
  const rows = await idbGet(MANDOS_CACHE_KEY);
  return Array.isArray(rows) ? rows : [];
};

// ========================================================
// COLA PERSISTENTE DE SINCRONIZACIÓN (localStorage)
// ========================================================

export const getOfflineQueue = () => {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeOfflineQueue = (queue) => {
  localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
};

export const enqueueOfflineOp = (voluntario, patchData) => {
  const queue = getOfflineQueue();
  const op = {
    opId: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    dni: voluntario?.dni ? String(voluntario.dni).trim() : null,
    id: voluntario?.id ?? null,
    origenTabla: voluntario?._origenTabla || (voluntario?.fase === '3' ? 'voluntarios' : 'voluntarios_general'),
    fase: voluntario?.fase || null,
    nombre: voluntario?.nombres_apellidos || 'Voluntario',
    patchData,
    createdAt: new Date().toISOString()
  };
  queue.push(op);
  writeOfflineQueue(queue);
  return { op, queueLength: queue.length };
};

export const flushOfflineQueue = async (supabase) => {
  const queue = getOfflineQueue();
  if (queue.length === 0) {
    return { synced: 0, remaining: 0, stoppedOffline: false, errors: [] };
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { synced: 0, remaining: queue.length, stoppedOffline: true, errors: [] };
  }

  let synced = 0;
  const remainingOps = [...queue];
  const errors = [];

  for (let i = 0; i < queue.length; i += 1) {
    const op = queue[i];
    try {
      await applyPatchToSupabase(
        supabase,
        {
          dni: op.dni,
          id: op.id,
          _origenTabla: op.origenTabla,
          fase: op.fase
        },
        op.patchData
      );
      synced += 1;
      // Quitar inmediatamente el elemento sincronizado para evitar duplicar trabajo si se corta a mitad
      const idx = remainingOps.findIndex((item) => item.opId === op.opId);
      if (idx !== -1) {
        remainingOps.splice(idx, 1);
        writeOfflineQueue(remainingOps);
      }
    } catch (err) {
      if (isNetworkError(err)) {
        return { synced, remaining: remainingOps.length, stoppedOffline: true, errors };
      }
      errors.push({ opId: op.opId, nombre: op.nombre, message: err?.message || 'Error de base de datos' });
    }
  }

  return { synced, remaining: remainingOps.length, stoppedOffline: false, errors };
};
