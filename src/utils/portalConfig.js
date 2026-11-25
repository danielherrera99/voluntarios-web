import { supabase } from '../supabase';

const CACHE_KEY = 'portal_config_cache_v2';
const TTL_MS = 10 * 60 * 1000; // 10 minutos de caché local en el dispositivo del visitante

let memoryCache = null;
let memoryCacheTime = 0;

/**
 * Obtiene la configuración del portal (Popup y Banner de capacitaciones).
 * Prioriza caché en memoria y localStorage, luego Backend en Vercel con caché Edge/RAM,
 * y sólo como último recurso consulta Supabase directamente.
 * Esto reduce las peticiones y la ingesta de logs en Supabase en más de un 99%.
 */
export async function getPortalConfig(forceRefresh = false) {
  const now = Date.now();

  // 1. Memoria rápida de la sesión activa
  if (!forceRefresh && memoryCache && (now - memoryCacheTime < TTL_MS)) {
    return memoryCache;
  }

  // 2. Caché persistente en LocalStorage (evita peticiones al recargar o volver a entrar)
  if (!forceRefresh) {
    try {
      const stored = localStorage.getItem(CACHE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.timestamp && (now - parsed.timestamp < TTL_MS) && parsed.data) {
          memoryCache = parsed.data;
          memoryCacheTime = parsed.timestamp;
          return parsed.data;
        }
      }
    } catch (e) {}
  }

  // 3. Consultar a través del Backend en Vercel (servido con caché Edge y sin generar logs en Supabase)
  const apiUrl = import.meta.env.VITE_API_URL || 'https://voluntarios-backend.vercel.app';
  try {
    const res = await fetch(`${apiUrl}/api/portal/config${forceRefresh ? '?refresh=true' : ''}`);
    if (res.ok) {
      const data = await res.json();
      memoryCache = data;
      memoryCacheTime = now;
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: now, data }));
      } catch (e) {}
      return data;
    }
  } catch (backendErr) {
    console.warn('Backend /api/portal/config no disponible, usando respaldo:', backendErr);
  }

  // 4. Respaldo directo a Supabase sólo si el Backend falla
  try {
    const [popupRes, bannerRes] = await Promise.allSettled([
      supabase.from('portal_popup').select('*').eq('id', 1).maybeSingle(),
      supabase.from('configuracion_banners').select('*').eq('id', 'capacitaciones').maybeSingle()
    ]);

    const data = {
      popup: popupRes.status === 'fulfilled' && !popupRes.value.error ? popupRes.value.data : null,
      banner: bannerRes.status === 'fulfilled' && !bannerRes.value.error ? bannerRes.value.data : null
    };

    memoryCache = data;
    memoryCacheTime = now;
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: now, data }));
    } catch (e) {}
    return data;
  } catch (err) {
    console.warn('Error en respaldo de configuración:', err);
    return memoryCache || { popup: null, banner: null };
  }
}

/**
 * Invalida la caché local tras una modificación administrativa
 */
export function invalidatePortalConfig() {
  memoryCache = null;
  memoryCacheTime = 0;
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (e) {}
}

