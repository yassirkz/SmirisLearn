import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Users, Video, Award, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function StatsCards() {
    const [stats, setStats] = useState({
        companies: { current: 0, previous: 0, percentage: 0, progress: 0 },
        users: { current: 0, previous: 0, percentage: 0, progress: 0 },
        videos: { current: 0, previous: 0, percentage: 0, progress: 0 },
        quizzes: { current: 0, previous: 0, percentage: 0, progress: 0 }
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const lastMonth = new Date();
                lastMonth.setMonth(lastMonth.getMonth() - 1);

                const [companies, users, videos, quizzes] = await Promise.all([
                    Promise.all([
                        supabase.from('organizations').select('*', { count: 'exact', head: true }),
                        supabase.from('organizations').select('*', { count: 'exact', head: true })
                            .lt('created_at', lastMonth.toISOString())
                    ]),
                    Promise.all([
                        supabase.from('profiles').select('*', { count: 'exact', head: true }),
                        supabase.from('profiles').select('*', { count: 'exact', head: true })
                            .lt('created_at', lastMonth.toISOString())
                    ]),
                    Promise.all([
                        supabase.from('videos').select('*', { count: 'exact', head: true }),
                        supabase.from('videos').select('*', { count: 'exact', head: true })
                            .lt('created_at', lastMonth.toISOString())
                    ]),
                    Promise.all([
                        supabase.from('quizzes').select('*', { count: 'exact', head: true }),
                        supabase.from('quizzes').select('*', { count: 'exact', head: true })
                            .lt('created_at', lastMonth.toISOString())
                    ])
                ]);

                const calculatePercentage = (current, previous) => {
                    if (previous === 0) return current > 0 ? 100 : 0;
                    return Math.round(((current - previous) / previous) * 100);
                };

                setStats({
                    companies: {
                        current: companies[0].count || 0,
                        previous: companies[1].count || 0,
                        percentage: calculatePercentage(companies[0].count || 0, companies[1].count || 0),
                        progress: Math.min((companies[0].count || 0) / 100, 1)
                    },
                    users: {
                        current: users[0].count || 0,
                        previous: users[1].count || 0,
                        percentage: calculatePercentage(users[0].count || 0, users[1].count || 0),
                        progress: Math.min((users[0].count || 0) / 500, 1)
                    },
                    videos: {
                        current: videos[0].count || 0,
                        previous: videos[1].count || 0,
                        percentage: calculatePercentage(videos[0].count || 0, videos[1].count || 0),
                        progress: Math.min((videos[0].count || 0) / 200, 1)
                    },
                    quizzes: {
                        current: quizzes[0].count || 0,
                        previous: quizzes[1].count || 0,
                        percentage: calculatePercentage(quizzes[0].count || 0, quizzes[1].count || 0),
                        progress: Math.min((quizzes[0].count || 0) / 100, 1)
                    }
                });
            } catch (error) {
                console.error('Erreur chargement stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const cards = [
        { 
            label: "Entreprises", 
            data: stats.companies,
            icon: Building2, 
            gradient: 'from-primary-500 to-primary-600',
            shadowColor: 'shadow-primary-500/30',
            target: 100
        },
        { 
            label: "Utilisateurs", 
            data: stats.users,
            icon: Users, 
            gradient: 'from-accent-500 to-accent-600',
            shadowColor: 'shadow-accent-500/30',
            target: 500
        },
        { 
            label: "Vidéos", 
            data: stats.videos,
            icon: Video, 
            gradient: 'from-emerald-500 to-emerald-600',
            shadowColor: 'shadow-emerald-500/30',
            target: 200
        },
        { 
            label: "Quiz", 
            data: stats.quizzes,
            icon: Award, 
            gradient: 'from-amber-500 to-amber-600',
            shadowColor: 'shadow-amber-500/30',
            target: 100
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {cards.map((card, index) => {
                const isPositive = card.data.percentage >= 0;
                const TrendIcon = isPositive ? TrendingUp : TrendingDown;
                const trendColor = isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400';
                const trendBg = isPositive ? 'bg-emerald-100/80 dark:bg-emerald-900/20' : 'bg-red-100/80 dark:bg-red-900/20';
                const progressWidth = card.data.progress * 100;

                return (
                    <motion.div
                        key={card.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1, type: "spring", stiffness: 200, damping: 20 }}
                        whileHover={{ y: -4, scale: 1.01 }}
                        className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl rounded-3xl p-6 shadow-lg border border-white/50 dark:border-white/5 relative overflow-hidden group"
                    >
                        {/* Hover shine effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />

                        <div className="flex items-start justify-between relative z-10">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 font-medium">{card.label}</p>
                                {loading ? (
                                    <div className="h-9 w-20 bg-gray-200/60 dark:bg-gray-700/60 rounded-xl animate-pulse"></div>
                                ) : (
                                    <div>
                                        <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{card.data.current}</p>
                                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 font-medium">Objectif: {card.target}</p>
                                    </div>
                                )}
                            </div>
                            <div className={`p-3.5 bg-gradient-to-br ${card.gradient} rounded-2xl shadow-lg ${card.shadowColor} group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                                <card.icon className="w-6 h-6 text-white" />
                            </div>
                        </div>

                        {!loading && (
                            <div className="mt-5 flex items-center gap-2 relative z-10">
                                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold ${trendBg} ${trendColor} border border-white/30 dark:border-white/5`}>
                                    <TrendIcon size={13} />
                                    <span>{Math.abs(card.data.percentage)}%</span>
                                </div>
                                <span className="text-[11px] text-gray-400 dark:text-gray-500">vs mois dernier</span>
                            </div>
                        )}

                        <div className="mt-5 relative z-10">
                            <div className="flex justify-between text-[11px] text-gray-400 dark:text-gray-500 mb-1.5 font-medium">
                                <span>Progression</span>
                                <span>{Math.round(progressWidth)}%</span>
                            </div>
                            <div className="h-2 bg-white/40 dark:bg-white/5 rounded-full overflow-hidden border border-white/30 dark:border-white/5">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: loading ? 0 : `${progressWidth}%` }}
                                    transition={{ delay: 0.5 + index * 0.1, duration: 1, ease: "easeOut" }}
                                    className={`h-full bg-gradient-to-r ${card.gradient} rounded-full`}
                                />
                            </div>
                        </div>

                        {card.data.progress > 1 && (
                            <div className="mt-3 text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5 relative z-10">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                                Objectif atteint !
                            </div>
                        )}
                    </motion.div>
                );
            })}
        </div>
    );
}
