// src/hooks/useUserRole.js - Version simplifiée
import { useAuth } from './useAuth'

export function useUserRole() {
    const { user } = useAuth()
    
    if (!user) {
        return {
        role: null,
        isSuperAdmin: false,
        isOrgAdmin: false,
        isStudent: false,
        organizationId: null,
        loading: false
        }
    }

    const role = user?.user_metadata?.role || 'student'
    const organizationId = user?.user_metadata?.organization_id || null

    return {
        role,
        isSuperAdmin: role === 'super_admin',
        isOrgAdmin: role === 'org_admin',
        isStudent: role === 'student',
        organizationId,
        loading: false
    }
}