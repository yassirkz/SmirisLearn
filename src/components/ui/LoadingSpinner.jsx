import { motion } from 'framer-motion';
import { Loader2, Sparkles, Shield, Zap } from 'lucide-react';

const sizes = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
  '2xl': 'w-20 h-20'
};

const colors = {
  primary: 'from-blue-500 to-purple-600',
  secondary: 'from-gray-500 to-gray-600',
  success: 'from-green-500 to-emerald-600',
  danger: 'from-red-500 to-pink-600',
  warning: 'from-orange-500 to-amber-600',
  info: 'from-cyan-500 to-blue-600',
  white: 'from-white to-white/80'
};

const variants = {
  circle: 'rounded-full',
  square: 'rounded-xl',
  custom: ''
};

/**
 * LoadingSpinner avec multiples variantes et animations
 */
export default function LoadingSpinner({ 
  size = 'md', 
  color = 'primary',
  variant = 'circle',
  message,
  showIcon = true,
  icon: CustomIcon,
  pulse = true,
  className = ''
}) {
  const sizeClass = sizes[size] || sizes.md;
  const colorClass = colors[color] || colors.primary;
  const variantClass = variants[variant] || variants.circle;

  // Animation du pulse
  const pulseAnimation = pulse ? {
    scale: [1, 1.05, 1],
    opacity: [0.8, 1, 0.8]
  } : {};

  return (
    <motion.div 
      className={`flex flex-col items-center justify-center space-y-4 ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Spinner principal */}
      <div className="relative">
        {/* Cercle de fond */}
        <div className={`absolute inset-0 ${variantClass} bg-gradient-to-r ${colorClass} opacity-20 blur-xl`} />
        
        {/* Spinner animé */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="relative"
        >
          <div className={`${sizeClass} ${variantClass} bg-gradient-to-r ${colorClass} p-0.5`}>
            <div className={`w-full h-full ${variantClass} bg-white dark:bg-gray-900 flex items-center justify-center`}>
              {showIcon && (
                <motion.div
                  animate={pulseAnimation}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  {CustomIcon ? (
                    <CustomIcon className={`w-${parseInt(size) * 0.6} h-${parseInt(size) * 0.6} text-transparent bg-clip-text bg-gradient-to-r ${colorClass}`} />
                  ) : (
                    <Loader2 className={`w-${parseInt(size) * 0.6} h-${parseInt(size) * 0.6} text-transparent bg-clip-text bg-gradient-to-r ${colorClass}`} />
                  )}
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Particules animées (pour size >= lg) */}
        {['lg', 'xl', '2xl'].includes(size) && (
          <>
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className={`absolute w-1 h-1 rounded-full bg-gradient-to-r ${colorClass}`}
                animate={{
                  x: [0, (i + 1) * 20, 0],
                  y: [0, (i + 1) * -20, 0],
                  opacity: [1, 0.5, 1],
                  scale: [1, 1.5, 1]
                }}
                transition={{
                  duration: 2 + i,
                  repeat: Infinity,
                  delay: i * 0.3
                }}
                style={{
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)'
                }}
              />
            ))}
          </>
        )}
      </div>

      {/* Message avec animation */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center space-y-1"
        >
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
            {message}
          </p>
          
          {/* Sous-message optionnel avec badges de sécurité */}
          {message.includes('sécurisé') && (
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="flex items-center justify-center gap-2 text-xs text-gray-400"
            >
              <Shield className="w-3 h-3" />
              <span>Connexion chiffrée</span>
              <Zap className="w-3 h-3" />
            </motion.div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

// Variante avec overlay pour chargement page entière
export function FullPageSpinner({ message = "Chargement sécurisé...", color = "primary" }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm"
    >
      <LoadingSpinner size="2xl" color={color} message={message} />
    </motion.div>
  );
}

// Variante avec progression
export function ProgressSpinner({ progress = 0, message, color = "primary" }) {
  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        <LoadingSpinner size="lg" color={color} showIcon={false} />
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <span className={`text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r ${colors[color]}`}>
            {progress}%
          </span>
        </motion.div>
      </div>
      {message && <p className="text-sm text-gray-500">{message}</p>}
    </div>
  );
}