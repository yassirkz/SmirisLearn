import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { 
  Chrome, Mail, Shield, Zap, Sparkles, 
  AlertCircle, CheckCircle, Loader2 
} from 'lucide-react';
import { useToast } from '../ui/Toast';

export default function AuthButtons() {
  const { signInWithGoogle } = useAuth();
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [showSecurity, setShowSecurity] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      
      // Animation de sécurité
      setShowSecurity(true);
      
      const { data, error } = await signInWithGoogle();
      
      if (error) {
        throw error;
      }

      // La redirection est gérée par Supabase
      // On montre juste un message de succès avant redirection
      success('Redirection vers Google...', {
        duration: 2000,
        icon: Chrome
      });

    } catch (error) {
      console.error('Erreur connexion Google:', error);
      
      showError(error.message || 'Erreur lors de la connexion avec Google', {
        duration: 5000,
        action: () => window.location.reload(),
        actionLabel: 'Réessayer'
      });
    } finally {
      setLoading(false);
      setTimeout(() => setShowSecurity(false), 1000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Bouton Google avec animations avancées */}
      <motion.button
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="group relative w-full overflow-hidden rounded-2xl bg-white px-6 py-4 
                   border-2 border-gray-200 hover:border-blue-300 
                   disabled:opacity-50 disabled:cursor-not-allowed
                   transition-all duration-300 shadow-lg hover:shadow-xl"
      >
        {/* Effet de shine */}
        <motion.div
          animate={loading ? { x: ['-100%', '100%'] } : {}}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-200/30 to-transparent"
        />

        {/* Effet de glow */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 blur-xl" />
        </div>

        {/* Contenu */}
        <div className="relative flex items-center justify-center gap-3">
          {/* Logo Google avec animation */}
          <motion.div
            animate={loading ? { rotate: 360 } : {}}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 text-blue-600" />
            ) : (
              <Chrome className="w-5 h-5 text-blue-600" />
            )}
          </motion.div>

          <span className="text-gray-700 font-semibold group-hover:text-gray-900 transition-colors">
            {loading ? 'Connexion en cours...' : 'Continuer avec Google'}
          </span>

          {/* Badge de sécurité animé */}
          <AnimatePresence>
            {showSecurity && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="absolute -right-2 -top-2"
              >
                <div className="relative">
                  <Shield className="w-4 h-4 text-green-500" />
                  <motion.div
                    animate={{ scale: [1, 1.5, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="absolute inset-0 bg-green-500 rounded-full blur opacity-50"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.button>

      {/* Séparateur animé */}
      <div className="relative my-6">
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.2 }}
          className="absolute inset-0 flex items-center"
        >
          <div className="w-full border-t border-gray-200" />
        </motion.div>
        <div className="relative flex justify-center text-sm">
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.3 }}
            className="px-4 bg-white text-gray-400 font-medium"
          >
            ou
          </motion.span>
        </div>
      </div>

      {/* Message d'information sécurisé */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-center space-y-2"
      >
        <p className="text-sm text-gray-600 flex items-center justify-center gap-2">
          <Mail className="w-4 h-4 text-gray-400" />
          Utilisez votre adresse email ci-dessous
        </p>

        {/* Badges de sécurité */}
        <motion.div
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex items-center justify-center gap-4 text-xs text-gray-400"
        >
          <div className="flex items-center gap-1">
            <Shield className="w-3 h-3 text-green-400" />
            <span>Chiffré</span>
          </div>
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-blue-400" />
            <span>Rapide</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-purple-400" />
            <span>Sécurisé</span>
          </div>
        </motion.div>

        {/* Message de sécurité (apparaît au hover) */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 rounded-full cursor-help"
        >
          <Sparkles className="w-3 h-3 text-blue-500" />
          <span className="text-xs text-blue-600">Connexion 2FA disponible</span>
        </motion.div>
      </motion.div>
    </div>
  );
}