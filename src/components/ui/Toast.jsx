import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle, XCircle, AlertCircle, Info, X,
  Bell, Shield, Zap, Sparkles 
} from "lucide-react";

// Configuration des positions
const POSITIONS = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2'
};

// Animation variants
const toastVariants = {
  initial: (position) => ({
    opacity: 0,
    x: position.includes('right') ? 50 : position.includes('left') ? -50 : 0,
    y: position.includes('top') ? -20 : 20,
    scale: 0.8
  }),
  animate: {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 30,
    },
  },
  exit: (position) => ({
    opacity: 0,
    x: position.includes('right') ? 50 : position.includes('left') ? -50 : 0,
    y: position.includes('top') ? -20 : 20,
    scale: 0.5,
    transition: { duration: 0.2 },
  }),
};

// Configuration des types
const TYPES = {
  success: {
    icon: CheckCircle,
    bg: 'bg-gradient-to-r from-emerald-500 to-green-500',
    border: 'border-emerald-200',
    text: 'text-white',
    progress: 'bg-white/30',
    glow: 'shadow-emerald-500/20'
  },
  error: {
    icon: XCircle,
    bg: 'bg-gradient-to-r from-red-500 to-pink-500',
    border: 'border-red-200',
    text: 'text-white',
    progress: 'bg-white/30',
    glow: 'shadow-red-500/20'
  },
  warning: {
    icon: AlertCircle,
    bg: 'bg-gradient-to-r from-orange-500 to-amber-500',
    border: 'border-orange-200',
    text: 'text-white',
    progress: 'bg-white/30',
    glow: 'shadow-orange-500/20'
  },
  info: {
    icon: Info,
    bg: 'bg-gradient-to-r from-blue-500 to-indigo-500',
    border: 'border-blue-200',
    text: 'text-white',
    progress: 'bg-white/30',
    glow: 'shadow-blue-500/20'
  },
  security: {
    icon: Shield,
    bg: 'bg-gradient-to-r from-purple-500 to-pink-500',
    border: 'border-purple-200',
    text: 'text-white',
    progress: 'bg-white/30',
    glow: 'shadow-purple-500/20'
  }
};

/**
 * Composant Toast individuel
 */
function Toast({ 
  message, 
  type = "info", 
  duration = 4000, 
  onClose,
  position = 'bottom-right',
  showProgress = true,
  action,
  onAction,
  actionLabel
}) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const config = TYPES[type] || TYPES.info;
  const Icon = config.icon;

  return (
    <motion.div
      custom={position}
      variants={toastVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      layout
      className={`
        relative flex items-start gap-3 p-4 rounded-2xl
        ${config.bg} ${config.border} shadow-xl backdrop-blur-sm
        border border-white/20 min-w-[320px] max-w-md
        group cursor-pointer hover:shadow-2xl transition-all
        ${config.glow}
      `}
      onClick={onAction || onClose}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Effet de brillance */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 rounded-2xl" />

      {/* Icône avec animation */}
      <motion.div
        initial={{ rotate: -180, scale: 0 }}
        animate={{ rotate: 0, scale: 1 }}
        transition={{ type: "spring", delay: 0.1 }}
        className="relative z-10"
      >
        <Icon className="w-6 h-6 text-white drop-shadow-lg" />
        {type === 'security' && (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -top-1 -right-1 w-2 h-2 bg-green-300 rounded-full"
          />
        )}
      </motion.div>

      {/* Contenu */}
      <div className="flex-1 relative z-10">
        <p className={`text-sm font-medium ${config.text} drop-shadow`}>
          {message}
        </p>
        
        {/* Sous-message optionnel */}
        {action && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAction?.();
            }}
            className="mt-1 text-xs text-white/80 hover:text-white underline underline-offset-2 transition-colors"
          >
            {actionLabel || 'En savoir plus'}
          </button>
        )}
      </div>

      {/* Bouton fermer */}
      <motion.button
        whileHover={{ scale: 1.1, rotate: 90 }}
        whileTap={{ scale: 0.9 }}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="relative z-10 p-1 hover:bg-white/20 rounded-lg transition-colors"
      >
        <X className="w-4 h-4 text-white/80 hover:text-white" />
      </motion.button>

      {/* Barre de progression */}
      {showProgress && duration > 0 && (
        <motion.div
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: duration / 1000, ease: "linear" }}
          className={`absolute bottom-0 left-0 right-0 h-1 ${config.progress} origin-left rounded-b-2xl`}
        />
      )}
    </motion.div>
  );
}

/**
 * Container pour gérer plusieurs toasts
 */
export function ToastContainer({ toasts, removeToast, position = 'bottom-right' }) {
  return (
    <div className={`fixed ${POSITIONS[position]} z-[9999] space-y-3 max-w-md w-full pointer-events-none`}>
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast
              {...toast}
              position={position}
              onClose={() => removeToast(toast.id)}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/**
 * Hook personnalisé pour gérer les toasts
 */
export function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ 
    message, 
    type = 'info', 
    duration = 4000,
    action,
    actionLabel,
    position
  }) => {
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
    
    setToasts(prev => [...prev, { 
      id, 
      message, 
      type, 
      duration,
      action,
      actionLabel,
      position
    }]);

    // Auto-retrait si durée > 0
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Méthodes raccourcies
  const success = (message, options = {}) => 
    addToast({ message, type: 'success', ...options });

  const error = (message, options = {}) => 
    addToast({ message, type: 'error', ...options });

  const warning = (message, options = {}) => 
    addToast({ message, type: 'warning', ...options });

  const info = (message, options = {}) => 
    addToast({ message, type: 'info', ...options });

  const security = (message, options = {}) => 
    addToast({ message, type: 'security', ...options });

  return {
    toasts,
    addToast,
    removeToast,
    clearToasts,
    success,
    error,
    warning,
    info,
    security
  };
}

export default Toast;