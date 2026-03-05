import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import LoginPage from './pages/LoginPage'
import AuthCallback from './pages/AuthCallback'

function HomePage() {
  const { user } = useAuth()
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-blue-100">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
            <span className="text-xl font-bold text-white">S</span>
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
              Smiris Learn
            </h1>
            <p className="text-sm text-gray-500">
              Plateforme de formation sécurisée
            </p>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Bienvenue sur votre espace
          </h2>
          
          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <p className="text-gray-700">
              <span className="font-medium">Connecté en tant que :</span>{' '}
              <span className="text-blue-600">{user?.email}</span>
            </p>
            <p className="text-sm text-gray-500 mt-1">
              ID: {user?.id?.substring(0, 8)}...
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="bg-green-50 text-green-700 px-3 py-1.5 rounded-lg text-sm border border-green-200">
              ✅ Authentification sécurisée
            </div>
            <div className="bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg text-sm border border-purple-200">
              🔒 Session active
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function App() {
  const { user, loading } = useAuth()

  // Afficher un loader pendant la vérification de session
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="relative mx-auto w-16 h-16 mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-blue-200"></div>
            <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
          </div>
          <p className="text-gray-600">Chargement de votre session...</p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      {/* Route pour le callback Google */}
      <Route path="/auth/callback" element={<AuthCallback />} />
      
      {/* Page de login - accessible seulement si non connecté */}
      <Route path="/login" element={
        user ? <Navigate to="/" replace /> : <LoginPage />
      } />
      
      {/* Page d'accueil - accessible seulement si connecté */}
      <Route path="/" element={
        user ? <HomePage /> : <Navigate to="/login" replace />
      } />
      
      {/* Redirection pour les routes inconnues */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App