import { useState, useEffect } from 'react'
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import Sidebar from './Sidebar'
import Header from './Header'
import { useAuth } from '../../hooks/useAuth'
import { Navigate } from 'react-router-dom'

export default function MainLayout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.innerWidth >= 1024;
        }
        return true;
    });

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) setSidebarOpen(true);
            else setSidebarOpen(false);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const { user } = useAuth()

    if (!user) return <Navigate to="/login" replace />

    return (
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary-50/50 via-white to-accent-50/30 dark:from-slate-950 dark:via-gray-900 dark:to-slate-950">
            {/* Overlay mobile */}
            <AnimatePresence mode="wait">
                {sidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSidebarOpen(false)}
                        className="lg:hidden fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-30"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar with animation */}
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

            {/* Main content */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={`transition-all duration-300 ${
                    sidebarOpen ? 'lg:ml-64' : 'ml-0'
                }`}
            >
                <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
                <main className="p-4 md:p-8 dark:text-gray-200">
                    {children}
                </main>
            </motion.div>
        </div>
    )
}