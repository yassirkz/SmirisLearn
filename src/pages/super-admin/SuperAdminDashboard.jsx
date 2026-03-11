import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    Building2, Users, Video, Award, AlertCircle,
    Shield, TrendingUp, Clock, Zap, Sparkles
} from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import CompaniesTable from '../../components/super-admin/CompaniesTable';
import RecentActivity from '../../components/super-admin/RecentActivity';
import { supabase } from '../../lib/supabase';

export default function SuperAdminDashboard() {
    const [loading, setLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState(null);
    const [error, setError] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(new Date());

    useEffect(() => {
        fetchDashboardData();
        const interval = setInterval(fetchDashboardData, 60000); // Rafraîchir toutes les minutes
        return () => clearInterval(interval);
    }, []);

    const fetchDashboardData = async () => {
        try {
            // ✅ Utilisation de la fonction RPC super admin
            const { data, error } = await supabase
                .rpc('get_super_admin_dashboard');

            if (error) throw error;
            
            setDashboardData(data);

            // Calculer la croissance réelle (Super Admin)
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
                        <div className="w-20 h-20 border-4 border-blue-200 rounded-full"></div>
                        <div className="absolute top-0 left-0 w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="mt-4 text-gray-500">Chargement du dashboard...</p>
                    </div>
                </div>
            </MainLayout>
        );
    }

    if (error || !dashboardData) {
        return (
            <MainLayout>
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <p className="text-sm text-red-700">Erreur de chargement: {error || "Données non disponibles"}</p>
                    </div>
                    <button
                        onClick={fetchDashboardData}
                        className="mt-2 text-sm text-red-600 hover:text-red-700 underline"
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
            >
                {/* En-tête */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Dashboard Super Admin</h1>
                        <p className="text-gray-500 mt-1 flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Dernière mise à jour: {lastUpdate.toLocaleTimeString()}
                        </p>
                    </div>
                    
                    <button
                        onClick={fetchDashboardData}
                        className="px-4 py-2 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-300 transition-all flex items-center gap-2 text-sm"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Rafraîchir
                    </button>
                </div>

                {/* Alertes système */}
                {system_status?.maintenance_mode && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-yellow-600" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-yellow-800">Mode maintenance activé</p>
                            <p className="text-xs text-yellow-600">La plateforme est en maintenance. Les inscriptions sont {system_status.allow_registration ? 'autorisées' : 'désactivées'}.</p>
                        </div>
                    </div>
                )}

                {/* Stats globales */}
                {global_stats && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { 
                                label: 'Entreprises', 
                                value: global_stats.total_organizations, 
                                growth: dashboardData.growth?.orgs || 0,
                                icon: Building2, 
                                color: 'from-blue-500 to-blue-600',
                                bg: 'bg-blue-50',
                                description: 'Total actif'
                            },
                            { 
                                label: 'Utilisateurs', 
                                value: global_stats.total_users, 
                                growth: dashboardData.growth?.users || 0,
                                icon: Users, 
                                color: 'from-purple-500 to-purple-600',
                                bg: 'bg-purple-50',
                                description: `Dont ${global_stats.active_trials} en essai`
                            },
                            { 
                                label: 'Vidéos', 
                                value: global_stats.total_videos, 
                                growth: dashboardData.growth?.videos || 0,
                                icon: Video, 
                                color: 'from-green-500 to-green-600',
                                bg: 'bg-green-50',
                                description: `${global_stats.storage_used_mb} Mo utilisés`
                            },
                            { 
                                label: 'Taux complétion', 
                                value: `${global_stats.avg_completion_rate || 0}%`, 
                                growth: dashboardData.growth?.completion || 0,
                                icon: TrendingUp, 
                                color: 'from-orange-500 to-orange-600',
                                bg: 'bg-orange-50',
                                description: 'Moyenne plateforme'
                            }
                        ].map((card, index) => {
                            const isPositive = card.growth >= 0;
                            const progress = card.label === 'Taux complétion' 
                                ? parseInt(card.value) 
                                : Math.min((parseInt(card.value) / 100) * 100, 100);

                            return (
                                <motion.div
                                    key={card.label}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    whileHover={{ y: -5 }}
                                    className={`${card.bg} rounded-2xl p-6 shadow-lg border border-white/50 backdrop-blur-sm relative overflow-hidden group`}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                    
                                    <div className="relative flex items-start justify-between">
                                        <div>
                                            <p className="text-sm text-gray-500 mb-1">{card.label}</p>
                                            <p className="text-3xl font-bold text-gray-800">{card.value}</p>
                                            <p className={`text-xs mt-2 flex items-center gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                                {isPositive ? '↑' : '↓'} {Math.abs(card.growth)}%
                                                <span className="text-gray-400 font-normal ml-1">vs mois dernier</span>
                                            </p>
                                            <p className="text-xs text-gray-500 mt-2">{card.description}</p>
                                        </div>
                                        <div className={`p-3 bg-gradient-to-br ${card.color} rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                            <card.icon className="w-6 h-6 text-white" />
                                        </div>
                                    </div>

                                    <div className="mt-4 h-1.5 bg-gray-200/50 rounded-full overflow-hidden relative">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progress}%` }}
                                            transition={{ delay: 0.5 + index * 0.1, duration: 1 }}
                                            className={`h-full bg-gradient-to-r ${card.color} rounded-full relative`}
                                        >
                                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white border border-current rounded-full shadow-sm" style={{ color: card.color.split(' ')[1].replace('to-', '') }} />
                                        </motion.div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}

                {/* Dernières entreprises */}
                {recent_organizations?.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-blue-100"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-blue-600" />
                                Dernières entreprises
                            </h2>
                            <span className="text-xs text-gray-400">
                                {recent_organizations.length} nouvelles
                            </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {recent_organizations.map((org, index) => (
                                <motion.div
                                    key={org.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.6 + index * 0.1 }}
                                    className="p-4 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 hover:shadow-md transition-all"
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                                            {org.name?.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-800">{org.name}</p>
                                            <p className="text-xs text-gray-500">Plan: {org.plan}</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-between text-xs text-gray-500">
                                        <span>Membres: {org.member_count}</span>
                                        <span>{new Date(org.created_at).toLocaleDateString()}</span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
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
                    className="text-center text-xs text-gray-400 flex items-center justify-center gap-1"
                >
                    <Shield className="w-3 h-3" />
                    <span>Données temps réel via RPC • Dernière mise à jour: {lastUpdate.toLocaleTimeString()}</span>
                </motion.div>
            </motion.div>
        </MainLayout>
    );
}