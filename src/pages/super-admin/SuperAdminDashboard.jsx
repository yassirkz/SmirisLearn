import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    Building2, Users, Video, Award, AlertCircle,
    Shield, TrendingUp, Clock, Zap, Sparkles, Calendar, Activity
} from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import CompaniesTable from '../../components/super-admin/CompaniesTable';
import RecentActivity from '../../components/super-admin/RecentActivity';
import GrowthChart from '../../components/super-admin/GrowthChart';
import RevenueChart from '../../components/super-admin/RevenueChart';
import { supabase } from '../../lib/supabase';

export default function SuperAdminDashboard() {
    const [loading, setLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState(null);
    const [error, setError] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(new Date());

    useEffect(() => {
        fetchDashboardData();
        // Auto-refresh toutes les 60s — stoppé si erreur
        const interval = setInterval(() => {
            // Ne pas rafraîchir si une erreur persiste
            setError(prev => {
                if (!prev) fetchDashboardData();
                return prev;
            });
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    const fetchDashboardData = async () => {
        try {
            const { data, error } = await supabase
                .rpc('get_super_admin_dashboard');

            if (error) throw error;

            // Supabase RPC returning JSONB can wrap the result in an array
            const dashData = Array.isArray(data) ? data[0] : data;
            if (!dashData) throw new Error('Aucune donnée retournée par le serveur');
            
            setDashboardData(dashData);

            const lastMonth = new Date();
            lastMonth.setMonth(lastMonth.getMonth() - 1);

            const [prevOrgs, prevUsers, prevVideos] = await Promise.all([
                supabase.from('organizations').select('*', { count: 'exact', head: true }).lt('created_at', lastMonth.toISOString()),
                supabase.from('profiles').select('*', { count: 'exact', head: true }).lt('created_at', lastMonth.toISOString()),
                supabase.from('videos').select('*', { count: 'exact', head: true }).lt('created_at', lastMonth.toISOString())
            ]);

            const calculateGrowth = (current, previous) => {
                if (!previous || previous === 0) return current > 0 ? 100 : 0;
                return Math.round(((current - previous) / previous) * 100);
            };

            // ============================================
            // Calculer la croissance du taux de complétion global
            // ============================================
            const { data: students } = await supabase
                .from('profiles')
                .select('id')
                .eq('role', 'student');

            let prevAvgCompletion = 0;
            if (students && students.length > 0) {
                const studentIds = students.map(s => s.id);
                const { data: prevProgress } = await supabase
                    .from('user_progress')
                    .select('user_id')
                    .eq('watched', true)
                    .in('user_id', studentIds)
                    .lt('completed_at', lastMonth.toISOString());

                const totalVideos = data.global_stats.total_videos || 1;
                const prevTotalCompletion = students.reduce((acc, student) => {
                    const watchedCount = prevProgress?.filter(p => p.user_id === student.id).length || 0;
                    return acc + (watchedCount / totalVideos * 100);
                }, 0);
                prevAvgCompletion = Math.round(prevTotalCompletion / students.length);
            }

            setDashboardData(prev => ({
                ...prev,
                growth: {
                    orgs: calculateGrowth(data.global_stats.total_organizations, prevOrgs.count || 0),
                    users: calculateGrowth(data.global_stats.total_users, prevUsers.count || 0),
                    videos: calculateGrowth(data.global_stats.total_videos, prevVideos.count || 0),
                    completion: calculateGrowth(data.global_stats.avg_completion_rate || 0, prevAvgCompletion)
                }
            }));

            setLastUpdate(new Date());
            setError(null);
        } catch (err) {
            console.error('Erreur chargement dashboard super admin:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <MainLayout>
                <div className="min-h-[60vh] flex flex-col items-center justify-center">
                    <motion.div
                        animate={{ scale: [1, 1.1, 1], rotate: [0, 180, 360] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                        className="relative"
                    >
                        <div className="w-20 h-20 border-4 border-primary-100/50 dark:border-gray-700 rounded-full shadow-2xl"></div>
                        <div className="absolute top-0 left-0 w-20 h-20 border-4 border-primary-600 dark:border-primary-400 border-t-transparent rounded-full"></div>
                    </motion.div>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="mt-6 text-sm font-medium text-gray-500 dark:text-gray-400 tracking-wide animate-pulse"
                    >Chargement du Control Center...</motion.p>
                </div>
            </MainLayout>
        );
    }

    if (error || !dashboardData) {
        return (
            <MainLayout>
                <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-red-200/50 dark:border-red-800/30 p-6 rounded-3xl shadow-lg">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-100/80 dark:bg-red-900/20 rounded-2xl">
                            <AlertCircle className="w-6 h-6 text-red-500" />
                        </div>
                        <div>
                            <p className="font-bold text-gray-900 dark:text-white">Erreur de chargement</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{error || "Données non disponibles"}</p>
                        </div>
                    </div>
                    <button
                        onClick={fetchDashboardData}
                        className="mt-4 px-5 py-2.5 bg-red-500 text-white rounded-2xl text-sm font-semibold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/25"
                    >
                        Réessayer
                    </button>
                </div>
            </MainLayout>
        );
    }

    const { global_stats, recent_organizations, recent_users, system_status } = dashboardData;

    return (
        <MainLayout>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-8"
                style={{ perspective: "1200px" }}
            >
                {/* ══════════════════════════════════════════════ */}
                {/* EN-TÊTE PREMIUM GLASSMORPHISM                  */}
                {/* ══════════════════════════════════════════════ */}
                <div className="relative bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl rounded-3xl p-8 sm:p-10 shadow-lg border border-white/50 dark:border-white/5 overflow-hidden">
                    {/* Background Glows */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 dark:bg-primary-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-500/10 dark:bg-accent-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />
                    
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-4">
                                <motion.div
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
                                    className="p-3 bg-gradient-to-br from-primary-500 to-accent-600 rounded-2xl shadow-lg shadow-primary-500/30"
                                >
                                    <Shield className="w-8 h-8 text-white" />
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="px-4 py-1.5 bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800/50 rounded-full text-sm font-bold text-primary-700 dark:text-primary-300 shadow-sm flex items-center gap-2 w-fit"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    Super Administration
                                </motion.div>
                                {/* Live indicator */}
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800/50 rounded-full h-fit">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                    </span>
                                    <span className="text-xs font-bold text-green-700 dark:text-green-400">Live</span>
                                </div>
                            </div>
                            
                            <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 tracking-tight mb-4">
                                Control Center
                            </h1>
                            
                            <p className="text-lg text-gray-500 dark:text-gray-400 font-medium max-w-2xl flex flex-wrap items-center gap-2">
                                <Activity className="w-5 h-5 text-primary-500" />
                                Vue d'ensemble de la plateforme
                                <span className="mx-2 opacity-50">•</span>
                                <span className="text-sm">Mis à jour à {lastUpdate.toLocaleTimeString('fr-FR')}</span>
                            </p>
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={fetchDashboardData}
                            className="px-5 py-2.5 bg-white/50 dark:bg-white/5 backdrop-blur-md border border-white/50 dark:border-white/5 rounded-2xl hover:bg-white/80 dark:hover:bg-white/10 transition-all flex items-center justify-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200 shadow-sm hover:shadow-md"
                        >
                            <Zap className="w-4 h-4 text-primary-500" />
                            Rafraîchir
                        </motion.button>
                    </div>
                </div>

                {/* Alertes système */}
                {system_status?.maintenance_mode && (
                    <div className="bg-yellow-50/80 dark:bg-yellow-900/20 backdrop-blur-sm border border-yellow-200 dark:border-yellow-800/50 p-4 rounded-2xl flex items-center gap-3">
                        <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl">
                            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-bold text-yellow-800 dark:text-yellow-300">Mode maintenance activé</p>
                            <p className="text-xs text-yellow-600 dark:text-yellow-400">
                                La plateforme est en maintenance. Les inscriptions sont {system_status.allow_registration ? 'actives' : 'inactives'}.
                            </p>
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════════ */}
                {/* CARTES DE STATISTIQUES PREMIUM                 */}
                {/* ══════════════════════════════════════════════ */}
                {global_stats && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { 
                                label: "Entreprises", 
                                value: global_stats.total_organizations, 
                                growth: dashboardData.growth?.orgs || 0,
                                icon: Building2, 
                                color: 'from-blue-500 to-cyan-400',
                                glow: 'shadow-blue-500/30',
                                description: "Organisations actives"
                            },
                            { 
                                label: "Membres", 
                                value: global_stats.total_users, 
                                growth: dashboardData.growth?.users || 0,
                                icon: Users, 
                                color: 'from-purple-500 to-pink-500',
                                glow: 'shadow-purple-500/30',
                                description: `${global_stats.active_trials} comptes en essai`
                            },
                            { 
                                label: "Vidéos", 
                                value: global_stats.total_videos, 
                                growth: dashboardData.growth?.videos || 0,
                                icon: Video, 
                                color: 'from-orange-500 to-amber-400',
                                glow: 'shadow-orange-500/30',
                                description: `${global_stats.storage_used_mb} Mo de stockage`
                            },
                            { 
                                label: "Engagement", 
                                value: `${global_stats.avg_completion_rate || 0}%`, 
                                growth: dashboardData.growth?.completion || 0,
                                icon: Award, 
                                color: 'from-emerald-400 to-teal-500',
                                glow: 'shadow-emerald-500/30',
                                description: "Moyenne de complétion"
                            }
                        ].map((card, index) => {
                            const isPositive = card.growth >= 0;
                            return (
                                <motion.div
                                    key={card.label}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    whileHover={{ y: -6, scale: 1.02 }}
                                    className="bg-white/60 dark:bg-slate-900/60 rounded-3xl p-6 shadow-lg border border-white/50 dark:border-white/5 backdrop-blur-2xl relative overflow-hidden group"
                                >
                                    {/* Glow de fond */}
                                    <div className={`absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br ${card.color} rounded-full opacity-0 dark:opacity-20 blur-3xl group-hover:opacity-10 dark:group-hover:opacity-30 transition-opacity duration-500 pointer-events-none`} />
                                    
                                    <div className="relative flex items-start justify-between z-10">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className={`w-1.5 h-6 rounded-full bg-gradient-to-b ${card.color} opacity-80`} />
                                                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{card.label}</p>
                                            </div>
                                            <h3 className="text-4xl font-black text-gray-800 dark:text-white tracking-tight leading-none mb-3">
                                                {card.value}
                                            </h3>
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${isPositive ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'}`}>
                                                    {isPositive ? '+' : ''}{card.growth}%
                                                </span>
                                                <span className="text-xs font-medium text-gray-400 dark:text-gray-500">vs mois d.</span>
                                            </div>
                                        </div>
                                        <div className={`p-3.5 bg-gradient-to-br ${card.color} rounded-2xl shadow-lg ${card.glow} group-hover:rotate-6 transition-transform duration-500 shrink-0`}>
                                            <card.icon className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                    
                                    <div className="mt-5 h-1.5 bg-white/40 dark:bg-white/5 rounded-full overflow-hidden relative z-10 border border-white/30 dark:border-white/5">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ 
                                                width: `${
                                                    card.label === "Engagement" 
                                                        ? parseFloat(card.value) 
                                                        : card.label === "Vidéos"
                                                            ? Math.min((global_stats.storage_used_mb / 10240) * 100, 100)
                                                            : card.label === "Entreprises"
                                                                ? Math.min((global_stats.total_organizations / 100) * 100, 100)
                                                                : Math.min((global_stats.total_users / 1000) * 100, 100)
                                                }%` 
                                            }}
                                            transition={{ delay: 0.5 + index * 0.1, duration: 1.5, ease: "easeOut" }}
                                            className={`h-full bg-gradient-to-r ${card.color} rounded-full`}
                                        />
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}

                {/* ══════════════════════════════════════════════ */}
                {/* GRAPHIQUES D'ANALYSE                           */}
                {/* ══════════════════════════════════════════════ */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    <GrowthChart />
                    <RevenueChart />
                </div>

                {/* ══════════════════════════════════════════════ */}
                {/* ONBOARDING RÉCENT                              */}
                {/* ══════════════════════════════════════════════ */}
                {recent_organizations?.length > 0 && (
                    <section className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                                <div className="p-2.5 bg-primary-100 dark:bg-primary-500/20 rounded-xl text-primary-600 dark:text-primary-400">
                                    <Building2 className="w-6 h-6" />
                                </div>
                                Onboarding Récent
                            </h2>
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-white/5 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/50 dark:border-white/5">
                                {recent_organizations.length} entreprises
                            </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {recent_organizations.map((org, index) => (
                                <motion.div
                                    key={org.id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.1 }}
                                    whileHover={{ y: -5 }}
                                    className="relative group bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl p-6 rounded-3xl border border-white/50 dark:border-white/5 shadow-lg overflow-hidden"
                                >
                                    <div className={`absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-primary-500 to-accent-600 rounded-full opacity-0 dark:opacity-10 blur-3xl group-hover:opacity-10 dark:group-hover:opacity-20 transition-opacity duration-500 pointer-events-none`} />
                                    
                                    <div className="relative z-10 flex flex-col gap-4">
                                        <div className="flex items-center justify-between">
                                            <div className="w-14 h-14 bg-gradient-to-br from-primary-600 to-accent-700 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-primary-500/30">
                                                {org.name?.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="px-3 py-1 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-[10px] font-bold uppercase tracking-widest border border-primary-200/50 dark:border-primary-800/50">
                                                {org.plan}
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <h3 className="font-bold text-gray-900 dark:text-white text-lg leading-tight truncate">{org.name}</h3>
                                            <div className="flex items-center gap-3 mt-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                                                <span className="flex items-center gap-1">
                                                    <Users className="w-3 h-3" />
                                                    {org.member_count} membres
                                                </span>
                                                <span className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(org.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </section>
                )}

                {/* ══════════════════════════════════════════════ */}
                {/* TABLEAU + ACTIVITÉS                            */}
                {/* ══════════════════════════════════════════════ */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <CompaniesTable recentData={recent_organizations} />
                    </div>
                    <div>
                        <RecentActivity activities={recent_users} />
                    </div>
                </div>

                {/* Badge sécurité */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="text-center py-4"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/40 dark:bg-white/5 backdrop-blur-md rounded-full border border-white/50 dark:border-white/5 text-xs text-gray-400 dark:text-gray-500">
                        <Shield className="w-3.5 h-3.5 text-primary-400" />
                        <span>Données temps réel via RPC • Dernière mise à jour: {lastUpdate.toLocaleTimeString()}</span>
                    </div>
                </motion.div>
            </motion.div>
        </MainLayout>
    );
}
