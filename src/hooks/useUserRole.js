import { useUserRole as useUserRoleFromContext } from '../contexts/UserRoleContext';

/**
 * Hook personnalisé pour récupérer le rôle de l'utilisateur.
 * Branche désormais les appels sur le UserRoleContext pour de meilleures performances (cache global).
 */
export function useUserRole() {
  return useUserRoleFromContext();
}