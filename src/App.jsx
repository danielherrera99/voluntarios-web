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

// Si se abre desde la App instalada en el celular (PWA standalone), abre directo en Login / Dashboard.
// Si se abre desde un navegador web normal (Render o diocesischiclayo.org), muestra la Consulta Pública.
const PublicOrPwaRoot = () => {
  const { user } = useAuth();
  
  const isStandalone = 
    typeof window !== 'undefined' && 
    (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true);

  if (isStandalone) {
    return <Navigate to={user ? "/dashboard" : "/login"} replace />;
  }

  return <ConsultaVoluntariado />;
};

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Portal Público de Consulta (o Login si es la App instalada) */}
      <Route path="/" element={<PublicOrPwaRoot />} />
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
