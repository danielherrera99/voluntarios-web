import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PublicPortal } from '../components/pastoral/PublicPortal';

export default function VoluntariosHome() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <PublicPortal
      onOpenLogin={() => navigate(user ? '/dashboard' : '/login')}
      isAuthenticated={Boolean(user)}
    />
  );
}
