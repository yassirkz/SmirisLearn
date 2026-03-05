import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useUserRole } from '../../hooks/useUserRole'
import LoadingSpinner from '../ui/LoadingSpinner'

/**
 * Composant pour protéger les routes
 * @param {Object} props
 * @param {React.ReactNode} props.children - Composant à protéger
 * @param {Array} props.allowedRoles - Rôles autorisés (ex: ['super_admin', 'org_admin'])
 * @param {string} props.redirectTo - URL de redirection si non autorisé
 */
export default function ProtectedRoute({ 
  children, 
  allowedRoles = [], 
  redirectTo = '/login' 
}) {
  const { user, loading: authLoading } = useAuth()
  const { role, loading: roleLoading } = useUserRole()

  // Afficher un loader pendant la vérification
  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" color="primary" />
      </div>
    )
  }

  // Si pas d'utilisateur, rediriger vers login
  if (!user) {
    return <Navigate to={redirectTo} replace />
  }

  // Si des rôles sont spécifiés et que l'utilisateur n'a pas le bon rôle
  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />
  }

  // Tout est bon, afficher le composant
  return children
}