import { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Al cargar la app, revisamos si hay un token guardado en localStorage
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Error parseando usuario guardado:', e);
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://voluntarios-backend.onrender.com';
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.msg || 'Error al iniciar sesión' };
      }

      // Guardar en LocalStorage (Estilo Jufra)
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      setUser(data.user);
      return { error: null };
    } catch (err) {
      console.error(err);
      return { error: 'Error de conexión con el servidor' };
    }
  };

  const register = async ({ nombre, email, password, telefono }) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://voluntarios-backend.onrender.com';
      const response = await fetch(`${apiUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, email, password, telefono })
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

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {!loading ? children : <div className="loader-container"><div className="loader"></div></div>}
    </AuthContext.Provider>
  );
};
