//eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion'
import { NavLink } from 'react-router-dom'
import { 
    LayoutDashboard, 
    Building2, 
    Users, 
    Settings,
    LogOut,
    Sparkles,
    BookOpen,
    Sun,
    Moon
    } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useUserRole } from '../../hooks/useUserRole'
import { useTheme } from '../../hooks/useTheme'
import Logo from '../ui/Logo'

export default function Sidebar({ onClose }) {    
    const { signOut } = useAuth()
    const { role } = useUserRole()
    const { theme, toggleTheme } = useTheme()

    const getMenuItems = () => {
        if (role === 'super_admin') {
            return [
                { path: '/super-admin', icon: LayoutDashboard, label: 'Tableau de bord' },
                { path: '/super-admin/companies', icon: Building2, label: 'Organisations' },
                { path: '/super-admin/users', icon: Users, label: 'Utilisateurs' },
                { path: '/super-admin/settings', icon: Settings, label: 'Paramètres' },
            ];
        } else if (role === 'org_admin') {
            return [
                { path: '/admin', icon: LayoutDashboard, label: 'Tableau de bord' },
                { path: '/admin/pillars', icon: Building2, label: 'Piliers' },
                { path: '/admin/members', icon: Users, label: 'Membres' },
                { path: '/admin/groups', icon: Users, label: 'Groupes' },
                { path: '/admin/settings', icon: Settings, label: 'Paramètres' },
            ];
        } else {
            // Student
            return [
                { path: '/student', icon: LayoutDashboard, label: 'Tableau de bord' },
                { path: '/student/learning', icon: BookOpen, label: 'Formations' },
            ];
        }
    };

    const menuItems = getMenuItems();

    return (
        <motion.aside 
            className="h-full w-64 bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border-r border-white/50 dark:border-white/5 shadow-[0_0_60px_-15px_rgba(139,92,246,0.15)] dark:shadow-[0_0_60px_-15px_rgba(139,92,246,0.1)] flex flex-col relative overflow-hidden"
            initial={{ x: -20 }}
            animate={{ x: 0 }}
        >
            {/* Decorative gradient orbs */}
            <div className="absolute -top-20 -left-20 w-40 h-40 bg-primary-400/20 dark:bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-accent-400/15 dark:bg-accent-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Logo */}
            <div className="p-6 border-b border-white/30 dark:border-white/5 relative z-10">
                <div className="flex items-center gap-3">
                    <Logo size="md" withText={false} />
                    <div>
                        <h2 className="font-bold text-gray-800 dark:text-gray-100 tracking-tight">Smiris Learn</h2>
                        <p className="text-[11px] text-primary-600 dark:text-primary-400 font-medium tracking-wide uppercase">
                            {role === 'super_admin' ? 'Super Admin' : role === 'org_admin' ? 'Administration' : 'Espace Étudiant'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Menu */}
            <nav className="flex-1 p-3 space-y-1 relative z-10 overflow-y-auto">
                {menuItems.map((item, index) => (
                    <motion.div
                        key={item.path}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.08, type: "spring", stiffness: 200, damping: 20 }}
                    >
                        <NavLink
                            to={item.path}
                            end={item.path === '/super-admin' || item.path === '/admin' || item.path === '/student'}
                            onClick={() => window.innerWidth < 1024 && onClose()}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group relative overflow-hidden
                                ${isActive 
                                    ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-500/30 dark:shadow-primary-900/40' 
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-white/5 hover:text-primary-600 dark:hover:text-primary-300'
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    {isActive && (
                                        <div className="absolute inset-0 bg-white/10 transform -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                    )}
                                    <div className={`p-1.5 rounded-xl ${isActive ? 'bg-white/20' : 'bg-transparent group-hover:bg-primary-100/50 dark:group-hover:bg-primary-900/30'} transition-colors`}>
                                        <item.icon size={18} />
                                    </div>
                                    <span className="font-medium text-[14px]">{item.label}</span>
                                    {item.label === 'Tableau de bord' && (
                                        <Sparkles className="w-3.5 h-3.5 ml-auto opacity-40" />
                                    )}
                                </>
                            )}
                        </NavLink>
                    </motion.div>
                ))}
            </nav>

            {/* Bottom actions */}
            <div className="p-3 border-t border-white/30 dark:border-white/5 space-y-1 relative z-10">
                <button
                    onClick={toggleTheme}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-white/5 transition-all group"
                >
                    <div className="p-1.5 rounded-xl bg-transparent group-hover:bg-amber-100/50 dark:group-hover:bg-amber-900/30 transition-colors">
                        {theme === 'light' ? <Moon className="w-[18px] h-[18px]" /> : <Sun className="w-[18px] h-[18px]" />}
                    </div>
                    <span className="font-medium text-[14px]">{theme === 'light' ? 'Mode Sombre' : 'Mode Clair'}</span>
                </button>

                <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={signOut}
                    className="flex items-center gap-3 px-4 py-3 w-full rounded-2xl text-red-500 dark:text-red-400 hover:bg-red-50/60 dark:hover:bg-red-900/20 transition-all duration-300 group"
                >
                    <div className="p-1.5 rounded-xl bg-transparent group-hover:bg-red-100/50 dark:group-hover:bg-red-900/30 transition-colors">
                        <LogOut size={18} />
                    </div>
                    <span className="font-medium text-[14px]">Déconnexion</span>
                </motion.button>
            </div>
        </motion.aside>
    )
}