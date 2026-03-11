import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, Home, ArrowLeft, AlertTriangle, 
  Lock, Clock, RefreshCw, Mail, Phone,
  MessageCircle, XCircle, HelpCircle, User,
  Building2, Key, Zap, Sparkles, ChevronRight,
  ShieldAlert, Fingerprint, Eye, EyeOff
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useUserRole } from '../hooks/useUserRole';
import { supabase } from '../lib/supabase';

// Configuration des redirections par rôle
const REDIRECTS = {
  super_admin: '/super-admin',
  org_admin: '/admin',
  student: '/student',
  default: '/login'
};

// Messages personnalisés par type d'erreur
const ERROR_MESSAGES = {
  'insufficient_permissions': {
    title: 'Permissions insuffisantes',
    message: 'Vous n\'avez pas les droits nécessaires pour accéder à cette ressource.',
    icon: ShieldAlert,
    color: 'from-red-500 to-pink-500',
    solution: 'Contactez votre administrateur pour demander des droits supplémentaires.'
  },
  'session_expired': {
    title: 'Session expirée',
    message: 'Votre session a expiré. Veuillez vous reconnecter.',
    icon: Clock,
    color: 'from-orange-500 to-amber-500',
    solution: 'Connectez-vous à nouveau pour continuer.'
  },
  'resource_not_found': {
    title: 'Ressource introuvable',
    message: 'La page ou la ressource demandée n\'existe pas.',
    icon: XCircle,
    color: 'from-gray-500 to-gray-600',
    solution: 'Vérifiez l\'URL ou retournez à l\'accueil.'
  },
  'organization_inactive': {
    title: 'Organisation inactive',
    message: 'Votre organisation n\'est plus active.',
    icon: Building2,
    color: 'from-purple-500 to-indigo-500',
    solution: 'Contactez le support pour réactiver votre abonnement.'
  },
  'trial_expired': {
    title: 'Période d\'essai expirée',
    message: 'La période d\'essai de votre organisation est terminée.',
    icon: Zap,
    color: 'from-yellow-500 to-orange-500',
    solution: 'Choisissez un plan pour continuer à utiliser la plateforme.'
  },
  'maintenance_mode': {
    title: 'Mode maintenance',
    message: 'La plateforme est actuellement en maintenance.',
    icon: Shield,
    color: 'from-blue-500 to-cyan-500',
    solution: 'Réessayez dans quelques minutes.'
  },
  'default': {
    title: 'Accès non autorisé',
    message: 'Vous n\'avez pas les permissions nécessaires.',
    icon: Lock,
    color: 'from-red-500 to-pink-500',
    solution: 'Vérifiez vos identifiants ou contactez le support.'
  }
};

export default function Unauthorized() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  
  // États dynamiques
  const [countdown, setCountdown] = useState(10);
  const [showSupport, setShowSupport] = useState(false);
  const [error, setError] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [suggestedActions, setSuggestedActions] = useState([]);
  const [showDetails, setShowDetails] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Récupérer les paramètres de l'erreur depuis l'URL ou le state
  const errorType = location.state?.errorType || 'default';
  const from = location.state?.from || location.search?.get('from') || '/';
  const requiredRole = location.state?.requiredRole || null;
  const config = ERROR_MESSAGES[errorType] || ERROR_MESSAGES.default;
  const Icon = config.icon;

  // ============================================
  // CHARGEMENT DYNAMIQUE DES INFORMATIONS
  // ============================================
  useEffect(() => {
    const loadDynamicData = async () => {
      try {
        if (user) {
          // Récupérer les infos de l'organisation
          const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id, full_name')
            .eq('id', user.id)
            .single();

          if (profile?.organization_id) {
            const { data: org } = await supabase
              .from('organizations')
              .select('name, plan_type, subscription_status, trial_ends_at')
              .eq('id', profile.organization_id)
              .single();

            if (org) {
              setOrganization(org);
            }
          }

          // Générer des suggestions dynamiques
          const actions = [];
          
          if (role === 'student' && requiredRole === 'org_admin') {
            actions.push({
              label: 'Demander les droits admin',
              action: () => handleRequestAccess('org_admin'),
              icon: Key,
              color: 'purple'
            });
          }

          if (organization?.subscription_status === 'trial') {
            const daysLeft = Math.ceil((new Date(organization.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24));
            if (daysLeft <= 3) {
              actions.push({
                label: `Prolonger l'essai (${daysLeft}j restants)`,
                action: () => navigate('/admin/settings?tab=billing'),
                icon: Zap,
                color: 'orange'
              });
            }
          }

          setSuggestedActions(actions);
        }
      } catch (err) {
        console.error('Erreur chargement données:', err);
      }
    };

    loadDynamicData();
  }, [user, role, requiredRole, organization]);

  // ============================================
  // COMPTE À REBOURS INTELLIGENT
  // ============================================
  useEffect(() => {
    // Pas de redirection si c'est une erreur critique
    if (errorType === 'maintenance_mode' || errorType === 'organization_inactive') {
      return;
    }

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      handleSmartRedirect();
    }
  }, [countdown, errorType]);

  // ============================================
  // REDIRECTION INTELLIGENTE
  // ============================================
  const handleSmartRedirect = () => {
    if (user && role) {
      // Rediriger vers le dashboard approprié
      const redirectPath = REDIRECTS[role] || REDIRECTS.default;
      navigate(redirectPath);
    } else {
      navigate('/login', { 
        state: { 
          from: location.pathname,
          message: 'Veuillez vous connecter pour continuer'
        } 
      });
    }
  };

  // ============================================
  // DEMANDE D'ACCÈS
  // ============================================
  const handleRequestAccess = async (requestedRole) => {
    try {
      setIsRefreshing(true);
      
      // Envoyer une notification à l'admin
      if (organization) {
        const { error } = await supabase
          .from('access_requests')
          .insert({
            user_id: user.id,
            organization_id: organization.id,
            requested_role: requestedRole,
            status: 'pending'
          });

        if (!error) {
          setError(null);
          alert('Demande envoyée ! Un administrateur va examiner votre requête.');
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsRefreshing(false);
    }
  };

  // ============================================
  // RAFRAÎCHIR LA SESSION
  // ============================================
  const handleRefreshSession = async () => {
    try {
      setIsRefreshing(true);
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) throw refreshError;
      window.location.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsRefreshing(false);
    }
  };

  // ============================================
  // DÉCONNEXION
  // ============================================
  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login', { 
        state: { message: 'Vous avez été déconnecté' }
      });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Particules animées dynamiques */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(errorType === 'maintenance_mode' ? 30 : 20)].map((_, i) => (
          <motion.div
            key={i}
            className={`absolute w-1 h-1 rounded-full ${
              errorType === 'maintenance_mode' ? 'bg-blue-200' : 'bg-red-200'
            }`}
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            animate={{
              y: [null, -100, null],
              x: [null, Math.random() * 50 - 25, null],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: Math.random() * 5 + 5,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
      </div>

      {/* Blobs flous dynamiques */}
      <div className="absolute inset-0 overflow-hidden">
        <div className={`absolute -top-40 -right-40 w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float ${
          errorType === 'maintenance_mode' ? 'bg-blue-200' : 'bg-red-200'
        }`} />
        <div className={`absolute -bottom-40 -left-40 w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float ${
          errorType === 'maintenance_mode' ? 'bg-cyan-200' : 'bg-orange-200'
        }`} style={{ animationDelay: '2s' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-white/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl max-w-md w-full border border-red-100"
      >
        {/* Badge dynamique */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
          className="absolute -top-4 -right-4"
        >
          <div className={`bg-gradient-to-r ${config.color} text-white px-4 py-2 rounded-bl-2xl rounded-tr-2xl text-xs font-bold shadow-lg flex items-center gap-1`}>
            <Shield className="w-3 h-3" />
            {config.title}
          </div>
        </motion.div>

        {/* Icône animée dynamique */}
        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
            transition={{ 
              scale: { type: "spring", delay: 0.1 },
              rotate: { delay: 0.5, duration: 0.5 }
            }}
            className="relative inline-block"
          >
            <div className={`absolute inset-0 bg-gradient-to-r ${config.color} rounded-full blur-xl opacity-20 animate-pulse`} />
            <div className={`relative w-24 h-24 bg-gradient-to-br ${config.color} rounded-full flex items-center justify-center shadow-2xl`}>
              <Icon className="w-12 h-12 text-white" />
              
              {/* Badge de rôle si applicable */}
              {role && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -top-1 -right-1"
                >
                  <div className="relative">
                    <Fingerprint className="w-5 h-5 text-yellow-400" />
                    <div className="absolute inset-0 bg-yellow-400 rounded-full blur animate-ping" />
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Message dynamique */}
        <motion.h1 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-bold text-gray-800 text-center mb-2"
        >
          {config.title}
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-gray-600 text-center mb-4"
        >
          {config.message}
        </motion.p>

        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="text-sm text-gray-500 text-center mb-6 bg-gray-50 p-3 rounded-xl"
        >
          💡 {config.solution}
        </motion.p>

        {/* Informations utilisateur dynamiques */}
        {user && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-r from-gray-50 to-white rounded-xl p-4 mb-6 border border-gray-200"
          >
            <div className="flex items-center gap-3 mb-3">
              <User className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Informations session</span>
              
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="ml-auto text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                {showDetails ? 'Masquer' : 'Détails'}
                <ChevronRight className={`w-3 h-3 transition-transform ${showDetails ? 'rotate-90' : ''}`} />
              </button>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="w-3 h-3 text-gray-400" />
                <span className="text-gray-600">{user.email}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Shield className="w-3 h-3 text-gray-400" />
                <span className="text-gray-600">Rôle actuel : <span className="font-medium text-gray-800">{role || 'non défini'}</span></span>
              </div>

              {requiredRole && (
                <div className="flex items-center gap-2 text-orange-600">
                  <Lock className="w-3 h-3" />
                  <span>Rôle requis : {requiredRole}</span>
                </div>
              )}

              <AnimatePresence>
                {showDetails && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-2 mt-2 border-t border-gray-200 space-y-2">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>Session créée: {new Date(user.created_at).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Fingerprint className="w-3 h-3" />
                        <span>ID: {user.id.substring(0, 16)}...</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Informations organisation */}
            {organization && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-medium text-gray-700">{organization.name}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className={`px-2 py-1 rounded-full ${
                    organization.subscription_status === 'active' 
                      ? 'bg-green-100 text-green-700'
                      : organization.subscription_status === 'trial'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700'
                  }`}>
                    {organization.plan_type} • {organization.subscription_status}
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Suggestions dynamiques */}
        {suggestedActions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="mb-6 space-y-2"
          >
            <p className="text-xs font-medium text-gray-500">Actions suggérées :</p>
            {suggestedActions.map((action, index) => (
              <motion.button
                key={index}
                whileHover={{ scale: 1.02, x: 5 }}
                whileTap={{ scale: 0.98 }}
                onClick={action.action}
                className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-white rounded-xl hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-2">
                  <action.icon className={`w-4 h-4 text-${action.color}-500`} />
                  <span className="text-sm text-gray-700">{action.label}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            ))}
          </motion.div>
        )}

        {/* Compte à rebours intelligent */}
        {errorType !== 'maintenance_mode' && errorType !== 'organization_inactive' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center mb-6"
          >
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span>Redirection dans</span>
            </div>
            <motion.div
              key={countdown}
              initial={{ scale: 1.5 }}
              animate={{ scale: 1 }}
              className="text-2xl font-bold text-gray-800"
            >
              {countdown}s
            </motion.div>
          </motion.div>
        )}

        {/* Boutons d'action dynamiques */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="space-y-3"
        >
          {/* Bouton principal selon le contexte */}
          {errorType === 'maintenance_mode' ? (
            <button
              onClick={handleRefreshSession}
              disabled={isRefreshing}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:shadow-lg transition-all group"
            >
              {isRefreshing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform" />
              )}
              Vérifier à nouveau
            </button>
          ) : (
            <Link
              to={user ? REDIRECTS[role] || '/' : '/login'}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all group"
            >
              <Home className="w-4 h-4 group-hover:-translate-y-1 transition-transform" />
              {user ? 'Mon dashboard' : 'Se connecter'}
            </Link>
          )}

          {/* Boutons secondaires */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:border-blue-300 hover:text-blue-600 transition-all group text-sm"
            >
              <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
              Retour
            </button>

            {user && (
              <button
                onClick={handleSignOut}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all group text-sm"
              >
                <RefreshCw className="w-3 h-3 group-hover:rotate-180 transition-transform" />
                Déconnexion
              </button>
            )}
          </div>
        </motion.div>

        {/* Section support */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-6 text-center"
        >
          <button
            onClick={() => setShowSupport(!showSupport)}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1 mx-auto"
          >
            <HelpCircle className="w-4 h-4" />
            Besoin d'aide ?
          </button>

          <AnimatePresence>
            {showSupport && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 p-4 bg-gray-50 rounded-xl space-y-3">
                  <button
                    onClick={() => window.location.href = 'mailto:support@smiris-learn.com'}
                    className="w-full flex items-center gap-3 p-2 hover:bg-white rounded-lg transition-colors text-left"
                  >
                    <Mail className="w-4 h-4 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Email</p>
                      <p className="text-xs text-gray-500">support@smiris-learn.com</p>
                    </div>
                  </button>

                  <a
                    href="tel:+33123456789"
                    className="w-full flex items-center gap-3 p-2 hover:bg-white rounded-lg transition-colors text-left"
                  >
                    <Phone className="w-4 h-4 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Téléphone</p>
                      <p className="text-xs text-gray-500">+33 1 23 45 67 89</p>
                    </div>
                  </a>

                  <button
                    onClick={() => window.open('https://t.me/smiris_support', '_blank')}
                    className="w-full flex items-center gap-3 p-2 hover:bg-white rounded-lg transition-colors text-left"
                  >
                    <MessageCircle className="w-4 h-4 text-purple-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Telegram</p>
                      <p className="text-xs text-gray-500">@smiris_support</p>
                    </div>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Message d'erreur */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 p-3 bg-red-50 border-l-4 border-red-500 rounded-lg flex items-start gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
              <p className="text-xs text-red-600">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Badges de sécurité dynamiques */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-6 flex justify-center gap-4 text-xs text-gray-400"
        >
          <div className="flex items-center gap-1">
            <Shield className="w-3 h-3" />
            <span>Protégé par RLS</span>
          </div>
          <div className="flex items-center gap-1">
            <Fingerprint className="w-3 h-3" />
            <span>Session {user ? 'active' : 'inactive'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Lock className="w-3 h-3" />
            <span>Chiffré</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}