import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    Users, Video, Award, TrendingUp, 
    Shield, AlertCircle, CheckCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { untrusted, escapeText } from '../../utils/security';

export default function AdminStats() {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        members: { current: 0, previous: 0, growth: 0 },
        videos: { current: 0, previous: 0, growth: 0 },
        quizzes: { current: 0, previous: 0, growth: 0 },
        completion: { current: 0, previous: 0, growth: 0 }
    });
    const [loading, setLoading] = useState(true);
    const [companyInfo, setCompanyInfo] = useState(null);

    useEffect(() => {
        fetchStats();
    }, [user]);

    const fetchStats = async () => {
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('organization_id')
                .eq('id', user.id)
                .single();

            if (!profile?.organization_id) return;

            const orgId = profile.organization_id;
            const lastMonth = new Date();
            lastMonth.setMonth(lastMonth.getMonth() - 1);

            // ============================================
            // Infos entreprise
            // ============================================
            const { data: org } = await supabase
                .from('organizations')
                .select('name, plan_type, trial_ends_at, created_at')
                .eq('id', orgId)
                .single();

            if (org) {
                const daysLeft = org.trial_ends_at 
                    ? Math.max(0, Math.ceil((new Date(org.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24)))
                    : 0;

                setCompanyInfo({
                    name: escapeText(untrusted(org.name)),
                    plan: org.plan_type,
                    daysLeft,
                    createdAt: new Date(org.created_at).toLocaleDateString('fr-FR')
                });
            }

            // ============================================
            // Membres
            // ============================================
            const [membersCurrent, membersPrevious] = await Promise.all([
                supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
                supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).lt('created_at', lastMonth.toISOString())
            ]);

            // ============================================
            // Piliers et vidéos
            // ============================================
            const { data: pillars } = await supabase
                .from('pillars')
                .select('id')
                .eq('organization_id', orgId);

            let videosCurrent = 0, videosPrevious = 0;
            let quizzesCurrent = 0, quizzesPrevious = 0;
            let totalVideos = 1; // Pour éviter division par zéro

            if (pillars?.length) {
                const pillarIds = pillars.map(p => p.id);

                // Compter toutes les vidéos pour le calcul de progression
                const { data: allVideos } = await supabase
                    .from('videos')
                    .select('id')
                    .in('pillar_id', pillarIds);
                totalVideos = allVideos?.length || 1;

                // Vidéos actuelles vs mois dernier
                const [videosRes, videosPrevRes] = await Promise.all([
                    supabase.from('videos').select('*', { count: 'exact', head: true }).in('pillar_id', pillarIds),
                    supabase.from('videos').select('*', { count: 'exact', head: true }).in('pillar_id', pillarIds).lt('created_at', lastMonth.toISOString())
                ]);

                videosCurrent = videosRes.count || 0;
                videosPrevious = videosPrevRes.count || 0;

                // Quiz
                if (videosCurrent > 0) {
                    const { data: videos } = await supabase
                        .from('videos')
                        .select('id')
                        .in('pillar_id', pillarIds);

                    const videoIds = videos?.map(v => v.id) || [];

                    const [quizzesRes, quizzesPrevRes] = await Promise.all([
                        supabase.from('quizzes').select('*', { count: 'exact', head: true }).in('video_id', videoIds),
                        supabase.from('quizzes').select('*', { count: 'exact', head: true }).in('video_id', videoIds).lt('created_at', lastMonth.toISOString())
                    ]);

                    quizzesCurrent = quizzesRes.count || 0;
                    quizzesPrevious = quizzesPrevRes.count || 0;
                }
            }

            // ============================================
            // Récupérer les membres avec leur progression (Fix 400 error by splitting queries)
            // ============================================
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, created_at')
                .eq('organization_id', orgId)
                .eq('role', 'student'); 

            // ============================================
            // Calcul du taux de complétion
            // ============================================
            let avgCompletion = 0;
            let previousAvgCompletion = 0;

            if (profiles && profiles.length > 0) {
                const userIds = profiles.map(p => p.id);
                const { data: progressData } = await supabase
                    .from('user_progress')
                    .select('user_id, watched')
                    .in('user_id', userIds);

                const members = profiles.map(profile => ({
                    ...profile,
                    user_progress: progressData?.filter(p => p.user_id === profile.id) || []
                }));
                // Complétion moyenne des membres actuels
                const totalCompletion = members.reduce((acc, member) => {
                    const watchedCount = member.user_progress?.filter(p => p.watched).length || 0;
                    return acc + (watchedCount / totalVideos * 100);
                }, 0);
                avgCompletion = Math.round(totalCompletion / members.length);

                // Complétion moyenne des membres du mois dernier
                const lastMonthMembers = members.filter(m => 
                    new Date(m.created_at) < lastMonth
                );
                
                if (lastMonthMembers.length > 0) {
                    const lastMonthTotal = lastMonthMembers.reduce((acc, member) => {
                        const watchedCount = member.user_progress?.filter(p => p.watched).length || 0;
                        return acc + (watchedCount / totalVideos * 100);
                    }, 0);
                    previousAvgCompletion = Math.round(lastMonthTotal / lastMonthMembers.length);
                }
            }

            const completionGrowth = previousAvgCompletion > 0 
                ? Math.round(((avgCompletion - previousAvgCompletion) / previousAvgCompletion) * 100)
                : avgCompletion > 0 ? 100 : 0;
                console.log('📊 Stats completion - valeurs brutes:', {
                    avgCompletion,
                    previousAvgCompletion,
                    completionGrowth,
                    membersCount: members?.length,
                    totalVideos
                });

            // ============================================
            // Fonction de calcul de croissance
            // ============================================
            const calculateGrowth = (current, previous) => {
                if (previous === 0) return current > 0 ? 100 : 0;
                return Math.round(((current - previous) / previous) * 100);
            };

            // ============================================
            // Mise à jour des stats
            // ============================================
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
                    current: avgCompletion,
                    previous: previousAvgCompletion,
                    growth: completionGrowth
                }
                
            });

        } catch (error) {
            console.error('Erreur chargement stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const statCards = [
        { label: 'Membres', data: stats.members, icon: Users, color: 'from-primary-500 to-primary-600' },
        { label: 'Vidéos', data: stats.videos, icon: Video, color: 'from-accent-500 to-accent-600' },
        { label: 'Quiz', data: stats.quizzes, icon: Award, color: 'from-pink-500 to-pink-600' },
        { label: 'Complétion', data: stats.completion, icon: TrendingUp, color: 'from-green-500 to-green-600' },
    ];

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[1,2,3,4].map(i => (
                    <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse"></div>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {statCards.map((card, index) => {
                    const isPositive = card.data.growth >= 0;
                    return (
                        <motion.div
                            key={card.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">{card.label}</p>
                                    <p className="text-2xl font-bold text-gray-800">
                                        {card.label === 'Complétion' ? `${card.data.current}%` : card.data.current}
                                    </p>
                                    <p className={`text-xs mt-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                        {isPositive ? '↑' : '↓'} {Math.abs(card.data.growth)}% vs mois dernier
                                    </p>
                                </div>
                                <div className={`p-3 bg-gradient-to-br ${card.color} rounded-lg`}>
                                    <card.icon className="w-5 h-5 text-white" />
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {companyInfo && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-primary-50 to-accent-50 rounded-xl p-4 border border-primary-100"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-4 h-4 text-primary-600" />
                        <h3 className="font-medium text-gray-800">Informations entreprise</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <p className="text-gray-500">Entreprise</p>
                            <p className="font-medium text-gray-800">{companyInfo.name}</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Plan</p>
                            <p className="font-medium text-gray-800 capitalize">{companyInfo.plan}</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Créée le</p>
                            <p className="font-medium text-gray-800">{companyInfo.createdAt}</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Fin d'essai</p>
                            <div className={`flex items-center gap-1 ${
                                companyInfo.daysLeft <= 3 ? 'text-orange-600' : 'text-green-600'
                            }`}>
                                {companyInfo.daysLeft <= 3 ? (
                                    <AlertCircle className="w-4 h-4" />
                                ) : (
                                    <CheckCircle className="w-4 h-4" />
                                )}
                                <span className="font-medium">{companyInfo.daysLeft} jours</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
}