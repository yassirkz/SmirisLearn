import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Menu, X, LayoutDashboard, BookOpen, Video, 
    Award, Users, Users2, Settings, LogOut, Sparkles,
    Shield, Zap, Sun, Moon, Search, Bell, ChevronRight
} from 'lucide-react';
import { NavLink, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme'; 
import { supabase } from '../../lib/supabase';
import { useUserRole } from '../../hooks/useUserRole';
import { useOwnerOrg } from '../../hooks/useOwnerOrg';
import Header from './Header';
import Logo from '../ui/Logo';

export default function AdminLayout({ children }) {
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const orgId = searchParams.get('orgId');

    const [sidebarOpen, setSidebarOpen] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.innerWidth >= 1024;
        }
        return true;
    });

    const [companyInfo, setCompanyInfo] = useState({ name: '', plan: '', status: '', trialDays: 0 });
    const { user, signOut } = useAuth();
    const { theme, toggleTheme } = useTheme(); 
    const { isAdminAccess, loading, role, organizationId } = useUserRole(); 
    const { isOwnerOrg, loading: orgLoading } = useOwnerOrg(orgId);
    
    const isImpersonating = role === 'super_admin' && orgId;
    const isReadOnly = isImpersonating && !isOwnerOrg;

    // Responsive sidebar
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) setSidebarOpen(true);
            else setSidebarOpen(false);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Security
    useEffect(() => {
        if (!loading && !isAdminAccess) {
            navigate('/unauthorized');
        }
    }, [isAdminAccess, loading, navigate]);

    // Company info
    useEffect(() => {
        const fetchCompanyInfo = async () => {
            const resolvedOrgId = isImpersonating ? orgId : organizationId;
            if (!resolvedOrgId) return;

            try {
                const { data: org, error } = await supabase
                    .from('organizations')
                    .select('name, plan_type, subscription_status, trial_ends_at')
                    .eq('id', resolvedOrgId)
                    .maybeSingle();

                if (!error && org) {
                    const days = org.trial_ends_at 
                        ? Math.max(0, Math.ceil((new Date(org.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24)))
                        : 0;
                    
                    setCompanyInfo({
                        name: org.name,
                        plan: org.plan_type,
                        status: org.subscription_status,
                        trialDays: days
                    });
                }
            } catch (err) {
                console.error('Error fetching company info:', err);
            }
        };

        fetchCompanyInfo();
    }, [isImpersonating, orgId, organizationId]);

    const menuItems = useMemo(() => [
        { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/admin/pillars', icon: BookOpen, label: 'Piliers' },
        { path: '/admin/videos', icon: Video, label: 'Vidéos' },
        { path: '/admin/quizzes', icon: Award, label: 'QCM' },
        { path: '/admin/groups', icon: Users2, label: 'Groupes' },
        { path: '/admin/members', icon: Users, label: 'Membres' },
        { path: '/admin/settings', icon: Settings, label: 'Paramètres' },
    ], []);

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary-50/50 via-white to-accent-50/30 dark:from-slate-950 dark:via-gray-900 dark:to-slate-950">
            {/* Impersonation Banner */}
            {isImpersonating && isReadOnly && (
                <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white p-2.5 text-center text-sm font-bold flex items-center justify-center gap-4 sticky top-0 z-[60] shadow-lg shadow-amber-500/20">
                    <Shield className="w-4 h-4" />
                    <span>Mode Lecture Seule — Vous visualisez l'entreprise {companyInfo.name}</span>
                    <button 
                        onClick={() => navigate('/super-admin')}
                        className="bg-white/20 backdrop-blur-sm text-white px-4 py-1 rounded-xl text-xs hover:bg-white/30 transition-colors border border-white/20"
                    >
                        Quitter
                    </button>
                </div>
            )}

            {/* Mobile overlay */}
            <AnimatePresence mode="wait">
                {sidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSidebarOpen(false)}
                        className="lg:hidden fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-30"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <AnimatePresence mode="wait">
                {sidebarOpen && (
                    <motion.div
                        initial={{ x: -300, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -300, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="fixed top-0 left-0 h-full z-40"
                    >
                        <aside className="h-full w-72 bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border-r border-white/50 dark:border-white/5 shadow-[0_0_60px_-15px_rgba(139,92,246,0.15)] dark:shadow-[0_0_60px_-15px_rgba(139,92,246,0.1)] flex flex-col relative overflow-hidden">
                            {/* Decorative orbs */}
                            <div className="absolute -top-20 -left-20 w-40 h-40 bg-primary-400/20 dark:bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
                            <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-accent-400/15 dark:bg-accent-500/10 rounded-full blur-3xl pointer-events-none" />

                            {/* Logo with dynamic badge */}
                            <div className="p-6 border-b border-white/30 dark:border-white/5 relative z-10">
                                <div className="relative flex items-center gap-4">
                                    <Logo size="lg" withText={false} />
                                    <div className="flex-1">
                                        <h2 className="font-bold text-gray-800 dark:text-gray-100 text-lg tracking-tight">Smiris Learn</h2>
                                        <p className="text-[11px] text-primary-600 dark:text-primary-400 flex items-center gap-1 font-medium">
                                            <Shield className="w-3 h-3" />
                                            {companyInfo.name || 'Admin'} • {companyInfo.plan === 'starter' ? 'Starter' : 'Gratuit'} {companyInfo.status === 'trial' ? '(Essai)' : ''}
                                        </p>
                                    </div>
                                </div>

                                {/* Dynamic trial badge */}
                                {companyInfo.trialDays > 0 && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 0.3, type: "spring" }}
                                        className={`mt-4 px-3 py-2 rounded-xl flex items-center gap-2 text-xs font-semibold ${
                                            companyInfo.trialDays <= 3
                                                ? 'bg-orange-100/80 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border border-orange-200/50 dark:border-orange-800/30'
                                                : 'bg-emerald-100/80 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/30'
                                        }`}
                                    >
                                        <Zap className="w-3 h-3" />
                                        <span>{companyInfo.trialDays} jour{companyInfo.trialDays > 1 ? 's' : ''} d'essai</span>
                                    </motion.div>
                                )}
                            </div>

                            {/* Menu */}
                            <nav className="flex-1 p-3 space-y-1 overflow-y-auto relative z-10">
                                {menuItems.map((item, index) => (
                                    <motion.div
                                        key={item.path}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.06, type: "spring", stiffness: 200, damping: 20 }}
                                    >
                                        <NavLink
                                            to={isImpersonating ? `${item.path}?orgId=${orgId}` : item.path}
                                            end={item.path === '/admin'}
                                            onClick={() => window.innerWidth < 1024 && setSidebarOpen(false)}
                                            className={({ isActive }) =>
                                                `relative flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group overflow-hidden
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
                                                    <span className="font-medium text-[14px] flex-1">{item.label}</span>
                                                    {item.badge && (
                                                        <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">
                                                            {item.badge}
                                                        </span>
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
                                    <span className="font-medium text-[14px]">Mode {theme === 'light' ? 'sombre' : 'clair'}</span>
                                </button>

                                <motion.button
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleSignOut}
                                    className="relative flex items-center gap-3 px-4 py-3 w-full rounded-2xl text-red-500 dark:text-red-400 hover:bg-red-50/60 dark:hover:bg-red-900/20 transition-all duration-300 group"
                                >
                                    <div className="p-1.5 rounded-xl bg-transparent group-hover:bg-red-100/50 dark:group-hover:bg-red-900/30 transition-colors">
                                        <LogOut size={18} />
                                    </div>
                                    <span className="font-medium text-[14px]">Déconnexion</span>
                                </motion.button>
                            </div>
                        </aside>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main content */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-72' : 'ml-0'}`}
            >
                <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
                <main className="p-4 md:p-8 dark:text-gray-200">
                    {children}
                </main>
            </motion.div>
        </div>
    );
}