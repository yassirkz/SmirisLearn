import { useState } from 'react'
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import Sidebar from './Sidebar'
import Header from './Header'
import { useAuth } from '../../hooks/useAuth'
import { Navigate } from 'react-router-dom'

export default function MainLayout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const { user } = useAuth()

    if (!user) return <Navigate to="/login" replace />

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        {/* Bouton menu for mobile */}
        <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg"
        >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Sidebar avec animation */}
        <AnimatePresence mode="wait">
            {sidebarOpen && (
            <motion.div
                initial={{ x: -300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -300, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="fixed top-0 left-0 h-full z-40"
            >
                <Sidebar onClose={() => setSidebarOpen(false)} />
            </motion.div>
            )}
        </AnimatePresence>

        {/* Contenu principal */}
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`transition-all duration-300 ${
            sidebarOpen ? 'lg:ml-64' : 'ml-0'
            }`}
        >
            <Header />
            <main className="p-4 md:p-8">
            {children}
            </main>
        </motion.div>
        </div>
    )
}