import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreVertical, Edit, Trash2, Eye, ChevronLeft, ChevronRight, Search, X, Building2, Users, Calendar, Mail, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import CreateCompanyModal from './CreateCompanyModal';

export default function CompaniesTable() {
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPlan, setSelectedPlan] = useState('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showActions, setShowActions] = useState(null);
    const itemsPerPage = 5;

    const fetchCompanies = useCallback(async () => {
        setLoading(true);
        try {
            // Requête pour le comptage
            let countQuery = supabase
                .from('organizations')
                .select('*', { count: 'exact', head: true });

            if (searchTerm) {
                countQuery = countQuery.ilike('name', `%${searchTerm}%`);
            }
            if (selectedPlan !== 'all') {
                countQuery = countQuery.eq('plan_type', selectedPlan);
            }

            const { count: totalCount, error: countError } = await countQuery;

            if (countError) throw countError;
            setTotalPages(Math.ceil(totalCount / itemsPerPage));

            // Requête pour les données
            let dataQuery = supabase
                .from('organizations')
                .select('*')
                .order('created_at', { ascending: false });

            if (searchTerm) {
                dataQuery = dataQuery.ilike('name', `%${searchTerm}%`);
            }
            if (selectedPlan !== 'all') {
                dataQuery = dataQuery.eq('plan_type', selectedPlan);
            }

            const from = (page - 1) * itemsPerPage;
            const to = from + itemsPerPage - 1;
            dataQuery = dataQuery.range(from, to);

            const { data: companiesData, error } = await dataQuery;

            if (error) throw error;

            // Compter les utilisateurs par entreprise
            const companiesWithUserCount = await Promise.all(
                (companiesData || []).map(async (company) => {
                    const { count, error: countError } = await supabase
                        .from('profiles')
                        .select('*', { count: 'exact', head: true })
                        .eq('organization_id', company.id);

                    return {
                        ...company,
                        userCount: countError ? 0 : count || 0
                    };
                })
            );

            setCompanies(companiesWithUserCount);
        } catch (error) {
            console.error('Erreur chargement entreprises:', error);
        } finally {
            setLoading(false);
        }
    }, [page, searchTerm, selectedPlan]);

    useEffect(() => {
        fetchCompanies();
    }, [fetchCompanies]);

    const getPlanBadge = (plan, status) => {
        if (status === 'trial') {
            return 'bg-green-100 text-green-600 border border-green-200';
        }
        const plans = {
            free: 'bg-gray-100 text-gray-600',
            starter: 'bg-blue-100 text-blue-600',
            business: 'bg-purple-100 text-purple-600'
        };
        return plans[plan] || plans.free;
    };

    const getPlanLabel = (plan) => {
        const labels = {
            free: 'Gratuit',
            starter: 'Starter',
            business: 'Business'
        };
        return labels[plan] || 'Gratuit';
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    return (
        <>
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-blue-100 overflow-hidden">
                {/* En-tête */}
                <div className="p-6 border-b border-blue-100">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Entreprises clientes</h2>
                            <p className="text-sm text-gray-500 mt-1">
                                {companies.length} entreprise{companies.length > 1 ? 's' : ''} affichée{companies.length > 1 ? 's' : ''}
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                            {/* Barre de recherche */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Rechercher..."
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setPage(1);
                                    }}
                                    className="pl-10 pr-10 py-2 border border-blue-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 w-full sm:w-64"
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => {
                                            setSearchTerm('');
                                            setPage(1);
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
                                    setSelectedPlan(e.target.value);
                                    setPage(1);
                                }}
                                className="px-4 py-2 border border-blue-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 bg-white"
                            >
                                <option value="all">Tous les plans</option>
                                <option value="free">Gratuit</option>
                                <option value="starter">Starter</option>
                                <option value="business">Business</option>
                            </select>

                            {/* Bouton nouvelle entreprise */}
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setIsModalOpen(true)}
                                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium shadow-lg whitespace-nowrap"
                            >
                                + Nouvelle entreprise
                            </motion.button>

                            {/* Bouton rafraîchir */}
                            <motion.button
                                whileHover={{ rotate: 180 }}
                                transition={{ duration: 0.3 }}
                                onClick={fetchCompanies}
                                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                title="Rafraîchir"
                            >
                                <RefreshCw className="w-5 h-5 text-gray-600" />
                            </motion.button>
                        </div>
                    </div>
                </div>

                {/* Tableau */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Entreprise</th>
                                <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Plan</th>
                                <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Utilisateurs</th>
                                <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Date création</th>
                                <th className="px-6 py-4 text-right text-sm font-medium text-gray-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-blue-100">
                            {loading ? (
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
                                                    setSearchTerm('');
                                                    setSelectedPlan('all');
                                                    setPage(1);
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
                                        className="hover:bg-blue-50/50 transition-colors group"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm group-hover:scale-110 transition-transform">
                                                    {company.name?.charAt(0).toUpperCase() || '?'}
                                                </div>
                                                <span className="font-medium text-gray-800">{company.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPlanBadge(company.plan_type)}`}>
                                                {getPlanLabel(company.plan_type)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Users className="w-4 h-4 text-gray-400" />
                                                <span className="text-sm text-gray-600">{company.userCount || 0}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                <span className="text-sm text-gray-600">{formatDate(company.created_at)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {company.subscription_status === 'trial' && (
                                                <span className="text-xs text-green-600">
                                                    ⏳ Essai: {new Date(company.trial_ends_at).toLocaleDateString()}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <motion.button
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    className="p-2 hover:bg-blue-100 rounded-lg transition-colors text-blue-600 opacity-0 group-hover:opacity-100"
                                                    title="Voir détails"
                                                >
                                                    <Eye size={18} />
                                                </motion.button>
                                                <motion.button
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    className="p-2 hover:bg-green-100 rounded-lg transition-colors text-green-600 opacity-0 group-hover:opacity-100"
                                                    title="Envoyer un email"
                                                >
                                                    <Mail size={18} />
                                                </motion.button>
                                                <div className="relative">
                                                    <motion.button
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={() => setShowActions(showActions === company.id ? null : company.id)}
                                                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                                    >
                                                        <MoreVertical size={18} className="text-gray-500" />
                                                    </motion.button>
                                                    <AnimatePresence>
                                                        {showActions === company.id && (
                                                            <motion.div
                                                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                                                className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-10"
                                                            >
                                                                <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2">
                                                                    <Edit size={16} />
                                                                    Modifier
                                                                </button>
                                                                <button className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                                                                    <Trash2 size={16} />
                                                                    Supprimer
                                                                </button>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
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
                            Page {page} sur {totalPages}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-2 border border-blue-200 rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft size={20} className="text-gray-600" />
                            </button>
                            
                            <div className="flex gap-1">
                                {[...Array(totalPages)].map((_, i) => {
                                    const pageNum = i + 1;
                                    if (totalPages > 5) {
                                        if (pageNum < page - 2 || pageNum > page + 2) return null;
                                        if (pageNum === 1 || pageNum === totalPages) return (
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
                                        );
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
                                    );
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

            <CreateCompanyModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchCompanies}
            />
        </>
    );
}