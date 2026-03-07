import { useEffect, useState } from 'react'
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion'
import {  Edit, Trash2, Eye, ChevronLeft, ChevronRight, Search, X, Building2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function CompaniesTable() {
    const [companies, setCompanies] = useState([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedPlan, setSelectedPlan] = useState('all')
    const itemsPerPage = 5

    useEffect(() => {
        const fetchCompanies = async () => {
            setLoading(true)
            try {
                // Construire la requête pour le comptage
                let countQuery = supabase
                    .from('organizations')
                    .select('*', { count: 'exact', head: true })

                // Appliquer les filtres pour le comptage
                if (searchTerm) {
                    countQuery = countQuery.ilike('name', `%${searchTerm}%`)
                }
                if (selectedPlan !== 'all') {
                    countQuery = countQuery.eq('plan_type', selectedPlan)
                }

                const { count: totalCount, error: countError } = await countQuery

                if (countError) throw countError
                setTotalPages(Math.ceil(totalCount / itemsPerPage))

                // Construire la requête pour les données
                let dataQuery = supabase
                    .from('organizations')
                    .select('*')
                    .order('created_at', { ascending: false })

                // Appliquer les mêmes filtres
                if (searchTerm) {
                    dataQuery = dataQuery.ilike('name', `%${searchTerm}%`)
                }
                if (selectedPlan !== 'all') {
                    dataQuery = dataQuery.eq('plan_type', selectedPlan)
                }

                // Pagination
                const from = (page - 1) * itemsPerPage
                const to = from + itemsPerPage - 1
                dataQuery = dataQuery.range(from, to)

                const { data: companiesData, error } = await dataQuery

                if (error) throw error

                // Pour chaque entreprise, compter ses utilisateurs
                const companiesWithUserCount = await Promise.all(
                    (companiesData || []).map(async (company) => {
                        const { count, error: countError } = await supabase
                            .from('profiles')
                            .select('*', { count: 'exact', head: true })
                            .eq('organization_id', company.id)

                        return {
                            ...company,
                            userCount: countError ? 0 : count || 0
                        }
                    })
                )

                setCompanies(companiesWithUserCount)
            } catch (error) {
                console.error('Erreur chargement entreprises:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchCompanies()
    }, [page, searchTerm, selectedPlan]) // ✅ Dépendances propres

    const getPlanBadge = (plan) => {
        const plans = {
            free: 'bg-gray-100 text-gray-600',
            starter: 'bg-blue-100 text-blue-600',
            business: 'bg-purple-100 text-purple-600'
        }
        return plans[plan] || plans.free
    }

    return (
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-blue-100 overflow-hidden">
            {/* En-tête avec recherche et filtre */}
            <div className="p-6 border-b border-blue-100">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <h2 className="text-xl font-bold text-gray-800">Entreprises clientes</h2>
                    
                    <div className="flex flex-col sm:flex-row gap-3">
                        {/* Barre de recherche */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Rechercher..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value)
                                    setPage(1)
                                }}
                                className="pl-10 pr-10 py-2 border border-blue-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 w-full sm:w-64"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => {
                                        setSearchTerm('')
                                        setPage(1)
                                    }}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>

                        {/* Filtre par plan */}
                        <select
                            value={selectedPlan}
                            onChange={(e) => {
                                setSelectedPlan(e.target.value)
                                setPage(1)
                            }}
                            className="px-4 py-2 border border-blue-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 bg-white"
                        >
                            <option value="all">Tous les plans</option>
                            <option value="free">Free</option>
                            <option value="starter">Starter</option>
                            <option value="business">Business</option>
                        </select>

                        {/* Bouton nouvelle entreprise */}
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium shadow-lg whitespace-nowrap"
                        >
                            + Nouvelle entreprise
                        </motion.button>
                    </div>
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
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
                                            <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div></td>
                                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div></td>
                                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div></td>
                                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-12 ml-auto animate-pulse"></div></td>
                                </tr>
                            ))
                        ) : companies.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                    <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                    <p className="text-gray-600">Aucune entreprise trouvée</p>
                                    {(searchTerm || selectedPlan !== 'all') && (
                                        <button
                                            onClick={() => {
                                                setSearchTerm('')
                                                setSelectedPlan('all')
                                                setPage(1)
                                            }}
                                            className="mt-2 text-blue-600 hover:text-blue-700"
                                        >
                                            Effacer les filtres
                                        </button>
                                    )}
                                </td>
                            </tr>
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
                                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">
                                                {company.name?.charAt(0).toUpperCase() || '?'}
                                            </div>
                                            <span className="font-medium text-gray-800">{company.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPlanBadge(company.plan_type)}`}>
                                            {company.plan_type || 'free'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">{company.userCount || 0}</td>
                                    <td className="px-6 py-4 text-gray-600">
                                        {new Date(company.created_at).toLocaleDateString('fr-FR', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric'
                                        })}
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

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-blue-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <p className="text-sm text-gray-600">
                        Page {page} sur {totalPages} • {companies.length} entreprise{companies.length > 1 ? 's' : ''} affichée{companies.length > 1 ? 's' : ''}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="p-2 border border-blue-200 rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft size={20} className="text-gray-600" />
                        </button>
                        
                        {/* Numéros de page simplifiés */}
                        <div className="flex gap-1">
                            {[...Array(totalPages)].map((_, i) => {
                                const pageNum = i + 1
                                // N'afficher que 5 pages max
                                if (totalPages > 5) {
                                    if (pageNum < page - 2 || pageNum > page + 2) return null
                                }
                                return (
                                    <button
                                        key={i}
                                        onClick={() => setPage(pageNum)}
                                        className={`w-10 h-10 rounded-lg transition-colors ${
                                            page === pageNum
                                                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                                                : 'hover:bg-blue-50 text-gray-600'
                                        }`}
                                    >
                                        {pageNum}
                                    </button>
                                )
                            })}
                        </div>

                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="p-2 border border-blue-200 rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight size={20} className="text-gray-600" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}