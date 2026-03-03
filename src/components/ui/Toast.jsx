import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react'

const toastVariants = {
    initial: { opacity: 0, y: 50, scale: 0.3 },
    animate: { 
        opacity: 1, 
        y: 0, 
        scale: 1,
        transition: {
        type: "spring",
        stiffness: 500,
        damping: 30
        }
    },
    exit: { 
        opacity: 0, 
        scale: 0.5, 
        y: -20,
        transition: { duration: 0.2 }
    }
    }

    const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    error: <XCircle className="w-5 h-5 text-red-500" />,
    warning: <AlertCircle className="w-5 h-5 text-amber-500" />,
    info: <AlertCircle className="w-5 h-5 text-blue-500" />
    }

    const backgrounds = {
    success: 'bg-emerald-50 border-emerald-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-amber-50 border-amber-200',
    info: 'bg-blue-50 border-blue-200'
    }

    export default function Toast({ message, type = 'info', duration = 3000, onClose }) {
    useEffect(() => {
        const timer = setTimeout(onClose, duration)
        return () => clearTimeout(timer)
    }, [duration, onClose])

    return (
        <motion.div
        variants={toastVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg ${backgrounds[type]}`}
        >
        {icons[type]}
        <p className="text-sm font-medium text-secondary-800">{message}</p>
        <button
            onClick={onClose}
            className="p-1 hover:bg-black/5 rounded-lg transition-colors"
        >
            <X className="w-4 h-4 text-secondary-500" />
        </button>
        </motion.div>
    )
    }

    // Toast Container
    export function ToastContainer({ toasts, removeToast }) {
    return (
        <div className="fixed bottom-0 right-0 p-4 space-y-2 z-50">
        <AnimatePresence>
            {toasts.map(toast => (
            <Toast
                key={toast.id}
                message={toast.message}
                type={toast.type}
                onClose={() => removeToast(toast.id)}
            />
            ))}
        </AnimatePresence>
        </div>
    )
}