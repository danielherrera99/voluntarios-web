import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthView } from '../components/pastoral/AuthView';

export default function Login() {
  const navigate = useNavigate();

  function handleAuthenticated(authenticatedUser) {
    localStorage.setItem('user', JSON.stringify(authenticatedUser));
    navigate('/dashboard');
    window.location.reload();
  }

  return (
    <AuthView
      onAuthenticated={handleAuthenticated}
      onBackToPublic={() => navigate('/')}
    />
  );
}
