import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Video, Award, TrendingUp, 
        Calendar, Sparkles, Clock, CheckCircle,
        AlertCircle, Shield, Activity, UserPlus,
        PlayCircle
} from 'lucide-react';
import AdminLayout from '../../components/layout/AdminLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useSearchParams } from 'react-router-dom';
import { useUserRole } from '../../hooks/useUserRole';
import { untrusted, escapeText } from '../../utils/security';


export default function AdminDashboard() {
    const { user } = useAuth();
    const { role } = useUserRole();
    const [searchParams] = useSearchParams();
    const orgIdFromUrl = searchParams.get('orgId');
    const isReadOnly = role === 'super_admin' && orgIdFromUrl;

    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        members: { current: 0, previous: 0, growth: 0 },
        videos: { current: 0, previous: 0, growth: 0 },
        quizzes: { current: 0, previous: 0, growth: 0 },
        completion: { current: 0, previous: 0, growth: 0 }
    });
    const [recentActivities, setRecentActivities] = useState([]);
    const [companyInfo, setCompanyInfo] = useState({
        name: '',
        plan: '',
        trialDays: 0,
        createdAt: '',
        endsAt: ''
    });
    const [topMembers, setTopMembers] = useState([]);
    const [recentVideos, setRecentVideos] = useState([]);

    // ============================================
    // Récupération des données dynamiques
    // ============================================
    useEffect(() => {
        fetchDashboardData();        
        // refresh chaque 30 secondes
        const interval = setInterval(fetchDashboardData, 30000);
        return () => clearInterval(interval);
    }, [user]);

    const fetchDashboardData = async () => {
        try {
            let orgId = null;

            if (isReadOnly) {
                orgId = orgIdFromUrl;
            } else {
                // 1. Récupérer le profil de l'utilisateur
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('organization_id, full_name, email')
                    .eq('id', user.id)
                    .maybeSingle();

                if (profileError) throw profileError;
                if (!profile?.organization_id) return;
                orgId = profile.organization_id;
            }
            // 2. Date du mois dernier pour comparaison
            const lastMonth = new Date();
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            // 3. Récupérer les infos de l'entreprise
            const { data: org, error: orgError } = await supabase
                .from('organizations')
                .select('name, plan_type, trial_ends_at, created_at')
                .eq('id', orgId)
                .maybeSingle();

            if (orgError) throw orgError;

            if (org) {
                const safeName = escapeText(untrusted(org.name));
                const daysLeft = org.trial_ends_at 
                    ? Math.max(0, Math.ceil((new Date(org.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24)))
                    : 0;

                setCompanyInfo({
                    name: safeName,
                    plan: org.plan_type || 'starter',
                    trialDays: daysLeft,
                    createdAt: new Date(org.created_at).toLocaleDateString('fr-FR'),
                    endsAt: org.trial_ends_at ? new Date(org.trial_ends_at).toLocaleDateString('fr-FR') : 'N/A'
                });
            }
            console.log('📦 Requête 3: members count');
            // 4. Compter les membres (actuels vs mois dernier)
            const [membersCurrent, membersPrevious] = await Promise.all([
                supabase.from('profiles')
                    .select('*', { count: 'exact', head: true })
                    .eq('organization_id', orgId),
                supabase.from('profiles')
                    .select('*', { count: 'exact', head: true })
                    .eq('organization_id', orgId)
                    .lt('created_at', lastMonth.toISOString())
            ]);
            // 5. Récupérer les piliers
            const { data: pillars, error: pillarsError } = await supabase
                .from('pillars')
                .select('id, name')
                .eq('organization_id', orgId);
            if (pillarsError) throw pillarsError;

            let videosCurrent = 0, videosPrevious = 0;
            let quizzesCurrent = 0, quizzesPrevious = 0;

            if (pillars && pillars.length > 0) {
                const pillarIds = pillars.map(p => p.id);

                // Vidéos actuelles vs mois dernier
                const [videosRes, videosPrevRes] = await Promise.all([
                    supabase.from('videos')
                        .select('*', { count: 'exact', head: true })
                        .in('pillar_id', pillarIds),
                    supabase.from('videos')
                        .select('*', { count: 'exact', head: true })
                        .in('pillar_id', pillarIds)
                        .lt('created_at', lastMonth.toISOString())
                ]);
                videosCurrent = videosRes.count || 0;
                videosPrevious = videosPrevRes.count || 0;

                // Quiz actuels vs mois dernier
                if (videosCurrent > 0) {
                    const { data: videos } = await supabase
                        .from('videos')
                        .select('id')
                        .in('pillar_id', pillarIds);

                    const videoIds = videos?.map(v => v.id) || [];

                    const [quizzesRes, quizzesPrevRes] = await Promise.all([
                        supabase.from('quizzes')
                            .select('*', { count: 'exact', head: true })
                            .in('video_id', videoIds),
                        supabase.from('quizzes')
                            .select('*', { count: 'exact', head: true })
                            .in('video_id', videoIds)
                            .lt('created_at', lastMonth.toISOString())
                    ]);
                    quizzesCurrent = quizzesRes.count || 0;
                    quizzesPrevious = quizzesPrevRes.count || 0;
                }
            }

            // 6. Récupérer les derniers membres
            const { data: recentMembers, error: membersError } = await supabase
                .from('profiles')
                .select('full_name, email, role, created_at')
                .eq('organization_id', orgId)
                .neq('role', 'org_admin')  // ← EXCLURE L'ADMIN
                .order('created_at', { ascending: false })
                .limit(5);

            if (membersError) throw membersError;

            setRecentActivities(recentMembers?.map(m => ({
                type: 'member',
                title: `Nouveau membre : ${escapeText(untrusted(m.full_name || m.email.split('@')[0]))}`,
                time: new Date(m.created_at).toLocaleDateString('fr-FR'),
                role: m.role
            })) || []);
            // 7. Récupérer les dernières vidéos
            if (pillars && pillars.length > 0) {
                const { data: videos, error: videosError } = await supabase
                    .from('videos')
                    .select('title, created_at, pillar_id')
                    .in('pillar_id', pillars.map(p => p.id))
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (!videosError && videos) {
                    setRecentVideos(videos.map(v => ({
                        title: escapeText(untrusted(v.title)),
                        time: new Date(v.created_at).toLocaleDateString('fr-FR'),
                        pillar: pillars.find(p => p.id === v.pillar_id)?.name || 'Inconnu'
                    })));
                }
            }
            // ============================================
            // 8. TOP MEMBRES PAR PROGRESSION (Fix 400 error by splitting queries)
            // ============================================
            const { data: profiles, error: membersProgressError } = await supabase
                .from('profiles')
                .select('id, full_name, email')
                .eq('organization_id', orgId);

            if (!membersProgressError && profiles) {
                const userIds = profiles.map(p => p.id);
                const { data: progressData } = await supabase
                    .from('user_progress')
                    .select('user_id, watched, quiz_score, video_id')
                    .in('user_id', userIds);

                // Create a map for easy lookup
                const members = profiles.map(profile => ({
                    ...profile,
                    user_progress: progressData?.filter(p => p.user_id === profile.id) || []
                }));
                // Compter le nombre total de vidéos dans l'entreprise
                let totalVideos = 1; // Éviter division par zéro
                if (pillars && pillars.length > 0) {
                    const { data: allVideos } = await supabase
                        .from('videos')
                        .select('id')
                        .in('pillar_id', pillars.map(p => p.id));

                    totalVideos = allVideos?.length || 1;
                }

                // Calculer la progression pour chaque membre
                const membersWithProgress = members.map(member => {
                    const watchedCount = member.user_progress?.filter(p => p.watched).length || 0;
                    const progress = Math.round((watchedCount / totalVideos) * 100);

                    return {
                        name: escapeText(untrusted(member.full_name || member.email.split('@')[0])),
                        progress,
                        avatar: (member.full_name || member.email)[0].toUpperCase(),
                        email: member.email
                    };
                });

                // Trier par progression décroissante et prendre les 3 premiers
                const topMembers = membersWithProgress
                    .sort((a, b) => b.progress - a.progress)
                    .slice(0, 3);

                setTopMembers(topMembers);
            }

            // 9. Calculer les pourcentages de croissance
            const calculateGrowth = (current, previous) => {
                if (previous === 0) return current > 0 ? 100 : 0;
                return Math.round(((current - previous) / previous) * 100);
            };

            setStats({
                members: {
                    current: membersCurrent.count || 0,
                    previous: membersPrevious.count || 0,
                    growth: calculateGrowth(membersCurrent.count || 0, membersPrevious.count || 0)
                },
                videos: {
                    current: videosCurrent,
                    previous: videosPrevious,
                    growth: calculateGrowth(videosCurrent, videosPrevious)
                },
                quizzes: {
                    current: quizzesCurrent,
                    previous: quizzesPrevious,
                    growth: calculateGrowth(quizzesCurrent, quizzesPrevious)
                },
                completion: {
                    current: Math.round(topMembers.reduce((acc, m) => acc + m.progress, 0) / (topMembers.length || 1)),
                    previous: 55,
                    growth: 8
                }
            });

        } catch (error) {
            console.error('Erreur chargement dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const cards = [
        { 
            label: 'Membres', 
            data: stats.members,
            icon: Users, 
            color: 'from-indigo-500 to-indigo-600', 
            bg: 'bg-indigo-50',
            description: 'Total utilisateurs'
        },
        { 
            label: 'Vidéos', 
            data: stats.videos,
            icon: Video, 
            color: 'from-purple-500 to-purple-600', 
            bg: 'bg-purple-50',
            description: 'Contenu disponible'
        },
        { 
            label: 'Quiz', 
            data: stats.quizzes,
            icon: Award, 
            color: 'from-pink-500 to-pink-600', 
            bg: 'bg-pink-50',
            description: 'Évaluations'
        },
        { 
            label: 'Complétion', 
            data: stats.completion,
            icon: TrendingUp, 
            color: 'from-green-500 to-green-600', 
            bg: 'bg-green-50',
            description: 'Moyenne'
        },
    ];

    if (loading) {
        return (
            <AdminLayout>
                <div className="min-h-[60vh] flex items-center justify-center">
                    <div className="relative">
                        <div className="w-20 h-20 border-4 border-indigo-200 rounded-full"></div>
                        <div className="absolute top-0 left-0 w-20 h-20 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="mt-4 text-gray-500">Chargement de votre dashboard...</p>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-8"
            >
                {/* En-tête avec bienvenue dynamique */}
                <div className="relative">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-4 -right-4"
                    >
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-bl-2xl rounded-tr-2xl text-xs font-bold shadow-lg flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </div>
                    </motion.div>

                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                                {companyInfo.name || 'Dashboard Admin'}
                                {companyInfo.plan === 'starter' && (
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                        Essai • {companyInfo.trialDays}j
                                    </span>
                                )}
                            </h1>
                            <p className="text-gray-500 mt-1">
                                {stats.members.current} membre{stats.members.current > 1 ? 's' : ''} • {stats.videos.current} vidéo{stats.videos.current > 1 ? 's' : ''}
                            </p>
                        </div>

                        {/* Badge période d'essai*/}
                        {companyInfo.trialDays > 0 && (
                            <motion.div
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="mt-4 md:mt-0"
                            >
                                <div className={`px-4 py-3 rounded-xl flex items-center gap-3 shadow-lg backdrop-blur-sm ${
                                    companyInfo.trialDays <= 3 
                                        ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white' 
                                        : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                                }`}>
                                    {companyInfo.trialDays <= 3 ? (
                                        <AlertCircle className="w-5 h-5" />
                                    ) : (
                                        <CheckCircle className="w-5 h-5" />
                                    )}
                                    <div>
                                        <p className="text-sm opacity-90">Fin d'essai</p>
                                        <p className="font-bold">{companyInfo.endsAt}</p>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>

                {/* Cartes de statistiques */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {cards.map((card, index) => {
                        const isPositive = card.data.growth >= 0;
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
                                        <p className="text-sm text-gray-600 mb-1">{card.label}</p>
                                        <p className="text-3xl font-bold text-gray-800">{card.data.current}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                                {isPositive ? '↑' : '↓'} {Math.abs(card.data.growth)}%
                                            </span>
                                            <span className="text-xs text-gray-400">vs mois dernier</span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2">{card.description}</p>
                                    </div>
                                    <div className={`p-3 bg-gradient-to-br ${card.color} rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                        <card.icon className="w-6 h-6 text-white" />
                                    </div>
                                </div>

                                <div className="mt-4 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(card.data.current / 50 * 100, 100)}%` }}
                                        transition={{ delay: 0.5 + index * 0.1, duration: 1 }}
                                        className={`h-full bg-gradient-to-r ${card.color}`}
                                    />
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Sections détaillées */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Dernières vidéos */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="lg:col-span-2 bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-indigo-100"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                <Video className="w-5 h-5 text-indigo-600" />
                                Dernières vidéos
                            </h2>
                            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                                {recentVideos.length} récentes
                            </span>
                        </div>

                        {recentVideos.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">
                                <PlayCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p>Aucune vidéo pour l'instant</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {recentVideos.map((video, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.4 + index * 0.1 }}
                                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:shadow-md transition-all group"
                                    >
                                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                            <Video className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-800">{video.title}</p>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <Clock className="w-3 h-3" />
                                                <span>{video.time}</span>
                                                <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                                <span>{video.pillar}</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.div>

                    {/* Top membres dynamiques */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-indigo-100"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-purple-600" />
                                Top progression
                            </h2>
                            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                                {topMembers.length} membres
                            </span>
                        </div>

                        {topMembers.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">
                                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p>Aucun membre pour l'instant</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {topMembers.map((member, index) => (
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
                                                    {member.avatar}
                                                </div>
                                                <span className="text-sm font-medium text-gray-700">{member.name}</span>
                                            </div>
                                            <span className="text-sm font-bold text-indigo-600">{member.progress}%</span>
                                        </div>
                                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${member.progress}%` }}
                                                transition={{ delay: 0.8 + index * 0.1, duration: 1 }}
                                                className="h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full"
                                            />
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}

                        {/* Activité récente */}
                        <div className="mt-6 pt-4 border-t border-gray-100">
                            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-indigo-600" />
                                Activité récente
                            </h3>
                            <div className="space-y-2">
                                {recentActivities.slice(0, 2).map((activity, index) => (
                                    <div key={index} className="text-xs text-gray-500 flex items-center gap-2">
                                        <UserPlus className="w-3 h-3 text-green-500" />
                                        <span>{activity.title}</span>
                                        <span className="ml-auto text-gray-400">{activity.time}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Info sécurisée */}
                        <div className="mt-4 p-2 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg">
                            <p className="text-xs text-gray-600 flex items-center gap-1">
                                <Shield className="w-3 h-3 text-indigo-600" />
                                Données mises à jour en temps réel
                            </p>
                        </div>
                    </motion.div>
                </div>
            </motion.div>
        </AdminLayout>
    );
}