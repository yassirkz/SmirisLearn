// src/components/admin/pillars/PillarStats.jsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Video, Users, TrendingUp, Award,
    Clock, CheckCircle, AlertCircle,
    BarChart3, PieChart, Target
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../ui/Toast';
import { untrusted, escapeText } from '../../../utils/security';

export default function PillarStats({ pillarId, pillarName, videos: pillarVideos }) {
    const { error: showError } = useToast();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        videos: {
            total: 0,
            totalDuration: 0,
            averageDuration: 0
        },
        students: {
            total: 0,
            active: 0,
            completed: 0,
            inProgress: 0
        },
        quizzes: {
            total: 0,
            averageScore: 0,
            passRate: 0,
            totalAttempts: 0
        },
        progress: {
            averageCompletion: 0,
            totalWatched: 0,
            totalTimeSpent: 0
        }
    });

    useEffect(() => {
        if (pillarId) {
            fetchStats();
        }
        // On veut recalculer si la liste de vidéos passée en props change
    }, [pillarId, pillarVideos]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            // ============================================
            // 1. Récupérer les vidéos du pilier AVEC quizzes
            //    (pillarVideos du parent ne contient pas les quizzes)
            // ============================================
            const { data: videosData, error: videosError } = await supabase
                .from('videos')
                .select(`
                    id,
                    duration,
                    quizzes (
                        id,
                        passing_score,
                        timer_minutes,
                        questions
                    )
                `)
                .eq('pillar_id', pillarId);

            if (videosError) throw videosError;
            const videos = videosData || [];
            const videoIds = videos.map(v => v.id);

            // ============================================
            // 2. Récupérer les statistiques des étudiants
            //    (2 requêtes plates pour éviter récursion RLS)
            // ============================================
            let studentCount = 0;
            let totalWatched = 0;
            let totalCompleted = 0;
            const uniqueStudents = new Set();

            try {
                // STEP 1 : group_ids liés à ce pilier
                const { data: accessData, error: accessError } = await supabase
                    .from('group_pillar_access')
                    .select('group_id')
                    .eq('pillar_id', pillarId);

                if (accessError) {
                    console.warn('⚠️ group_pillar_access:', accessError);
                } else if (accessData?.length) {
                    const groupIds = [...new Set(accessData.map(r => r.group_id))];

                    // STEP 2 : membres de ces groupes
                    const { data: membersData, error: membersError } = await supabase
                        .from('group_members')
                        .select('user_id')
                        .in('group_id', groupIds);

                    if (!membersError && membersData) {
                        membersData.forEach(m => uniqueStudents.add(m.user_id));
                        studentCount = uniqueStudents.size;
                    }
                }
            } catch (studentErr) {
                console.warn('⚠️ Impossible de charger les statistiques étudiants:', studentErr);
            }

            // ============================================
            // 3. Calculer les stats vidéos
            // ============================================
            const videoStats = videos?.reduce((acc, video) => ({
                total: acc.total + 1,
                totalDuration: acc.totalDuration + (video.duration || 0),
                quizzes: acc.quizzes + (video.quizzes?.length > 0 ? 1 : 0)
            }), { total: 0, totalDuration: 0, quizzes: 0 }) || { total: 0, totalDuration: 0, quizzes: 0 };

            // ============================================
            // 4. Calculer les stats quiz
            // ============================================
            let totalScore = 0;
            let totalPassed = 0;
            let totalAttempts = 0;
            let scoreCount = 0;

            // Compter uniquement le nombre de questions par quiz
            // (les stats de réussite nécessitent une table user_progress)
            videos?.forEach(video => {
                video.quizzes?.forEach(quiz => {
                    if (quiz.questions?.length > 0) {
                        scoreCount++;
                    }
                });
            });

            // ============================================
            // 5. Mettre à jour les stats
            // ============================================
            setStats({
                videos: {
                    total: videoStats.total,
                    totalDuration: videoStats.totalDuration,
                    averageDuration: videoStats.total ? Math.round(videoStats.totalDuration / videoStats.total) : 0
                },
                students: {
                    total: studentCount,
                    active: studentCount, // À affiner avec dernière connexion
                    completed: Math.min(totalCompleted, studentCount),
                    inProgress: studentCount - Math.min(totalCompleted, studentCount)
                },
                quizzes: {
                    total: videoStats.quizzes,
                    averageScore: scoreCount ? Math.round(totalScore / scoreCount) : 0,
                    passRate: totalAttempts ? Math.round((totalPassed / totalAttempts) * 100) : 0,
                    totalAttempts
                },
                progress: {
                    averageCompletion: studentCount && videoStats.total 
                        ? Math.min(100, Math.round((totalWatched / (studentCount * videoStats.total)) * 100))
                        : 0,
                    totalWatched,
                    totalTimeSpent: totalWatched * (videoStats.total ? Math.round(videoStats.totalDuration / videoStats.total) : 0)
                }
            });

        } catch (err) {
            console.error('❌ Erreur chargement stats:', err);
            showError('Impossible de charger les statistiques');
        } finally {
            setLoading(false);
        }
    };

    const formatDuration = (seconds) => {
        if (!seconds) return '0 min';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) return `${hours}h ${minutes}min`;
        return `${minutes} min`;
    };

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
                ))}
            </div>
        );
    }

    const statCards = [
        {
            title: 'Vidéos',
            icon: Video,
            value: stats.videos.total,
            subValue: formatDuration(stats.videos.totalDuration),
            color: 'from-blue-500 to-indigo-600',
            bg: 'bg-blue-50',
            iconBg: 'bg-blue-100',
            iconColor: 'text-blue-600'
        },
        {
            title: 'Étudiants',
            icon: Users,
            value: stats.students.total,
            subValue: `${stats.students.active} actifs`,
            color: 'from-purple-500 to-pink-600',
            bg: 'bg-purple-50',
            iconBg: 'bg-purple-100',
            iconColor: 'text-purple-600'
        },
        {
            title: 'Quiz',
            icon: Award,
            value: stats.quizzes.total,
            subValue: `${stats.quizzes.passRate}% réussite`,
            color: 'from-green-500 to-emerald-600',
            bg: 'bg-green-50',
            iconBg: 'bg-green-100',
            iconColor: 'text-green-600'
        },
        {
            title: 'Progression',
            icon: TrendingUp,
            value: `${stats.progress.averageCompletion}%`,
            subValue: `${stats.progress.totalWatched} vues`,
            color: 'from-orange-500 to-red-600',
            bg: 'bg-orange-50',
            iconBg: 'bg-orange-100',
            iconColor: 'text-orange-600'
        }
    ];

    return (
        <div className="space-y-6">
            {/* Titre */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                    Statistiques - {escapeText(untrusted(pillarName))}
                </h3>
                <button
                    onClick={fetchStats}
                    className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Actualiser
                </button>
            </div>

            {/* Cartes principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((card, index) => {
                    const Icon = card.icon;
                    return (
                        <motion.div
                            key={card.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            whileHover={{ y: -2 }}
                            className={`${card.bg} rounded-xl p-4 shadow-sm border border-white/50 relative overflow-hidden group`}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                            
                            <div className="relative flex items-start justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">{card.title}</p>
                                    <p className="text-2xl font-bold text-gray-800">{card.value}</p>
                                    <p className="text-xs text-gray-500 mt-1">{card.subValue}</p>
                                </div>
                                <div className={`p-2 ${card.iconBg} rounded-lg`}>
                                    <Icon className={`w-5 h-5 ${card.iconColor}`} />
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Détails supplémentaires */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Détail vidéos */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
                >
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <Video className="w-4 h-4 text-blue-600" />
                        Détail des vidéos
                    </h4>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Durée totale</span>
                            <span className="font-medium text-gray-800">
                                {formatDuration(stats.videos.totalDuration)}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Durée moyenne</span>
                            <span className="font-medium text-gray-800">
                                {formatDuration(stats.videos.averageDuration)}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Avec quiz</span>
                            <span className="font-medium text-gray-800">
                                {stats.quizzes.total}/{stats.videos.total}
                            </span>
                        </div>
                    </div>
                </motion.div>

                {/* Détail étudiants */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
                >
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4 text-purple-600" />
                        Détail des étudiants
                    </h4>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Total</span>
                            <span className="font-medium text-gray-800">
                                {stats.students.total}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Terminé</span>
                            <span className="font-medium text-green-600">
                                {stats.students.completed}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">En cours</span>
                            <span className="font-medium text-orange-600">
                                {stats.students.inProgress}
                            </span>
                        </div>
                    </div>
                </motion.div>

                {/* Détail quiz */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
                >
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <Award className="w-4 h-4 text-green-600" />
                        Performance quiz
                    </h4>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Score moyen</span>
                            <span className="font-medium text-gray-800">
                                {stats.quizzes.averageScore}%
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Taux réussite</span>
                            <span className="font-medium text-green-600">
                                {stats.quizzes.passRate}%
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Tentatives</span>
                            <span className="font-medium text-gray-800">
                                {stats.quizzes.totalAttempts}
                            </span>
                        </div>
                    </div>
                </motion.div>

                {/* Progression */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
                >
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-orange-600" />
                        Temps & Progression
                    </h4>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Temps total</span>
                            <span className="font-medium text-gray-800">
                                {formatDuration(stats.progress.totalTimeSpent)}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Vidéos vues</span>
                            <span className="font-medium text-gray-800">
                                {stats.progress.totalWatched}
                            </span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden mt-2">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${stats.progress.averageCompletion}%` }}
                                transition={{ delay: 0.6, duration: 1 }}
                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full"
                            />
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Badge d'information */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-center text-xs text-gray-400 flex items-center justify-center gap-1"
            >
                <Target className="w-3 h-3" />
                <span>Dernière mise à jour: {new Date().toLocaleTimeString()}</span>
            </motion.div>
        </div>
    );
}