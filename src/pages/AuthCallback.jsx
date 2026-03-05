import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion'

export default function AuthCallback() {
    const navigate = useNavigate()
    const [error, setError] = useState(null)
    const [retryCount, setRetryCount] = useState(0)

    useEffect(() => {
        let mounted = true
        let timeoutId

        const handleCallback = async () => {
        try {
            // Timeout de sécurité (10 secondes max)
            timeoutId = setTimeout(() => {
            if (mounted) {
                setError('Délai d\'attente dépassé. Veuillez réessayer.')
                setTimeout(() => navigate('/login'), 3000)
            }
            }, 10000)

            // Récupérer la session après le retour de Google
            const { data: { session }, error: sessionError } = await supabase.auth.getSession()
            
            clearTimeout(timeoutId)

            if (sessionError) {
            console.error('Erreur session:', sessionError)
            if (mounted) {
                setError('Erreur lors de la récupération de la session')
                setTimeout(() => navigate('/login'), 3000)
            }
            return
            }

            if (session) {
            // Connexion réussie
            if (mounted) {
                // Petit délai pour montrer l'animation
                setTimeout(() => navigate('/'), 1500)
            }
            } else {
            // Pas de session
            if (mounted) {
                setError('Aucune session trouvée')
                setTimeout(() => navigate('/login'), 3000)
            }
            }
        } catch (err) {
            console.error('Erreur inattendue:', err)
            if (mounted) {
            setError('Une erreur inattendue est survenue')
            setTimeout(() => navigate('/login'), 3000)
            }
        }
        }

        handleCallback()

        return () => {
        mounted = false
        if (timeoutId) clearTimeout(timeoutId)
        }
    }, [navigate, retryCount])

    // Fonction pour réessayer manuellement
    const handleRetry = () => {
        setError(null)
        setRetryCount(prev => prev + 1)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center bg-white p-8 rounded-2xl shadow-xl border border-blue-100 max-w-md w-full"
        >
            {error ? (
            // Affichage d'erreur
            <>
                <div className="w-20 h-20 bg-red-100 rounded-full mx-auto mb-6 flex items-center justify-center">
                <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                </div>
                
                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                Oups ! Une erreur est survenue
                </h2>
                
                <p className="text-gray-600 text-sm mb-6">
                {error}
                </p>
                
                <button
                onClick={handleRetry}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                >
                Réessayer
                </button>
            </>
            ) : (
            // Chargement
            <>
                {/* Spinner animé */}
                <div className="relative mx-auto w-20 h-20 mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-blue-200"></div>
                <motion.div 
                    className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                </div>
                
                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                Authentification en cours
                </h2>
                
                <p className="text-gray-500 text-sm mb-4">
                Veuillez patienter pendant que nous finalisons votre connexion...
                </p>
                
                {/* Points d'animation */}
                <div className="flex justify-center gap-2">
                {[1, 2, 3].map((i) => (
                    <motion.div
                    key={i}
                    className="w-2 h-2 bg-blue-500 rounded-full"
                    animate={{ y: [0, -5, 0] }}
                    transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: i * 0.15,
                    }}
                    />
                ))}
                </div>

                {/* Message de sécurité */}
                <p className="text-xs text-gray-400 mt-6">
                🔒 Connexion sécurisée via Google
                </p>
            </>
            )}
        </motion.div>
        </div>
    )
}