import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { useUserRole } from "./hooks/useUserRole";
import LoginPage from "./pages/LoginPage";
import AuthCallback from "./pages/AuthCallback";
import Unauthorized from "./pages/Unauthorized";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import LoadingSpinner from "./components/ui/LoadingSpinner";
import SuperAdminDashboard from "./pages/super-admin/SuperAdminDashboard";

// Pages temporaires pour les dashboards
function AdminDashboard() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Dashboard Admin Entreprise</h1>
      <p className="text-gray-600">Gestion de votre entreprise</p>
    </div>
  );
}

function StudentDashboard() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Espace Étudiant</h1>
      <p className="text-gray-600">Vos formations</p>
    </div>
  );
}

function HomePage() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Bienvenue sur Smiris Learn
        </h1>
        <p className="text-gray-600">Connecté en tant que : {user?.email}</p>
      </div>
    </div>
  );
}

function App() {
  const { user, loading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();

  // Afficher un loader pendant la vérification de session
  if (loading || roleLoading) {
    console.log("👤 Utilisateur connecté:", user?.email);
    console.log("🎭 Rôle depuis useUserRole:", role);
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

      {/* Routes protégées - Super Admin uniquement */}
      <Route
        path="/super-admin"
        element={
          <ProtectedRoute allowedRoles={["super_admin"]}>
            <SuperAdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/super-admin/*"
        element={
          <ProtectedRoute allowedRoles={["super_admin"]}>
            <div>Sous-routes Super Admin</div>
          </ProtectedRoute>
        }
      />

      {/* Routes protégées - Admin Entreprise (ou Super Admin) */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["super_admin", "org_admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRoles={["super_admin", "org_admin"]}>
            <div>Sous-routes Admin</div>
          </ProtectedRoute>
        }
      />

      {/* Routes protégées - Étudiant (tout utilisateur connecté) */}
      <Route
        path="/student"
        element={
          <ProtectedRoute
            allowedRoles={["super_admin", "org_admin", "student"]}
          >
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/*"
        element={
          <ProtectedRoute
            allowedRoles={["super_admin", "org_admin", "student"]}
          >
            <div>Sous-routes Étudiant</div>
          </ProtectedRoute>
        }
      />

      {/* Page d'accueil - Redirection selon le rôle */}
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

      {/* Redirection 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
