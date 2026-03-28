import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Settings, Save, RefreshCw, Mail, 
    Bell, Lock, Globe, Moon, Sun, Eye, EyeOff,
    CheckCircle, AlertCircle, X, Building,
    User, Key, CreditCard, ArrowRight, History, Sparkles,
    Building2
} from 'lucide-react';
import AdminLayout from '../../components/layout/AdminLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useSearchParams } from 'react-router-dom';
import { useUserRole } from '../../hooks/useUserRole';
import { useTheme } from '../../hooks/useTheme';
import { useStripe } from '../../hooks/useStripe';
import { useToast } from '../../hooks/useToast';
import { untrusted, escapeText } from '../../utils/security';
import SanitizedInput from '../../components/ui/SanitizedInput';
export default function AdminSettings() {
    const { user } = useAuth();
    const { role } = useUserRole();
    const { theme, setTheme } = useTheme(); 
    const [searchParams] = useSearchParams();
    const orgIdFromUrl = searchParams.get('orgId');
    const isReadOnly = role === 'super_admin' && orgIdFromUrl;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const { createPortalSession, createCheckoutSession, loading: stripeLoading } = useStripe();
    const { success: showToastSuccess } = useToast();

    const [orgData, setOrgData] = useState({
        plan_type: 'free',
        subscription_status: 'none',
        trial_ends_at: null
    });

    // ============================================
    // État des paramètres
    // ============================================
    const [settings, setSettings] = useState({
        companyName: '',
        companyEmail: '',
        adminName: '',
        emailNotifications: true,
        memberJoined: true,
        videoUploaded: true,
        quizCompleted: true,
        sessionTimeout: '30'
    });

    const [originalSettings, setOriginalSettings] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [passwordData, setPasswordData] = useState({
        current: '',
        new: '',
        confirm: ''
    });
    const [passwordTouched, setPasswordTouched] = useState({});

    // ============================================
    // Chargement des paramètres
    // ============================================
    useEffect(() => {
        if (!role) return;
        fetchSettings();

        // Vérifier si retour de checkout réussi
        if (searchParams.get('session_id')) {
            showToastSuccess("Votre abonnement a été mis à jour avec succès !");
            // Nettoyer l'URL
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
        }
    }, [user, role, isReadOnly]);

    const fetchSettings = async () => {
        try {
            let resolvedOrgId = null;
            let profileData = null;

            if (isReadOnly) {
                resolvedOrgId = orgIdFromUrl;
                const { data: adminProfile } = await supabase
                    .from('profiles')
                    .select('email, full_name')
                    .eq('organization_id', resolvedOrgId)
                    .eq('role', 'org_admin')
                    .limit(1)
                    .maybeSingle();
                
                profileData = adminProfile;
            } else {
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('organization_id, email, full_name')
                    .eq('id', user.id)
                    .maybeSingle();

                if (profileError) throw profileError;
                resolvedOrgId = profile?.organization_id;
                profileData = profile;
            }

            let companyName = '';

            if (resolvedOrgId) {
                const { data: org, error: orgError } = await supabase
                    .from('organizations')
                    .select('name, plan_type, subscription_status, trial_ends_at')
                    .eq('id', resolvedOrgId)
                    .maybeSingle();

                if (orgError) throw orgError;
                if (org) {
                    companyName = org.name || '';
                    setOrgData({
                        plan_type: org.plan_type || 'free',
                        subscription_status: org.subscription_status || 'none',
                        trial_ends_at: org.trial_ends_at
                    });
                }
            }

            const newSettings = {
                companyName: escapeText(untrusted(companyName)),
                companyEmail: escapeText(untrusted(profileData?.email || '')),
                adminName: escapeText(untrusted(profileData?.full_name || '')),
                emailNotifications: localStorage.getItem('emailNotifications') !== 'false',
                memberJoined: localStorage.getItem('memberJoined') !== 'false',
                videoUploaded: localStorage.getItem('videoUploaded') !== 'false',
                quizCompleted: localStorage.getItem('quizCompleted') !== 'false',
                sessionTimeout: localStorage.getItem('sessionTimeout') || '30'
            };

            setSettings(newSettings);
            setOriginalSettings(newSettings);
        } catch (error) {
            console.error('Erreur chargement paramètres:', error);
        } finally {
            setLoading(false);
        }
    };

    // ============================================
    // Validation
    // ============================================
    const validatePassword = (value) => {
        if (!value) return "Mot de passe requis";
        if (value.length < 8) return "Minimum 8 caractères";
        if (!/[A-Z]/.test(value)) return "Doit contenir une majuscule";
        if (!/[0-9]/.test(value)) return "Doit contenir un chiffre";
        return "";
    };

    const passwordErrors = {
        current: passwordTouched.current ? validatePassword(passwordData.current) : '',
        new: passwordTouched.new ? validatePassword(passwordData.new) : '',
        confirm: passwordTouched.confirm && passwordData.confirm !== passwordData.new 
            ? "Les mots de passe ne correspondent pas"
            : ''
    };

    const isPasswordValid = !passwordErrors.current && 
                           !passwordErrors.new && 
                           !passwordErrors.confirm &&
                           passwordData.current &&
                           passwordData.new &&
                           passwordData.confirm;

    const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

    // ============================================
    // Sauvegarde
    // ============================================
    const handleSaveSettings = async () => {
        setSaving(true);
        setError('');
        setSuccess('');

        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('organization_id')
                .eq('id', user.id)
                .single();

            if (profile?.organization_id) {
                if (settings.companyName !== originalSettings.companyName) {
                    const { error } = await supabase
                        .from('organizations')
                        .update({ name: settings.companyName })
                        .eq('id', profile.organization_id);

                    if (error) throw error;
                }
            }

            if (settings.adminName !== originalSettings.adminName) {
                const { error } = await supabase
                    .from('profiles')
                    .update({ full_name: settings.adminName })
                    .eq('id', user.id);

                if (error) throw error;
            }

            // Sauvegarder les préférences (sauf thème)
            localStorage.setItem('sessionTimeout', settings.sessionTimeout);
            localStorage.setItem('emailNotifications', settings.emailNotifications);
            localStorage.setItem('memberJoined', settings.memberJoined);
            localStorage.setItem('videoUploaded', settings.videoUploaded);
            localStorage.setItem('quizCompleted', settings.quizCompleted);

            setSuccess("Paramètres mis à jour avec succès");
            setOriginalSettings(settings);

        } catch (error) {
            console.error('Erreur sauvegarde:', error);
            setError(error.message || "Erreur lors de la sauvegarde");
        } finally {
            setSaving(false);
        }
    };

    // ============================================
    // Changement mot de passe
    // ============================================
    const handleChangePassword = async () => {
        if (!isPasswordValid) return;

        setSaving(true);
        setError('');
        setSuccess('');

        try {
            const { error } = await supabase.auth.updateUser({
                password: passwordData.new
            });

            if (error) throw error;

            setSuccess("Mot de passe modifié avec succès");
            setPasswordData({ current: '', new: '', confirm: '' });
            setPasswordTouched({});

        } catch (error) {
            console.error('Erreur changement mot de passe:', error);
            setError(error.message || "Erreur lors du changement de mot de passe");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <AdminLayout>
                <div className="min-h-[60vh] flex items-center justify-center">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/50 dark:border-white/5 flex flex-col items-center gap-4"
                    >
                        <RefreshCw className="w-10 h-10 text-primary-500 animate-spin" />
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400">Chargement des paramètres...</p>
                    </motion.div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-8"
            >
                {/* En-tête avec Glassmorphism */}
                <div className="relative bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl p-8 sm:p-10 shadow-xl border border-white/50 dark:border-white/5 overflow-hidden">
                    {/* Background Glows */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 dark:bg-primary-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-title-500/10 dark:bg-title-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />
                    
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-4">
                                <motion.div
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
                                    className="p-3 bg-gradient-to-br from-primary-500 to-accent-600 rounded-2xl shadow-lg shadow-primary-500/30"
                                >
                                    <Settings className="w-8 h-8 text-white" />
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="px-4 py-1.5 bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800/50 rounded-full text-sm font-bold text-primary-700 dark:text-primary-300 shadow-sm flex items-center gap-2 w-fit"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    Paramètres
                                </motion.div>
                            </div>
                            
                            <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 tracking-tight mb-4">
                                Configuration
                            </h1>
                            
                            <p className="text-lg text-gray-500 dark:text-gray-400 font-medium max-w-2xl flex items-center gap-2">
                                Gérez vos préférences et informations de compte
                            </p>
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <AnimatePresence>
                    {success && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-3"
                        >
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                            <p className="text-sm text-green-700 dark:text-green-300 flex-1">{success}</p>
                            <button onClick={() => setSuccess('')} className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300">
                                <X className="w-4 h-4" />
                            </button>
                        </motion.div>
                    )}

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"
                        >
                            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                            <p className="text-sm text-red-700 dark:text-red-300 flex-1">{error}</p>
                            <button onClick={() => setError('')} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300">
                                <X className="w-4 h-4" />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Grille des paramètres */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Colonne principale */}
                    <div className="lg:col-span-2 space-y-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/50 dark:border-white/5 relative overflow-hidden group"
                        >
                            {/* Glow Effect */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/5 dark:bg-primary-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-primary-500/10 dark:group-hover:bg-primary-500/20 transition-colors duration-500" />
                            
                            <div className="relative z-10">
                                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-3">
                                    <div className="p-2.5 bg-primary-50 dark:bg-primary-900/30 rounded-xl">
                                        <Building className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                                    </div>
                                    Informations générales
                                </h2>

                            <div className="space-y-4">
                                <SanitizedInput
                                    label="Nom de l'entreprise"
                                    value={settings.companyName}
                                    onChange={(e) => setSettings({...settings, companyName: e.target.value})}
                                    validate="text"
                                    minLength={3}
                                    maxLength={100}
                                    required
                                    disabled={isReadOnly}
                                    className="dark:bg-gray-700 dark:text-white dark:border-gray-600"
                                />

                                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Email de l'organisation</p>
                                    <p className="text-lg font-medium text-gray-800 dark:text-white flex items-center gap-2">
                                        <Mail className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                                        {settings.companyEmail}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Utilisé pour les communications officielles
                                    </p>
                                </div>

                                <SanitizedInput
                                    label="Nom de l'administrateur"
                                    value={settings.adminName}
                                    onChange={(e) => setSettings({...settings, adminName: e.target.value})}
                                    validate="text"
                                    minLength={3}
                                    required
                                    disabled={isReadOnly}
                                    className="dark:bg-gray-700 dark:text-white dark:border-gray-600"
                                />
                            </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/50 dark:border-white/5 relative overflow-hidden group"
                        >
                            {/* Glow Effect */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/5 dark:bg-primary-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-primary-500/10 dark:group-hover:bg-primary-500/20 transition-colors duration-500" />
                            
                            <div className="relative z-10">
                                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-3">
                                    <div className="p-2.5 bg-primary-50 dark:bg-primary-900/30 rounded-xl">
                                        <Bell className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                                    </div>
                                    Notifications
                                </h2>

                            <div className="space-y-3">
                                <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-xl cursor-pointer hover:bg-primary-50 dark:hover:bg-gray-600 transition-colors">
                                    <div>
                                        <p className="font-medium text-gray-700 dark:text-gray-300">Notifications par email</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Recevoir des alertes pour les activités importantes</p>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={settings.emailNotifications}
                                            onChange={(e) => setSettings({...settings, emailNotifications: e.target.checked})}
                                            className="sr-only"
                                        />
                                        <div className={`w-12 h-6 rounded-full transition-colors ${
                                            settings.emailNotifications ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
                                        }`}>
                                            <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                                                settings.emailNotifications ? 'translate-x-6' : 'translate-x-1'
                                            }`} />
                                        </div>
                                    </div>
                                </label>

                                {settings.emailNotifications && (
                                    <div className="ml-8 space-y-2">
                                        { [
                                            { key: 'memberJoined', label: 'Nouveau membre inscrit' },
                                            { key: 'videoUploaded', label: 'Nouvelle vidéo publiée' },
                                            { key: 'quizCompleted', label: 'Quiz terminé par un étudiant' }
                                        ].map(item => (
                                            <label key={item.key} className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg">
                                                <input
                                                    type="checkbox"
                                                    checked={settings[item.key]}
                                                    onChange={(e) => setSettings({...settings, [item.key]: e.target.checked})}
                                                    className="rounded text-primary-600 dark:bg-gray-700 dark:border-gray-600"
                                                    disabled={isReadOnly}
                                                />
                                                <span className="text-sm text-gray-600 dark:text-gray-300">{item.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/50 dark:border-white/5 relative overflow-hidden group"
                        >
                            {/* Glow Effect */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/5 dark:bg-primary-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-primary-500/10 dark:group-hover:bg-primary-500/20 transition-colors duration-500" />
                            
                            <div className="relative z-10">
                                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-3">
                                    <div className="p-2.5 bg-primary-50 dark:bg-primary-900/30 rounded-xl">
                                        <Globe className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                                    </div>
                                    Apparence
                                </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Thème</p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setTheme('light')}
                                            className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                                                theme === 'light'
                                                    ? 'border-primary-600 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/30'
                                                    : 'border-gray-200 dark:border-gray-700 hover:border-primary-200 dark:hover:border-primary-700'
                                            }`}
                                        >
                                            <Sun className="w-5 h-5 mx-auto mb-1 text-yellow-500" />
                                            <span className="text-xs dark:text-gray-300">Clair</span>
                                        </button>
                                        <button
                                            onClick={() => setTheme('dark')}
                                            className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                                                theme === 'dark'
                                                    ? 'border-primary-600 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/30'
                                                    : 'border-gray-200 dark:border-gray-700 hover:border-primary-200 dark:hover:border-primary-700'
                                            }`}
                                        >
                                            <Moon className="w-5 h-5 mx-auto mb-1 text-primary-600 dark:text-primary-400" />
                                            <span className="text-xs dark:text-gray-300">Sombre</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.35 }}
                            className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/50 dark:border-white/5 relative overflow-hidden group"
                        >
                            {/* Glow Effect */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/5 dark:bg-primary-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-primary-500/10 dark:group-hover:bg-primary-500/20 transition-colors duration-500" />
                            
                            <div className="relative z-10">
                                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-3">
                                    <div className="p-2.5 bg-primary-50 dark:bg-primary-900/30 rounded-xl">
                                        <CreditCard className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                                    </div>
                                    Abonnement & Facturation
                                </h2>

                            <div className="space-y-6">
                                {/* Plan Actuel */}
                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-600 rounded-xl flex items-center justify-center shadow-lg">
                                            <Sparkles className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-tight">Plan actuel</p>
                                            <p className="text-xl font-bold text-gray-800 dark:text-white capitalize">
                                                {orgData.plan_type === 'free' ? 'Gratuit' : orgData.plan_type}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                            orgData.subscription_status === 'active' 
                                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                        }`}>
                                            {orgData.subscription_status === 'active' ? 'Actif' : 'En essai'}
                                        </span>
                                    </div>
                                </div>

                                {/* Actions Billing */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    { (orgData.plan_type === 'free' || orgData.subscription_status === 'trial') ? (
                                        <button
                                            onClick={() => {
                                                console.log('💳 Tentative Payement - Price ID:', import.meta.env.VITE_STRIPE_STARTER_PRICE_ID);
                                                createCheckoutSession(import.meta.env.VITE_STRIPE_STARTER_PRICE_ID);
                                            }}
                                            disabled={stripeLoading}
                                            className="col-span-2 flex items-center justify-center gap-2 p-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-lg transition-all group disabled:opacity-50"
                                        >
                                            {stripeLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                                            Passer au plan Starter
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                onClick={createPortalSession}
                                                disabled={stripeLoading}
                                                className="flex items-center justify-center gap-2 p-4 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400 transition-all disabled:opacity-50"
                                            >
                                                {stripeLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <History className="w-5 h-5" />}
                                                Gérer l'abonnement
                                            </button>
                                            <button
                                                onClick={createPortalSession}
                                                disabled={stripeLoading}
                                                className="flex items-center justify-center gap-2 p-4 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-all disabled:opacity-50"
                                            >
                                                Voir les factures
                                            </button>
                                        </>
                                    )}
                                </div>

                                <p className="text-xs text-center text-gray-400 dark:text-gray-500">
                                    Paiements sécurisés par Stripe. Aucune donnée bancaire n'est stockée sur nos serveurs.
                                </p>
                            </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Colonne latérale */}
                    <div className="space-y-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/50 dark:border-white/5 relative overflow-hidden group"
                        >
                            {/* Glow Effect */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/5 dark:bg-primary-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-primary-500/10 dark:group-hover:bg-primary-500/20 transition-colors duration-500" />
                            
                            <div className="relative z-10">
                                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-3">
                                    <div className="p-2.5 bg-primary-50 dark:bg-primary-900/30 rounded-xl">
                                        <Lock className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                                    </div>
                                    Sécurité
                                </h2>

                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Délai d'expiration de session</p>
                                <select
                                    value={settings.sessionTimeout}
                                    onChange={(e) => setSettings({...settings, sessionTimeout: e.target.value})}
                                    className="w-full p-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-primary-400 dark:focus:border-primary-500 focus:ring-4 focus:ring-primary-100 dark:focus:ring-primary-900/30 outline-none transition-all dark:bg-gray-700 dark:text-white"
                                    disabled={isReadOnly}
                                >
                                    <option value="15">15 minutes</option>
                                    <option value="30">30 minutes</option>
                                    <option value="60">1 heure</option>
                                    <option value="120">2 heures</option>
                                    <option value="240">4 heures</option>
                                </select>
                            </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/50 dark:border-white/5 relative overflow-hidden group"
                        >
                            {/* Glow Effect */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/5 dark:bg-primary-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-primary-500/10 dark:group-hover:bg-primary-500/20 transition-colors duration-500" />
                            
                            <div className="relative z-10">
                                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-3">
                                    <div className="p-2.5 bg-primary-50 dark:bg-primary-900/30 rounded-xl">
                                        <Key className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                                    </div>
                                    Mot de passe
                                </h2>

                            <div className="space-y-4">
                                {/* Mot de passe actuel */}
                                <div>
                                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Mot de passe actuel</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={passwordData.current}
                                            onChange={(e) => setPasswordData({...passwordData, current: e.target.value})}
                                            onBlur={() => setPasswordTouched({...passwordTouched, current: true})}
                                            className={`w-full p-3 pr-10 border-2 rounded-xl outline-none transition-all dark:bg-gray-700 dark:text-white ${
                                                passwordErrors.current && passwordTouched.current
                                                    ? 'border-red-300 dark:border-red-600 focus:border-red-500 dark:focus:border-red-400'
                                                    : passwordData.current && !passwordErrors.current
                                                        ? 'border-green-300 dark:border-green-600 focus:border-green-500 dark:focus:border-green-400'
                                                        : 'border-gray-200 dark:border-gray-700 focus:border-primary-400 dark:focus:border-primary-500'
                                            }`}
                                            placeholder="********"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    {passwordErrors.current && passwordTouched.current && (
                                        <p className="text-xs text-red-500 dark:text-red-400 mt-1">{passwordErrors.current}</p>
                                    )}
                                </div>

                                {/* Nouveau mot de passe */}
                                <div>
                                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Nouveau mot de passe</label>
                                    <input
                                        type="password"
                                        value={passwordData.new}
                                        onChange={(e) => setPasswordData({...passwordData, new: e.target.value})}
                                        onBlur={() => setPasswordTouched({...passwordTouched, new: true})}
                                        className={`w-full p-3 border-2 rounded-xl outline-none transition-all dark:bg-gray-700 dark:text-white ${
                                            passwordErrors.new && passwordTouched.new
                                                ? 'border-red-300 dark:border-red-600 focus:border-red-500 dark:focus:border-red-400'
                                                : passwordData.new && !passwordErrors.new
                                                    ? 'border-green-300 dark:border-green-600 focus:border-green-500 dark:focus:border-green-400'
                                                    : 'border-gray-200 dark:border-gray-700 focus:border-primary-400 dark:focus:border-primary-500'
                                        }`}
                                        placeholder="********"
                                    />
                                    {passwordErrors.new && passwordTouched.new && (
                                        <p className="text-xs text-red-500 dark:text-red-400 mt-1">{passwordErrors.new}</p>
                                    )}
                                </div>

                                {/* Confirmation */}
                                <div>
                                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Confirmer le mot de passe</label>
                                    <input
                                        type="password"
                                        value={passwordData.confirm}
                                        onChange={(e) => setPasswordData({...passwordData, confirm: e.target.value})}
                                        onBlur={() => setPasswordTouched({...passwordTouched, confirm: true})}
                                        className={`w-full p-3 border-2 rounded-xl outline-none transition-all dark:bg-gray-700 dark:text-white ${
                                            passwordErrors.confirm && passwordTouched.confirm
                                                ? 'border-red-300 dark:border-red-600 focus:border-red-500 dark:focus:border-red-400'
                                                : passwordData.confirm && !passwordErrors.confirm
                                                    ? 'border-green-300 dark:border-green-600 focus:border-green-500 dark:focus:border-green-400'
                                                    : 'border-gray-200 dark:border-gray-700 focus:border-primary-400 dark:focus:border-primary-500'
                                        }`}
                                        placeholder="********"
                                    />
                                    {passwordErrors.confirm && passwordTouched.confirm && (
                                        <p className="text-xs text-red-500 dark:text-red-400 mt-1">{passwordErrors.confirm}</p>
                                    )}
                                </div>

                                <button
                                    onClick={handleChangePassword}
                                    disabled={!isPasswordValid || saving}
                                    className={`w-full py-3 rounded-xl font-medium transition-all ${
                                        isPasswordValid && !saving
                                            ? 'bg-gradient-to-r from-primary-600 to-accent-600 text-white hover:shadow-lg'
                                            : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                    }`}
                                >
                                    Mettre à jour le mot de passe
                                </button>
                            </div>
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* Bouton de sauvegarde */}
                {hasChanges && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="fixed bottom-8 right-8"
                    >
                        <button
                            onClick={handleSaveSettings}
                            disabled={saving}
                            className="px-6 py-3 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-xl shadow-lg hover:shadow-xl flex items-center gap-2 group"
                        >
                            {saving ? (
                                <>
                                    <RefreshCw className="w-5 h-5 animate-spin" />
                                    <span>Sauvegarde...</span>
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    <span>Enregistrer les modifications</span>
                                </>
                            )}
                        </button>
                    </motion.div>
                )}
            </motion.div>
        </AdminLayout>
    );
}