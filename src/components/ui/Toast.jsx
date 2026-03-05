import { useEffect } from "react";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, AlertCircle, Info, X } from "lucide-react";

const toastVariants = {
    initial: { opacity: 0, y: 50, scale: 0.3 },
    animate: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
        type: "spring",
        stiffness: 500,
        damping: 30,
        },
    },
    exit: {
        opacity: 0,
        scale: 0.5,
        y: -20,
        transition: { duration: 0.2 },
    },
    };

    const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    error: <XCircle className="w-5 h-5 text-red-500" />,
    warning: <AlertCircle className="w-5 h-5 text-amber-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
    };

    const backgrounds = {
    success: "bg-emerald-50 border-emerald-200",
    error: "bg-red-50 border-red-200",
    warning: "bg-amber-50 border-amber-200",
    info: "bg-blue-50 border-blue-200",
    };

    export default function Toast({
    message,
    type = "info",
    duration = 4000,
    onClose,
    }) {
    useEffect(() => {
        const timer = setTimeout(onClose, duration);
        return () => clearTimeout(timer);
    }, [duration, onClose]);

    return (
        <motion.div
        variants={toastVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className={`
            fixed bottom-4 right-4 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl 
            border shadow-2xl backdrop-blur-sm bg-opacity-90
            ${backgrounds[type]}
        `}
        >
        <motion.div
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: duration / 1000, ease: "linear" }}
            className="absolute bottom-0 left-0 right-0 h-1 bg-current opacity-20 origin-left rounded-b-2xl"
        />

        <div className="flex items-center gap-3">
            {icons[type]}
            <p className="text-sm font-medium text-gray-800">{message}</p>
        </div>

        <button
            onClick={onClose}
            className="p-1.5 hover:bg-black/10 rounded-xl transition-colors"
        >
            <X className="w-4 h-4 text-gray-500" />
        </button>
        </motion.div>
    );
    }

    // Container pour plusieurs toasts
    export function ToastContainer({ toasts, removeToast }) {
    return (
        <div className="fixed bottom-5 right-5 z-50 space-y-3">
        <AnimatePresence>
            {toasts.map((toast) => (
            <Toast
                key={toast.id}
                message={toast.message}
                type={toast.type}
                onClose={() => removeToast(toast.id)}
            />
            ))}
        </AnimatePresence>
        </div>
    );
}
