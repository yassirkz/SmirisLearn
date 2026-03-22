import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { ToastContainer } from '../components/ui/Toast';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback(({ 
        message, 
        type = 'info', 
        duration = 4000,
        action,
        actionLabel,
        position = 'bottom-right'
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

    const value = useMemo(() => ({
        addToast,
        removeToast,
        clearToasts,
        success: (message, options) => addToast({ message, type: 'success', ...options }),
        error: (message, options) => addToast({ message, type: 'error', ...options }),
        warning: (message, options) => addToast({ message, type: 'warning', ...options }),
        info: (message, options) => addToast({ message, type: 'info', ...options }),
        security: (message, options) => addToast({ message, type: 'security', ...options }),
    }), [addToast, removeToast, clearToasts]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
