import { motion } from 'framer-motion';
import { 
  MoreVertical, Play, Heart, MessageCircle, 
  Share2, Star, Eye, Clock 
} from 'lucide-react';

const variants = {
  default: 'rounded-2xl',
  compact: 'rounded-xl',
  minimal: 'rounded-lg'
};

const animations = {
  shimmer: {
    background: [
      'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)',
      'linear-gradient(90deg, #e5e7eb 25%, #d1d5db 50%, #e5e7eb 75%)',
      'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)'
    ],
    backgroundSize: '200% 100%',
    backgroundPosition: ['0% 0%', '100% 0%', '0% 0%']
  },
  pulse: {
    opacity: [0.5, 0.8, 0.5],
    scale: [1, 1.02, 1]
  },
  wave: {
    y: [0, -2, 0, 2, 0],
    transition: { duration: 2, repeat: Infinity }
  }
};

/**
 * Skeleton loader avec multiples variantes
 */
export default function SkeletonCard({ 
  variant = 'default',
  animation = 'shimmer',
  count = 1,
  showAvatar = true,
  showImage = false,
  showActions = false,
  showFooter = true,
  className = ''
}) {
  const selectedAnimation = animations[animation] || animations.shimmer;
  const variantClass = variants[variant] || variants.default;

  const SkeletonItem = ({ index }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`bg-white dark:bg-gray-800 ${variantClass} p-6 shadow-lg border border-gray-100 dark:border-gray-700 relative overflow-hidden group`}
    >
      {/* Animation de fond */}
      <motion.div
        animate={selectedAnimation}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 opacity-50"
        style={{
          background: 'linear-gradient(90deg, transparent 25%, rgba(255,255,255,0.2) 50%, transparent 75%)',
          backgroundSize: '200% 100%'
        }}
      />

      {/* Image placeholder */}
      {showImage && (
        <motion.div 
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-full h-32 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-xl mb-4 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        </motion.div>
      )}

      {/* En-tête avec avatar */}
      <div className="flex items-start gap-4 mb-4">
        {showAvatar && (
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="relative"
          >
            <div className="w-12 h-12 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </div>
            {/* Badge animé */}
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"
            />
          </motion.div>
        )}

        <div className="flex-1 space-y-2">
          <motion.div 
            animate={{ width: ['60%', '80%', '60%'] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-full"
          />
          <motion.div 
            animate={{ width: ['40%', '60%', '40%'] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
            className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-full"
          />
        </div>

        {showActions && (
          <MoreVertical className="w-5 h-5 text-gray-300 dark:text-gray-600" />
        )}
      </div>

      {/* Contenu */}
      <div className="space-y-3 mb-4">
        <motion.div 
          animate={{ width: ['100%', '95%', '100%'] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-full"
        />
        <motion.div 
          animate={{ width: ['90%', '85%', '90%'] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.1 }}
          className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-full"
        />
        <motion.div 
          animate={{ width: ['80%', '75%', '80%'] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
          className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-full"
        />
      </div>

      {/* Statistiques */}
      {showFooter && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            {[Eye, Heart, MessageCircle].map((Icon, i) => (
              <motion.div
                key={i}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                className="flex items-center gap-1"
              >
                <Icon className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                <div className="w-6 h-3 bg-gray-200 dark:bg-gray-700 rounded-full" />
              </motion.div>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4 text-gray-300 dark:text-gray-600" />
            <div className="w-12 h-3 bg-gray-200 dark:bg-gray-700 rounded-full" />
          </div>
        </div>
      )}
    </motion.div>
  );

  // Rendu multiple si count > 1
  return (
    <div className={`grid grid-cols-1 md:grid-cols-${Math.min(count, 3)} gap-6 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonItem key={i} index={i} />
      ))}
    </div>
  );
}

// Variante pour tableau
export function TableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 dark:bg-gray-900 p-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
              className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full"
              style={{ width: `${100 / columns}%` }}
            />
          ))}
        </div>
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <motion.div
          key={rowIndex}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: rowIndex * 0.05 }}
          className="p-4 border-b border-gray-100 dark:border-gray-700 last:border-0"
        >
          <div className="flex gap-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <motion.div
                key={colIndex}
                animate={{ 
                  width: ['90%', '100%', '90%'],
                  opacity: [0.3, 0.5, 0.3]
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity,
                  delay: (rowIndex * columns + colIndex) * 0.05
                }}
                className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-full"
                style={{ width: `${100 / columns}%` }}
              />
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// Variante pour graphique
export function ChartSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
      <div className="flex justify-between mb-6">
        <div className="space-y-2">
          <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
        </div>
        <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
      </div>

      <div className="h-64 relative">
        {/* Barres du graphique */}
        <div className="absolute inset-0 flex items-end justify-around gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${Math.random() * 60 + 20}%` }}
              transition={{ 
                duration: 1, 
                delay: i * 0.1,
                repeat: Infinity,
                repeatType: 'reverse'
              }}
              className="w-8 bg-gradient-to-t from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-t-lg"
            />
          ))}
        </div>
      </div>
    </div>
  );
}