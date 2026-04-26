import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    MoreVertical, Edit, Trash2, Eye, ChevronLeft, ChevronRight, 
    Search, X, Building2, Users, Calendar, Mail, RefreshCw,
    LayoutDashboard, ChevronDown
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
    const [isPlanFilterOpen, setIsPlanFilterOpen] = useState(false);
    const planFilterRef = useRef(null);
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

    // Fermer le dropdown si on clique ailleurs
    useEffect(() => {
        function handleClickOutside(event) {
            if (planFilterRef.current && !planFilterRef.current.contains(event.target)) {
                setIsPlanFilterOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [planFilterRef]);

    const getPlanBadge = (plan, status) => {
        if (status === 'trial') {
            return 'bg-green-100/80 dark:bg-green-900/40 text-green-700 dark:text-green-400 border border-green-200/50 dark:border-green-800/30';
        }
        const plans = {
            free: 'bg-white/50 dark:bg-white/10 text-slate-600 dark:text-slate-300 border border-white/50 dark:border-white/5',
            starter: 'bg-primary-50/80 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 border border-primary-200/50 dark:border-primary-800/30',
            business: 'bg-accent-50/80 dark:bg-accent-900/40 text-accent-700 dark:text-accent-300 border border-accent-200/50 dark:border-accent-800/30'
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
            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl p-8 rounded-3xl border border-white/50 dark:border-white/5 shadow-lg relative">
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-primary-500 to-accent-600 rounded-full opacity-0 dark:opacity-10 blur-3xl pointer-events-none" />
                
                {/* En-tête */}
                <div className="p-0 mb-8 relative z-30">
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
                                    className="pl-12 pr-10 py-3 bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/5 rounded-2xl focus:ring-4 focus:ring-primary-100/50 dark:focus:ring-primary-900/30 focus:bg-white/80 dark:focus:bg-white/10 w-full sm:w-72 font-medium transition-all text-sm dark:text-white dark:placeholder-gray-400 shadow-sm"
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
                            <div className="relative" ref={planFilterRef}>
                                <button
                                    onClick={() => setIsPlanFilterOpen(!isPlanFilterOpen)}
                                    className="px-6 py-3 bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/5 rounded-2xl focus:ring-4 focus:ring-primary-100/50 dark:focus:ring-primary-900/30 font-bold text-xs text-gray-600 dark:text-gray-300 transition-all flex items-center gap-2 shadow-sm min-w-[160px] justify-between"
                                >
                                    <span>{selectedPlan === 'all' ? 'Filtrer par plan' : getPlanLabel(selectedPlan)}</span>
                                    <ChevronDown size={14} className={`transition-transform duration-200 ${isPlanFilterOpen ? 'rotate-180' : ''}`} />
                                </button>

                                <AnimatePresence>
                                    {isPlanFilterOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                            className="absolute right-0 mt-2 w-48 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-2xl shadow-xl border border-white/50 dark:border-white/5 py-2 z-50"
                                        >
                                            {[
                                                { value: 'all', label: 'Filtrer par plan' },
                                                { value: 'free', label: 'Gratuit' },
                                                { value: 'starter', label: 'Starter' },
                                                { value: 'business', label: 'Business' }
                                            ].map((plan) => (
                                                <button
                                                    key={plan.value}
                                                    onClick={() => {
                                                        setSelectedPlan(plan.value);
                                                        setPage(1);
                                                        setIsPlanFilterOpen(false);
                                                    }}
                                                    className={`w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center gap-2
                                                        ${selectedPlan === plan.value 
                                                            ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400 font-bold' 
                                                            : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-white/10'
                                                        }`}
                                                >
                                                    {plan.label}
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

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
                        <tbody className="divide-y divide-white/40 dark:divide-white/5">
                            {loading ? (
                                [...Array(3)].map((_, i) => (
                                    <tr key={i}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-white/50 dark:bg-white/5 rounded-lg border border-white/30 dark:border-white/5 animate-pulse"></div>
                                                <div className="h-4 bg-white/50 dark:bg-white/5 rounded w-32 border border-white/30 dark:border-white/5 animate-pulse"></div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4"><div className="h-4 bg-white/50 dark:bg-white/5 rounded w-20 border border-white/30 dark:border-white/5 animate-pulse"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-white/50 dark:bg-white/5 rounded w-16 border border-white/30 dark:border-white/5 animate-pulse"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-white/50 dark:bg-white/5 rounded w-24 border border-white/30 dark:border-white/5 animate-pulse"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-white/50 dark:bg-white/5 rounded w-12 ml-auto border border-white/30 dark:border-white/5 animate-pulse"></div></td>
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
                                        className="transition-all hover:bg-white/40 dark:hover:bg-white/5 group/row"
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
                                            <div className="flex items-center gap-3 bg-white/50 dark:bg-white/5 p-2 py-1.5 rounded-2xl border border-white/50 dark:border-white/5 w-fit">
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
                                            <div className="flex items-center justify-end gap-3">
                                                <motion.button
                                                    whileHover={{ scale: 1.1, backgroundColor: 'rgba(var(--color-primary-50), 0.5)' }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => navigate(`/super-admin/companies/${company.id}`)}
                                                    className="p-3 text-primary-600 dark:text-primary-400 rounded-xl transition-colors bg-white/60 dark:bg-white/5 shadow-sm border border-white/50 dark:border-white/5"
                                                    title="Explorer"
                                                >
                                                    <Eye size={18} />
                                                </motion.button>
                                                <motion.button
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => navigate(`/admin?orgId=${company.id}`)}
                                                    className="p-2 hover:bg-white/60 dark:hover:bg-white/5 rounded-lg transition-colors text-accent-600 dark:text-accent-400"
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
                                                            .in('role', ['org_admin', 'super_admin'])
                                                            .limit(1)
                                                            .maybeSingle();
                                                        
                                                        if (profiles?.email) {
                                                            window.location.href = `mailto:${profiles.email}?subject=Question concernant ${company.name}`;
                                                        } else {
                                                            alert("Aucun email d'administrateur trouvé.");
                                                        }
                                                    }}
                                                    className="p-2 hover:bg-white/60 dark:hover:bg-white/5 rounded-lg transition-colors text-green-600 dark:text-green-400"
                                                    title="Envoyer un email"
                                                >
                                                    <Mail size={18} />
                                                </motion.button>
                                                <div className="relative">
                                                    <motion.button
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={() => setShowActions(showActions === company.id ? null : company.id)}
                                                        className="p-2 hover:bg-white/60 dark:hover:bg-white/5 rounded-lg transition-colors"
                                                    >
                                                        <MoreVertical size={18} className="text-gray-500 dark:text-gray-400" />
                                                    </motion.button>
                                                    <AnimatePresence>
                                                        {showActions === company.id && (
                                                            <motion.div
                                                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                                                className="absolute right-0 mt-2 w-48 bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl rounded-2xl shadow-lg border border-white/50 dark:border-white/5 py-1.5 z-10"
                                                            >
                                                                <button 
                                                                    onClick={() => {
                                                                        setEditingCompany(company);
                                                                        setIsEditModalOpen(true);
                                                                        setShowActions(null);
                                                                    }}
                                                                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-white/10 hover:text-primary-600 dark:hover:text-primary-400 flex items-center gap-2 transition-colors"
                                                                >
                                                                    <Edit size={16} />
                                                                    Modifier
                                                                </button>
                                                                <button 
                                                                    onClick={async () => {
                                                                        if (window.confirm(`Supprimer définitivement l'entreprise ${company.name} ? Cette action supprimera également tous les piliers, groupes et détachera les membres.`)) {
                                                                            setLoading(true);
                                                                            try {
                                                                                // 1. Détacher les profils un par un pour éviter les erreurs RLS sur les mises à jour en masse
                                                                                const { data: profilesToDetach, error: fetchProfilesError } = await supabase
                                                                                    .from('profiles')
                                                                                    .select('id')
                                                                                    .eq('organization_id', company.id);
                                                                                
                                                                                if (fetchProfilesError) throw fetchProfilesError;

                                                                                if (profilesToDetach && profilesToDetach.length > 0) {
                                                                                    for (const profile of profilesToDetach) {
                                                                                        const { error: detachError } = await supabase
                                                                                            .from('profiles')
                                                                                            .update({ organization_id: null, role: 'student' })
                                                                                            .eq('id', profile.id);
                                                                                        
                                                                                        if (detachError) {
                                                                                            console.error(`Erreur détachement profil ${profile.id}:`, detachError);
                                                                                            // On continue quand même pour les autres, ou on throw ?
                                                                                            // On throw pour être sûr de ne pas laisser d'incohérences
                                                                                            throw detachError;
                                                                                        }
                                                                                    }
                                                                                }

                                                                                // 2. Supprimer les piliers
                                                                                // Note: On pourrait aussi supprimer les video_progress ici si nécessaire
                                                                                await supabase
                                                                                    .from('pillars')
                                                                                    .delete()
                                                                                    .eq('organization_id', company.id);

                                                                                // 3. Nettoyer les groupes et leurs membres
                                                                                const { data: groupsToDelete } = await supabase
                                                                                    .from('groups')
                                                                                    .select('id')
                                                                                    .eq('organization_id', company.id);
                                                                                
                                                                                if (groupsToDelete && groupsToDelete.length > 0) {
                                                                                    const groupIds = groupsToDelete.map(g => g.id);
                                                                                    // Supprimer les membres des groupes d'abord
                                                                                    await supabase
                                                                                        .from('group_members')
                                                                                        .delete()
                                                                                        .in('group_id', groupIds);
                                                                                    
                                                                                    // Puis supprimer les groupes
                                                                                    await supabase
                                                                                        .from('groups')
                                                                                        .delete()
                                                                                        .in('id', groupIds);
                                                                                }

                                                                                // 4. Supprimer les invitations
                                                                                await supabase
                                                                                    .from('member_invitations')
                                                                                    .delete()
                                                                                    .eq('organization_id', company.id);

                                                                                // 5. Supprimer l'organisation finale
                                                                                const { error } = await supabase
                                                                                    .from('organizations')
                                                                                    .delete()
                                                                                    .eq('id', company.id);
                                                                                
                                                                                if (!error) {
                                                                                    fetchCompanies();
                                                                                } else {
                                                                                    throw error;
                                                                                }
                                                                            } catch (err) {
                                                                                alert(`Erreur lors de la suppression: ${err.message}. Assurez-vous d'avoir supprimé les vidéos et quiz associés manuellement si nécessaire.`);
                                                                            } finally {
                                                                                setLoading(false);
                                                                            }
                                                                        }
                                                                        setShowActions(null);
                                                                    }}
                                                                    className="w-full px-4 py-2.5 text-left text-sm text-red-600 dark:text-red-400 hover:bg-white/50 dark:hover:bg-white/10 flex items-center gap-2 transition-colors"
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
                    <div className="px-6 py-4 border-t border-white/40 dark:border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Page {page} sur {totalPages}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-2 border border-white/50 dark:border-white/5 rounded-xl hover:bg-white/50 dark:hover:bg-white/5 bg-white/40 dark:bg-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                                                        ? 'bg-gradient-to-r from-primary-600 to-primary-800 text-white shadow-lg shadow-primary-500/25'
                                                        : 'hover:bg-white/50 dark:hover:bg-white/5 bg-white/40 dark:bg-transparent text-gray-600 dark:text-gray-400 border border-white/50 dark:border-white/5'
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
                                            className={`w-10 h-10 rounded-xl font-semibold transition-all ${
                                                page === pageNum
                                                    ? 'bg-gradient-to-r from-primary-600 to-accent-600 text-white shadow-lg shadow-primary-500/30'
                                                    : 'hover:bg-white/50 dark:hover:bg-white/5 bg-white/40 dark:bg-transparent border border-white/50 dark:border-white/5 text-gray-600 dark:text-gray-400'
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
                                className="p-2 border border-white/50 dark:border-white/5 rounded-xl hover:bg-white/50 dark:hover:bg-white/5 bg-white/40 dark:bg-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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