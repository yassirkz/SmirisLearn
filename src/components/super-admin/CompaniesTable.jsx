import { useEffect, useState } from 'react'
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion'
import { MoreVertical, Edit, Trash2, Eye } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function CompaniesTable() {
    const [companies, setCompanies] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchCompanies = async () => {
        const { data, error } = await supabase
            .from('organizations')
            .select('*')
            .order('created_at', { ascending: false })

        if (!error) setCompanies(data)
        setLoading(false)
        }

        fetchCompanies()
    }, [])

    return (
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-blue-100 overflow-hidden">
        {/* En-tête */}
        <div className="p-6 border-b border-blue-100">
            <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800">Entreprises clientes</h2>
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium shadow-lg"
            >
                + Nouvelle entreprise
            </motion.button>
            </div>
        </div>

        {/* Tableau */}
        <div className="overflow-x-auto">
            <table className="w-full">
            <thead className="bg-gray-50/50">
                <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Nom</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Plan</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Utilisateurs</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Date création</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-600">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-blue-100">
                {loading ? (
                // Skeleton loading
                [...Array(3)].map((_, i) => (
                    <tr key={i}>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-12 ml-auto animate-pulse"></div></td>
                    </tr>
                ))
                ) : (
                companies.map((company, index) => (
                    <motion.tr
                    key={company.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-blue-50/50 transition-colors"
                    >
                    <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                            {company.name.charAt(0)}
                        </div>
                        <span className="font-medium text-gray-800">{company.name}</span>
                        </div>
                    </td>
                    <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        company.plan_type === 'free' ? 'bg-gray-100 text-gray-600' :
                        company.plan_type === 'starter' ? 'bg-blue-100 text-blue-600' :
                        'bg-purple-100 text-purple-600'
                        }`}>
                        {company.plan_type}
                        </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">0</td>
                    <td className="px-6 py-4 text-gray-600">
                        {new Date(company.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                        <button className="p-2 hover:bg-blue-100 rounded-lg transition-colors">
                            <Eye size={18} className="text-gray-600" />
                        </button>
                        <button className="p-2 hover:bg-blue-100 rounded-lg transition-colors">
                            <Edit size={18} className="text-gray-600" />
                        </button>
                        <button className="p-2 hover:bg-red-100 rounded-lg transition-colors">
                            <Trash2 size={18} className="text-red-500" />
                        </button>
                        </div>
                    </td>
                    </motion.tr>
                ))
                )}
            </tbody>
            </table>
        </div>
        </div>
    )
}