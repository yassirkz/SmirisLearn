import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { useUserRole } from "./hooks/useUserRole";
import LoginPage from "./pages/LoginPage";
import AuthCallback from "./pages/AuthCallback";
import Unauthorized from "./pages/Unauthorized";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import LoadingSpinner from "./components/ui/LoadingSpinner";
import SuperAdminDashboard from "./pages/super-admin/SuperAdminDashboard";
import AcceptInvitePage from './pages/AcceptInvitePage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminSettings from './pages/admin/AdminSettings';

function StudentDashboard() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Espace Étudiant</h1>
      <p className="text-gray-600">Vos formations</p>
    </div>
  );
}

function App() {
  const { user, loading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" color="primary" />
          <p className="mt-4 text-gray-600">Chargement de votre session...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Routes publiques */}
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="/accept-invite" element={<AcceptInvitePage />} />

      {/* Super Admin */}
      <Route
        path="/super-admin"
        element={
          <ProtectedRoute allowedRoles={["super_admin"]}>
            <SuperAdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* Admin Entreprise */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["super_admin", "org_admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/settings" 
        element={
          <ProtectedRoute allowedRoles={["super_admin", "org_admin"]}>
            <AdminSettings />
          </ProtectedRoute>
        }
      />

      {/* Étudiant */}
      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRoles={["super_admin", "org_admin", "student"]}>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />

      {/* Redirections */}
      <Route
        path="/"
        element={
          !user ? (
            <Navigate to="/login" replace />
          ) : role === "super_admin" ? (
            <Navigate to="/super-admin" replace />
          ) : role === "org_admin" ? (
            <Navigate to="/admin" replace />
          ) : (
            <Navigate to="/student" replace />
          )
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;