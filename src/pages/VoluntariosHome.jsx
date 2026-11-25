import React from 'react';
import { Link } from 'react-router-dom';

export default function VoluntariosHome() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Lienzo limpio para la nueva experiencia de Voluntarios (Pastoral Juvenil) */}
      <main style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div style={{
          maxWidth: '600px',
          padding: '3rem 2rem',
          backgroundColor: '#ffffff',
          borderRadius: '1.5rem',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            fontSize: '1.8rem',
            marginBottom: '1.5rem'
          }}>
            ✝️
          </div>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: '#1e293b',
            marginBottom: '0.75rem'
          }}>
            Pastoral Juvenil — Diócesis de Chiclayo
          </h1>
          <p style={{
            color: '#64748b',
            fontSize: '1rem',
            lineHeight: 1.6,
            marginBottom: '2rem'
          }}>
            Lienzo principal de Voluntariado preparado para el nuevo diseño.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link 
              to="/visitaleon" 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0.75rem 1.5rem',
                backgroundColor: '#991b1b',
                color: '#ffffff',
                borderRadius: '0.75rem',
                fontWeight: 600,
                textDecoration: 'none',
                fontSize: '0.9rem',
                transition: 'all 0.2s'
              }}
            >
              🏛️ Ir a Consulta Visita León
            </Link>

            <Link 
              to="/login" 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0.75rem 1.5rem',
                backgroundColor: '#f1f5f9',
                color: '#334155',
                borderRadius: '0.75rem',
                fontWeight: 600,
                textDecoration: 'none',
                fontSize: '0.9rem',
                border: '1px solid #cbd5e1'
              }}
            >
              🔒 Acceso Interno
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
