import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, User, Shield, Sun, Moon, Menu } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useUserRole } from '../../hooks/useUserRole';
import { useTheme } from '../../hooks/useTheme';
import SearchComponent from '../../pages/SearchComponent';
import NotificationDropdown from './NotificationDropdown';
import { supabase } from '../../lib/supabase';

export default function Header({ onToggleSidebar }) {
    const { user } = useAuth();
    const { role } = useUserRole();
    const { theme, toggleTheme } = useTheme(); 
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

    const getRoleLabel = () => {
        if (role === 'super_admin') return 'Super Admin';
        if (role === 'org_admin') return 'Administration';
        return 'Étudiant';
    };

    return (
        <motion.header 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border-b border-white/50 dark:border-white/5 sticky top-0 z-30"
        >
            <div className="flex items-center justify-between px-4 md:px-8 py-3.5 gap-4">
                {/* Hamburger */}
                <button
                    onClick={onToggleSidebar}
                    className="p-2.5 bg-white/50 dark:bg-white/5 rounded-xl hover:bg-white/80 dark:hover:bg-white/10 transition-all text-gray-600 dark:text-gray-300 shrink-0 border border-white/50 dark:border-white/5 shadow-sm"
                    title="Menu"
                >
                    <Menu className="w-5 h-5" />
                </button>

                {/* Search bar — desktop */}
                <div className="hidden md:block flex-1 max-w-2xl">
                    <SearchComponent 
                        placeholder="Rechercher..."
                        autoFocus={false}
                    />
                </div>

                {/* Right actions */}
                <div className="flex items-center gap-2.5 ml-auto">
                    {/* Theme toggle */}
                    <button
                        onClick={toggleTheme}
                        className="p-2.5 bg-white/50 dark:bg-white/5 rounded-xl hover:bg-white/80 dark:hover:bg-white/10 transition-all text-gray-600 dark:text-gray-300 border border-white/50 dark:border-white/5 shadow-sm"
                        title={theme === 'light' ? 'Mode Sombre' : 'Mode Clair'}
                    >
                        {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                    </button>

                    {/* Notifications */}
                    <div className="relative">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setShowNotifications(!showNotifications)}
                            className={`relative p-2.5 rounded-xl transition-all duration-300 border shadow-sm ${
                                showNotifications 
                                ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30 border-primary-500' 
                                : 'bg-white/50 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-white/10 border-white/50 dark:border-white/5'
                            }`}
                        >
                            <Bell size={20} />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 animate-pulse">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </motion.button>
                        
                        <NotificationDropdown 
                            isOpen={showNotifications} 
                            onClose={() => setShowNotifications(false)} 
                        />
                    </div>

                    {/* Profile chip */}
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="flex items-center gap-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white px-4 py-2 rounded-2xl shadow-lg shadow-primary-500/25 cursor-pointer hover:shadow-xl hover:shadow-primary-500/35 transition-all border border-primary-500/50"
                    >
                        <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                            <User size={16} />
                        </div>
                        <div className="hidden md:block">
                            <p className="text-sm font-semibold tracking-tight leading-none">{user?.email?.split('@')[0]}</p>
                            <p className="text-[11px] text-white/70 flex items-center gap-1 mt-0.5">
                                <Shield className="w-3 h-3" />
                                {getRoleLabel()}
                            </p>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Mobile search */}
            <div className="md:hidden px-4 pb-3">
                <SearchComponent 
                    placeholder="Recherche..."
                    autoFocus={false}
                />
            </div>
        </motion.header>
    );
}