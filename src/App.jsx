import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ResponsableDashboard from './pages/ResponsableDashboard';
import LiderDashboard from './pages/LiderDashboard';
import GuiaDashboard from './pages/GuiaDashboard';
import ConsultaVoluntariado from './pages/ConsultaVoluntariado';
import InstallPwaBanner from './components/InstallPwaBanner';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const DashboardRouter = () => {
  const { user } = useAuth();
  if (user?.rol === 'responsable') return <ResponsableDashboard />;
  if (user?.rol === 'lider') return <LiderDashboard />;
  if (user?.rol === 'guia') return <GuiaDashboard />;
  return <Dashboard />;
};

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Portal Público de Consulta de Voluntariado */}
      <Route path="/" element={<ConsultaVoluntariado />} />
      <Route path="/consulta" element={<ConsultaVoluntariado />} />

      {/* Acceso Administrativo y Jerárquico */}
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <DashboardRouter />
          </ProtectedRoute>
        } 
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <AppRoutes />
        <InstallPwaBanner />
      </Router>
    </AuthProvider>
  );
}

export default App;
