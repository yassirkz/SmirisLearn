import { useEffect, useState } from 'react'
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion'
import { Building2, Users, Video, Award, TrendingUp, TrendingDown } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function StatsCards() {
    const [stats, setStats] = useState({
        companies: { current: 0, previous: 0, percentage: 0, progress: 0 },
        users: { current: 0, previous: 0, percentage: 0, progress: 0 },
        videos: { current: 0, previous: 0, percentage: 0, progress: 0 },
        quizzes: { current: 0, previous: 0, percentage: 0, progress: 0 }
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Date du mois dernier pour comparaison
                const lastMonth = new Date()
                lastMonth.setMonth(lastMonth.getMonth() - 1)

                // Récupérer les stats actuelles et du mois dernier
                const [companies, users, videos, quizzes] = await Promise.all([
                    // Entreprises
                    Promise.all([
                        supabase.from('organizations').select('*', { count: 'exact', head: true }),
                        supabase.from('organizations').select('*', { count: 'exact', head: true })
                            .lt('created_at', lastMonth.toISOString())
                    ]),
                    // Utilisateurs
                    Promise.all([
                        supabase.from('profiles').select('*', { count: 'exact', head: true }),
                        supabase.from('profiles').select('*', { count: 'exact', head: true })
                            .lt('created_at', lastMonth.toISOString())
                    ]),
                    // Vidéos
                    Promise.all([
                        supabase.from('videos').select('*', { count: 'exact', head: true }),
                        supabase.from('videos').select('*', { count: 'exact', head: true })
                            .lt('created_at', lastMonth.toISOString())
                    ]),
                    // Quiz
                    Promise.all([
                        supabase.from('quizzes').select('*', { count: 'exact', head: true }),
                        supabase.from('quizzes').select('*', { count: 'exact', head: true })
                            .lt('created_at', lastMonth.toISOString())
                    ])
                ])

                // Calculer les pourcentages et progressions
                const companiesCurrent = companies[0].count || 0
                const companiesPrevious = companies[1].count || 0
                const companiesPercentage = companiesPrevious === 0 
                    ? (companiesCurrent > 0 ? 100 : 0)
                    : Math.round(((companiesCurrent - companiesPrevious) / companiesPrevious) * 100)
                
                const usersCurrent = users[0].count || 0
                const usersPrevious = users[1].count || 0
                const usersPercentage = usersPrevious === 0 
                    ? (usersCurrent > 0 ? 100 : 0)
                    : Math.round(((usersCurrent - usersPrevious) / usersPrevious) * 100)
                
                const videosCurrent = videos[0].count || 0
                const videosPrevious = videos[1].count || 0
                const videosPercentage = videosPrevious === 0 
                    ? (videosCurrent > 0 ? 100 : 0)
                    : Math.round(((videosCurrent - videosPrevious) / videosPrevious) * 100)
                
                const quizzesCurrent = quizzes[0].count || 0
                const quizzesPrevious = quizzes[1].count || 0
                const quizzesPercentage = quizzesPrevious === 0 
                    ? (quizzesCurrent > 0 ? 100 : 0)
                    : Math.round(((quizzesCurrent - quizzesPrevious) / quizzesPrevious) * 100)

                setStats({
                    companies: {
                        current: companiesCurrent,
                        previous: companiesPrevious,
                        percentage: companiesPercentage,
                        progress: Math.min(companiesCurrent / 100, 1) // Progression sur objectif de 100
                    },
                    users: {
                        current: usersCurrent,
                        previous: usersPrevious,
                        percentage: usersPercentage,
                        progress: Math.min(usersCurrent / 500, 1) // Objectif 500 utilisateurs
                    },
                    videos: {
                        current: videosCurrent,
                        previous: videosPrevious,
                        percentage: videosPercentage,
                        progress: Math.min(videosCurrent / 200, 1) // Objectif 200 vidéos
                    },
                    quizzes: {
                        current: quizzesCurrent,
                        previous: quizzesPrevious,
                        percentage: quizzesPercentage,
                        progress: Math.min(quizzesCurrent / 100, 1) // Objectif 100 quiz
                    }
                })
            } catch (error) {
                console.error('Erreur chargement stats:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchStats()
    }, [])

    const cards = [
        { 
            label: 'Entreprises', 
            data: stats.companies,
            icon: Building2, 
            color: 'from-blue-500 to-blue-600', 
            bg: 'bg-blue-50',
            target: 100 // Objectif
        },
        { 
            label: 'Utilisateurs', 
            data: stats.users,
            icon: Users, 
            color: 'from-purple-500 to-purple-600', 
            bg: 'bg-purple-50',
            target: 500
        },
        { 
            label: 'Vidéos', 
            data: stats.videos,
            icon: Video, 
            color: 'from-green-500 to-green-600', 
            bg: 'bg-green-50',
            target: 200
        },
        { 
            label: 'Quiz', 
            data: stats.quizzes,
            icon: Award, 
            color: 'from-orange-500 to-orange-600', 
            bg: 'bg-orange-50',
            target: 100
        },
    ]

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {cards.map((card, index) => {
                const isPositive = card.data.percentage >= 0
                const TrendIcon = isPositive ? TrendingUp : TrendingDown
                const trendColor = isPositive ? 'text-green-600' : 'text-red-600'
                const trendBg = isPositive ? 'bg-green-100' : 'bg-red-100'
                
                // Calculer la largeur de la barre de progression (0-100%)
                const progressWidth = card.data.progress * 100

                return (
                    <motion.div
                        key={card.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ y: -5 }}
                        className={`${card.bg} rounded-2xl p-6 shadow-lg border border-white/50 backdrop-blur-sm relative overflow-hidden group`}
                    >
                        {/* Effet de brillance au hover */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">{card.label}</p>
                                {loading ? (
                                    <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
                                ) : (
                                    <div>
                                        <p className="text-2xl font-bold text-gray-800">{card.data.current}</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Objectif: {card.target}
                                        </p>
                                    </div>
                                )}
                            </div>
                            <div className={`p-3 bg-gradient-to-br ${card.color} rounded-xl shadow-lg group-hover:scale-110 transition-transform`}>
                                <card.icon className="w-6 h-6 text-white" />
                            </div>
                        </div>

                        {!loading && (
                            <div className="mt-4 flex items-center gap-2">
                                <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${trendBg} ${trendColor}`}>
                                    <TrendIcon size={14} />
                                    <span>{Math.abs(card.data.percentage)}%</span>
                                </div>
                                <span className="text-xs text-gray-500">par rapport au mois dernier</span>
                            </div>
                        )}

                        {/* barre de PROGRESS DYNAMIQUE*/}
                        <div className="mt-4">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>Progression</span>
                                <span>{Math.round(progressWidth)}%</span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: loading ? 0 : `${progressWidth}%` }}
                                    transition={{ delay: 0.5 + index * 0.1, duration: 1 }}
                                    className={`h-full bg-gradient-to-r ${card.color}`}
                                />
                            </div>
                        </div>

                        {/* Indicateur de dépassement si > 100% */}
                        {card.data.progress > 1 && (
                            <div className="mt-2 text-xs text-green-600 font-medium flex items-center gap-1">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                Objectif dépassé ! 🎉
                            </div>
                        )}
                    </motion.div>
                )
            })}
        </div>
    )
}