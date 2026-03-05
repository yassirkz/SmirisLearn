// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion'
import { Bell, Search, User } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

export default function Header() {
    const { user } = useAuth()

    return (
        <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white/70 backdrop-blur-xl border-b border-blue-100 sticky top-0 z-30"
        >
        <div className="flex items-center justify-between px-4 md:px-8 py-4">
            {/* Barre de recherche */}
            <div className="hidden md:flex items-center flex-1 max-w-md">
            <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                type="text"
                placeholder="Rechercher..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all"
                />
            </div>
            </div>

            {/* Actions utilisateur */}
            <div className="flex items-center gap-3 ml-auto">
            {/* Notifications */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative p-2.5 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
                <Bell size={20} className="text-gray-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </motion.button>

            {/* Profil */}
            <motion.div
                whileHover={{ scale: 1.02 }}
                className="flex items-center gap-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-xl shadow-md"
            >
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <User size={18} />
                </div>
                <div className="hidden md:block">
                <p className="text-sm font-medium">{user?.email}</p>
                <p className="text-xs text-white/70">Super Admin</p>
                </div>
            </motion.div>
            </div>
        </div>
        </motion.header>
    )
}