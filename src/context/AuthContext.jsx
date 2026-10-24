import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

/**
 * Decodifica de forma segura la carga útil de un token JWT en el navegador
 */
const parseJwt = (token) => {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

/**
 * Verifica si el token ya superó su tiempo de expiración
 */
const isTokenExpired = (token) => {
  if (!token) return true;
  const decoded = parseJwt(token);
  if (!decoded || !decoded.exp) return false;
  return Date.now() >= decoded.exp * 1000;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback((reason = null) => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    if (reason) {
      sessionStorage.setItem('logout_reason', reason);
    }
  }, []);

  useEffect(() => {
    // Al cargar la app, revisamos si hay un token guardado en localStorage
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (token && savedUser) {
      if (isTokenExpired(token)) {
        logout('Tu sesión ha caducado automáticamente por seguridad (límite de 8 horas). Por favor ingresa nuevamente.');
      } else {
        try {
          setUser(JSON.parse(savedUser));
        } catch (e) {
          console.error('Error parseando usuario guardado:', e);
          logout();
        }
      }
    }
    setLoading(false);

    // Verificación proactiva periódica de expiración cada 60 segundos
    const checkInterval = setInterval(() => {
      const activeToken = localStorage.getItem('token');
      if (activeToken && isTokenExpired(activeToken)) {
        logout('Tu sesión ha caducado automáticamente por seguridad (límite de 8 horas). Por favor ingresa nuevamente.');
      }
    }, 60000);

    return () => clearInterval(checkInterval);
  }, [logout]);

  const login = async (email, password) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://voluntarios-backend.vercel.app';
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.msg || 'Error al iniciar sesión' };
      }

      // Guardar en LocalStorage con sesión segura de 8 horas
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      setUser(data.user);
      return { error: null };
    } catch (err) {
      console.error(err);
      return { error: 'Error de conexión con el servidor' };
    }
  };

  const register = async ({ dni, nombre, email, password, telefono }) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://voluntarios-backend.vercel.app';
      const response = await fetch(`${apiUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dni, nombre, email, password, telefono })
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.msg || 'Error al enviar solicitud de registro' };
      }

      return { success: true, msg: data.msg };
    } catch (err) {
      console.error(err);
      return { error: 'Error de conexión con el servidor' };
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, isTokenExpired }}>
      {!loading ? children : <div className="loader-container"><div className="loader"></div></div>}
    </AuthContext.Provider>
  );
};
