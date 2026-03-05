//eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion'
import { NavLink } from 'react-router-dom'
import { 
    LayoutDashboard, 
    Building2, 
    Users, 
    Settings,
    LogOut,
    Sparkles
    } from 'lucide-react'
    import { useAuth } from '../../hooks/useAuth'
    import { useUserRole } from '../../hooks/useUserRole'

    export default function Sidebar({ onClose }) {    
    const { signOut } = useAuth()
    const { role } = useUserRole()

    const menuItems = [
        { path: '/super-admin', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/super-admin/companies', icon: Building2, label: 'Entreprises' },
        { path: '/super-admin/users', icon: Users, label: 'Utilisateurs' },
        { path: '/super-admin/settings', icon: Settings, label: 'Paramètres' },
    ]

    return (
        <motion.aside 
        className="h-full w-64 bg-white/80 backdrop-blur-xl border-r border-blue-100 shadow-xl flex flex-col"
        initial={{ x: -20 }}
        animate={{ x: 0 }}
        >
        {/* Logo */}
        <div className="p-6 border-b border-blue-100">
            <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-xl font-bold text-white">S</span>
            </div>
            <div>
                <h2 className="font-bold text-gray-800">Smiris Learn</h2>
                <p className="text-xs text-gray-500">Super Admin</p>
            </div>
            </div>
        </div>

        {/* Menu */}
        <nav className="flex-1 p-4 space-y-1">
            {menuItems.map((item, index) => (
            <motion.div
                key={item.path}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
            >
                <NavLink
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group
                    ${isActive 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-200' 
                    : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                    }`
                }
                >
                <item.icon size={20} />
                <span className="font-medium">{item.label}</span>
                {item.label === 'Dashboard' && (
                    <Sparkles className="w-4 h-4 ml-auto opacity-50" />
                )}
                </NavLink>
            </motion.div>
            ))}
        </nav>

        {/* Déconnexion */}
        <div className="p-4 border-t border-blue-100">
            <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={signOut}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-600 hover:bg-red-50 transition-all duration-300"
            >
            <LogOut size={20} />
            <span className="font-medium">Déconnexion</span>
            </motion.button>
        </div>
        </motion.aside>
    )
}