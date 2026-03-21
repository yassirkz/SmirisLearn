import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    Building2, Users, Video, Award, AlertCircle,
    Shield, TrendingUp, Clock, Zap, Sparkles, Calendar
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
        const interval = setInterval(fetchDashboardData, 60000);
        return () => clearInterval(interval);
    }, []);

    const fetchDashboardData = async () => {
        try {
            const { data, error } = await supabase
                .rpc('get_super_admin_dashboard');

            if (error) throw error;
            
            setDashboardData(data);

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

            setDashboardData(prev => ({
                ...prev,
                growth: {
                    orgs: calculateGrowth(data.global_stats.total_organizations, prevOrgs.count || 0),
                    users: calculateGrowth(data.global_stats.total_users, prevUsers.count || 0),
                    videos: calculateGrowth(data.global_stats.total_videos, prevVideos.count || 0),
                    completion: 0
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
                <div className="min-h-[60vh] flex items-center justify-center">
                    <div className="relative">
                        <div className="w-20 h-20 border-4 border-primary-200 dark:border-primary-800 rounded-full"></div>
                        <div className="absolute top-0 left-0 w-20 h-20 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="mt-4 text-gray-500 dark:text-gray-400">Chargement de votre dashboard...</p>
                    </div>
                </div>
            </MainLayout>
        );
    }

    if (error || !dashboardData) {
        return (
            <MainLayout>
                <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                        <p className="text-sm text-red-700 dark:text-red-300">Erreur de chargement: {error || "Données non disponibles"}</p>
                    </div>
                    <button
                        onClick={fetchDashboardData}
                        className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 underline"
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
                {/* En-tête Control Center */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
                                Control <span className="text-primary-600 dark:text-primary-400">Center</span>
                            </h1>
                            <div className="flex items-center gap-2 px-3 py-1 bg-green-50 dark:bg-green-900/30 border border-green-100 dark:border-green-800 rounded-full h-fit">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                            </div>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 font-medium flex items-center gap-2">
                            <Clock className="w-4 h-4 text-primary-500 dark:text-primary-400" />
                            Vue d'ensemble de la plateforme • {lastUpdate.toLocaleTimeString()}
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={fetchDashboardData}
                            className="p-3 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-2xl hover:border-primary-200 dark:hover:border-primary-700 hover:shadow-lg dark:hover:shadow-gray-900 transition-all text-gray-600 dark:text-gray-300"
                            title="Rafraîchir les données"
                        >
                            <Zap className="w-5 h-5" />
                        </motion.button>
                    </div>
                </div>

                {/* Alertes système */}
                {system_status?.maintenance_mode && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-500 p-4 rounded-lg flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Mode maintenance activé</p>
                            <p className="text-xs text-yellow-600 dark:text-yellow-400">
                                La plateforme est en maintenance. Les inscriptions sont {system_status.allow_registration ? 'actives' : 'inactives'}.
                            </p>
                        </div>
                    </div>
                )}

                {/* Stats globales */}
                {global_stats && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { 
                                label: "Entreprises Approuvées", 
                                value: global_stats.total_organizations, 
                                growth: dashboardData.growth?.orgs || 0,
                                icon: Building2, 
                                color: 'from-primary-600 to-accent-600',
                                shadow: 'shadow-primary-200 dark:shadow-primary-900/30',
                                description: "Organisations actives"
                            },
                            { 
                                label: "Membres Plateforme", 
                                value: global_stats.total_users, 
                                growth: dashboardData.growth?.users || 0,
                                icon: Users, 
                                color: 'from-accent-600 to-primary-600',
                                shadow: 'shadow-accent-200 dark:shadow-accent-900/30',
                                description: `${global_stats.active_trials} comptes en essai`
                            },
                            { 
                                label: "Vidéos Hébergées", 
                                value: global_stats.total_videos, 
                                growth: dashboardData.growth?.videos || 0,
                                icon: Video, 
                                color: 'from-emerald-500 to-teal-600',
                                shadow: 'shadow-emerald-200 dark:shadow-emerald-900/30',
                                description: `${global_stats.storage_used_mb} Mo de stockage`
                            },
                            { 
                                label: "Score d'Engagement", 
                                value: `${global_stats.avg_completion_rate || 0}%`, 
                                growth: dashboardData.growth?.completion || 0,
                                icon: Award, 
                                color: 'from-amber-500 to-accent-600',
                                shadow: 'shadow-orange-200 dark:shadow-orange-900/30',
                                description: "Moyenne de complétion"
                            }
                        ].map((card, index) => {
                            const isPositive = card.growth >= 0;
                            const progress = card.label.includes('Score') 
                                ? parseInt(card.value) 
                                : Math.min((parseInt(card.value) / 100) * 100, 100);

                            return (
                                <motion.div
                                    key={card.label}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    whileHover={{ 
                                        y: -8,
                                        transition: { duration: 0.2 }
                                    }}
                                    className="relative group bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-xl shadow-gray-200/40 dark:shadow-gray-900/40 overflow-hidden"
                                >
                                    <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${card.color} opacity-[0.03] rounded-bl-[5rem] -z-0`} />
                                    
                                    <div className="relative z-10">
                                        <div className="flex items-center justify-between mb-6">
                                            <div className={`p-4 bg-gradient-to-br ${card.color} rounded-2xl shadow-xl ${card.shadow} text-white`}>
                                                <card.icon className="w-6 h-6" />
                                            </div>
                                            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${isPositive ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                                                {isPositive ? '↑' : '↓'} {Math.abs(card.growth)}%
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">{card.label}</p>
                                            <p className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">{card.value}</p>
                                            <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 pt-2 flex items-center gap-1">
                                                <Zap className="w-3 h-3 text-primary-500 dark:text-primary-400" />
                                                {card.description}
                                            </p>
                                        </div>

                                        <div className="mt-6 h-2 bg-gray-50 dark:bg-gray-700 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${progress}%` }}
                                                transition={{ delay: 0.5 + index * 0.1, duration: 1.5, ease: "circOut" }}
                                                className={`h-full bg-gradient-to-r ${card.color} rounded-full`}
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}

                {/* Graphiques d'analyse */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    <GrowthChart />
                    <RevenueChart />
                </div>

                {/* Dernières entreprises */}
                {recent_organizations?.length > 0 && (
                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Building2 className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                                Onboarding Récent
                            </h2>
                            <button className="text-sm font-bold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300">
                                Voir tout
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {recent_organizations.map((org, index) => (
                                <motion.div
                                    key={org.id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.1 }}
                                    whileHover={{ y: -5 }}
                                    className="relative group bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-xl shadow-gray-100/50 dark:shadow-gray-900/50 overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary-50 dark:bg-primary-900/20 rounded-bl-[4rem] group-hover:bg-primary-600 transition-colors duration-500 -z-0 opacity-20 group-hover:opacity-10" />
                                    
                                    <div className="relative z-10 flex flex-col gap-4">
                                        <div className="flex items-center justify-between">
                                            <div className="w-14 h-14 bg-gradient-to-br from-primary-600 to-accent-700 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-primary-200 dark:shadow-primary-900/30">
                                                {org.name?.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="px-3 py-1 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-[10px] font-bold uppercase tracking-widest">
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

                {/* Tableau des entreprises et activités */}
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
                    className="text-center text-xs text-gray-400 dark:text-gray-500 flex items-center justify-center gap-1"
                >
                    <Shield className="w-3 h-3" />
                    <span>Données temps réel via RPC • Dernière mise à jour: {lastUpdate.toLocaleTimeString()}</span>
                </motion.div>
            </motion.div>
        </MainLayout>
    );
}
