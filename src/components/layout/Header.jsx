import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, User, Shield, Zap, Sun, Moon, Menu } from 'lucide-react'; // ← AJOUT Sun/Moon/Menu
import { useAuth } from '../../hooks/useAuth';
import { useUserRole } from '../../hooks/useUserRole';
import { useTheme } from '../../hooks/useTheme'; // ← AJOUT
import SearchComponent from '../../pages/SearchComponent';
import NotificationDropdown from './NotificationDropdown';
import { supabase } from '../../lib/supabase';

export default function Header({ onToggleSidebar }) {
    const { user } = useAuth();
    const { role } = useUserRole();
    const { theme, toggleTheme } = useTheme(); // ← AJOUT
    const [showNotifications, setShowNotifications] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!user) return;

        const fetchUnreadCount = async () => {
            const { count, error } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('read', false);
            
            if (!error) setUnreadCount(count || 0);
        };

        fetchUnreadCount();

        const channel = supabase
            .channel('unread-count')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`
                },
                () => {
                    fetchUnreadCount();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    return (
        <motion.header 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-b border-blue-100 dark:border-gray-800 sticky top-0 z-30"
        >
            <div className="flex items-center justify-between px-4 md:px-8 py-4 gap-4">
                <button
                    onClick={onToggleSidebar}
                    className="p-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300 shrink-0"
                    title="Toggle Menu"
                >
                    <Menu className="w-5 h-5" />
                </button>
                {/* Barre de recherche */}
                <div className="hidden md:block flex-1 max-w-2xl">
                    <SearchComponent 
                        placeholder="Rechercher entreprises, utilisateurs, vidéos..."
                        autoFocus={false}
                    />
                </div>

                {/* Actions utilisateur */}
                <div className="flex items-center gap-3 ml-auto">
                    {/* Bouton Dark Mode */}
                    <button
                        onClick={toggleTheme}
                        className="p-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300"
                        title={theme === 'light' ? 'Passer en mode sombre' : 'Passer en mode clair'}
                    >
                        {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                    </button>

                    {/* Notifications */}
                    <div className="relative">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setShowNotifications(!showNotifications)}
                            className={`relative p-2.5 rounded-xl transition-all duration-300 ${
                                showNotifications 
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/30' 
                                : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        >
                            <Bell size={20} />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900 animate-bounce-subtle">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </motion.button>
                        
                        <NotificationDropdown 
                            isOpen={showNotifications} 
                            onClose={() => setShowNotifications(false)} 
                        />
                    </div>

                    {/* Profil */}
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-xl shadow-lg cursor-pointer hover:shadow-xl transition-all"
                    >
                        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                            <User size={18} />
                        </div>
                        <div className="hidden md:block">
                            <p className="text-sm font-medium">{user?.email?.split('@')[0]}</p>
                            <p className="text-xs text-white/70 flex items-center gap-1">
                                <Shield className="w-3 h-3" />
                                {role === 'super_admin' ? 'Super Admin' : role === 'org_admin' ? 'Admin' : 'Étudiant'}
                            </p>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Barre de recherche mobile */}
            <div className="md:hidden px-4 pb-4">
                <SearchComponent 
                    placeholder="Rechercher..."
                    autoFocus={false}
                />
            </div>
        </motion.header>
    );
}