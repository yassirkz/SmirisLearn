import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Menu, X, LayoutDashboard, BookOpen, Video, 
    Award, Users, Settings, LogOut, Sparkles,
    Shield, Zap
} from 'lucide-react';
import { NavLink, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { useUserRole } from '../../hooks/useUserRole';

export default function AdminLayout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [companyName, setCompanyName] = useState('');
    const [companyPlan, setCompanyPlan] = useState('');
    const [trialDays, setTrialDays] = useState(0);
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const orgId = searchParams.get('orgId');
    const { isAdminAccess, loading, role } = useUserRole(); 
    const isImpersonating = role === 'super_admin' && orgId;

    // ============================================
    // SÉCURITÉ : Vérification du rôle (avec gestion du loading)
    // ============================================
    useEffect(() => {
        if (!loading && !isAdminAccess) {
            navigate('/unauthorized');
        }
    }, [isAdminAccess, loading, navigate]);

    // ============================================
    // Récupération des infos entreprise
    // ============================================
    useEffect(() => {
        const fetchCompanyInfo = async () => {
            if (!user) return;

            try {
                let resolvedOrgId = null;

                if (isImpersonating) {
                    resolvedOrgId = orgId;
                } else {
                    const { data: profile, error: profileError } = await supabase
                        .from('profiles')
                        .select('organization_id')
                        .eq('id', user.id)
                        .maybeSingle();

                    if (profileError) throw profileError;
                    resolvedOrgId = profile?.organization_id;
                }

                if (resolvedOrgId) {
                    const { data: org, error: orgError } = await supabase
                        .from('organizations')
                        .select('name, plan_type, trial_ends_at')
                        .eq('id', resolvedOrgId)
                        .maybeSingle();

                    if (orgError) throw orgError;

                    if (org) {
                        setCompanyName(org.name);
                        setCompanyPlan(org.plan_type);

                        if (org.trial_ends_at) {
                            const days = Math.max(0, Math.ceil(
                                (new Date(org.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24)
                            ));
                            setTrialDays(days);
                        }
                    }
                }
            } catch (error) {
                console.error('Erreur chargement infos:', error);
            }
        };

        fetchCompanyInfo();
    }, [user, isImpersonating, orgId]);

    // ============================================
    // Loader pendant le chargement
    // ============================================
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-indigo-200 rounded-full"></div>
                    <div className="absolute top-0 left-0 w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            </div>
        );
    }

    const menuItems = [
        { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', badge: null },
        { path: '/admin/pillars', icon: BookOpen, label: 'Piliers', badge: null },
        { path: '/admin/videos', icon: Video, label: 'Vidéos', badge: null },
        { path: '/admin/quizzes', icon: Award, label: 'QCM', badge: null },
        { path: '/admin/members', icon: Users, label: 'Membres', badge: null },
        { path: '/admin/settings', icon: Settings, label: 'Paramètres', badge: null  },
    ];

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
            {/* Banner Impersonation */}
            {isImpersonating && (
                <div className="bg-amber-500 text-white p-2 text-center text-sm font-bold flex items-center justify-center gap-4 sticky top-0 z-[60]">
                    <Shield className="w-4 h-4" />
                    <span>Mode Lecture Seule - Vous visualisez l'entreprise {companyName}</span>
                    <button 
                        onClick={() => navigate('/super-admin')}
                        className="bg-white text-amber-600 px-3 py-1 rounded-lg text-xs hover:bg-amber-50 transition-colors"
                    >
                        Quitter
                    </button>
                </div>
            )}
            {/* Bouton menu mobile */}
            <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-indigo-100"
            >
                {sidebarOpen ? <X size={24} className="text-indigo-600" /> : <Menu size={24} className="text-indigo-600" />}
            </button>

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
                        <aside className="h-full w-72 bg-white/80 backdrop-blur-xl border-r border-indigo-100 shadow-2xl flex flex-col">
                            {/* Logo avec badge dynamique */}
                            <div className="p-6 border-b border-indigo-100 relative overflow-hidden">
                                <div className="absolute -top-10 -right-10 w-20 h-20 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-full opacity-20 blur-2xl" />
                                
                                <div className="relative flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                                        <span className="text-2xl font-bold text-white">S</span>
                                    </div>
                                    <div className="flex-1">
                                        <h2 className="font-bold text-gray-800 text-lg">Smiris Learn</h2>
                                        <p className="text-xs text-indigo-600 flex items-center gap-1">
                                            <Shield className="w-3 h-3" />
                                            {companyName || 'Admin'} • {companyPlan || 'Starter'}
                                        </p>
                                    </div>
                                </div>

                                {/* Badge période d'essai dynamique */}
                                {trialDays > 0 && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 0.3 }}
                                        className={`mt-4 px-3 py-2 rounded-xl flex items-center gap-2 text-xs font-medium ${
                                            trialDays <= 3
                                                ? 'bg-orange-100 text-orange-700 border border-orange-200'
                                                : 'bg-green-100 text-green-700 border border-green-200'
                                        }`}
                                    >
                                        <Zap className="w-3 h-3" />
                                        <span>{trialDays} jour{trialDays > 1 ? 's' : ''} d'essai</span>
                                    </motion.div>
                                )}
                            </div>

                            {/* Menu */}
                            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                                {menuItems.map((item, index) => (
                                    <motion.div
                                        key={item.path}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                    >
                                        <NavLink
                                            to={item.path}
                                            onClick={() => setSidebarOpen(false)}
                                            className={({ isActive }) =>
                                                `relative flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group overflow-hidden
                                                ${isActive 
                                                    ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg shadow-indigo-200' 
                                                    : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'
                                                }`
                                            }
                                        >
                                            <div className="absolute inset-0 bg-white/20 transform -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                            
                                            <item.icon size={20} />
                                            <span className="font-medium flex-1">{item.label}</span>
                                            {item.badge && (
                                                <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">
                                                    {item.badge}
                                                </span>
                                            )}
                                        </NavLink>
                                    </motion.div>
                                ))}
                            </nav>

                            {/* Déconnexion */}
                            <div className="p-4 border-t border-indigo-100">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleSignOut}
                                    className="relative flex items-center gap-3 px-4 py-3.5 w-full rounded-xl text-red-600 hover:bg-red-50 transition-all duration-300 group overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-100/50 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                    <LogOut size={20} />
                                    <span className="font-medium">Déconnexion</span>
                                </motion.button>
                            </div>
                        </aside>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Contenu principal */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-72' : 'ml-0'}`}
            >
                <main className="p-4 md:p-8">
                    {children}
                </main>
            </motion.div>
        </div>
    );
}