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
    }, [pillarId, pillarVideos]);

    const fetchStats = async () => {
        setLoading(true);
        try {
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

            let studentCount = 0;
            let totalWatched = 0;
            let totalCompleted = 0;
            const uniqueStudents = new Set();

            try {
                const { data: accessData, error: accessError } = await supabase
                    .from('group_pillar_access')
                    .select('group_id')
                    .eq('pillar_id', pillarId);

                if (!accessError && accessData?.length) {
                    const groupIds = [...new Set(accessData.map(r => r.group_id))];
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

            const videoStats = videos?.reduce((acc, video) => ({
                total: acc.total + 1,
                totalDuration: acc.totalDuration + (video.duration || 0),
                quizzes: acc.quizzes + (video.quizzes?.length > 0 ? 1 : 0)
            }), { total: 0, totalDuration: 0, quizzes: 0 }) || { total: 0, totalDuration: 0, quizzes: 0 };

            let totalScore = 0;
            let totalPassed = 0;
            let totalAttempts = 0;
            let scoreCount = 0;

            if (videoIds.length > 0) {
                try {
                    const { data: progressData, error: progressError } = await supabase
                        .from('user_progress')
                        .select('user_id, video_id, watched, quiz_passed, quiz_score, quiz_attempts')
                        .in('video_id', videoIds);

                    if (!progressError && progressData) {
                        totalWatched = progressData.filter(p => p.watched).length;
                        totalAttempts = progressData.reduce((sum, p) => sum + (p.quiz_attempts || 0), 0);
                        totalPassed = progressData.filter(p => p.quiz_passed).length;
                        const scoresWithValue = progressData.filter(p => p.quiz_score != null);
                        totalScore = scoresWithValue.reduce((sum, p) => sum + p.quiz_score, 0);
                        scoreCount = scoresWithValue.length;

                        const studentVideoWatchMap = {};
                        progressData.filter(p => p.watched).forEach(p => {
                            if (!studentVideoWatchMap[p.user_id]) studentVideoWatchMap[p.user_id] = new Set();
                            studentVideoWatchMap[p.user_id].add(p.video_id);
                        });
                        totalCompleted = Object.values(studentVideoWatchMap)
                            .filter(watchedSet => watchedSet.size >= videoIds.length).length;
                    }
                } catch (progressErr) {
                    console.warn('⚠️ Impossible de charger user_progress:', progressErr);
                }
            }

            setStats({
                videos: {
                    total: videoStats.total,
                    totalDuration: videoStats.totalDuration,
                    averageDuration: videoStats.total ? Math.round(videoStats.totalDuration / videoStats.total) : 0
                },
                students: {
                    total: studentCount,
                    active: studentCount,
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
                    <div key={i} className="h-24 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
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
            color: 'from-primary-500 to-accent-600',
            bg: 'bg-primary-50 dark:bg-primary-900/30',
            iconBg: 'bg-primary-100 dark:bg-primary-800/50',
            iconColor: 'text-primary-600 dark:text-primary-400'
        },
        {
            title: 'Étudiants',
            icon: Users,
            value: stats.students.total,
            subValue: `${stats.students.active} actifs`,
            color: 'from-accent-500 to-primary-600',
            bg: 'bg-accent-50 dark:bg-accent-900/30',
            iconBg: 'bg-accent-100 dark:bg-accent-800/50',
            iconColor: 'text-accent-600 dark:text-accent-400'
        },
        {
            title: 'Quiz',
            icon: Award,
            value: stats.quizzes.total,
            subValue: `${stats.quizzes.passRate}% réussite`,
            color: 'from-green-500 to-emerald-600',
            bg: 'bg-green-50 dark:bg-green-900/30',
            iconBg: 'bg-green-100 dark:bg-green-800/50',
            iconColor: 'text-green-600 dark:text-green-400'
        },
        {
            title: 'Progression',
            icon: TrendingUp,
            value: `${stats.progress.averageCompletion}%`,
            subValue: `${stats.progress.totalWatched} vues`,
            color: 'from-orange-500 to-red-600',
            bg: 'bg-orange-50 dark:bg-orange-900/30',
            iconBg: 'bg-orange-100 dark:bg-orange-800/50',
            iconColor: 'text-orange-600 dark:text-orange-400'
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    Statistiques - {escapeText(untrusted(pillarName))}
                </h3>
                <button
                    onClick={fetchStats}
                    className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Actualiser
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {statCards.map((card, index) => {
                    const Icon = card.icon;
                    return (
                        <motion.div
                            key={card.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            whileHover={{ y: -4, scale: 1.02 }}
                            className={`${card.bg} rounded-2xl p-5 shadow-lg border border-white/50 dark:border-white/5 backdrop-blur-md relative overflow-hidden group transition-all duration-300`}
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                            
                            <div className="relative flex items-start justify-between z-10">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1">{card.title}</p>
                                    <p className="text-3xl font-extrabold text-gray-800 dark:text-white drop-shadow-sm">{card.value}</p>
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">{card.subValue}</p>
                                </div>
                                <div className={`p-3 ${card.iconBg} rounded-xl shadow-inner group-hover:scale-110 transition-transform duration-300`}>
                                    <Icon className={`w-6 h-6 ${card.iconColor}`} />
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Détail vidéos */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl rounded-2xl p-5 shadow-lg border border-white/50 dark:border-white/5 hover:border-primary-200 dark:hover:border-primary-900/50 transition-colors cursor-pointer group"
                >
                    <h4 className="text-sm font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <div className="p-1.5 bg-primary-100 dark:bg-primary-900/50 rounded-lg">
                            <Video className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                        </div>
                        Détails Vidéos
                    </h4>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm border-b border-gray-100 dark:border-gray-800 pb-2">
                            <span className="text-gray-500 dark:text-gray-400 font-medium">Durée totale</span>
                            <span className="font-bold text-gray-800 dark:text-gray-200 bg-white/50 dark:bg-white/5 border border-white/50 dark:border-white/5 px-2 py-0.5 rounded text-xs shadow-sm">
                                {formatDuration(stats.videos.totalDuration)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-sm border-b border-gray-100 dark:border-gray-800 pb-2">
                            <span className="text-gray-500 dark:text-gray-400 font-medium">Durée moyenne</span>
                            <span className="font-bold text-gray-800 dark:text-gray-200 bg-white/50 dark:bg-white/5 border border-white/50 dark:border-white/5 px-2 py-0.5 rounded text-xs shadow-sm">
                                {formatDuration(stats.videos.averageDuration)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500 dark:text-gray-400 font-medium">Avec quiz</span>
                            <span className="font-bold text-gray-800 dark:text-gray-200 bg-white/50 dark:bg-white/5 border border-white/50 dark:border-white/5 px-2 py-0.5 rounded text-xs shadow-sm">
                                {stats.quizzes.total} / {stats.videos.total}
                            </span>
                        </div>
                    </div>
                </motion.div>

                {/* Détail étudiants */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl rounded-2xl p-5 shadow-lg border border-white/50 dark:border-white/5 hover:border-accent-200 dark:hover:border-accent-900/50 transition-colors cursor-pointer group"
                >
                    <h4 className="text-sm font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <div className="p-1.5 bg-accent-100 dark:bg-accent-900/50 rounded-lg">
                            <Users className="w-4 h-4 text-accent-600 dark:text-accent-400" />
                        </div>
                        Détails Étudiants
                    </h4>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm border-b border-gray-100 dark:border-gray-800 pb-2">
                            <span className="text-gray-500 dark:text-gray-400 font-medium">Total</span>
                            <span className="font-bold text-gray-800 dark:text-gray-200 bg-white/50 dark:bg-white/5 border border-white/50 dark:border-white/5 px-2 py-0.5 rounded text-xs shadow-sm">
                                {stats.students.total}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-sm border-b border-gray-100 dark:border-gray-800 pb-2">
                            <span className="text-gray-500 dark:text-gray-400 font-medium">Terminé</span>
                            <span className="font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 px-2 py-0.5 rounded text-xs">
                                {stats.students.completed}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500 dark:text-gray-400 font-medium">En cours</span>
                            <span className="font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/50 px-2 py-0.5 rounded text-xs">
                                {stats.students.inProgress}
                            </span>
                        </div>
                    </div>
                </motion.div>

                {/* Détail quiz */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl rounded-2xl p-5 shadow-lg border border-white/50 dark:border-white/5 hover:border-green-200 dark:hover:border-green-900/50 transition-colors cursor-pointer group"
                >
                    <h4 className="text-sm font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <div className="p-1.5 bg-green-100 dark:bg-green-900/50 rounded-lg">
                            <Award className="w-4 h-4 text-green-600 dark:text-green-400" />
                        </div>
                        Performance Quiz
                    </h4>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm border-b border-gray-100 dark:border-gray-800 pb-2">
                            <span className="text-gray-500 dark:text-gray-400 font-medium">Score moyen</span>
                            <span className="font-bold text-gray-800 dark:text-gray-200 bg-white/50 dark:bg-white/5 border border-white/50 dark:border-white/5 px-2 py-0.5 rounded text-xs shadow-sm">
                                {stats.quizzes.averageScore}%
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-sm border-b border-gray-100 dark:border-gray-800 pb-2">
                            <span className="text-gray-500 dark:text-gray-400 font-medium">Taux réussite</span>
                            <span className="font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 px-2 py-0.5 rounded text-xs">
                                {stats.quizzes.passRate}%
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500 dark:text-gray-400 font-medium">Tentatives</span>
                            <span className="font-bold text-gray-800 dark:text-gray-200 bg-white/50 dark:bg-white/5 border border-white/50 dark:border-white/5 px-2 py-0.5 rounded text-xs shadow-sm">
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
                    className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl rounded-2xl p-5 shadow-lg border border-white/50 dark:border-white/5 border-b-4 border-b-primary-500 cursor-pointer group"
                >
                    <h4 className="text-sm font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <div className="p-1.5 bg-orange-100 dark:bg-orange-900/50 rounded-lg">
                            <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                        </div>
                        Progression Générale
                    </h4>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500 dark:text-gray-400 font-medium">Temps Total</span>
                            <span className="font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800/50 px-2 py-0.5 rounded text-xs">
                                {formatDuration(stats.progress.totalTimeSpent)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500 dark:text-gray-400 font-medium">Vidéos Vues</span>
                            <span className="font-bold text-gray-800 dark:text-gray-200 bg-white/50 dark:bg-white/5 border border-white/50 dark:border-white/5 px-2 py-0.5 rounded text-xs shadow-sm">
                                {stats.progress.totalWatched}
                            </span>
                        </div>
                        <div className="pt-2">
                            <div className="flex justify-between text-xs mb-1.5">
                                <span className="font-medium text-gray-500">Avancement</span>
                                <span className="font-bold text-primary-600 dark:text-primary-400">{stats.progress.averageCompletion}%</span>
                            </div>
                            <div className="h-2.5 bg-white/40 dark:bg-white/5 rounded-full overflow-hidden shadow-inner border border-white/50 dark:border-white/5">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${stats.progress.averageCompletion}%` }}
                                    transition={{ delay: 0.6, duration: 1, type: "spring", stiffness: 50 }}
                                    className="h-full bg-gradient-to-r from-primary-500 via-primary-400 to-accent-500 rounded-full relative"
                                >
                                    <div className="absolute inset-0 bg-white/20 dark:bg-white/10" style={{ backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.15) 50%, rgba(255,255,255,.15) 75%, transparent 75%, transparent)' }} />
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-center text-xs text-gray-400 dark:text-gray-500 flex items-center justify-center gap-1"
            >
                <Target className="w-3 h-3" />
                <span>Dernière mise à jour: {new Date().toLocaleTimeString()}</span>
            </motion.div>
        </div>
    );
}