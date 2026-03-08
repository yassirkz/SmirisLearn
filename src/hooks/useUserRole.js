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
        console.log('🔍 Recherche rôle pour:', user.id)
        
        // 1. chercher dans la table profiles
        let roleValue = null
        
        console.log('  - Cherche dans la table profiles...')
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle() 

        console.log('  - Résultat profiles:', { data, error })

        if (!error && data) {
          roleValue = data.role
          console.log('  - Rôle trouvé dans profiles:', roleValue)
        } else if (error) {
          console.error('  - Erreur query profiles:', error)
        }

        // Fallback vers user_metadata si pas dans profiles
        if (!roleValue) {
          roleValue = user?.user_metadata?.role
          console.log('  - Fallback vers user_metadata:', roleValue)
        }

        //  Si toujours pas de rôle, utiliser 'student' par défaut
        const finalRole = roleValue || 'student'
        console.log('  - Rôle final:', finalRole)
        setRole(finalRole)

        // Mettre à jour user_metadata pour qu'il soit cohérent avec profiles
        if (data && user?.user_metadata?.role !== data.role) {
          console.log(' - Mise à jour des métadonnées...')
          await supabase.auth.updateUser({
            data: { role: data.role }
          })
        }

      } catch (err) {
        console.error('Erreur récupération rôle:', err)
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