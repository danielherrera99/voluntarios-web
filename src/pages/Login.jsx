import React from 'react';
import { Link } from 'react-router-dom';

export default function Login() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div style={{
        maxWidth: '460px',
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: '1.5rem',
        padding: '3rem 2rem',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
        border: '1px solid #e2e8f0',
        textAlign: 'center'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          fontSize: '1.6rem',
          marginBottom: '1.25rem'
        }}>
          🔒
        </div>
        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: 800,
          color: '#1e293b',
          marginBottom: '0.5rem'
        }}>
          Iniciar Sesión
        </h1>
        <p style={{
          color: '#64748b',
          fontSize: '0.9rem',
          marginBottom: '2rem'
        }}>
          Lienzo de autenticación vacío listo para el nuevo diseño.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Link
            to="/loginleon"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '0.75rem 1.25rem',
              backgroundColor: '#991b1b',
              color: '#ffffff',
              borderRadius: '0.75rem',
              fontWeight: 600,
              textDecoration: 'none',
              fontSize: '0.85rem'
            }}
          >
            🏛️ Ir al Login Anterior (Visita León)
          </Link>
          <Link
            to="/"
            style={{
              color: '#64748b',
              textDecoration: 'none',
              fontSize: '0.82rem',
              fontWeight: 500
            }}
          >
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
