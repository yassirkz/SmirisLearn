import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    MoreVertical, Edit, Trash2, Eye, ChevronLeft, ChevronRight, 
    Search, X, Building2, Users, Calendar, Mail, RefreshCw,
    LayoutDashboard
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import CreateCompanyModal from './CreateCompanyModal';
import EditCompanyModal from './EditCompanyModal';

export default function CompaniesTable() {
    const navigate = useNavigate();
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPlan, setSelectedPlan] = useState('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingCompany, setEditingCompany] = useState(null);
    const [showActions, setShowActions] = useState(null);
    const itemsPerPage = 5;

    const fetchCompanies = useCallback(async () => {
        setLoading(true);
        try {
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
            return 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800';
        }
        const plans = {
            free: 'bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700',
            starter: 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800',
            business: 'bg-accent-50 dark:bg-accent-900/30 text-accent-600 dark:text-accent-400 border border-accent-200 dark:border-accent-800'
        };
        return plans[plan] || plans.free;
    };

    const getPlanLabel = (plan) => {
        const labels = {
            free: "Gratuit",
            starter: "Starter",
            business: "Business"
        };
        return labels[plan] || "Gratuit";
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString(undefined, {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    return (
        <>
            <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-xl shadow-gray-200/40 dark:shadow-gray-900/40 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-50 dark:bg-primary-900/20 opacity-[0.03] rounded-bl-[5rem] -z-0" />
                
                {/* En-tête */}
                <div className="p-0 mb-8 relative z-10">
                    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Entreprises</h2>
                            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">
                                {companies.length} entreprises enregistrées
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            {/* Barre de recherche */}
                            <div className="relative group/search">
                                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 group-focus-within/search:text-primary-500 dark:group-focus-within/search:text-primary-400 transition-colors" size={18} />
                                <input
                                    type="text"
                                    placeholder="Rechercher une entreprise..."
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setPage(1);
                                    }}
                                    className="pl-12 pr-10 py-3 bg-gray-50 dark:bg-gray-700 border-none rounded-2xl focus:ring-4 focus:ring-primary-100 dark:focus:ring-primary-900/30 focus:bg-white dark:focus:bg-gray-600 w-full sm:w-72 font-medium transition-all text-sm dark:text-white dark:placeholder-gray-400"
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => {
                                            setSearchTerm('');
                                            setPage(1);
                                        }}
                                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
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
                                className="px-6 py-3 bg-gray-50 dark:bg-gray-700 border-none rounded-2xl focus:ring-4 focus:ring-primary-100 dark:focus:ring-primary-900/30 focus:bg-white dark:focus:bg-gray-600 font-bold text-xs text-gray-600 dark:text-gray-300 transition-all appearance-none cursor-pointer"
                            >
                                <option value="all">Filtrer par plan</option>
                                <option value="free">Gratuit</option>
                                <option value="starter">Starter</option>
                                <option value="business">Business</option>
                            </select>

                            {/* Bouton nouvelle entreprise */}
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setIsModalOpen(true)}
                                className="px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-2xl font-bold shadow-xl shadow-primary-200 dark:shadow-primary-900/30 whitespace-nowrap text-sm flex items-center gap-2"
                            >
                                <Building2 size={18} />
                                Déployer Entreprise
                            </motion.button>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto relative z-10">
                    <table className="w-full min-w-[640px]">
                        <thead className="bg-transparent border-b border-gray-100 dark:border-gray-700">
                            <tr>
                                <th className="px-6 py-5 text-left text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Identification</th>
                                <th className="px-6 py-5 text-left text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Licence</th>
                                <th className="px-6 py-5 text-left text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Usage</th>
                                <th className="px-6 py-5 text-left text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Inscrit le</th>
                                <th className="px-6 py-5 text-right text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Gestion</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-primary-100/50 dark:divide-gray-700">
                            {loading ? (
                                [...Array(3)].map((_, i) => (
                                    <tr key={i}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12 ml-auto animate-pulse"></div></td>
                                    </tr>
                                ))
                            ) : companies.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                        <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                                        <p className="text-gray-600 dark:text-gray-300">Aucun résultat trouvé</p>
                                        {(searchTerm || selectedPlan !== 'all') && (
                                            <button
                                                onClick={() => {
                                                    setSearchTerm('');
                                                    setSelectedPlan('all');
                                                    setPage(1);
                                                }}
                                                className="mt-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
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
                                        initial={{ opacity: 0, scale: 0.98 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="transition-all hover:bg-primary-50/30 dark:hover:bg-gray-700/30 group/row"
                                    >
                                        <td className="px-6 py-6">
                                            <div 
                                                className="flex items-center gap-4 cursor-pointer group/data"
                                                onClick={() => navigate(`/super-admin/companies/${company.id}`)}
                                            >
                                                <div className="w-12 h-12 bg-gradient-to-br from-primary-600 to-primary-800 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-primary-200 dark:shadow-primary-900/30 group-hover/data:scale-110 transition-transform">
                                                    {company.name?.charAt(0).toUpperCase() || '?'}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-gray-900 dark:text-white group-hover/data:text-primary-600 dark:group-hover/data:text-primary-400 transition-colors">
                                                        {company.name}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-0.5">ID: {company.id.slice(0, 8)}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 font-bold">
                                            <span className={`px-4 py-1.5 rounded-full text-[10px] uppercase font-black tracking-widest ${getPlanBadge(company.plan_type)} shadow-sm`}>
                                                {getPlanLabel(company.plan_type)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="flex items-center gap-3 bg-gray-50/50 dark:bg-gray-800/50 p-2 py-1.5 rounded-2xl w-fit">
                                                <Users className="w-4 h-4 text-primary-500 dark:text-primary-400" />
                                                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{company.userCount || 0}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{formatDate(company.created_at)}</span>
                                                {company.subscription_status === 'trial' && (
                                                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mt-1 animate-pulse">
                                                        ⏳ Essai actif
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="flex items-center justify-end gap-3 translate-x-4 opacity-0 group-hover/row:opacity-100 group-hover/row:translate-x-0 transition-all duration-300">
                                                <motion.button
                                                    whileHover={{ scale: 1.1, backgroundColor: 'rgba(var(--color-primary-50), 0.5)' }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => navigate(`/super-admin/companies/${company.id}`)}
                                                    className="p-3 text-primary-600 dark:text-primary-400 rounded-xl transition-colors bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700"
                                                    title="Explorer"
                                                >
                                                    <Eye size={18} />
                                                </motion.button>
                                                <motion.button
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => navigate(`/admin?orgId=${company.id}`)}
                                                    className="p-2 hover:bg-accent-100 dark:hover:bg-accent-900/50 rounded-lg transition-colors text-accent-600 dark:text-accent-400 opacity-0 group-hover:opacity-100"
                                                    title="Voir Dashboard Admin"
                                                >
                                                    <LayoutDashboard size={18} />
                                                </motion.button>
                                                <motion.button
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={async () => {
                                                        const { data: profiles } = await supabase
                                                            .from('profiles')
                                                            .select('email')
                                                            .eq('organization_id', company.id)
                                                            .eq('role', 'org_admin')
                                                            .single();
                                                        
                                                        if (profiles?.email) {
                                                            window.location.href = `mailto:${profiles.email}?subject=Question concernant ${company.name}`;
                                                        } else {
                                                            alert("Aucun email d'administrateur trouvé.");
                                                        }
                                                    }}
                                                    className="p-2 hover:bg-green-100 dark:hover:bg-green-900/50 rounded-lg transition-colors text-green-600 dark:text-green-400 opacity-0 group-hover:opacity-100"
                                                    title="Envoyer un email"
                                                >
                                                    <Mail size={18} />
                                                </motion.button>
                                                <div className="relative">
                                                    <motion.button
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={() => setShowActions(showActions === company.id ? null : company.id)}
                                                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                                    >
                                                        <MoreVertical size={18} className="text-gray-500 dark:text-gray-400" />
                                                    </motion.button>
                                                    <AnimatePresence>
                                                        {showActions === company.id && (
                                                            <motion.div
                                                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                                                className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-1 z-10"
                                                            >
                                                                <button 
                                                                    onClick={() => {
                                                                        setEditingCompany(company);
                                                                        setIsEditModalOpen(true);
                                                                        setShowActions(null);
                                                                    }}
                                                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-gray-700 hover:text-primary-600 dark:hover:text-primary-400 flex items-center gap-2"
                                                                >
                                                                    <Edit size={16} />
                                                                    Modifier
                                                                </button>
                                                                <button 
                                                                    onClick={async () => {
                                                                        if (window.confirm(`Supprimer définitivement l'entreprise ${company.name} ?`)) {
                                                                            const { error } = await supabase
                                                                                .from('organizations')
                                                                                .delete()
                                                                                .eq('id', company.id);
                                                                            
                                                                            if (!error) {
                                                                                fetchCompanies();
                                                                            } else {
                                                                                alert(`Erreur lors de la suppression: ${error.message}`);
                                                                            }
                                                                        }
                                                                        setShowActions(null);
                                                                    }}
                                                                    className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50 flex items-center gap-2"
                                                                >
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
                    <div className="px-6 py-4 border-t border-primary-100/50 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Page {page} sur {totalPages}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-2 border border-primary-200 dark:border-gray-700 rounded-lg hover:bg-primary-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft size={20} className="text-gray-600 dark:text-gray-400" />
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
                                                        ? 'bg-gradient-to-r from-primary-600 to-primary-800 text-white'
                                                        : 'hover:bg-primary-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
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
                                                    ? 'bg-gradient-to-r from-primary-600 to-primary-800 text-white'
                                                    : 'hover:bg-primary-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
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
                                className="p-2 border border-primary-200 dark:border-gray-700 rounded-lg hover:bg-primary-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight size={20} className="text-gray-600 dark:text-gray-400" />
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

            <EditCompanyModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setEditingCompany(null);
                }}
                company={editingCompany}
                onSuccess={fetchCompanies}
            />
        </>
    );
}