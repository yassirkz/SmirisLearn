// src/App.jsx
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
// LANDING PAGE
// ============================================
import LandingPage from './pages/LandingPage'; // ← AJOUT

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
import PillarDetailPage from './pages/admin/PillarDetailPage';
import VideosPage from './pages/admin/VideosPage';
import VideoDetailPage from './pages/admin/VideoDetailPage';
import QuizPage from './pages/admin/QuizPage';
import GroupsPage from './pages/admin/GroupsPage';
import MembersPage from './pages/admin/MembersPage';

// ============================================
// STUDENT PAGES
// ============================================
import StudentDashboard from './pages/student/StudentDashboard';
import StudentLearningPage from './pages/student/StudentLearningPage';
import StudentVideoPage from './pages/student/StudentVideoPage';
import StudentQuizPage from './pages/student/StudentQuizPage';

function App() {
  const { user, loading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">
        <div className="text-center">
          <LoadingSpinner size="lg" color="primary" />
          <p className="mt-4 text-gray-600 dark:text-gray-400 animate-pulse">
            Chargement de votre session...
          </p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* ============================================
          ROUTES PUBLIQUES
      ============================================ */}
      <Route path="/" element={<LandingPage />} /> 
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="/accept-invite" element={<AcceptInvitePage />} />
      <Route path="/accept-member-invite" element={<AcceptInvitePage />} />

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

      {/* Routes Piliers */}
      <Route
        path="/admin/pillars"
        element={
          <ProtectedRoute allowedRoles={["super_admin", "org_admin"]}>
            <PillarsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/pillars/:id"
        element={
          <ProtectedRoute allowedRoles={["super_admin", "org_admin"]}>
            <PillarDetailPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/videos"
        element={
          <ProtectedRoute allowedRoles={["super_admin", "org_admin"]}>
            <VideosPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/videos/:id"
        element={
            <ProtectedRoute allowedRoles={["super_admin", "org_admin"]}>
                <VideoDetailPage />
            </ProtectedRoute>
        }
      />
      <Route
        path="/admin/quizzes"
        element={
            <ProtectedRoute allowedRoles={["super_admin", "org_admin"]}>
                <QuizPage />
            </ProtectedRoute>
        }
      />

      <Route
        path="/admin/groups"
        element={
            <ProtectedRoute allowedRoles={["super_admin", "org_admin"]}>
                <GroupsPage />
            </ProtectedRoute>
        }
      />

      <Route
        path="/admin/members"
        element={
            <ProtectedRoute allowedRoles={["super_admin", "org_admin"]}>
                <MembersPage />
            </ProtectedRoute>
        }
      />

      {/* ============================================
          STUDENT ROUTES
      ============================================ */}
      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRoles={["student", "super_admin", "org_admin"]}>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/learning"
        element={
          <ProtectedRoute allowedRoles={["student", "super_admin", "org_admin"]}>
            <StudentLearningPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/video/:id"
        element={
            <ProtectedRoute allowedRoles={["student", "super_admin", "org_admin"]}>
                <StudentVideoPage />
            </ProtectedRoute>
        }
      />
      <Route
        path="/student/quiz/:id"
        element={
            <ProtectedRoute allowedRoles={["student", "super_admin", "org_admin"]}>
                <StudentQuizPage />
            </ProtectedRoute>
        }
      />

      {/* 404 - Redirection vers l'accueil */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;