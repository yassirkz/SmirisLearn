import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, Trash2, X, Info, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export default function NotificationDropdown({ isOpen, onClose }) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || !isOpen) return;

        fetchNotifications();

        const channel = supabase
            .channel('notifications-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`
                },
                () => {
                    fetchNotifications();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, isOpen]);

    const fetchNotifications = async () => {
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) throw error;
            setNotifications(data || []);
        } catch (err) {
            console.error('Erreur récupération notifications', err);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ read: true })
                .eq('id', id);
            if (error) throw error;
            setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
        } catch (err) {
            console.error('Erreur markAsRead:', err);
        }
    };

    const deleteNotification = async (id) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('id', id);
            if (error) throw error;
            setNotifications(notifications.filter(n => n.id !== id));
        } catch (err) {
            console.error('Erreur deleteNotification:', err);
        }
    };

    const markAllAsRead = async () => {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ read: true })
                .eq('user_id', user.id)
                .eq('read', false);
            if (error) throw error;
            setNotifications(notifications.map(n => ({ ...n, read: true })));
        } catch (err) {
            console.error('Erreur markAllAsRead:', err);
        }
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'success': return <CheckCircle className="w-5 h-5 text-emerald-500" />;
            case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
            case 'error': return <AlertCircle className="w-5 h-5 text-red-500" />;
            default: return <Info className="w-5 h-5 text-primary-500" />;
        }
    };

    const getTypeBg = (type) => {
        switch (type) {
            case 'success': return 'bg-emerald-100 dark:bg-emerald-900/30';
            case 'warning': return 'bg-amber-100 dark:bg-amber-900/30';
            case 'error': return 'bg-red-100 dark:bg-red-900/30';
            default: return 'bg-primary-100 dark:bg-primary-900/30';
        }
    };

    const handleNotificationClick = async (notification) => {
        if (!notification.read) {
            await markAsRead(notification.id);
        }
        if (notification.link) {
            navigate(notification.link);
            onClose();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={onClose} />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 md:w-96 max-w-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.4)] border border-white/50 dark:border-white/5 z-50 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-white/30 dark:border-white/5 flex items-center justify-between">
                            <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2 tracking-tight">
                                <div className="p-1.5 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                                    <Bell className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                                </div>
                                Notifications
                            </h3>
                            <div className="flex items-center gap-2">
                                {notifications.some(n => !n.read) && (
                                    <button 
                                        onClick={markAllAsRead}
                                        className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-semibold px-2 py-1 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                                    >
                                        Tout marquer lu
                                    </button>
                                )}
                                <button onClick={onClose} className="p-1.5 hover:bg-white/50 dark:hover:bg-white/5 rounded-lg transition-colors">
                                    <X className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                </button>
                            </div>
                        </div>

                        {/* List */}
                        <div className="max-h-[400px] overflow-y-auto">
                            {loading ? (
                                <div className="p-8 text-center">
                                    <div className="w-8 h-8 border-2 border-primary-600 dark:border-primary-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                                    <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Chargement...</p>
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="p-12 text-center">
                                    <div className="w-16 h-16 bg-primary-50 dark:bg-primary-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <Bell className="w-8 h-8 text-primary-200 dark:text-primary-700" />
                                    </div>
                                    <p className="text-gray-500 dark:text-gray-400 font-semibold">Aucune notification</p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Vous êtes à jour</p>
                                </div>
                            ) : (
                                <div className="p-1.5">
                                    {notifications.map((notification, index) => (
                                        <motion.div 
                                            key={notification.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.03 }}
                                            onClick={() => handleNotificationClick(notification)}
                                            role="button"
                                            tabIndex={0}
                                            className={`p-3.5 hover:bg-white/50 dark:hover:bg-white/5 transition-all rounded-xl flex gap-3 relative group cursor-pointer mb-1 ${!notification.read ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''}`}
                                        >
                                            {!notification.read && (
                                                <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-primary-600 dark:bg-primary-400 rounded-full"></div>
                                            )}
                                            <div className={`p-2 ${getTypeBg(notification.type)} rounded-xl mt-0.5 shrink-0`}>
                                                {getTypeIcon(notification.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm text-gray-800 dark:text-white ${!notification.read ? 'font-bold' : 'font-medium'}`}>
                                                    {notification.title}
                                                </p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                                                    {notification.message}
                                                </p>
                                                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5 font-medium">
                                                    {new Date(notification.created_at).toLocaleString()}
                                                </p>
                                            </div>
                                            <div className="flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                {!notification.read && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); markAsRead(notification.id); }}
                                                        className="p-1.5 bg-white/60 dark:bg-white/5 shadow-sm border border-white/50 dark:border-white/5 rounded-lg text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                                                        title="Marquer comme lu"
                                                    >
                                                        <Check className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id); }}
                                                    className="p-1.5 bg-white/60 dark:bg-white/5 shadow-sm border border-white/50 dark:border-white/5 rounded-lg text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                    title="Supprimer"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}