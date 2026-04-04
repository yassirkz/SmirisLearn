import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
    Users, Video, Award, TrendingUp, Sparkles, 
    Clock, Shield, AlertCircle, CheckCircle,
    Activity, UserPlus, PlayCircle
} from 'lucide-react';
import AdminLayout from '../../components/layout/AdminLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useSearchParams } from 'react-router-dom';
import { useUserRole } from '../../hooks/useUserRole';

export default function AdminDashboard() {
    const { user } = useAuth();
    const { role, organizationId, loading: roleLoading } = useUserRole();
    const [searchParams] = useSearchParams();
    const orgIdFromUrl = searchParams.get('orgId');
    const isReadOnly = role === 'super_admin' && orgIdFromUrl;

    const [loading, setLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState(null);
    const [error, setError] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(new Date());
    const [isTabVisible, setIsTabVisible] = useState(true);

    // Monitoring de la visibilité de l'onglet (Performance)
    useEffect(() => {
        const handleVisibilityChange = () => setIsTabVisible(document.visibilityState === 'visible');
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    const fetchDashboardData = useCallback(async () => {
        if (!isTabVisible && dashboardData) return; // Économie de ressources si onglet caché
        
        try {
            const targetOrgId = orgIdFromUrl || organizationId;
            if (!targetOrgId) {
                if (!roleLoading) setLoading(false);
                return;
            }

            // Utilise la nouvelle RPC optimisée (V2)
            const { data, error } = await supabase
                .rpc('get_organization_dashboard_v2', {
                    p_org_id: targetOrgId
                });

            if (error) throw error;
            setDashboardData(data);
            setLastUpdate(new Date());
            setError(null);
        } catch (err) {
            console.error('Erreur lors du chargement du tableau de bord:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [orgIdFromUrl, organizationId, isTabVisible, dashboardData, roleLoading]);

    useEffect(() => {
        fetchDashboardData();
        const interval = setInterval(fetchDashboardData, 60000); // 1 minute (économie serveur)
        return () => clearInterval(interval);
    }, [fetchDashboardData]);

    if (loading) {
        return (
            <AdminLayout>
                <div className="min-h-[60vh] flex items-center justify-center">
                    <div className="relative">
                        <div className="w-20 h-20 border-4 border-primary-100 dark:border-primary-900 rounded-full"></div>
                        <div className="absolute top-0 left-0 w-20 h-20 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="mt-4 text-gray-500 dark:text-gray-400">Chargement...</p>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    if (error || !dashboardData) {
        return (
            <AdminLayout>
                <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                        <p className="text-sm text-red-700 dark:text-red-300">
                            Erreur lors du chargement: {error || '?'}
                        </p>
                    </div>
                    <button
                        onClick={fetchDashboardData}
                        className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 underline"
                    >
                        Réessayer
                    </button>
                </div>
            </AdminLayout>
        );
    }

    const { organization, stats, recent_activities, top_students } = dashboardData;

    const cards = [
        { 
            label: 'Membres', 
            value: stats?.total_members || 0,
            growth: stats?.growth_members || 0,
            icon: Users, 
            color: 'from-blue-500 to-cyan-400',
            glow: 'shadow-blue-500/30',
            description: 'Nombre total de membres'
        },
        { 
            label: 'Vidéos', 
            value: stats?.total_videos || 0,
            growth: stats?.growth_videos || 0,
            icon: Video, 
            color: 'from-purple-500 to-pink-500',
            glow: 'shadow-purple-500/30',
            description: 'Nombre total de vidéos'
        },
        { 
            label: 'Quiz', 
            value: stats?.total_quizzes || 0,
            growth: stats?.growth_quizzes || 0,
            icon: Award, 
            color: 'from-orange-500 to-amber-400',
            glow: 'shadow-orange-500/30',
            description: 'Nombre total de quiz'
        },
        { 
            label: 'Score Moyen', 
            value: `${Math.round(stats?.avg_score || 0)}%`,
            growth: 0,
            icon: TrendingUp, 
            color: 'from-emerald-400 to-teal-500',
            glow: 'shadow-emerald-500/30',
            description: 'Performance globale'
        },
    ];

    return (
        <AdminLayout>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-8"
                style={{ perspective: "1200px" }}
            >
                {/* En-tête */}
                <div className="relative mb-10">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-bold uppercase tracking-widest mb-4"
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                {organization?.plan_type === 'starter' ? 'Plan Starter' : 'Plan Premium'}
                            </motion.div>
                            
                            <h1 className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 tracking-tight leading-tight">
                                {organization?.name || 'Tableau de bord'}
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-2 font-medium">
                                <Activity className="w-4 h-4 text-primary-500" />
                                Vue générale de l'activité
                                <span className="mx-2 opacity-50">•</span>
                                <span className="text-sm">Mis à jour à {lastUpdate.toLocaleTimeString('fr-FR')}</span>
                            </p>
                        </div>

                        {/* Bouton rafraîchir */}
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={fetchDashboardData}
                            className="px-5 py-2.5 bg-white dark:bg-slate-800 border-2 border-primary-100 dark:border-slate-700 rounded-2xl hover:border-primary-300 dark:hover:border-primary-500 transition-all flex items-center justify-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200 shadow-sm"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Rafraîchir
                        </motion.button>
                    </div>
                </div>

                {/* Cartes de statistiques */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {cards.map((card, index) => {
                        const isPositive = card.growth >= 0;
                        return (
                            <motion.div
                                key={card.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                whileHover={{ y: -6, scale: 1.02 }}
                                className="bg-white/90 dark:bg-slate-900/80 rounded-3xl p-6 shadow-xl border border-white/50 dark:border-white/5 backdrop-blur-xl relative overflow-hidden group"
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
                                
                                <div className="mt-5 h-1.5 bg-gray-100 dark:bg-gray-800/50 rounded-full overflow-hidden relative z-10">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min((card.value.toString().includes('%') ? parseInt(card.value) : card.value / 50) * 100, 100)}%` }}
                                        transition={{ delay: 0.5 + index * 0.1, duration: 1.5, ease: "easeOut" }}
                                        className={`h-full bg-gradient-to-r ${card.color} rounded-full`}
                                    />
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Sections détaillées */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
                    {/* Activités récentes */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="lg:col-span-2 bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-xl border border-white/50 dark:border-white/5 overflow-hidden relative"
                    >
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/5 dark:bg-primary-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                        
                        <div className="relative z-10 flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                                <div className="p-2.5 bg-primary-100 dark:bg-primary-500/20 rounded-xl text-primary-600 dark:text-primary-400">
                                    <Activity className="w-6 h-6" />
                                </div>
                                Activités récentes
                            </h2>
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-full shadow-inner">
                                {recent_activities?.length || 0} activités
                            </span>
                        </div>

                        {recent_activities?.length > 0 ? (
                            <div className="space-y-4 relative z-10">
                                {recent_activities.map((activity, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.4 + index * 0.1 }}
                                        whileHover={{ x: 5 }}
                                        className="flex items-center gap-4 p-4 bg-gray-50/80 dark:bg-slate-800/60 rounded-2xl hover:bg-white dark:hover:bg-slate-700/80 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 shadow-sm hover:shadow-lg transition-all group"
                                    >
                                        <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform">
                                            <UserPlus className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{activity.description}</p>
                                            <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">
                                                <Clock className="w-3.5 h-3.5 text-primary-400" />
                                                <span>{new Date(activity.timestamp).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute:'2-digit' })}</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                                <Activity className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                <p className="font-medium text-lg">Aucune activité récente</p>
                                <p className="text-sm mt-1">L'historique de votre organisation apparaîtra ici</p>
                            </div>
                        )}
                    </motion.div>

                    {/* Top étudiants */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-xl border border-white/50 dark:border-white/5 overflow-hidden relative"
                    >
                        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-accent-500/10 dark:bg-accent-500/20 rounded-full blur-3xl pointer-events-none" />
                        
                        <div className="relative z-10 flex items-center justify-between mb-8">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                                <div className="p-2.5 bg-accent-100 dark:bg-accent-500/20 rounded-xl text-accent-600 dark:text-accent-400">
                                    <TrendingUp className="w-5 h-5" />
                                </div>
                                Progressions
                            </h2>
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-full shadow-inner">
                                Top {top_students?.length || 0}
                            </span>
                        </div>

                        {top_students?.length > 0 ? (
                            <div className="space-y-6 relative z-10">
                                {top_students.map((student, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.5 + index * 0.1 }}
                                        className="space-y-3 p-4 bg-gray-50/80 dark:bg-slate-800/60 rounded-2xl hover:bg-white dark:hover:bg-slate-700/80 transition-all border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md">
                                                    {student.name?.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-bold text-gray-800 dark:text-gray-200">{student.name}</span>
                                            </div>
                                            <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-br from-green-500 to-emerald-400">
                                                {student.completion}%
                                            </span>
                                        </div>
                                        <div className="h-2.5 bg-gray-200/50 dark:bg-gray-800 rounded-full overflow-hidden shadow-inner">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${student.completion}%` }}
                                                transition={{ delay: 0.8 + index * 0.1, duration: 1.5, ease: "easeOut" }}
                                                className="h-full bg-gradient-to-r from-green-400 to-emerald-600 rounded-full"
                                            />
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-gray-400 dark:text-gray-500 relative z-10">
                                <Users className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                <p className="font-medium text-lg">Aucune donnée</p>
                                <p className="text-sm mt-1">Les progressions s'afficheront ici</p>
                            </div>
                        )}

                        {/* Info sécurisée */}
                        <div className="mt-8 p-3 bg-gradient-to-r from-primary-50 to-primary-100/50 dark:from-primary-900/10 dark:to-primary-800/5 rounded-xl border border-primary-100 dark:border-primary-900/30 relative z-10">
                            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center justify-center gap-2">
                                <Shield className="w-4 h-4 text-primary-500" />
                                Mise à jour des données en temps réel
                            </p>
                        </div>
                    </motion.div>
                </div>
            </motion.div>
        </AdminLayout>
    );
}