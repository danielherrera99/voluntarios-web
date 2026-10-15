import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import { LogOut, Users } from 'lucide-react';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [voluntarios, setVoluntarios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVoluntarios();
  }, []);

  const fetchVoluntarios = async () => {
    try {
      const { data, error } = await supabase
        .from('voluntarios')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setVoluntarios(data || []);
    } catch (error) {
      console.error('Error fetching data:', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="logo">
          <Users size={24} />
          Voluntariado Chiclayo
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{user?.email}</span>
          <button onClick={logout} className="btn" style={{ background: '#f1f5f9', color: 'var(--color-text)' }}>
            <LogOut size={16} /> Salir
          </button>
        </div>
      </nav>

      <main className="main-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2>Directorio de Voluntarios</h2>
          <div className="card" style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontWeight: 600, fontSize: '1.25rem', color: 'var(--color-primary)' }}>{voluntarios.length}</span>
            <span style={{ color: 'var(--color-text-muted)' }}>Inscritos</span>
          </div>
        </div>

        <div className="table-container">
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>Cargando voluntarios...</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Nombres y Apellidos</th>
                  <th>DNI</th>
                  <th>Correo</th>
                  <th>Teléfono</th>
                  <th>Servicio/Grupo</th>
                  <th>Fase</th>
                </tr>
              </thead>
              <tbody>
                {voluntarios.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No hay registros aún.</td>
                  </tr>
                ) : (
                  voluntarios.map(v => (
                    <tr key={v.id}>
                      <td style={{ fontWeight: 500 }}>{v.nombres_apellidos}</td>
                      <td>{v.dni}</td>
                      <td>{v.correo}</td>
                      <td>{v.telefono}</td>
                      <td>{v.grupo_integra || '-'}</td>
                      <td>
                        <span style={{ 
                          padding: '0.25rem 0.5rem', 
                          borderRadius: '999px', 
                          fontSize: '0.75rem', 
                          background: v.info_validada ? '#dcfce7' : '#fef3c7',
                          color: v.info_validada ? '#166534' : '#92400e'
                        }}>
                          {v.info_validada ? 'Validado' : 'Pendiente'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
