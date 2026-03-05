import { useAuth } from './useAuth'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useUserRole() {
  const { user } = useAuth()
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setRole(null)
      setLoading(false)
      return
    }

    const fetchUserRole = async () => {
      try {
        // 1. D'abord, chercher dans user_metadata
        let roleValue = user?.user_metadata?.role
        console.log('🔍 Recherche rôle pour:', user.id)
        console.log('  - user_metadata.role:', roleValue)

        // 2. Si pas dans user_metadata, chercher dans la table profiles
        if (!roleValue) {
          console.log('  - Cherche dans la table profiles...')
          const { data, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)

          console.log('  - Résultat profiles:', { data, error })

          if (!error && data && data.length > 0) {
            roleValue = data[0].role
            console.log('  - Rôle trouvé dans profiles:', roleValue)
          } else if (error) {
            console.error('  - Erreur query profiles:', error)
          }
        }

        // 3. Sinon, rôle par défaut
        const finalRole = roleValue || 'student'
        console.log('  - Rôle final:', finalRole)
        setRole(finalRole)
      } catch (err) {
        console.error('❌ Erreur récupération rôle:', err)
        setRole('student')
      } finally {
        setLoading(false)
      }
    }

    fetchUserRole()
  }, [user])

  return {
    role,
    isSuperAdmin: role === 'super_admin',
    isOrgAdmin: role === 'org_admin',
    isStudent: role === 'student',
    organizationId: user?.user_metadata?.organization_id || null,
    loading
  }
}