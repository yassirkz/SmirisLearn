import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Info, AlertCircle } from 'lucide-react';

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  type = 'danger'
}) {
  const config = {
    danger: {
      btn: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-red-500/25 hover:shadow-red-500/40',
      icon: <AlertCircle className="w-7 h-7 text-red-500" />,
      iconBg: 'bg-red-100 dark:bg-red-900/20',
      bar: 'from-red-400 to-red-500',
    },
    warning: {
      btn: 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-amber-500/25 hover:shadow-amber-500/40',
      icon: <AlertTriangle className="w-7 h-7 text-amber-500" />,
      iconBg: 'bg-amber-100 dark:bg-amber-900/20',
      bar: 'from-amber-400 to-amber-500',
    },
    info: {
      btn: 'bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 shadow-primary-500/25 hover:shadow-primary-500/40',
      icon: <Info className="w-7 h-7 text-primary-500" />,
      iconBg: 'bg-primary-100 dark:bg-primary-900/20',
      bar: 'from-primary-400 to-primary-500',
    }
  };

  const { btn, icon, iconBg, bar } = config[type] || config.info;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] w-full max-w-md overflow-hidden border border-white/50 dark:border-white/5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top accent bar */}
            <div className={`h-1.5 bg-gradient-to-r ${bar}`} />

            <div className="p-7">
              <div className="flex items-start gap-4 mb-5">
                <div className={`p-3 ${iconBg} rounded-2xl shrink-0`}>
                  {icon}
                </div>
                <div className="flex-1 pt-1">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{title}</h3>
                  <p className="text-gray-500 dark:text-gray-400 mt-2 leading-relaxed text-[15px]">{message}</p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/50 dark:hover:bg-white/5 rounded-xl transition-colors shrink-0">
                  <X className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                </button>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={onClose}
                  className="flex-1 px-5 py-3 bg-white/50 dark:bg-white/5 border border-white/50 dark:border-white/5 rounded-2xl text-gray-700 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-white/10 transition-all font-semibold shadow-sm"
                >
                  {cancelText}
                </button>
                <button
                  onClick={onConfirm}
                  className={`flex-1 px-5 py-3 text-white rounded-2xl transition-all font-semibold shadow-lg ${btn}`}
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}