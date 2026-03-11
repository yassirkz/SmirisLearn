import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { useUserRole } from "./hooks/useUserRole";
import LoginPage from "./pages/LoginPage";
import AuthCallback from "./pages/AuthCallback";
import Unauthorized from "./pages/Unauthorized";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import LoadingSpinner from "./components/ui/LoadingSpinner";
import AcceptInvitePage from './pages/AcceptInvitePage';
// ============================================
// SUPER ADMIN PAGES
// ============================================
import SuperAdminDashboard from "./pages/super-admin/SuperAdminDashboard";
import SuperAdminCompanies from "./pages/super-admin/SuperAdminCompanies";
import SuperAdminCompanyDetail from "./pages/super-admin/SuperAdminCompanyDetail";
import SuperAdminUsers from "./pages/super-admin/SuperAdminUsers";
import SuperAdminSettings from "./pages/super-admin/SuperAdminSettings";
// ============================================
// ADMIN ENTREPRISE PAGES
// ============================================
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminSettings from './pages/admin/AdminSettings';
import PillarsPage from './pages/admin/PillarsPage';
// ============================================
// STUDENT PAGES
// ============================================
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
      {/* ============================================
          ROUTES PUBLIQUES
      ============================================ */}
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="/accept-invite" element={<AcceptInvitePage />} />

      {/* ============================================
          SUPER ADMIN ROUTES
      ============================================ */}
      <Route
        path="/super-admin/companies/:id"
        element={
          <ProtectedRoute allowedRoles={["super_admin"]}>
            <SuperAdminCompanyDetail />
          </ProtectedRoute>
        }
      />

      <Route
        path="/super-admin/companies"
        element={
          <ProtectedRoute allowedRoles={["super_admin"]}>
            <SuperAdminCompanies />
          </ProtectedRoute>
        }
      />

      <Route
        path="/super-admin/users"
        element={
          <ProtectedRoute allowedRoles={["super_admin"]}>
            <SuperAdminUsers />
          </ProtectedRoute>
        }
      />

      <Route
        path="/super-admin/settings"
        element={
          <ProtectedRoute allowedRoles={["super_admin"]}>
            <SuperAdminSettings />
          </ProtectedRoute>
        }
      />

      <Route
        path="/super-admin"
        element={
          <ProtectedRoute allowedRoles={["super_admin"]}>
            <SuperAdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* ============================================
          ADMIN ENTREPRISE ROUTES
      ============================================ */}
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

      <Route
        path="/admin/pillars"
        element={
          <ProtectedRoute allowedRoles={["super_admin", "org_admin"]}>
            <PillarsPage />
          </ProtectedRoute>
        }
      />

      {/* ============================================
          STUDENT ROUTES
      ============================================ */}
      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRoles={["super_admin", "org_admin", "student"]}>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />

      {/* ============================================
          REDIRECTIONS
      ============================================ */}
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

      {/* 404 - Redirection vers l'accueil */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;