
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, Trash2, X, Info, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

export default function NotificationDropdown({ isOpen, onClose }) {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || !isOpen) return;

        fetchNotifications();

        // Abonnement temps réel
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
            console.error('Erreur fetch notifications:', err);
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
            case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
            case 'error': return <AlertCircle className="w-5 h-5 text-red-500" />;
            default: return <Info className="w-5 h-5 text-blue-500" />;
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={onClose} />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-blue-100 z-50 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-blue-50 bg-gradient-to-r from-blue-50 to-white flex items-center justify-between">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                <Bell className="w-4 h-4 text-blue-600" />
                                Notifications
                            </h3>
                            <div className="flex items-center gap-2">
                                {notifications.some(n => !n.read) && (
                                    <button 
                                        onClick={markAllAsRead}
                                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                                    >
                                        Tout lire
                                    </button>
                                )}
                                <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                                    <X className="w-4 h-4 text-gray-400" />
                                </button>
                            </div>
                        </div>

                        {/* List */}
                        <div className="max-h-[400px] overflow-y-auto">
                            {loading ? (
                                <div className="p-8 text-center">
                                    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                                    <p className="mt-2 text-sm text-gray-500">Chargement...</p>
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="p-12 text-center">
                                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Bell className="w-8 h-8 text-blue-200" />
                                    </div>
                                    <p className="text-gray-500 font-medium">Aucune notification</p>
                                    <p className="text-xs text-gray-400 mt-1">Vous êtes à jour !</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-50">
                                    {notifications.map((notification) => (
                                        <div 
                                            key={notification.id}
                                            className={`p-4 hover:bg-blue-50/30 transition-colors flex gap-3 relative group ${!notification.read ? 'bg-blue-50/10' : ''}`}
                                        >
                                            {!notification.read && (
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600"></div>
                                            )}
                                            <div className="mt-0.5">
                                                {getTypeIcon(notification.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-bold text-gray-800 ${!notification.read ? '' : 'font-semibold'}`}>
                                                    {notification.title}
                                                </p>
                                                <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">
                                                    {notification.message}
                                                </p>
                                                <p className="text-[10px] text-gray-400 mt-1">
                                                    {new Date(notification.created_at).toLocaleString()}
                                                </p>
                                            </div>
                                            <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {!notification.read && (
                                                    <button 
                                                        onClick={() => markAsRead(notification.id)}
                                                        className="p-1.5 bg-white shadow-sm border border-gray-100 rounded-lg text-blue-600 hover:bg-blue-50"
                                                        title="Marquer comme lu"
                                                    >
                                                        <Check className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => deleteNotification(notification.id)}
                                                    className="p-1.5 bg-white shadow-sm border border-gray-100 rounded-lg text-red-500 hover:bg-red-50"
                                                    title="Supprimer"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-3 border-t border-blue-50 bg-gray-50/50 text-center">
                            <button className="text-xs text-gray-500 hover:text-blue-600 font-medium transition-colors">
                                Voir toutes les notifications
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
