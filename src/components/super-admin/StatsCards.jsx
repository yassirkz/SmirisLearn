import { useEffect, useState } from 'react'
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion'
import { Building2, Users, Video, Award } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function StatsCards() {
    const [stats, setStats] = useState({
        companies: 0,
        users: 0,
        videos: 0,
        quizzes: 0
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchStats = async () => {
        try {
            const [companies, users, videos, quizzes] = await Promise.all([
            supabase.from('organizations').select('*', { count: 'exact', head: true }),
            supabase.from('profiles').select('*', { count: 'exact', head: true }),
            supabase.from('videos').select('*', { count: 'exact', head: true }),
            supabase.from('quizzes').select('*', { count: 'exact', head: true })
            ])

            setStats({
            companies: companies.count || 0,
            users: users.count || 0,
            videos: videos.count || 0,
            quizzes: quizzes.count || 0
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
        { label: 'Entreprises', value: stats.companies, icon: Building2, color: 'from-blue-500 to-blue-600', bg: 'bg-blue-50' },
        { label: 'Utilisateurs', value: stats.users, icon: Users, color: 'from-purple-500 to-purple-600', bg: 'bg-purple-50' },
        { label: 'Vidéos', value: stats.videos, icon: Video, color: 'from-green-500 to-green-600', bg: 'bg-green-50' },
        { label: 'Quiz', value: stats.quizzes, icon: Award, color: 'from-orange-500 to-orange-600', bg: 'bg-orange-50' },
    ]

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, index) => (
            <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -5 }}
            className={`${card.bg} rounded-2xl p-6 shadow-lg border border-white/50 backdrop-blur-sm`}
            >
            <div className="flex items-start justify-between">
                <div>
                <p className="text-sm text-gray-600 mb-1">{card.label}</p>
                {loading ? (
                    <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
                ) : (
                    <p className="text-2xl font-bold text-gray-800">{card.value}</p>
                )}
                </div>
                <div className={`p-3 bg-gradient-to-br ${card.color} rounded-xl shadow-lg`}>
                <card.icon className="w-6 h-6 text-white" />
                </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
                <span className="text-xs text-gray-500">+12% ce mois</span>
                <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '75%' }}
                    transition={{ delay: 0.5 + index * 0.1, duration: 1 }}
                    className={`h-full bg-gradient-to-r ${card.color}`}
                />
                </div>
            </div>
            </motion.div>
        ))}
        </div>
    )
}