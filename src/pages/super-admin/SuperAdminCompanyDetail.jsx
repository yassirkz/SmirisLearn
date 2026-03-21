import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2, Users, Video, Award, TrendingUp,
    Calendar, ArrowLeft, Edit, Mail, MoreVertical,
    CheckCircle, AlertCircle, Clock, Shield,
    Download, Filter, Search, X, Sparkles,
    PieChart, BarChart3, Activity, UserPlus,
    Eye, Trash2, Zap, LayoutDashboard,
    Gauge, AlertTriangle, HardDrive
} from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { useMemberInvitation } from '../../hooks/useMemberInvitation';
import { untrusted, escapeText } from '../../utils/security';
import EditCompanyModal from '../../components/super-admin/EditCompanyModal';
import ConfirmationModal from '../../components/ui/ConfirmationModal';

export default function SuperAdminCompanyDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { success, error: showError } = useToast();
    const { createInvitation, loading: inviting } = useMemberInvitation();

    const [loading, setLoading] = useState(true);
    const [company, setCompany] = useState(null);
    const [users, setUsers] = useState([]);
    const [stats, setStats] = useState({
        members: { current: 0, previous: 0, growth: 0 },
        videos: { current: 0, previous: 0, growth: 0 },
        quizzes: { current: 0, previous: 0, growth: 0 },
        completion: { current: 0, previous: 0, growth: 0 }
    });
    const [recentVideos, setRecentVideos] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('all');
    const [showActions, setShowActions] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [limits, setLimits] = useState(null);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('student');
    const [actionUser, setActionUser] = useState(null); // pour confirmation de retrait
    const [roleChangeUser, setRoleChangeUser] = useState(null); // pour modal de changement de rôle
    const [newRole, setNewRole] = useState('student');
    const [viewUser, setViewUser] = useState(null); // pour modal de détails

    useEffect(() => {
        if (id) {
            fetchCompanyDetails();
            fetchOrganizationLimits();
        }
    }, [id]);

    const fetchOrganizationLimits = async () => {
        try {
            const { data, error } = await supabase
                .rpc('check_organization_limits_full', {
                    p_org_id: id
                });
            if (error) throw error;
            setLimits(data);
        } catch (error) {
            console.error('Erreur chargement limites:', error);
        }
    };

    const fetchCompanyDetails = async () => {
        setLoading(true);
        try {
            // ============================================
            // 1. Récupérer les infos de l'entreprise (protégé par RLS)
            // ============================================
            const { data: companyData, error: companyError } = await supabase
                .from('organizations')
                .select('*')
                .eq('id', id)
                .single();

            if (companyError) throw companyError;
            setCompany(companyData);

            // ============================================
            // 2. Date du mois dernier pour comparaison
            // ============================================
            const lastMonth = new Date();
            lastMonth.setMonth(lastMonth.getMonth() - 1);

            // ============================================
            // 3. Compter les membres (actuels vs mois dernier)
            // ============================================
            const [membersCurrent, membersPrevious] = await Promise.all([
                supabase.from('profiles')
                    .select('*', { count: 'exact', head: true })
                    .eq('organization_id', id),
                supabase.from('profiles')
                    .select('*', { count: 'exact', head: true })
                    .eq('organization_id', id)
                    .lt('created_at', lastMonth.toISOString())
            ]);

            // ============================================
            // 4. Récupérer les piliers de l'entreprise
            // ============================================
            const { data: pillars } = await supabase
                .from('pillars')
                .select('id, name')
                .eq('organization_id', id);

            let videosCurrent = 0, videosPrevious = 0;
            let quizzesCurrent = 0, quizzesPrevious = 0;

            if (pillars && pillars.length > 0) {
                const pillarIds = pillars.map(p => p.id);

                // Compter les vidéos
                const [videosRes, videosPrevRes] = await Promise.all([
                    supabase.from('videos')
                        .select('*', { count: 'exact', head: true })
                        .in('pillar_id', pillarIds),
                    supabase.from('videos')
                        .select('*', { count: 'exact', head: true })
                        .in('pillar_id', pillarIds)
                        .lt('created_at', lastMonth.toISOString())
                ]);

                videosCurrent = videosRes.count || 0;
                videosPrevious = videosPrevRes.count || 0;

                // Compter les quiz
                if (videosCurrent > 0) {
                    const { data: videos } = await supabase
                        .from('videos')
                        .select('id')
                        .in('pillar_id', pillarIds);

                    const videoIds = videos?.map(v => v.id) || [];

                    const [quizzesRes, quizzesPrevRes] = await Promise.all([
                        supabase.from('quizzes')
                            .select('*', { count: 'exact', head: true })
                            .in('video_id', videoIds),
                        supabase.from('quizzes')
                            .select('*', { count: 'exact', head: true })
                            .in('video_id', videoIds)
                            .lt('created_at', lastMonth.toISOString())
                    ]);

                    quizzesCurrent = quizzesRes.count || 0;
                    quizzesPrevious = quizzesPrevRes.count || 0;
                }
            }

            // ============================================
            // 5. Récupérer les utilisateurs de l'entreprise
            // ============================================
            const { data: usersData, error: usersError } = await supabase
                .from('profiles')
                .select('*')
                .eq('organization_id', id)
                .order('created_at', { ascending: false });

            if (!usersError) {
                setUsers(usersData || []);
            }

            // ============================================
            // 6. Récupérer les dernières vidéos
            // ============================================
            if (pillars && pillars.length > 0) {
                const { data: videos } = await supabase
                    .from('videos')
                    .select('title, created_at, pillar_id')
                    .in('pillar_id', pillars.map(p => p.id))
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (videos) {
                    setRecentVideos(videos.map(v => ({
                        title: escapeText(untrusted(v.title)),
                        time: new Date(v.created_at).toLocaleDateString('fr-FR'),
                        pillar: pillars.find(p => p.id === v.pillar_id)?.name || 'Inconnu'
                    })));
                }
            }

            // ============================================
            // 7. Calculer le taux de complétion moyen (Fix 400 error by splitting queries)
            // ============================================
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id')
                .eq('organization_id', id)
                .eq('role', 'student');

            let avgCompletion = 0;
            let totalVideos = videosCurrent || 1;

            if (profiles && profiles.length > 0) {
                const userIds = profiles.map(p => p.id);
                const { data: progressData } = await supabase
                    .from('user_progress')
                    .select('user_id, watched')
                    .in('user_id', userIds);

                const totalCompletion = profiles.reduce((acc, profile) => {
                    const userProgress = progressData?.filter(p => p.user_id === profile.id) || [];
                    const watchedCount = userProgress.filter(p => p.watched).length || 0;
                    return acc + (watchedCount / totalVideos * 100);
                }, 0);
                avgCompletion = Math.round(totalCompletion / profiles.length);
            }

            // ============================================
            // 8. Calculer les pourcentages de croissance
            // ============================================
            const calculateGrowth = (current, previous) => {
                if (previous === 0) return current > 0 ? 100 : 0;
                return Math.round(((current - previous) / previous) * 100);
            };

            setStats({
                members: {
                    current: membersCurrent.count || 0,
                    previous: membersPrevious.count || 0,
                    growth: calculateGrowth(membersCurrent.count || 0, membersPrevious.count || 0)
                },
                videos: {
                    current: videosCurrent,
                    previous: videosPrevious,
                    growth: calculateGrowth(videosCurrent, videosPrevious)
                },
                quizzes: {
                    current: quizzesCurrent,
                    previous: quizzesPrevious,
                    growth: calculateGrowth(quizzesCurrent, quizzesPrevious)
                },
                completion: {
                    current: avgCompletion,
                    previous: 0,
                    growth: 0
                }
            });

        } catch (error) {
            console.error('Erreur chargement détails:', error);
        } finally {
            setLoading(false);
        }
    };

    // ============================================
    // Actions utilisateur
    // ============================================
    const handleRoleChange = async () => {
        if (!roleChangeUser) return;
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role: newRole })
                .eq('id', roleChangeUser.id);
            if (error) throw error;
            success('Rôle mis à jour');
            setRoleChangeUser(null);
            fetchCompanyDetails();
        } catch (err) {
            showError(err.message);
        }
    };

    const handleRemoveFromOrg = async () => {
        if (!actionUser) return;
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ organization_id: null, role: 'student' })
                .eq('id', actionUser.id);
            if (error) throw error;
            success('Utilisateur retiré de l\'organisation');
            setActionUser(null);
            fetchCompanyDetails();
        } catch (err) {
            showError(err.message);
        }
    };

    const handleInvite = async (e) => {
        e.preventDefault();
        if (!company) return;
        try {
            await createInvitation({
                email: inviteEmail,
                role: inviteRole,
                organization_id: company.id,
                invited_by: user.id,
            });
            success('Invitation envoyée');
            setShowInviteModal(false);
            setInviteEmail('');
            setInviteRole('student');
        } catch (err) {
            showError(err.message);
        }
    };

    // ============================================
    // Filtrer les utilisateurs
    // ============================================
    const filteredUsers = users.filter(user => {
        const matchesSearch =
            user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = filterRole === 'all' || user.role === filterRole;
        return matchesSearch && matchesRole;
    });

    // ============================================
    // Obtenir le badge du plan
    // ============================================
    const getPlanBadge = (plan) => {
        const plans = {
            free: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300', label: 'Gratuit' },
            starter: { bg: 'bg-primary-100 dark:bg-primary-900/30', text: 'text-primary-700 dark:text-primary-300', label: 'Starter' },
            business: { bg: 'bg-accent-100 dark:bg-accent-900/30', text: 'text-accent-700 dark:text-accent-300', label: 'Business' }
        };
        return plans[plan] || plans.free;
    };

    // ============================================
    // Obtenir le badge du rôle
    // ============================================
    const getRoleBadge = (role) => {
        const roles = {
            super_admin: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', label: 'Super Admin' },
            org_admin: { bg: 'bg-primary-100 dark:bg-primary-900/30', text: 'text-primary-700 dark:text-primary-300', label: 'Admin' },
            student: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', label: 'Étudiant' }
        };
        return roles[role] || roles.student;
    };

    if (loading) {
        return (
            <MainLayout>
                <div className="min-h-[60vh] flex items-center justify-center">
                    <div className="relative">
                        <div className="w-20 h-20 border-4 border-primary-200 dark:border-primary-800 rounded-full"></div>
                        <div className="absolute top-0 left-0 w-20 h-20 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="mt-4 text-gray-500 dark:text-gray-400">Chargement des détails...</p>
                    </div>
                </div>
            </MainLayout>
        );
    }

    if (!company) {
        return (
            <MainLayout>
                <div className="text-center py-12">
                    <Building2 className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Entreprise non trouvée</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">L'entreprise que vous recherchez n'existe pas.</p>
                    <button
                        onClick={() => navigate('/super-admin/companies')}
                        className="px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
                    >
                        Retour à la liste
                    </button>
                </div>
            </MainLayout>
        );
    }

    const planBadge = getPlanBadge(company.plan_type);
    const daysLeft = company.trial_ends_at
        ? Math.max(0, Math.ceil((new Date(company.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24)))
        : 0;

    return (
        <MainLayout>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-8"
            >
                {/* En-tête avec navigation */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => navigate('/super-admin/companies')}
                        className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors group"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span>Retour aux entreprises</span>
                    </button>

                    <div className="flex items-center gap-3">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => navigate(`/admin?orgId=${company.id}`)}
                            className="flex items-center gap-2 px-4 py-2 bg-accent-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all"
                        >
                            <LayoutDashboard className="w-4 h-4" />
                            <span>Voir Dashboard</span>
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setShowEditModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:border-blue-300 dark:hover:border-blue-600 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-sm"
                        >
                            <Edit className="w-4 h-4" />
                            <span>Modifier</span>
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                                const admin = users.find(u => u.role === 'org_admin');
                                if (admin?.email) {
                                    window.location.href = `mailto:${admin.email}?subject=Question concernant ${company.name}`;
                                } else {
                                    alert("Aucun email d'administrateur trouvé pour cette entreprise.");
                                }
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:border-primary-300 dark:hover:border-primary-600 hover:text-primary-600 dark:hover:text-primary-400 transition-all shadow-sm"
                        >
                            <Mail className="w-4 h-4" />
                            <span>Contacter</span>
                        </motion.button>
                    </div>
                </div>

                {/* En-tête entreprise */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-primary-100 dark:border-gray-700 relative overflow-hidden"
                >
                    {/* Éléments décoratifs */}
                    <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-primary-400 to-accent-400 rounded-full opacity-20 blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-br from-green-400 to-emerald-400 rounded-full opacity-20 blur-3xl pointer-events-none" />

                    {/* Badge premium */}
                    <div className="absolute top-4 right-4">
                        <div className="bg-gradient-to-r from-primary-600 to-accent-600 text-white px-4 py-2 rounded-bl-2xl rounded-tr-2xl text-xs font-bold shadow-lg flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            {company.plan_type === 'starter' ? 'Période d\'essai' : 'Plan actif'}
                        </div>
                    </div>

                    <div className="relative flex flex-col md:flex-row md:items-center gap-6">
                        {/* Logo */}
                        <div className="w-24 h-24 bg-gradient-to-br from-primary-500 to-accent-600 rounded-2xl flex items-center justify-center shadow-xl">
                            <span className="text-4xl font-bold text-white">
                                {company.name?.charAt(0).toUpperCase()}
                            </span>
                        </div>

                        {/* Infos */}
                        <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-3 mb-2">
                                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
                                    {escapeText(untrusted(company.name))}
                                </h1>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${planBadge.bg} ${planBadge.text}`}>
                                    {planBadge.label}
                                </span>
                                {company.subscription_status === 'trial' && (
                                    <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-medium flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        Essai {daysLeft}j
                                    </span>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-6 text-sm text-gray-600 dark:text-gray-400">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                                    <span>Créée le {new Date(company.created_at).toLocaleDateString('fr-FR')}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-accent-600 dark:text-accent-400" />
                                    <span>{users.length} utilisateur{users.length > 1 ? 's' : ''}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-green-600 dark:text-green-400" />
                                    <span>ID: {company.id.substring(0, 8)}...</span>
                                </div>
                            </div>
                        </div>

                        {/* Stats rapides */}
                        <div className="flex gap-4">
                            <div className="text-center">
                                <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">{stats.members.current}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Membres</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-accent-600 dark:text-accent-400">{stats.videos.current}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Vidéos</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.quizzes.current}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Quiz</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Cartes de statistiques */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { label: 'Membres', data: stats.members, icon: Users, color: 'from-primary-500 to-primary-600', bg: 'bg-primary-50 dark:bg-primary-900/30', description: 'Total utilisateurs' },
                        { label: 'Vidéos', data: stats.videos, icon: Video, color: 'from-accent-500 to-accent-600', bg: 'bg-accent-50 dark:bg-accent-900/30', description: 'Contenu disponible' },
                        { label: 'Quiz', data: stats.quizzes, icon: Award, color: 'from-accent-500 to-pink-600', bg: 'bg-pink-50 dark:bg-pink-900/30', description: 'Évaluations' },
                        { label: 'Score moyen', data: stats.completion, icon: TrendingUp, color: 'from-green-500 to-green-600', bg: 'bg-green-50 dark:bg-green-900/30', description: 'Moyenne quiz' }
                    ].map((card, index) => {
                        const isPositive = card.data.growth >= 0;
                        const value = card.label === 'Score moyen' ? `${card.data.current}%` : card.data.current;
                        const progress = card.label === 'Score moyen' ? card.data.current : Math.min((card.data.current / 50) * 100, 100);
                        return (
                            <motion.div
                                key={card.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                whileHover={{ y: -5 }}
                                className={`${card.bg} rounded-2xl p-6 shadow-lg border border-white/50 dark:border-gray-700 backdrop-blur-sm relative overflow-hidden group`}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-gray-700/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

                                <div className="relative flex items-start justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{card.label}</p>
                                        <p className="text-3xl font-bold text-gray-800 dark:text-white">{value}</p>
                                        <p className={`text-xs mt-2 flex items-center gap-1 ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                            {isPositive ? '↑' : '↓'} {Math.abs(card.data.growth)}%
                                            <span className="text-gray-400 dark:text-gray-500 font-normal ml-1">vs mois dernier</span>
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{card.description}</p>
                                    </div>
                                    <div className={`p-3 bg-gradient-to-br ${card.color} rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                        <card.icon className="w-6 h-6 text-white" />
                                    </div>
                                </div>

                                <div className="mt-4 h-1.5 bg-gray-200/50 dark:bg-gray-700/50 rounded-full overflow-hidden relative">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                        transition={{ delay: 0.5 + index * 0.1, duration: 1 }}
                                        className={`h-full bg-gradient-to-r ${card.color} rounded-full relative`}
                                    >
                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white border border-current rounded-full shadow-sm" style={{ color: card.color.split(' ')[1].replace('to-', '') }} />
                                    </motion.div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Graphiques et activités */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Graphique d'évolution (placeholder) */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-primary-100 dark:border-gray-700"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                                Évolution des membres
                            </h2>
                            <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                                30 derniers jours
                            </span>
                        </div>
                        <div className="h-64 flex items-center justify-center bg-gradient-to-br from-primary-50 to-accent-50 dark:from-gray-700 dark:to-gray-600 rounded-xl">
                            <p className="text-gray-400 dark:text-gray-500">Graphique à venir</p>
                        </div>
                    </motion.div>

                    {/* Dernières vidéos */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-primary-100 dark:border-gray-700"
                    >
                        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                            <Video className="w-5 h-5 text-accent-600 dark:text-accent-400" />
                            Dernières vidéos
                        </h2>
                        {recentVideos.length === 0 ? (
                            <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                                <Video className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p>Aucune vidéo récente</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {recentVideos.map((video, index) => (
                                    <div key={index} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
                                        <div className="w-8 h-8 bg-gradient-to-br from-accent-500 to-primary-600 rounded-lg flex items-center justify-center">
                                            <Video className="w-4 h-4 text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{video.title}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{video.time} • {video.pillar}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                </div>

                {limits && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                        className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-primary-100 dark:border-gray-700"
                    >
                        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                            <Gauge className="w-5 h-5 text-accent-600 dark:text-accent-400" />
                            Limites du plan {limits.plan_type}
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Utilisateurs */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Utilisateurs</span>
                                </div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-500 dark:text-gray-400">Utilisés</span>
                                    <span className={limits.can_add_users ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                        {limits.current_usage.users} / {limits.limits?.users === -1 ? '∞' : limits.limits?.users}
                                    </span>
                                </div>
                                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary-600 rounded-full transition-all duration-500"
                                        style={{
                                            width: limits.limits?.users === -1
                                                ? '100%'
                                                : `${(limits.current_usage.users / limits.limits?.users) * 100}%`
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Vidéos */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Video className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Vidéos</span>
                                </div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-500 dark:text-gray-400">Créées</span>
                                    <span className={limits.can_add_videos ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                        {limits.current_usage.videos} / {limits.limits?.videos === -1 ? '∞' : limits.limits?.videos}
                                    </span>
                                </div>
                                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-purple-600 rounded-full transition-all duration-500"
                                        style={{
                                            width: limits.limits?.videos === -1
                                                ? '100%'
                                                : `${(limits.current_usage.videos / limits.limits?.videos) * 100}%`
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Stockage */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <HardDrive className="w-4 h-4 text-green-600 dark:text-green-400" />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Stockage</span>
                                </div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-500 dark:text-gray-400">Utilisé</span>
                                    <span className={limits.storage_percent_used < 80 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                        {limits.storage_percent_used}%
                                    </span>
                                </div>
                                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${
                                            limits.storage_percent_used > 80 ? 'bg-red-600' : 'bg-green-600'
                                        }`}
                                        style={{ width: `${Math.min(limits.storage_percent_used, 100)}%` }}
                                    />
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {limits.current_usage.storage_mb} Mo / {limits.limits?.storage} Go
                                </p>
                            </div>
                        </div>

                        {/* Alertes */}
                        {!limits.can_add_users && (
                            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                    Limite utilisateurs atteinte. Passez à un plan supérieur pour ajouter plus de membres.
                                </p>
                            </div>
                        )}

                        {!limits.can_add_videos && (
                            <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                    Limite vidéos atteinte. Passez à un plan supérieur pour ajouter plus de contenu.
                                </p>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Liste des utilisateurs */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-primary-100 dark:border-gray-700"
                >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                        <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                            <Users className="w-5 h-5 text-accent-600 dark:text-accent-400" />
                            Utilisateurs de l'entreprise
                        </h2>

                        <div className="flex flex-col sm:flex-row gap-3">
                            {/* Barre de recherche */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Rechercher..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-all w-full sm:w-64 dark:bg-gray-700 dark:text-white"
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {/* Filtre par rôle */}
                            <select
                                value={filterRole}
                                onChange={(e) => setFilterRole(e.target.value)}
                                className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30 bg-white dark:bg-gray-700 dark:text-white"
                            >
                                <option value="all">Tous les rôles</option>
                                <option value="org_admin">Admins</option>
                                <option value="student">Étudiants</option>
                            </select>

                            {/* Bouton inviter */}
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setShowInviteModal(true)}
                                className="px-4 py-2 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                            >
                                <UserPlus className="w-4 h-4" />
                                <span>Inviter</span>
                            </motion.button>
                        </div>
                    </div>

                    {/* Tableau des utilisateurs */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Utilisateur</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rôle</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Inscription</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {filteredUsers.map((user, index) => {
                                    const roleBadge = getRoleBadge(user.role);
                                    return (
                                        <motion.tr
                                            key={user.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                                        >
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                                        {user.full_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="font-medium text-gray-800 dark:text-white">
                                                        {escapeText(untrusted(user.full_name || 'Sans nom'))}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{escapeText(untrusted(user.email))}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleBadge.bg} ${roleBadge.text}`}>
                                                    {roleBadge.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                                {new Date(user.created_at).toLocaleDateString('fr-FR')}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => setViewUser(user)}
                                                        className="p-1 hover:bg-primary-100 dark:hover:bg-primary-900/50 rounded-lg transition-colors text-primary-600 dark:text-primary-400"
                                                        title="Voir"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setRoleChangeUser(user);
                                                            setNewRole(user.role);
                                                        }}
                                                        className="p-1 hover:bg-accent-100 dark:hover:bg-accent-900/50 rounded-lg transition-colors text-accent-600 dark:text-accent-400"
                                                        title="Modifier rôle"
                                                    >
                                                        <Award className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setActionUser(user)}
                                                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg transition-colors text-red-600 dark:text-red-400"
                                                        title="Supprimer"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {filteredUsers.length === 0 && (
                            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                                <Users className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                                <p>Aucun utilisateur trouvé</p>
                                {(searchTerm || filterRole !== 'all') && (
                                    <button
                                        onClick={() => {
                                            setSearchTerm('');
                                            setFilterRole('all');
                                        }}
                                        className="mt-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                                    >
                                        Effacer les filtres
                                    </button>
                                )}
                            </div>
                        )}
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
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
                        onClick={(e) => e.target === e.currentTarget && setShowInviteModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Inviter un membre</h3>
                            <form onSubmit={handleInvite} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                                    <input
                                        type="email"
                                        required
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl focus:border-primary-400 focus:ring-4 focus:ring-primary-100 dark:focus:ring-primary-900/30 outline-none dark:bg-gray-700 dark:text-white"
                                        placeholder="email@exemple.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rôle</label>
                                    <select
                                        value={inviteRole}
                                        onChange={(e) => setInviteRole(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl focus:border-primary-400 focus:ring-4 focus:ring-primary-100 dark:focus:ring-primary-900/30 outline-none dark:bg-gray-700 dark:text-white"
                                    >
                                        <option value="student">Étudiant</option>
                                        <option value="org_admin">Admin</option>
                                    </select>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowInviteModal(false)}
                                        className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={inviting}
                                        className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-xl shadow-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                                    >
                                        {inviting ? 'Envoi...' : 'Inviter'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal de changement de rôle */}
            <AnimatePresence>
                {roleChangeUser && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
                        onClick={(e) => e.target === e.currentTarget && setRoleChangeUser(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Changer le rôle</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                Utilisateur : <span className="font-medium">{roleChangeUser.full_name || roleChangeUser.email}</span>
                            </p>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nouveau rôle</label>
                                    <select
                                        value={newRole}
                                        onChange={(e) => setNewRole(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl focus:border-primary-400 focus:ring-4 focus:ring-primary-100 dark:focus:ring-primary-900/30 outline-none dark:bg-gray-700 dark:text-white"
                                    >
                                        <option value="student">Étudiant</option>
                                        <option value="org_admin">Admin</option>
                                    </select>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setRoleChangeUser(null)}
                                        className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        onClick={handleRoleChange}
                                        className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-xl shadow-lg hover:bg-primary-700 transition-colors"
                                    >
                                        Confirmer
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal de détails utilisateur */}
            <AnimatePresence>
                {viewUser && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
                        onClick={(e) => e.target === e.currentTarget && setViewUser(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Détails de l'utilisateur</h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                        {viewUser.full_name?.charAt(0).toUpperCase() || viewUser.email?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-800 dark:text-white">{viewUser.full_name || 'Sans nom'}</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-300">{viewUser.email}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <span className="text-gray-500 dark:text-gray-400">Rôle :</span>
                                    <span className="font-medium dark:text-white">{viewUser.role === 'org_admin' ? 'Admin' : viewUser.role === 'super_admin' ? 'Super Admin' : 'Étudiant'}</span>
                                    <span className="text-gray-500 dark:text-gray-400">Inscription :</span>
                                    <span className="font-medium dark:text-white">{new Date(viewUser.created_at).toLocaleDateString('fr-FR')}</span>
                                    <span className="text-gray-500 dark:text-gray-400">ID :</span>
                                    <span className="font-medium text-xs dark:text-white">{viewUser.id}</span>
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end">
                                <button
                                    onClick={() => setViewUser(null)}
                                    className="px-6 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                >
                                    Fermer
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal de confirmation pour retrait */}
            <ConfirmationModal
                isOpen={!!actionUser}
                onClose={() => setActionUser(null)}
                onConfirm={handleRemoveFromOrg}
                title="Retirer l'utilisateur"
                message={`Êtes-vous sûr de vouloir retirer ${actionUser?.full_name || actionUser?.email} de l'organisation ? Il perdra l'accès à toutes les données.`}
                confirmText="Retirer"
                type="warning"
            />

            <EditCompanyModal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                company={company}
                onSuccess={fetchCompanyDetails}
            />
        </MainLayout>
    );
}