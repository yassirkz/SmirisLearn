import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Search, Filter, X, ChevronLeft, ChevronRight,
    Building2, Mail, Calendar, MoreVertical, Eye,
    Edit, Trash2, Shield, Award, UserPlus, Download,
    RefreshCw, Sparkles, AlertCircle, CheckCircle,
    UserCog, UserX, UserCheck, Clock, Zap
} from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { untrusted, escapeText } from '../../utils/security';
import UserActionModal from '../../components/super-admin/UserActionModal';

export default function SuperAdminUsers() {
    const { user } = useAuth();
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

    // Modal
    const [showUserModal, setShowUserModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [modalAction, setModalAction] = useState('view'); // 'view', 'edit', 'delete'
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        fetchUsers();
        fetchOrganizations();
    }, [page, searchTerm, selectedOrg, selectedRole]);

    // ============================================
    // Récupérer les organisations (pour le filtre)
    // ============================================
    const fetchOrganizations = async () => {
        try {
            const { data, error } = await supabase
                .from('organizations')
                .select('id, name')
                .order('name');

            if (error) throw error;
            setOrganizations(data || []);
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
            // Requête pour le comptage total
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

            // Requête pour les données
            let dataQuery = supabase
                .from('profiles')
                .select(`
                    *,
                    organizations (
                        name
                    )
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

            // Pagination
            const from = (page - 1) * itemsPerPage;
            const to = from + itemsPerPage - 1;
            dataQuery = dataQuery.range(from, to);

            const { data, error } = await dataQuery;
            if (error) throw error;

            // Calculer les stats globales
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
                bg: 'bg-gradient-to-r from-red-500 to-pink-500',
                text: 'text-white',
                label: 'Super Admin',
                icon: Shield
            },
            org_admin: {
                bg: 'bg-gradient-to-r from-purple-500 to-indigo-500',
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
    // Gérer les actions sur un utilisateur
    // ============================================
    const handleUserAction = (user, action) => {
        if (action === 'suspend') {
            alert('La suspension de compte sera bientôt disponible.');
            setShowActions(null);
            return;
        }

        setSelectedUser(user);
        setModalAction(action);
        setShowUserModal(true);
        setShowActions(null);
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
                {/* En-tête */}
                <div className="relative">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-4 -right-4"
                    >
                        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-bl-2xl rounded-tr-2xl text-xs font-bold shadow-lg flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            Gestion des utilisateurs
                        </div>
                    </motion.div>

                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                            <Users className="w-8 h-8 text-purple-600" />
                            Utilisateurs
                        </h1>
                        <p className="text-gray-500 mt-1">
                            Gérez tous les utilisateurs de la plateforme
                        </p>
                    </div>
                </div>

                {/* Cartes de statistiques */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { label: 'Total utilisateurs', value: stats.total, icon: Users, color: 'from-blue-500 to-blue-600', bg: 'bg-blue-50' },
                        { label: 'Administrateurs', value: stats.admins, icon: UserCog, color: 'from-purple-500 to-purple-600', bg: 'bg-purple-50' },
                        { label: 'Étudiants', value: stats.students, icon: UserCheck, color: 'from-green-500 to-green-600', bg: 'bg-green-50' },
                        { label: 'Nouveaux ce mois', value: stats.newThisMonth, icon: Zap, color: 'from-orange-500 to-orange-600', bg: 'bg-orange-50' }
                    ].map((card, index) => (
                        <motion.div
                            key={card.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            whileHover={{ y: -5 }}
                            className={`${card.bg} rounded-2xl p-6 shadow-lg border border-white/50 backdrop-blur-sm relative overflow-hidden group`}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                            
                            <div className="relative flex items-start justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">{card.label}</p>
                                    <p className="text-3xl font-bold text-gray-800">{card.value}</p>
                                </div>
                                <div className={`p-3 bg-gradient-to-br ${card.color} rounded-xl shadow-lg group-hover:scale-110 transition-transform`}>
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
                    className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-purple-100"
                >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <Filter className="w-5 h-5 text-purple-600" />
                            <h2 className="text-lg font-semibold text-gray-800">Filtres</h2>
                            {(searchTerm || selectedOrg !== 'all' || selectedRole !== 'all') && (
                                <button
                                    onClick={resetFilters}
                                    className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1"
                                >
                                    <X className="w-3 h-3" />
                                    Réinitialiser
                                </button>
                            )}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 flex-1 lg:justify-end">
                            {/* Barre de recherche */}
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Rechercher par nom ou email..."
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setPage(1);
                                    }}
                                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all"
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {/* Filtre par organisation */}
                            <select
                                value={selectedOrg}
                                onChange={(e) => {
                                    setSelectedOrg(e.target.value);
                                    setPage(1);
                                }}
                                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-100 bg-white min-w-[200px]"
                            >
                                <option value="all">Toutes les entreprises</option>
                                {organizations.map(org => (
                                    <option key={org.id} value={org.id}>
                                        {escapeText(untrusted(org.name))}
                                    </option>
                                ))}
                            </select>

                            {/* Filtre par rôle */}
                            <select
                                value={selectedRole}
                                onChange={(e) => {
                                    setSelectedRole(e.target.value);
                                    setPage(1);
                                }}
                                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-100 bg-white min-w-[150px]"
                            >
                                <option value="all">Tous les rôles</option>
                                <option value="super_admin">Super Admin</option>
                                <option value="org_admin">Admin</option>
                                <option value="student">Étudiant</option>
                            </select>

                            {/* Bouton rafraîchir */}
                            <motion.button
                                whileHover={{ rotate: 180 }}
                                transition={{ duration: 0.3 }}
                                onClick={fetchUsers}
                                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
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
                                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {exporting ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Download className="w-4 h-4" />
                                )}
                                <span>{exporting ? 'Exportation...' : 'Exporter'}</span>
                            </motion.button>
                        </div>
                    </div>
                </motion.div>

                {/* Tableau des utilisateurs */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-purple-100 overflow-hidden"
                >
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gradient-to-r from-purple-50 to-pink-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Utilisateur</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Email</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Entreprise</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Rôle</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Inscription</th>
                                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    // Skeleton loader
                                    [...Array(5)].map((_, i) => (
                                        <tr key={i}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                                                    <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-40 animate-pulse"></div></td>
                                            <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div></td>
                                            <td className="px-6 py-4"><div className="h-6 bg-gray-200 rounded-full w-20 animate-pulse"></div></td>
                                            <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div></td>
                                            <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-12 ml-auto animate-pulse"></div></td>
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
                                                    className="text-purple-600 hover:text-purple-700 font-medium"
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
                                                className="hover:bg-purple-50/50 transition-colors group"
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm group-hover:scale-110 transition-transform">
                                                            {user.full_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                                                        </div>
                                                        <span className="font-medium text-gray-800">
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
                                                            className="p-2 hover:bg-blue-100 rounded-lg transition-colors text-blue-600 opacity-0 group-hover:opacity-100"
                                                            title="Voir détails"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </motion.button>
                                                        <motion.button
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            onClick={() => handleUserAction(user, 'edit')}
                                                            className="p-2 hover:bg-purple-100 rounded-lg transition-colors text-purple-600 opacity-0 group-hover:opacity-100"
                                                            title="Modifier"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </motion.button>
                                                        <div className="relative">
                                                            <motion.button
                                                                whileHover={{ scale: 1.1 }}
                                                                whileTap={{ scale: 0.9 }}
                                                                onClick={() => setShowActions(showActions === user.id ? null : user.id)}
                                                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                                            >
                                                                <MoreVertical className="w-4 h-4 text-gray-500" />
                                                            </motion.button>
                                                            <AnimatePresence>
                                                                {showActions === user.id && (
                                                                    <motion.div
                                                                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                                                        className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-10"
                                                                    >
                                                                        <button
                                                                            onClick={() => handleUserAction(user, 'edit')}
                                                                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 flex items-center gap-2"
                                                                        >
                                                                            <Edit className="w-4 h-4" />
                                                                            Modifier le rôle
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleUserAction(user, 'suspend')}
                                                                            className="w-full px-4 py-2 text-left text-sm text-orange-600 hover:bg-orange-50 flex items-center gap-2"
                                                                        >
                                                                            <UserX className="w-4 h-4" />
                                                                            Suspendre
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleUserAction(user, 'delete')}
                                                                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
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
                        <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <p className="text-sm text-gray-600">
                                Affichage de {((page - 1) * itemsPerPage) + 1} à {Math.min(page * itemsPerPage, totalCount)} sur {totalCount} utilisateurs
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                                                className={`w-10 h-10 rounded-lg transition-colors ${
                                                    page === pageNum
                                                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                                                        : 'hover:bg-gray-50 text-gray-600'
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
                                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                    className="text-center text-xs text-gray-400 flex items-center justify-center gap-1"
                >
                    <Shield className="w-3 h-3" />
                    <span>Données protégées par RLS • Actions journalisées</span>
                </motion.div>
            </motion.div>

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