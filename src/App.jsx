// src/App.jsx
import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { useUserRole } from "./hooks/useUserRole";
import LoadingSpinner from "./components/ui/LoadingSpinner";

// Non-lazy (needed before routing)
import ProtectedRoute from "./components/auth/ProtectedRoute";
import ImpersonationBanner from "./components/layout/ImpersonationBanner";

// ============================================
// LAZY-LOADED PAGES (code-split)
// ============================================
const LoginPage = lazy(() => import("./pages/LoginPage"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const Unauthorized = lazy(() => import("./pages/Unauthorized"));
const AcceptInvitePage = lazy(() => import("./pages/AcceptInvitePage"));
const LandingPage = lazy(() => import("./pages/LandingPage"));

// Super Admin
const SuperAdminDashboard = lazy(() => import("./pages/super-admin/SuperAdminDashboard"));
const SuperAdminCompanies = lazy(() => import("./pages/super-admin/SuperAdminCompanies"));
const SuperAdminCompanyDetail = lazy(() => import("./pages/super-admin/SuperAdminCompanyDetail"));
const SuperAdminUsers = lazy(() => import("./pages/super-admin/SuperAdminUsers"));
const SuperAdminSettings = lazy(() => import("./pages/super-admin/SuperAdminSettings"));

// Admin
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const PillarsPage = lazy(() => import("./pages/admin/PillarsPage"));
const PillarDetailPage = lazy(() => import("./pages/admin/PillarDetailPage"));
const VideosPage = lazy(() => import("./pages/admin/VideosPage"));
const VideoDetailPage = lazy(() => import("./pages/admin/VideoDetailPage"));
const QuizPage = lazy(() => import("./pages/admin/QuizPage"));
const GroupsPage = lazy(() => import("./pages/admin/GroupsPage"));
const MembersPage = lazy(() => import("./pages/admin/MembersPage"));

// Student
const StudentDashboard = lazy(() => import("./pages/student/StudentDashboard"));
const StudentLearningPage = lazy(() => import("./pages/student/StudentLearningPage"));
const StudentVideoPage = lazy(() => import("./pages/student/StudentVideoPage"));
const StudentQuizPage = lazy(() => import("./pages/student/StudentQuizPage"));

function App() {
  const { user, loading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-primary-50 dark:from-secondary-950 dark:to-secondary-900 transition-colors duration-300">
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
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-primary-50 dark:from-secondary-950 dark:to-secondary-900">
        <LoadingSpinner size="lg" color="primary" />
      </div>
    }>
    <ImpersonationBanner />
    <Routes>
      {/* ============================================
          ROUTES PUBLIQUES
      ============================================ */}
      <Route
        path="/"
        element={
          !user ? (
            <LandingPage />
          ) : role === "super_admin" ? (
            <Navigate to="/super-admin" replace />
          ) : role === "org_admin" ? (
            <Navigate to="/admin" replace />
          ) : (
            <Navigate to="/student" replace />
          )
        }
      />      
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
    </Suspense>
  );
}

export default App;