import { useState, useEffect } from 'react';
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
    const { role } = useUserRole();
    const [searchParams] = useSearchParams();
    const orgIdFromUrl = searchParams.get('orgId');
    const isReadOnly = role === 'super_admin' && orgIdFromUrl;

    const [loading, setLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState(null);
    const [error, setError] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(new Date());

    useEffect(() => {
        fetchDashboardData();
        const interval = setInterval(fetchDashboardData, 30000);
        return () => clearInterval(interval);
    }, [user, orgIdFromUrl]);

    const fetchDashboardData = async () => {
        try {
            let targetOrgId = orgIdFromUrl;
            
            if (!targetOrgId && user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('organization_id')
                    .eq('id', user.id)
                    .single();
                
                targetOrgId = profile?.organization_id;
            }

            if (!targetOrgId) {
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .rpc('get_organization_dashboard', {
                    p_org_id: targetOrgId
                });

            if (error) throw error;
            
            setDashboardData(data);
            
            const lastMonth = new Date();
            lastMonth.setMonth(lastMonth.getMonth() - 1);

            const [prevMembers, prevVideos, prevQuizzes] = await Promise.all([
                supabase.from('profiles')
                    .select('*', { count: 'exact', head: true })
                    .eq('organization_id', targetOrgId)
                    .lt('created_at', lastMonth.toISOString()),
                supabase.from('pillars')
                    .select('id')
                    .eq('organization_id', targetOrgId)
            ]);

            let prevVideosCount = 0;
            let prevQuizzesCount = 0;

            if (prevVideos.data?.length > 0) {
                const pillarIds = prevVideos.data.map(p => p.id);
                
                const [vRes, qRes] = await Promise.all([
                    supabase.from('videos')
                        .select('*', { count: 'exact', head: true })
                        .in('pillar_id', pillarIds)
                        .lt('created_at', lastMonth.toISOString()),
                    supabase.from('quizzes')
                        .select('*, videos!inner(pillar_id)', { count: 'exact', head: true })
                        .in('videos.pillar_id', pillarIds)
                        .lt('created_at', lastMonth.toISOString())
                ]);
                prevVideosCount = vRes.count || 0;
                prevQuizzesCount = qRes.count || 0;
            }

            const calculateGrowth = (current, previous) => {
                if (!previous || previous === 0) return current > 0 ? 100 : 0;
                return Math.round(((current - previous) / previous) * 100);
            };

            setDashboardData(prev => ({
                ...prev,
                growth: {
                    members: calculateGrowth(data.stats?.total_members || 0, prevMembers.count || 0),
                    videos: calculateGrowth(data.stats?.total_videos || 0, prevVideosCount),
                    quizzes: calculateGrowth(data.stats?.total_quizzes || 0, prevQuizzesCount),
                    score: 0
                }
            }));

            setLastUpdate(new Date());
            setError(null);

        } catch (err) {
            console.error('Erreur lors du chargement du tableau de bord:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <AdminLayout>
                <div className="min-h-[60vh] flex items-center justify-center">
                    <div className="relative">
                        <div className="w-20 h-20 border-4 border-indigo-200 dark:border-indigo-800 rounded-full"></div>
                        <div className="absolute top-0 left-0 w-20 h-20 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
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
            growth: dashboardData?.growth?.members || 0,
            icon: Users, 
            color: 'from-indigo-500 to-indigo-600',
            bg: 'bg-indigo-50 dark:bg-indigo-900/30',
            description: 'Nombre total de membres'
        },
        { 
            label: 'Vidéos', 
            value: stats?.total_videos || 0,
            growth: dashboardData?.growth?.videos || 0,
            icon: Video, 
            color: 'from-purple-500 to-purple-600',
            bg: 'bg-purple-50 dark:bg-purple-900/30',
            description: 'Nombre total de vidéos'
        },
        { 
            label: 'Quiz', 
            value: stats?.total_quizzes || 0,
            growth: dashboardData?.growth?.quizzes || 0,
            icon: Award, 
            color: 'from-pink-500 to-pink-600',
            bg: 'bg-pink-50 dark:bg-pink-900/30',
            description: 'Nombre total de quiz'
        },
        { 
            label: 'Score Moyen', 
            value: `${Math.round(stats?.avg_score || 0)}%`,
            growth: dashboardData?.growth?.score || 0,
            icon: TrendingUp, 
            color: 'from-green-500 to-green-600',
            bg: 'bg-green-50 dark:bg-green-900/30',
            description: 'Performance globale des étudiants'
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
                {/* En-tête avec badge de rafraîchissement */}
                <div className="relative">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-4 -right-4"
                    >
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-bl-2xl rounded-tr-2xl text-xs font-bold shadow-lg flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            {new Date().toLocaleDateString('fr-FR', { 
                                weekday: 'long', 
                                day: 'numeric', 
                                month: 'long' 
                            })}
                        </div>
                    </motion.div>

                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                {organization?.name || 'Tableau de bord'}
                                {organization?.plan_type === 'starter' && (
                                    <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-full">
                                        Essai
                                    </span>
                                )}
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                                <Activity className="w-4 h-4" />
                                {stats?.total_members || 0} membres • 
                                {stats?.total_videos || 0} vidéos
                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                    Mis à jour à : {lastUpdate.toLocaleTimeString('fr-FR')}
                                </span>
                            </p>
                        </div>

                        {/* Bouton rafraîchir */}
                        <button
                            onClick={fetchDashboardData}
                            className="mt-4 md:mt-0 px-4 py-2 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-indigo-300 dark:hover:border-indigo-600 transition-all flex items-center gap-2 text-sm dark:text-gray-200"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Rafraîchir
                        </button>
                    </div>
                </div>

                {/* Cartes de statistiques */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {cards.map((card, index) => {
                        const isPositive = card.growth >= 0;
                        return (
                            <motion.div
                                key={card.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                whileHover={{ 
                                    rotateY: 5, 
                                    rotateX: -5, 
                                    scale: 1.05, 
                                    z: 30,
                                    boxShadow: "0 20px 40px rgba(0,0,0,0.1)"
                                }}
                                style={{ transformStyle: "preserve-3d" }}
                                className={`${card.bg} rounded-2xl p-6 shadow-lg border border-white/50 dark:border-gray-700 backdrop-blur-sm relative overflow-hidden group`}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-gray-700/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                
                                <div className="relative flex items-start justify-between" style={{ transform: "translateZ(30px)" }}>
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{card.label}</p>
                                        <p className="text-3xl font-bold text-gray-800 dark:text-white">{card.value}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-xs font-medium ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                {isPositive ? '↑' : '↓'} {Math.abs(card.growth)}%
                                            </span>
                                            <span className="text-xs text-gray-400 dark:text-gray-500">vs mois dernier</span>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{card.description}</p>
                                    </div>
                                    <div className={`p-3 bg-gradient-to-br ${card.color} rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                        <card.icon className="w-6 h-6 text-white" />
                                    </div>
                                </div>

                                <div className="mt-4 h-1.5 bg-gray-200/50 dark:bg-gray-700/50 rounded-full overflow-hidden relative" style={{ transform: "translateZ(10px)" }}>
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min((card.value.toString().includes('%') ? parseInt(card.value) : card.value / 50) * 100, 100)}%` }}
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

                {/* Sections détaillées */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Activités récentes */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="lg:col-span-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-indigo-100 dark:border-gray-700"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                                <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                Activités récentes
                            </h2>
                            <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                                {recent_activities?.length || 0} activités
                            </span>
                        </div>

                        {recent_activities?.length > 0 ? (
                            <div className="space-y-3">
                                {recent_activities.map((activity, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.4 + index * 0.1 }}
                                        className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:shadow-md transition-all group"
                                    >
                                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                            <UserPlus className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{activity.description}</p>
                                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                                <Clock className="w-3 h-3" />
                                                <span>{new Date(activity.timestamp).toLocaleDateString('fr-FR')}</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                                <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p>Aucune activité récente</p>
                            </div>
                        )}
                    </motion.div>

                    {/* Top étudiants */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-indigo-100 dark:border-gray-700"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                Meilleures progressions
                            </h2>
                            <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                                {top_students?.length || 0} membres
                            </span>
                        </div>

                        {top_students?.length > 0 ? (
                            <div className="space-y-4">
                                {top_students.map((student, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.5 + index * 0.1 }}
                                        className="space-y-2"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                                    {student.name?.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{student.name}</span>
                                            </div>
                                            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{student.completion}%</span>
                                        </div>
                                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${student.completion}%` }}
                                                transition={{ delay: 0.8 + index * 0.1, duration: 1 }}
                                                className="h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full"
                                            />
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p>Aucune donnée disponible</p>
                            </div>
                        )}

                        {/* Info sécurisée */}
                        <div className="mt-4 p-2 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-lg">
                            <p className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-1">
                                <Shield className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                                Données en temps réel
                            </p>
                        </div>
                    </motion.div>
                </div>
            </motion.div>
        </AdminLayout>
    );
}