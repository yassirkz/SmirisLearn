import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Search, Filter, X, ChevronLeft, ChevronRight, ChevronDown,
    Building2, Mail, Calendar, MoreVertical, Eye,
    Edit, Trash2, Shield, Award, UserPlus, Download,
    RefreshCw, Sparkles, AlertCircle, CheckCircle,
    UserCog, UserX, UserCheck, Clock, Zap, Ban
} from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { useMemberInvitation } from '../../hooks/useMemberInvitation';
import { untrusted, escapeText } from '../../utils/security';
import UserActionModal from '../../components/super-admin/UserActionModal';
import ConfirmationModal from '../../components/ui/ConfirmationModal';

export default function SuperAdminUsers() {
    const { user, startImpersonation } = useAuth();
    const { success, error: showError } = useToast();
    const { createInvitation, loading: inviting } = useMemberInvitation();

    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState([]);
    const [organizations, setOrganizations] = useState([]);
    const [stats, setStats] = useState({
        total: 0,
        admins: 0,
        students: 0,
        newThisMonth: 0
    });

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const itemsPerPage = 10;

    // Filtres
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOrg, setSelectedOrg] = useState('all');
    const [selectedRole, setSelectedRole] = useState('all');
    const [showFilters, setShowFilters] = useState(false);
    const [showActions, setShowActions] = useState(null);
    const [isOrgFilterOpen, setIsOrgFilterOpen] = useState(false);
    const [isRoleFilterOpen, setIsRoleFilterOpen] = useState(false);
    const orgFilterRef = useRef(null);
    const roleFilterRef = useRef(null);

    // Modals
    const [showUserModal, setShowUserModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [modalAction, setModalAction] = useState('view');
    const [exporting, setExporting] = useState(false);

    // Invitation modal
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('student');
    const [inviteOrg, setInviteOrg] = useState('');

    // Confirmation modal for suspend/delete
    const [actionUser, setActionUser] = useState(null);
    const [actionType, setActionType] = useState(null); // 'suspend', 'unsuspend', 'delete'

    useEffect(() => {
        fetchUsers();
        fetchOrganizations();
    }, [page, searchTerm, selectedOrg, selectedRole]);

    // Fermer les dropdowns si on clique ailleurs
    useEffect(() => {
        function handleClickOutside(event) {
            if (orgFilterRef.current && !orgFilterRef.current.contains(event.target)) {
                setIsOrgFilterOpen(false);
            }
            if (roleFilterRef.current && !roleFilterRef.current.contains(event.target)) {
                setIsRoleFilterOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [orgFilterRef, roleFilterRef]);

    // ============================================
    // Récupérer les organisations (pour le filtre et l'invitation)
    // ============================================
    const fetchOrganizations = async () => {
        try {
            const { data, error } = await supabase
                .from('organizations')
                .select('id, name')
                .order('name');
            if (error) throw error;
            setOrganizations(data || []);
            if (data?.length > 0) setInviteOrg(data[0].id);
        } catch (error) {
            console.error('Erreur chargement organisations:', error);
        }
    };

    // ============================================
    // Récupérer les utilisateurs avec pagination et filtres
    // ============================================
    const fetchUsers = async () => {
        setLoading(true);
        try {
            let countQuery = supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true });

            if (searchTerm) {
                countQuery = countQuery.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
            }
            if (selectedOrg !== 'all') {
                countQuery = countQuery.eq('organization_id', selectedOrg);
            }
            if (selectedRole !== 'all') {
                countQuery = countQuery.eq('role', selectedRole);
            }

            const { count, error: countError } = await countQuery;
            if (countError) throw countError;

            setTotalCount(count || 0);
            setTotalPages(Math.ceil((count || 0) / itemsPerPage));

            let dataQuery = supabase
                .from('profiles')
                .select(`
                    *,
                    organizations (name)
                `)
                .order('created_at', { ascending: false });

            if (searchTerm) {
                dataQuery = dataQuery.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
            }
            if (selectedOrg !== 'all') {
                dataQuery = dataQuery.eq('organization_id', selectedOrg);
            }
            if (selectedRole !== 'all') {
                dataQuery = dataQuery.eq('role', selectedRole);
            }

            const from = (page - 1) * itemsPerPage;
            const to = from + itemsPerPage - 1;
            dataQuery = dataQuery.range(from, to);

            const { data, error } = await dataQuery;
            if (error) throw error;

            const { data: allUsers } = await supabase
                .from('profiles')
                .select('role, created_at');

            if (allUsers) {
                const now = new Date();
                const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                setStats({
                    total: allUsers.length,
                    admins: allUsers.filter(u => u.role === 'org_admin').length,
                    students: allUsers.filter(u => u.role === 'student').length,
                    newThisMonth: allUsers.filter(u => new Date(u.created_at) >= firstDayOfMonth).length
                });
            }

            setUsers(data || []);
        } catch (error) {
            console.error('Erreur chargement utilisateurs:', error);
        } finally {
            setLoading(false);
        }
    };

    // ============================================
    // Obtenir le badge du rôle
    // ============================================
    const getRoleBadge = (role) => {
        const roles = {
            super_admin: {
                bg: 'bg-gradient-to-r from-red-500 to-accent-600',
                text: 'text-white',
                label: 'Super Admin',
                icon: Shield
            },
            org_admin: {
                bg: 'bg-gradient-to-r from-primary-500 to-accent-500',
                text: 'text-white',
                label: 'Admin',
                icon: UserCog
            },
            student: {
                bg: 'bg-gradient-to-r from-green-500 to-emerald-500',
                text: 'text-white',
                label: 'Étudiant',
                icon: UserCheck
            }
        };
        return roles[role] || roles.student;
    };

    // ============================================
    // Actions utilisateur
    // ============================================
    const handleUserAction = (user, action) => {
        if (action === 'view' || action === 'edit') {
            setSelectedUser(user);
            setModalAction(action);
            setShowUserModal(true);
            setShowActions(null);
        } else if (action === 'suspend' || action === 'delete' || action === 'unsuspend') {
            setActionUser(user);
            setActionType(action);
            setShowActions(null);
        }
    };

    const handleSuspend = async () => {
        if (!actionUser) return;
        const suspend = actionType === 'suspend';
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ suspended: suspend })
                .eq('id', actionUser.id);
            if (error) throw error;
            success(suspend ? 'Utilisateur suspendu' : 'Utilisateur réactivé');
            setActionUser(null);
            fetchUsers();
        } catch (err) {
            showError(err.message);
        }
    };

    const handleDelete = async () => {
        if (!actionUser) return;
        try {
            const { error } = await supabase
                .from('profiles')
                .delete()
                .eq('id', actionUser.id);
            if (error) throw error;
            success('Utilisateur supprimé');
            setActionUser(null);
            fetchUsers();
        } catch (err) {
            showError(err.message);
        }
    };

    const handleInvite = async (e) => {
        e.preventDefault();
        if (!inviteOrg) {
            showError('Veuillez sélectionner une organisation');
            return;
        }
        try {
            await createInvitation({
                email: inviteEmail,
                role: inviteRole,
                organization_id: inviteOrg,
                invited_by: user.id,
            });
            success('Invitation envoyée');
            setShowInviteModal(false);
            setInviteEmail('');
            setInviteRole('student');
            setInviteOrg(organizations[0]?.id || '');
        } catch (err) {
            showError(err.message);
        }
    };

    // ============================================
    // Réinitialiser les filtres
    // ============================================
    const resetFilters = () => {
        setSearchTerm('');
        setSelectedOrg('all');
        setSelectedRole('all');
        setPage(1);
    };

    // ============================================
    // Exporter les utilisateurs (CSV)
    // ============================================
    const handleExportUsers = async () => {
        setExporting(true);
        try {
            let query = supabase
                .from('profiles')
                .select(`
                    id,
                    full_name,
                    email,
                    role,
                    created_at,
                    organizations (name)
                `)
                .order('created_at', { ascending: false });

            if (searchTerm) {
                query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
            }
            if (selectedOrg !== 'all') {
                query = query.eq('organization_id', selectedOrg);
            }
            if (selectedRole !== 'all') {
                query = query.eq('role', selectedRole);
            }

            const { data, error } = await query;
            if (error) throw error;

            if (!data || data.length === 0) {
                alert('Aucun utilisateur à exporter');
                return;
            }

            const headers = ['Nom', 'Email', 'Entreprise', 'Rôle', 'Date inscription'];
            const rows = data.map(user => [
                `"${(user.full_name || '').replace(/"/g, '""')}"`,
                `"${user.email.replace(/"/g, '""')}"`,
                `"${(user.organizations?.name || '').replace(/"/g, '""')}"`,
                user.role,
                new Date(user.created_at).toLocaleDateString('fr-FR')
            ]);

            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.join(','))
            ].join('\n');

            const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `export_utilisateurs_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Erreur export utilisateurs:', error);
            alert('Erreur lors de l\'export');
        } finally {
            setExporting(false);
        }
    };

    return (
        <MainLayout>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-8"
            >
                {/* En-tête premium glassmorphism */}
                <div className="relative bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl rounded-3xl p-8 sm:p-10 shadow-lg border border-white/50 dark:border-white/5 overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 dark:bg-primary-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-500/10 dark:bg-accent-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />
                    
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-4">
                                <motion.div
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
                                    className="p-3 bg-gradient-to-br from-primary-500 to-accent-600 rounded-2xl shadow-lg shadow-primary-500/30"
                                >
                                    <Users className="w-8 h-8 text-white" />
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="px-4 py-1.5 bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800/50 rounded-full text-sm font-bold text-primary-700 dark:text-primary-300 shadow-sm flex items-center gap-2 w-fit"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    Gestion des Utilisateurs
                                </motion.div>
                            </div>
                            
                            <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 tracking-tight mb-4">
                                Utilisateurs
                            </h1>
                            
                            <p className="text-lg text-gray-500 dark:text-gray-400 font-medium max-w-2xl flex flex-wrap items-center gap-2">
                                <Shield className="w-5 h-5 text-gray-400" />
                                Gérez tous les utilisateurs de la plateforme
                            </p>
                        </div>
                    </div>
                </div>

                {/* Cartes de statistiques */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Total utilisateurs', value: stats.total, icon: Users, color: 'from-blue-500 to-cyan-400', glow: 'shadow-blue-500/30' },
                    { label: 'Administrateurs', value: stats.admins, icon: UserCog, color: 'from-purple-500 to-pink-500', glow: 'shadow-purple-500/30' },
                    { label: 'Étudiants', value: stats.students, icon: UserCheck, color: 'from-emerald-400 to-teal-500', glow: 'shadow-emerald-500/30' },
                    { label: 'Nouveaux ce mois', value: stats.newThisMonth, icon: Zap, color: 'from-orange-500 to-amber-400', glow: 'shadow-orange-500/30' }
                ].map((card, index) => (
                    <motion.div
                        key={card.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ y: -6, scale: 1.02 }}
                        className="bg-white/60 dark:bg-slate-900/60 rounded-3xl p-6 shadow-lg border border-white/50 dark:border-white/5 backdrop-blur-2xl relative overflow-hidden group"
                    >
                        <div className={`absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br ${card.color} rounded-full opacity-0 dark:opacity-20 blur-3xl group-hover:opacity-10 dark:group-hover:opacity-30 transition-opacity duration-500 pointer-events-none`} />
                        
                        <div className="relative flex items-start justify-between z-10">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className={`w-1.5 h-6 rounded-full bg-gradient-to-b ${card.color} opacity-80`} />
                                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{card.label}</p>
                                </div>
                                <h3 className="text-4xl font-black text-gray-800 dark:text-white tracking-tight leading-none">
                                    {card.value}
                                </h3>
                            </div>
                            <div className={`p-3.5 bg-gradient-to-br ${card.color} rounded-2xl shadow-lg ${card.glow} group-hover:rotate-6 transition-transform duration-500 shrink-0`}>
                                <card.icon className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

                {/* Filtres et recherche */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl rounded-3xl p-6 shadow-lg border border-white/50 dark:border-white/5 relative z-30"
                >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <Filter className="w-5 h-5 text-primary-600" />
                            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Filtres</h2>
                            {(searchTerm || selectedOrg !== 'all' || selectedRole !== 'all') && (
                                <button
                                    onClick={resetFilters}
                                    className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1"
                                >
                                    <X className="w-3 h-3" />
                                    Réinitialiser
                                </button>
                            )}
                        </div>

                        <div className="flex flex-col sm:flex-row dark:bg-gray-800/90 dark:border-gray-700 dark:text-white dark:placeholder:text-gray-400 gap-3 flex-1 lg:justify-end">
                            {/* Barre de recherche */}
                            <div className="relative flex-1 max-w-md dark:bg-gray-800/90 dark:border-gray-700 dark:text-white dark:placeholder:text-gray-400">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-400 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Rechercher par nom ou email..."
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setPage(1);
                                    }}
                                    className="w-full pl-9 pr-4 py-2 bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/5 dark:text-white dark:placeholder:text-gray-400 rounded-2xl focus:outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100 transition-all font-medium text-sm shadow-sm"
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-400"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {/* Filtre par organisation */}
                            <div className="relative" ref={orgFilterRef}>
                                <button
                                    onClick={() => setIsOrgFilterOpen(!isOrgFilterOpen)}
                                    className="px-4 py-2.5 bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/5 dark:text-white rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary-100/50 w-full sm:w-auto sm:min-w-[200px] font-medium text-sm shadow-sm flex items-center justify-between gap-2 transition-all"
                                >
                                    <span className="truncate">
                                        {selectedOrg === 'all' 
                                            ? 'Toutes les entreprises' 
                                            : organizations.find(o => o.id === selectedOrg)?.name || 'Organisation inconnue'}
                                    </span>
                                    <ChevronDown size={14} className={`shrink-0 transition-transform duration-200 ${isOrgFilterOpen ? 'rotate-180' : ''}`} />
                                </button>

                                <AnimatePresence>
                                    {isOrgFilterOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                            className="absolute left-0 mt-2 w-64 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-2xl shadow-xl border border-white/50 dark:border-white/5 py-2 z-50"
                                        >
                                            <button
                                                onClick={() => {
                                                    setSelectedOrg('all');
                                                    setPage(1);
                                                    setIsOrgFilterOpen(false);
                                                }}
                                                className={`w-full px-4 py-2.5 text-left text-sm transition-colors
                                                    ${selectedOrg === 'all' 
                                                        ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400 font-bold' 
                                                        : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-white/10'
                                                    }`}
                                            >
                                                Toutes les entreprises
                                            </button>
                                            {organizations.map(org => (
                                                <button
                                                    key={org.id}
                                                    onClick={() => {
                                                        setSelectedOrg(org.id);
                                                        setPage(1);
                                                        setIsOrgFilterOpen(false);
                                                    }}
                                                    className={`w-full px-4 py-2.5 text-left text-sm transition-colors
                                                        ${selectedOrg === org.id 
                                                            ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400 font-bold' 
                                                            : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-white/10'
                                                        }`}
                                                >
                                                    {escapeText(untrusted(org.name))}
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Filtre par rôle */}
                            <div className="relative" ref={roleFilterRef}>
                                <button
                                    onClick={() => setIsRoleFilterOpen(!isRoleFilterOpen)}
                                    className="px-4 py-2.5 bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/5 dark:text-white rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary-100/50 w-full sm:w-auto sm:min-w-[150px] font-medium text-sm shadow-sm flex items-center justify-between gap-2 transition-all"
                                >
                                    <span>
                                        {selectedRole === 'all' ? 'Tous les rôles' : getRoleBadge(selectedRole).label}
                                    </span>
                                    <ChevronDown size={14} className={`transition-transform duration-200 ${isRoleFilterOpen ? 'rotate-180' : ''}`} />
                                </button>

                                <AnimatePresence>
                                    {isRoleFilterOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                            className="absolute left-0 mt-2 w-48 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-2xl shadow-xl border border-white/50 dark:border-white/5 py-2 z-50"
                                        >
                                            {[
                                                { value: 'all', label: 'Tous les rôles' },
                                                { value: 'super_admin', label: 'Super Admin' },
                                                { value: 'org_admin', label: 'Admin' },
                                                { value: 'student', label: 'Étudiant' }
                                            ].map((role) => (
                                                <button
                                                    key={role.value}
                                                    onClick={() => {
                                                        setSelectedRole(role.value);
                                                        setPage(1);
                                                        setIsRoleFilterOpen(false);
                                                    }}
                                                    className={`w-full px-4 py-2.5 text-left text-sm transition-colors
                                                        ${selectedRole === role.value 
                                                            ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400 font-bold' 
                                                            : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-white/10'
                                                        }`}
                                                >
                                                    {role.label}
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Bouton rafraîchir */}
                            <motion.button
                                whileHover={{ rotate: 180 }}
                                transition={{ duration: 0.3 }}
                                onClick={fetchUsers}
                                className="p-2.5 border border-white/50 dark:border-white/5 bg-white/40 dark:bg-white/5 dark:text-white rounded-2xl hover:bg-white/60 dark:hover:bg-white/10 transition-colors shadow-sm"
                                title="Rafraîchir"
                            >
                                <RefreshCw className="w-5 h-5 text-gray-600" />
                            </motion.button>

                            {/* Bouton exporter */}
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleExportUsers}
                                disabled={exporting}
                                className="px-4 py-2.5 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-2xl shadow-lg shadow-primary-500/25 hover:shadow-xl transition-all flex items-center gap-2 disabled:opacity-50 font-bold text-sm"
                            >
                                {exporting ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Download className="w-4 h-4" />
                                )}
                                <span className="hidden sm:inline">{exporting ? 'Exportation...' : 'Exporter'}</span>
                            </motion.button>

                            {/* Bouton inviter */}
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setShowInviteModal(true)}
                                className="px-4 py-2.5 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-2xl shadow-lg shadow-primary-500/25 hover:shadow-xl transition-all flex items-center gap-2 font-bold text-sm"
                            >
                                <UserPlus className="w-4 h-4" />
                                <span className="hidden sm:inline">Inviter</span>
                            </motion.button>
                        </div>
                    </div>
                </motion.div>

                {/* Tableau des utilisateurs */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl rounded-3xl shadow-lg border border-white/50 dark:border-white/5 overflow-hidden"
                >
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px]">
                            <thead className="bg-transparent border-b border-gray-100 dark:border-gray-700">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Utilisateur</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Email</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Entreprise</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Rôle</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Inscription</th>
                                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                        <tbody className="divide-y divide-white/40 dark:divide-white/5">
                                {loading ? (
                                    // Skeleton loader
                                    [...Array(5)].map((_, i) => (
                                        <tr key={i}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-white/50 dark:bg-white/5 rounded-full border border-white/30 dark:border-white/5 animate-pulse"></div>
                                                    <div className="h-4 bg-white/50 dark:bg-white/5 rounded w-32 border border-white/30 dark:border-white/5 animate-pulse"></div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4"><div className="h-4 bg-white/50 dark:bg-white/5 rounded w-40 border border-white/30 dark:border-white/5 animate-pulse"></div></td>
                                            <td className="px-6 py-4"><div className="h-4 bg-white/50 dark:bg-white/5 rounded w-32 border border-white/30 dark:border-white/5 animate-pulse"></div></td>
                                            <td className="px-6 py-4"><div className="h-6 bg-white/50 dark:bg-white/5 rounded-full w-20 border border-white/30 dark:border-white/5 animate-pulse"></div></td>
                                            <td className="px-6 py-4"><div className="h-4 bg-white/50 dark:bg-white/5 rounded w-24 border border-white/30 dark:border-white/5 animate-pulse"></div></td>
                                            <td className="px-6 py-4"><div className="h-4 bg-white/50 dark:bg-white/5 rounded w-12 ml-auto border border-white/30 dark:border-white/5 animate-pulse"></div></td>
                                        </tr>
                                    ))
                                ) : users.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                            <p className="text-lg font-medium text-gray-700 mb-1">Aucun utilisateur trouvé</p>
                                            <p className="text-sm text-gray-500 mb-4">
                                                {searchTerm || selectedOrg !== 'all' || selectedRole !== 'all'
                                                    ? 'Aucun résultat ne correspond à vos critères'
                                                    : 'Commencez par inviter des utilisateurs'}
                                            </p>
                                            {(searchTerm || selectedOrg !== 'all' || selectedRole !== 'all') && (
                                            <button
                                                    onClick={resetFilters}
                                                    className="text-primary-600 hover:text-primary-700 font-medium"
                                                >
                                                    Effacer les filtres
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((user, index) => {
                                        const roleBadge = getRoleBadge(user.role);
                                        const RoleIcon = roleBadge.icon;
                                        
                                        return (
                                            <motion.tr
                                                key={user.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="hover:bg-white/40 dark:hover:bg-white/5 transition-colors group"
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm group-hover:scale-110 transition-transform">
                                                            {user.full_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                                                        </div>
                                                        <span className="font-medium text-gray-800 dark:text-gray-200">
                                                            {escapeText(untrusted(user.full_name || 'Sans nom'))}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">
                                                    {escapeText(untrusted(user.email))}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <Building2 className="w-4 h-4 text-gray-400" />
                                                        <span className="text-sm text-gray-600">
                                                            {user.organizations?.name 
                                                                ? escapeText(untrusted(user.organizations.name))
                                                                : '—'
                                                            }
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${roleBadge.bg} ${roleBadge.text} shadow-sm`}>
                                                        <RoleIcon className="w-3 h-3" />
                                                        {roleBadge.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                                        <Calendar className="w-4 h-4" />
                                                        {new Date(user.created_at).toLocaleDateString('fr-FR')}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right relative">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <motion.button
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            onClick={() => handleUserAction(user, 'view')}
                                                            className="p-2 hover:bg-white/60 dark:hover:bg-white/5 rounded-xl transition-colors text-primary-600 dark:text-primary-400 opacity-0 group-hover:opacity-100 border border-transparent hover:border-white/50 dark:hover:border-white/5"
                                                            title="Voir détails"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </motion.button>
                                                        <motion.button
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            onClick={() => handleUserAction(user, 'edit')}
                                                            className="p-2 hover:bg-white/60 dark:hover:bg-white/5 rounded-xl transition-colors text-primary-600 dark:text-primary-400 opacity-0 group-hover:opacity-100 border border-transparent hover:border-white/50 dark:hover:border-white/5"
                                                            title="Modifier"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </motion.button>
                                                        <div className="relative">
                                                            <motion.button
                                                                whileHover={{ scale: 1.1 }}
                                                                whileTap={{ scale: 0.9 }}
                                                                onClick={() => setShowActions(showActions === user.id ? null : user.id)}
                                                                className="p-2 hover:bg-white/60 dark:hover:bg-white/5 rounded-xl transition-colors border border-transparent hover:border-white/50 dark:hover:border-white/5"
                                                            >
                                                                <MoreVertical className="w-4 h-4 text-gray-500" />
                                                            </motion.button>
                                                            <AnimatePresence>
                                                                {showActions === user.id && (
                                                                    <motion.div
                                                                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                                                        className="absolute right-0 mt-2 w-48 bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl rounded-2xl shadow-lg border border-white/50 dark:border-white/5 py-1.5 z-10"
                                                                    >
                                                                        <button
                                                                            onClick={() => handleUserAction(user, 'edit')}
                                                                            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-white/10 hover:text-primary-600 dark:hover:text-primary-400 flex items-center gap-2 transition-colors"
                                                                        >
                                                                            <Edit className="w-4 h-4" />
                                                                            Modifier le rôle
                                                                        </button>
                                                                        <button
                                                                            onClick={() => startImpersonation(user.id)}
                                                                            className="w-full px-4 py-2 text-left text-sm text-blue-600 dark:text-blue-400 hover:bg-white/50 dark:hover:bg-white/10 flex items-center gap-2 transition-colors"
                                                                        >
                                                                            <Eye className="w-4 h-4" />
                                                                            Voir comme l'utilisateur
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleUserAction(user, 'suspend')}
                                                                            className="w-full px-4 py-2 text-left text-sm text-orange-600 dark:text-orange-400 hover:bg-white/50 dark:hover:bg-white/10 flex items-center gap-2 transition-colors"
                                                                        >
                                                                            <UserX className="w-4 h-4" />
                                                                            Suspendre
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleUserAction(user, 'delete')}
                                                                            className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-white/50 dark:hover:bg-white/10 flex items-center gap-2 transition-colors"
                                                                        >
                                                                            <Trash2 className="w-4 h-4" />
                                                                            Supprimer
                                                                        </button>
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="px-6 py-4 border-t border-white/40 dark:border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Affichage de {((page - 1) * itemsPerPage) + 1} à {Math.min(page * itemsPerPage, totalCount)} sur {totalCount} utilisateurs
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-2 border border-white/50 dark:border-white/5 rounded-xl hover:bg-white/50 dark:hover:bg-white/5 bg-white/40 dark:bg-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                
                                <div className="flex gap-1">
                                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                                        let pageNum = page;
                                        if (totalPages <= 5) {
                                            pageNum = i + 1;
                                        } else if (page <= 3) {
                                            pageNum = i + 1;
                                        } else if (page >= totalPages - 2) {
                                            pageNum = totalPages - 4 + i;
                                        } else {
                                            pageNum = page - 2 + i;
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
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    )}
                </motion.div>

                {/* Note de sécurité */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-center py-4"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 dark:bg-slate-900/40 backdrop-blur-sm rounded-full border border-gray-200 dark:border-gray-800 text-xs text-gray-400 dark:text-gray-500">
                        <Shield className="w-3.5 h-3.5 text-primary-400" />
                        <span>Données protégées par RLS • Actions journalisées</span>
                    </div>
                </motion.div>
            </motion.div>

            {/* Modal d'invitation */}
            <AnimatePresence>
                {showInviteModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                        onClick={(e) => e.target === e.currentTarget && setShowInviteModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-3xl p-6 max-w-md w-full border border-white/50 dark:border-white/10 shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Inviter un utilisateur</h3>
                            <form onSubmit={handleInvite} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                                    <input
                                        type="email"
                                        required
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        className="w-full px-4 py-2 border border-white/50 dark:border-white/10 rounded-xl focus:border-primary-400 focus:ring-4 focus:ring-primary-100/50 bg-white/50 dark:bg-slate-800/50 dark:text-white transition-all shadow-sm"
                                        placeholder="email@exemple.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rôle</label>
                                    <select
                                        value={inviteRole}
                                        onChange={(e) => setInviteRole(e.target.value)}
                                        className="w-full px-4 py-2 border border-white/50 dark:border-white/10 rounded-xl focus:border-primary-400 focus:ring-4 focus:ring-primary-100/50 bg-white/50 dark:bg-slate-800/50 dark:text-white transition-all shadow-sm"
                                    >
                                        <option value="student">Étudiant</option>
                                        <option value="org_admin">Admin</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Organisation</label>
                                    <select
                                        value={inviteOrg}
                                        onChange={(e) => setInviteOrg(e.target.value)}
                                        className="w-full px-4 py-2 border border-white/50 dark:border-white/10 rounded-xl focus:border-primary-400 focus:ring-4 focus:ring-primary-100/50 bg-white/50 dark:bg-slate-800/50 dark:text-white transition-all shadow-sm"
                                        required
                                    >
                                        <option value="">Sélectionner une organisation</option>
                                        {organizations.map(org => (
                                            <option key={org.id} value={org.id}>
                                                {escapeText(untrusted(org.name))}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowInviteModal(false)}
                                        className="flex-1 px-4 py-2.5 border border-white/50 dark:border-white/10 bg-white/40 dark:bg-white/5 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-white/10 transition-colors font-medium"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={inviting}
                                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 font-medium"
                                    >
                                        {inviting ? 'Envoi...' : 'Inviter'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal de confirmation pour suspension/suppression */}
            <AnimatePresence>
                {actionUser && actionType && (
                    <ConfirmationModal
                        isOpen={!!actionUser}
                        onClose={() => setActionUser(null)}
                        onConfirm={actionType === 'delete' ? handleDelete : handleSuspend}
                        title={
                            actionType === 'suspend' ? 'Suspendre l\'utilisateur' :
                            actionType === 'unsuspend' ? 'Réactiver l\'utilisateur' :
                            'Supprimer l\'utilisateur'
                        }
                        message={
                            actionType === 'delete'
                                ? 'Cette action est irréversible. L\'utilisateur sera définitivement supprimé et ne pourra plus se connecter.'
                                : actionType === 'suspend'
                                ? 'L\'utilisateur ne pourra plus se connecter jusqu\'à sa réactivation.'
                                : 'L\'utilisateur pourra à nouveau se connecter.'
                        }
                        confirmText={
                            actionType === 'suspend' ? 'Suspendre' :
                            actionType === 'unsuspend' ? 'Réactiver' : 'Supprimer'
                        }
                        cancelText="Annuler"
                        type={actionType === 'delete' ? 'danger' : 'warning'}
                    />
                )}
            </AnimatePresence>

            <UserActionModal
                isOpen={showUserModal}
                onClose={() => {
                    setShowUserModal(false);
                    setSelectedUser(null);
                }}
                user={selectedUser}
                action={modalAction}
                onSuccess={fetchUsers}
            />
        </MainLayout>
    );
}