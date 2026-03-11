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
import { untrusted, escapeText } from '../../utils/security';
import EditCompanyModal from '../../components/super-admin/EditCompanyModal';



export default function SuperAdminCompanyDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    
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
            free: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Gratuit' },
            starter: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Starter' },
            business: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Business' }
        };
        return plans[plan] || plans.free;
    };

    // ============================================
    // Obtenir le badge du rôle
    // ============================================
    const getRoleBadge = (role) => {
        const roles = {
            super_admin: { bg: 'bg-red-100', text: 'text-red-700', label: 'Super Admin' },
            org_admin: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Admin' },
            student: { bg: 'bg-green-100', text: 'text-green-700', label: 'Étudiant' }
        };
        return roles[role] || roles.student;
    };

    if (loading) {
        return (
            <MainLayout>
                <div className="min-h-[60vh] flex items-center justify-center">
                    <div className="relative">
                        <div className="w-20 h-20 border-4 border-blue-200 rounded-full"></div>
                        <div className="absolute top-0 left-0 w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="mt-4 text-gray-500">Chargement des détails...</p>
                    </div>
                </div>
            </MainLayout>
        );
    }

    if (!company) {
        return (
            <MainLayout>
                <div className="text-center py-12">
                    <Building2 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Entreprise non trouvée</h2>
                    <p className="text-gray-500 mb-6">L'entreprise que vous recherchez n'existe pas.</p>
                    <button
                        onClick={() => navigate('/super-admin/companies')}
                        className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
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
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors group"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span>Retour aux entreprises</span>
                    </button>

                    <div className="flex items-center gap-3">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => navigate(`/admin?orgId=${company.id}`)}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all"
                        >
                            <LayoutDashboard className="w-4 h-4" />
                            <span>Voir Dashboard</span>
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setShowEditModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm"
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
                            className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm"
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
                    className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-blue-100 relative overflow-hidden"
                >
                    {/* Éléments décoratifs */}
                    <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full opacity-20 blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-br from-green-400 to-emerald-400 rounded-full opacity-20 blur-3xl pointer-events-none" />
                    
                    {/* Badge premium */}
                    <div className="absolute top-4 right-4">
                        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-bl-2xl rounded-tr-2xl text-xs font-bold shadow-lg flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            {company.plan_type === 'starter' ? 'Période d\'essai' : 'Plan actif'}
                        </div>
                    </div>

                    <div className="relative flex flex-col md:flex-row md:items-center gap-6">
                        {/* Logo */}
                        <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl">
                            <span className="text-4xl font-bold text-white">
                                {company.name?.charAt(0).toUpperCase()}
                            </span>
                        </div>

                        {/* Infos */}
                        <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-3 mb-2">
                                <h1 className="text-3xl font-bold text-gray-800">
                                    {escapeText(untrusted(company.name))}
                                </h1>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${planBadge.bg} ${planBadge.text}`}>
                                    {planBadge.label}
                                </span>
                                {company.subscription_status === 'trial' && (
                                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        Essai {daysLeft}j
                                    </span>
                                )}
                            </div>
                            
                            <div className="flex flex-wrap gap-6 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-blue-600" />
                                    <span>Créée le {new Date(company.created_at).toLocaleDateString('fr-FR')}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-purple-600" />
                                    <span>{users.length} utilisateur{users.length > 1 ? 's' : ''}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-green-600" />
                                    <span>ID: {company.id.substring(0, 8)}...</span>
                                </div>
                            </div>
                        </div>

                        {/* Stats rapides */}
                        <div className="flex gap-4">
                            <div className="text-center">
                                <p className="text-2xl font-bold text-blue-600">{stats.members.current}</p>
                                <p className="text-xs text-gray-500">Membres</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-purple-600">{stats.videos.current}</p>
                                <p className="text-xs text-gray-500">Vidéos</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-green-600">{stats.quizzes.current}</p>
                                <p className="text-xs text-gray-500">Quiz</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Cartes de statistiques */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { label: 'Membres', data: stats.members, icon: Users, color: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', description: 'Total utilisateurs' },
                        { label: 'Vidéos', data: stats.videos, icon: Video, color: 'from-purple-500 to-purple-600', bg: 'bg-purple-50', description: 'Contenu disponible' },
                        { label: 'Quiz', data: stats.quizzes, icon: Award, color: 'from-pink-500 to-pink-600', bg: 'bg-pink-50', description: 'Évaluations' },
                        { label: 'Score moyen', data: stats.completion, icon: TrendingUp, color: 'from-green-500 to-green-600', bg: 'bg-green-50', description: 'Moyenne quiz' }
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
                                className={`${card.bg} rounded-2xl p-6 shadow-lg border border-white/50 backdrop-blur-sm relative overflow-hidden group`}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                
                                <div className="relative flex items-start justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500 mb-1">{card.label}</p>
                                        <p className="text-3xl font-bold text-gray-800">{value}</p>
                                        <p className={`text-xs mt-2 flex items-center gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                            {isPositive ? '↑' : '↓'} {Math.abs(card.data.growth)}%
                                            <span className="text-gray-400 font-normal ml-1">vs mois dernier</span>
                                        </p>
                                        <p className="text-xs text-gray-500 mt-2">{card.description}</p>
                                    </div>
                                    <div className={`p-3 bg-gradient-to-br ${card.color} rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                        <card.icon className="w-6 h-6 text-white" />
                                    </div>
                                </div>

                                <div className="mt-4 h-1.5 bg-gray-200/50 rounded-full overflow-hidden relative">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                        transition={{ delay: 0.5 + index * 0.1, duration: 1 }}
                                        className={`h-full bg-gradient-to-r ${card.color} rounded-full relative`}
                                    >
                                        {/* Indicateur pointu à la fin */}
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
                        className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-lg border border-blue-100"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-blue-600" />
                                Évolution des membres
                            </h2>
                            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                                30 derniers jours
                            </span>
                        </div>
                        <div className="h-64 flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl">
                            <p className="text-gray-400">Graphique à venir</p>
                        </div>
                    </motion.div>

                    {/* Dernières vidéos */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white rounded-2xl p-6 shadow-lg border border-blue-100"
                    >
                        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <Video className="w-5 h-5 text-purple-600" />
                            Dernières vidéos
                        </h2>
                        {recentVideos.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">
                                <Video className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p>Aucune vidéo récente</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {recentVideos.map((video, index) => (
                                    <div key={index} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                                            <Video className="w-4 h-4 text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-800 truncate">{video.title}</p>
                                            <p className="text-xs text-gray-500">{video.time} • {video.pillar}</p>
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
                        className="bg-white rounded-2xl p-6 shadow-lg border border-blue-100"
                    >
                        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <Gauge className="w-5 h-5 text-purple-600" />
                            Limites du plan {limits.plan_type}
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Utilisateurs */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-blue-600" />
                                    <span className="text-sm font-medium text-gray-700">Utilisateurs</span>
                                </div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-500">Utilisés</span>
                                    <span className={limits.can_add_users ? 'text-green-600' : 'text-red-600'}>
                                        {limits.current_usage.users} / {limits.limits?.users === -1 ? '∞' : limits.limits?.users}
                                    </span>
                                </div>
                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-blue-600 rounded-full transition-all duration-500"
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
                                    <Video className="w-4 h-4 text-purple-600" />
                                    <span className="text-sm font-medium text-gray-700">Vidéos</span>
                                </div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-500">Créées</span>
                                    <span className={limits.can_add_videos ? 'text-green-600' : 'text-red-600'}>
                                        {limits.current_usage.videos} / {limits.limits?.videos === -1 ? '∞' : limits.limits?.videos}
                                    </span>
                                </div>
                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
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
                                    <HardDrive className="w-4 h-4 text-green-600" />
                                    <span className="text-sm font-medium text-gray-700">Stockage</span>
                                </div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-500">Utilisé</span>
                                    <span className={limits.storage_percent_used < 80 ? 'text-green-600' : 'text-red-600'}>
                                        {limits.storage_percent_used}%
                                    </span>
                                </div>
                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-500 ${
                                            limits.storage_percent_used > 80 ? 'bg-red-600' : 'bg-green-600'
                                        }`}
                                        style={{ width: `${Math.min(limits.storage_percent_used, 100)}%` }}
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    {limits.current_usage.storage_mb} Mo / {limits.limits?.storage} Go
                                </p>
                            </div>
                        </div>

                        {/* Alertes */}
                        {!limits.can_add_users && (
                            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                                <p className="text-sm text-yellow-700">
                                    Limite utilisateurs atteinte. Passez à un plan supérieur pour ajouter plus de membres.
                                </p>
                            </div>
                        )}

                        {!limits.can_add_videos && (
                            <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                                <p className="text-sm text-yellow-700">
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
                    className="bg-white rounded-2xl p-6 shadow-lg border border-blue-100"
                >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                            <Users className="w-5 h-5 text-indigo-600" />
                            Utilisateurs de l'entreprise
                        </h2>

                        <div className="flex flex-col sm:flex-row gap-3">
                            {/* Barre de recherche */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Rechercher..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all w-full sm:w-64"
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

                            {/* Filtre par rôle */}
                            <select
                                value={filterRole}
                                onChange={(e) => setFilterRole(e.target.value)}
                                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 bg-white"
                            >
                                <option value="all">Tous les rôles</option>
                                <option value="org_admin">Admins</option>
                                <option value="student">Étudiants</option>
                            </select>

                            {/* Bouton inviter */}
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2"
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
                                <tr className="border-b border-gray-200">
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilisateur</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rôle</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inscription</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredUsers.map((user, index) => {
                                    const roleBadge = getRoleBadge(user.role);
                                    return (
                                        <motion.tr
                                            key={user.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="hover:bg-gray-50 transition-colors group"
                                        >
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                                        {user.full_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="font-medium text-gray-800">
                                                        {escapeText(untrusted(user.full_name || 'Sans nom'))}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">{escapeText(untrusted(user.email))}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleBadge.bg} ${roleBadge.text}`}>
                                                    {roleBadge.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500">
                                                {new Date(user.created_at).toLocaleDateString('fr-FR')}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button className="p-1 hover:bg-blue-100 rounded-lg transition-colors text-blue-600" title="Voir">
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button className="p-1 hover:bg-purple-100 rounded-lg transition-colors text-purple-600" title="Modifier rôle">
                                                        <Award className="w-4 h-4" />
                                                    </button>
                                                    <button className="p-1 hover:bg-red-100 rounded-lg transition-colors text-red-600" title="Supprimer">
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
                            <div className="text-center py-12 text-gray-500">
                                <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                <p>Aucun utilisateur trouvé</p>
                                {(searchTerm || filterRole !== 'all') && (
                                    <button
                                        onClick={() => {
                                            setSearchTerm('');
                                            setFilterRole('all');
                                        }}
                                        className="mt-2 text-blue-600 hover:text-blue-700"
                                    >
                                        Effacer les filtres
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>

            <EditCompanyModal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                company={company}
                onSuccess={fetchCompanyDetails}
            />
        </MainLayout>
    );
}