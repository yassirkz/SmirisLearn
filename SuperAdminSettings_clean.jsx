// src/pages/super-admin/SuperAdminSettings.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Settings, User, Mail, Bell, Moon, Sun,
    Shield, Eye, EyeOff, Save, RefreshCw, CheckCircle,
    AlertCircle, X, Key, Download, Zap, Activity, Server, Sparkles
} from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { untrusted, escapeText } from '../../utils/security';
import SanitizedInput from '../../components/ui/SanitizedInput';

export default function SuperAdminSettings() {
    const { user } = useAuth();
    const { theme, setTheme } = useTheme();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    // ============================================
    // 1. PROFIL SUPER ADMIN
    // ============================================
    const [profile, setProfile] = useState({
        fullName: '',
        email: ''
    });

    // ============================================
    // 2. CHANGEMENT DE MOT DE PASSE
    // ============================================
    const [passwordData, setPasswordData] = useState({
        current: '',
        new: '',
        confirm: ''
    });
    const [showPassword, setShowPassword] = useState({
        current: false,
        new: false,
        confirm: false
    });
    const [passwordTouched, setPasswordTouched] = useState({});

    // ============================================
    // 3. PRÉFÉRENCES (localStorage)
    // ============================================
    const [preferences, setPreferences] = useState({
        emailNotifications: true,
        newCompanyAlert: true,
        newUserAlert: true,
        sessionTimeout: '30'
    });

    const [platformConfig, setPlatformConfig] = useState({
        trial_days: 14,
        allow_registration: true,
        maintenance_mode: false,
        max_file_size: 500,
        allowed_video_formats: ['mp4', 'webm', 'mov'],
        api_enabled: false,
        api_rate_limit: 1000
    });
    
    const handleSavePlatformConfig = async () => {
        setSaving(true);
        setError('');
        setSuccess('');

        try {
            const { error } = await supabase
                .from('system_settings')
                .update({
                    trial_days: platformConfig.trial_days,
                    allow_registration: platformConfig.allow_registration,
                    maintenance_mode: platformConfig.maintenance_mode,
                    max_file_size: platformConfig.max_file_size,
                    allowed_video_formats: platformConfig.allowed_video_formats,
                    api_enabled: platformConfig.api_enabled,
                    api_rate_limit: platformConfig.api_rate_limit
                })
                .eq('id', 1);

            if (error) throw error;

            setSuccess('Configuration plateforme sauvegardée');
        } catch (error) {
            console.error('Erreur sauvegarde config:', error);
            setError(error.message);
        } finally {
            setSaving(false);
        }
    };

    // ============================================
    // 5. STATISTIQUES PLATEFORME
    // ============================================
    const [platformStats, setPlatformStats] = useState({
        companies: 0,
        users: 0,
        videos: 0,
        storageUsed: 0
    });

    // ============================================
    // Chargement initial
    // ============================================
    useEffect(() => {
        fetchProfile();
        fetchPreferences();
        fetchPlatformConfig();
        fetchPlatformStats();
    }, [user]);

    const fetchProfile = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('full_name, email')
                .eq('id', user.id)
                .single();

            if (error) throw error;

            setProfile({
                fullName: escapeText(untrusted(data?.full_name || '')),
                email: escapeText(untrusted(data?.email || user.email || ''))
            });
        } catch (error) {
            console.error('Erreur chargement profil:', error);
        }
    };

    const fetchPreferences = () => {
        setPreferences({
            emailNotifications: localStorage.getItem('emailNotifications') !== 'false',
            newCompanyAlert: localStorage.getItem('newCompanyAlert') !== 'false',
            newUserAlert: localStorage.getItem('newUserAlert') !== 'false',
            sessionTimeout: localStorage.getItem('sessionTimeout') || '30'
        });
    };

    const fetchPlatformConfig = async () => {
        try {
            const { data: existing, error: checkError } = await supabase
                .from('system_settings')
                .select('*')
                .eq('id', 1)
                .maybeSingle();

            if (checkError) throw checkError;

            if (!existing) {
                const { error: insertError } = await supabase
                    .from('system_settings')
                    .insert({ id: 1 });

                if (insertError) throw insertError;
            }

            const { data, error } = await supabase
                .from('system_settings')
                .select('*')
                .eq('id', 1)
                .single();

            if (error) throw error;
            
            if (data) {
                setPlatformConfig({
                    trial_days: data.trial_days || 14,
                    allow_registration: data.allow_registration ?? true,
                    maintenance_mode: data.maintenance_mode ?? false,
                    max_file_size: data.max_file_size || 500,
                    allowed_video_formats: data.allowed_video_formats || ['mp4', 'webm', 'mov'],
                    api_enabled: data.api_enabled ?? false,
                    api_rate_limit: data.api_rate_limit || 1000
                });
            }
        } catch (error) {
            console.error('Erreur chargement config:', error);
        }
    };

    const fetchPlatformStats = async () => {
        try {
            const { count: companiesCount } = await supabase
                .from('organizations')
                .select('*', { count: 'exact', head: true });

            const { count: usersCount } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true });

            const { count: videosCount } = await supabase
                .from('videos')
                .select('*', { count: 'exact', head: true });

            const storageUsed = (videosCount || 0) * 50;

            setPlatformStats({
                companies: companiesCount || 0,
                users: usersCount || 0,
                videos: videosCount || 0,
                storageUsed
            });

        } catch (error) {
            console.error('Erreur chargement stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const validatePassword = (value) => {
        if (!value) return "Mot de passe requis";
        if (value.length < 8) return "Minimum 8 caractères";
        if (!/[A-Z]/.test(value)) return "Au moins une majuscule";
        if (!/[0-9]/.test(value)) return "Au moins un chiffre";
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

    const handleSaveProfile = async () => {
        setSaving(true);
        setError('');
        setSuccess('');

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ full_name: profile.fullName })
                .eq('id', user.id);

            if (error) throw error;

            setSuccess('Profil mis à jour avec succès');
        } catch (error) {
            console.error('Erreur sauvegarde profil:', error);
            setError(error.message);
        } finally {
            setSaving(false);
        }
    };

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

            setSuccess('Mot de passe modifié avec succès');
            setPasswordData({ current: '', new: '', confirm: '' });
            setPasswordTouched({});

        } catch (error) {
            console.error('Erreur changement mot de passe:', error);
            setError(error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleSavePreferences = () => {
        Object.entries(preferences).forEach(([key, value]) => {
            localStorage.setItem(key, value.toString());
        });

        setSuccess('Préférences sauvegardées');
    };


    const formatStorage = (mb) => {
        if (mb > 1024) {
            return `${(mb / 1024).toFixed(1)} Go`;
        }
        return `${mb} Mo`;
    };

    const handleRefreshStats = async () => {
        setRefreshing(true);
        try {
            await fetchPlatformStats();
            setSuccess('Statistiques mises à jour');
        } catch (error) {
            console.error('Erreur rafraîchissement stats:', error);
            setError('Erreur lors de la mise à jour des statistiques');
        } finally {
            setRefreshing(false);
        }
    };

    const handleExportData = async () => {
        setExporting(true);
        setError('');
        
        try {
            const { data: orgs, error: orgsError } = await supabase
                .from('organizations')
                .select('name, plan_type, created_at');

            if (orgsError) throw orgsError;

            if (!orgs || orgs.length === 0) {
                setError('Aucune donnée à exporter');
                return;
            }

            const headers = ['Nom', 'Plan', 'Date de création'];
            const rows = orgs.map(org => [
                `"${org.name.replace(/"/g, '""')}"`,
                org.plan_type,
                new Date(org.created_at).toLocaleDateString('fr-FR')
            ]);

            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.join(','))
            ].join('\n');

            const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `export_platforme_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            setSuccess('Données exportées avec succès');
        } catch (error) {
            console.error('Erreur export:', error);
            setError('Erreur lors de l\'export des données');
        } finally {
            setExporting(false);
        }
    };

    if (loading) {
        return (
            <MainLayout>
                <div className="min-h-[60vh] flex items-center justify-center">
                    <div className="relative">
                        <div className="w-20 h-20 border-4 border-primary-200 dark:border-primary-800 rounded-full"></div>
                        <div className="absolute top-0 left-0 w-20 h-20 border-4 border-primary-600 dark:border-primary-400 border-t-transparent rounded-full animate-spin"></div>
                        <p className="mt-4 text-gray-500 dark:text-gray-400">Chargement des paramètres...</p>
                    </div>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-8"
            >
                {/* En-tête premium glassmorphism */}
                <div className="relative bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl p-8 sm:p-10 shadow-xl border border-white/50 dark:border-white/5 overflow-hidden">
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
                                    <Settings className="w-8 h-8 text-white" />
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="px-4 py-1.5 bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800/50 rounded-full text-sm font-bold text-primary-700 dark:text-primary-300 shadow-sm flex items-center gap-2 w-fit"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    Administration
                                </motion.div>
                            </div>
                            
                            <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 tracking-tight mb-4">
                                Paramètres
                            </h1>
                            
                            <p className="text-lg text-gray-500 dark:text-gray-400 font-medium max-w-2xl flex flex-wrap items-center gap-2">
                                <Shield className="w-5 h-5 text-gray-400" />
                                Gérez votre profil et la configuration de la plateforme
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
                            className="p-4 bg-green-50/80 dark:bg-green-900/20 backdrop-blur-sm border border-green-200 dark:border-green-800/50 rounded-2xl flex items-center gap-3 shadow-sm"
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
                            className="p-4 bg-red-50/80 dark:bg-red-900/20 backdrop-blur-sm border border-red-200 dark:border-red-800/50 rounded-2xl flex items-center gap-3 shadow-sm"
                        >
                            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                            <p className="text-sm text-red-700 dark:text-red-300 flex-1">{error}</p>
                            <button onClick={() => setError('')} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300">
                                <X className="w-4 h-4" />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Grille */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Colonne principale */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* PROFIL */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/50 dark:border-white/5 relative overflow-hidden group"
                        >
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-3">
                                <div className="p-2.5 bg-primary-50 dark:bg-primary-900/30 rounded-xl">
                                    <User className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                                </div>
                                Mon profil
                            </h2>

                            <div className="space-y-4">
                                <SanitizedInput
                                    label="Nom complet"
                                    value={profile.fullName}
                                    onChange={(e) => setProfile({...profile, fullName: e.target.value})}
                                    validate="text"
                                    minLength={3}
                                    required
                                    className="dark:text-white dark:bg-gray-900 dark:border-gray-700 dark:focus:border-primary-500 dark:focus:bg-gray-900 dark:focus:text-white dark:placeholder-gray-400 dark:focus:placeholder-gray-500 dark:focus:ring-primary-500 dark:focus:ring-offset-primary-500 dark:focus:ring-offset-gray-900 dark:focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                                />

                                <div className="bg-gray-50/80 dark:bg-slate-800/50 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/50">
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Email</p>
                                    <p className="text-lg font-medium text-gray-800 dark:text-white flex items-center gap-2">
                                        <Mail className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                                        {profile.email}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        L'email ne peut pas être modifié.
                                    </p>
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.02, y: -1 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleSaveProfile}
                                    disabled={saving}
                                    className="px-6 py-3 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-2xl shadow-lg shadow-primary-500/20 hover:shadow-xl transition-all font-medium flex items-center gap-2 disabled:opacity-50"
                                >
                                    <Save className="w-4 h-4" />
                                    Mettre à jour le profil
                                </motion.button>
                            </div>
                        </motion.div>

                        {/* MOT DE PASSE */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/50 dark:border-white/5 relative overflow-hidden group"
                        >
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-3">
                                <div className="p-2.5 bg-primary-50 dark:bg-primary-900/30 rounded-xl">
                                    <Key className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                                </div>
                                Changer le mot de passe
                            </h2>

                            <div className="space-y-4">
                                {/* Mot de passe actuel */}
                                <div>
                                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Mot de passe actuel</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword.current ? "text" : "password"}
                                            value={passwordData.current}
                                            onChange={(e) => setPasswordData({...passwordData, current: e.target.value})}
                                            onBlur={() => setPasswordTouched({...passwordTouched, current: true})}
                                            className={`w-full p-3 pr-10 border-2 rounded-xl outline-none transition-all dark:bg-gray-900 dark:text-white dark:border-gray-700 ${
                                                passwordErrors.current && passwordTouched.current
                                                    ? 'border-red-300 dark:border-red-600 focus:border-red-500'
                                                    : passwordData.current && !passwordErrors.current
                                                        ? 'border-green-300 dark:border-green-600 focus:border-green-500'
                                                        : 'border-gray-200 dark:border-gray-700 focus:border-primary-400 dark:focus:border-primary-500'
                                            }`}
                                            placeholder="********"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword({...showPassword, current: !showPassword.current})}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500"
                                        >
                                            {showPassword.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    {passwordErrors.current && passwordTouched.current && (
                                        <p className="text-xs text-red-500 dark:text-red-400 mt-1">{passwordErrors.current}</p>
                                    )}
                                </div>

                                {/* Nouveau mot de passe */}
                                <div>
                                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Nouveau mot de passe</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword.new ? "text" : "password"}
                                            value={passwordData.new}
                                            onChange={(e) => setPasswordData({...passwordData, new: e.target.value})}
                                            onBlur={() => setPasswordTouched({...passwordTouched, new: true})}
                                            className={`w-full p-3 pr-10 border-2 rounded-xl outline-none transition-all dark:bg-gray-900 dark:text-white dark:border-gray-700 ${
                                                passwordErrors.new && passwordTouched.new
                                                    ? 'border-red-300 dark:border-red-600 focus:border-red-500'
                                                    : passwordData.new && !passwordErrors.new
                                                        ? 'border-green-300 dark:border-green-600 focus:border-green-500'
                                                        : 'border-gray-200 dark:border-gray-700 focus:border-primary-400 dark:focus:border-primary-500'
                                            }`}
                                            placeholder="********"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword({...showPassword, new: !showPassword.new})}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500"
                                        >
                                            {showPassword.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    {passwordErrors.new && passwordTouched.new && (
                                        <p className="text-xs text-red-500 dark:text-red-400 mt-1">{passwordErrors.new}</p>
                                    )}
                                </div>

                                {/* Confirmation */}
                                <div>
                                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Confirmer</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword.confirm ? "text" : "password"}
                                            value={passwordData.confirm}
                                            onChange={(e) => setPasswordData({...passwordData, confirm: e.target.value})}
                                            onBlur={() => setPasswordTouched({...passwordTouched, confirm: true})}
                                            className={`w-full p-3 pr-10 border-2 rounded-xl outline-none transition-all dark:bg-gray-900 dark:text-white dark:border-gray-700 ${
                                                passwordErrors.confirm && passwordTouched.confirm
                                                    ? 'border-red-300 dark:border-red-600 focus:border-red-500'
                                                    : passwordData.confirm && !passwordErrors.confirm
                                                        ? 'border-green-300 dark:border-green-600 focus:border-green-500'
                                                        : 'border-gray-200 dark:border-gray-700 focus:border-primary-400 dark:focus:border-primary-500'
                                            }`}
                                            placeholder="********"
                                        />
                                    </div>
                                    {passwordErrors.confirm && passwordTouched.confirm && (
                                        <p className="text-xs text-red-500 dark:text-red-400 mt-1">{passwordErrors.confirm}</p>
                                    )}
                                </div>

                                <motion.button
                                    whileHover={isPasswordValid ? { scale: 1.02, y: -1 } : {}}
                                    whileTap={isPasswordValid ? { scale: 0.98 } : {}}
                                    onClick={handleChangePassword}
                                    disabled={!isPasswordValid || saving}
                                    className={`px-6 py-3 rounded-2xl font-medium transition-all flex items-center gap-2 ${
                                        isPasswordValid && !saving
                                            ? 'bg-gradient-to-r from-primary-600 to-accent-600 text-white shadow-lg shadow-primary-500/20 hover:shadow-xl'
                                            : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                    }`}
                                >
                                    <Key className="w-4 h-4" />
                                    Changer le mot de passe
                                </motion.button>
                            </div>
                        </motion.div>

                        {/* PRÉFÉRENCES */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/50 dark:border-white/5 relative overflow-hidden group"
                        >
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-3">
                                <div className="p-2.5 bg-primary-50 dark:bg-primary-900/30 rounded-xl">
                                    <Bell className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                                </div>
                                Préférences
                            </h2>

                            {/* Notifications */}
                            <div className="mb-6">
                                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Notifications</h3>
                                <div className="space-y-3">
                                    {[
                                        { key: 'emailNotifications', label: 'Notifications par email' },
                                        { key: 'newCompanyAlert', label: 'Nouvelle entreprise créée' },
                                        { key: 'newUserAlert', label: 'Nouvel utilisateur inscrit' }
                                    ].map(item => (
                                        <label key={item.key} className="flex items-center justify-between p-4 bg-gray-50/80 dark:bg-slate-800/50 rounded-2xl cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-all border border-transparent hover:border-primary-100 dark:hover:border-primary-800/50">
                                            <span className="text-sm text-gray-700 dark:text-gray-300">{item.label}</span>
                                            <div className="relative">
                                                <input
                                                    type="checkbox"
                                                    checked={preferences[item.key]}
                                                    onChange={(e) => setPreferences({...preferences, [item.key]: e.target.checked})}
                                                    className="sr-only"
                                                />
                                                <div className={`w-14 h-7 rounded-full transition-all shadow-inner ${
                                                    preferences[item.key] ? 'bg-gradient-to-r from-primary-500 to-accent-600' : 'bg-gray-300 dark:bg-gray-600'
                                                }`}>
                                                    <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-all mt-0.5 ${
                                                        preferences[item.key] ? 'translate-x-7' : 'translate-x-0.5'
                                                    }`} />
                                                </div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Thème */}
                            <div className="mb-6">
                                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Apparence</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Thème</p>
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

                            {/* Sécurité */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Sécurité</h3>
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Expiration de session</p>
                                    <select
                                        value={preferences.sessionTimeout}
                                        onChange={(e) => setPreferences({...preferences, sessionTimeout: e.target.value})}
                                        className="w-full p-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-primary-400 dark:focus:border-primary-500 focus:ring-4 focus:ring-primary-100 dark:focus:ring-primary-900/30 outline-none transition-all dark:bg-gray-900 dark:text-white"
                                    >
                                        <option value="15">15 minutes</option>
                                        <option value="30">30 minutes</option>
                                        <option value="60">1 heure</option>
                                        <option value="120">2 heures</option>
                                        <option value="240">4 heures</option>
                                    </select>
                                </div>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.02, y: -1 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleSavePreferences}
                                className="mt-6 px-6 py-3 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-2xl shadow-lg shadow-primary-500/20 hover:shadow-xl transition-all font-medium flex items-center gap-2"
                            >
                                <Save className="w-4 h-4" />
                                Sauvegarder les préférences
                            </motion.button>
                        </motion.div>

                        {/* CONFIGURATION PLATEFORME */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/50 dark:border-white/5 relative overflow-hidden group"
                        >
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-3">
                                <div className="p-2.5 bg-primary-50 dark:bg-primary-900/30 rounded-xl">
                                    <Server className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                                </div>
                                Configuration plateforme
                            </h2>


                            {/* Paramètres généraux */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Période d'essai (jours)
                                    </label>
                                    <input
                                        type="number"
                                        value={platformConfig.trial_days}
                                        onChange={(e) => setPlatformConfig({...platformConfig, trial_days: parseInt(e.target.value)})}
                                        className="w-full p-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-primary-400 dark:focus:border-primary-500 focus:ring-4 focus:ring-primary-100 dark:focus:ring-primary-900/30 outline-none transition-all dark:bg-gray-900 dark:text-white"
                                        min="0"
                                        max="90"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Taille maximale des fichiers (Mo)
                                    </label>
                                    <input
                                        type="number"
                                        value={platformConfig.max_file_size}
                                        onChange={(e) => setPlatformConfig({...platformConfig, max_file_size: parseInt(e.target.value)})}
                                        className="w-full p-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-primary-400 dark:focus:border-primary-500 focus:ring-4 focus:ring-primary-100 dark:focus:ring-primary-900/30 outline-none transition-all dark:bg-gray-900 dark:text-white"
                                        min="1"
                                        max="10240"
                                    />
                                </div>
                            </div>

                            {/* Toggles */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <label className="flex items-center justify-between p-4 bg-gray-50/80 dark:bg-slate-800/50 rounded-2xl cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-all border border-transparent hover:border-primary-100 dark:hover:border-primary-800/50">
                                    <div>
                                        <p className="font-medium text-gray-700 dark:text-gray-300">Autoriser les inscriptions</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Les nouveaux utilisateurs peuvent s'inscrire</p>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={platformConfig.allow_registration}
                                            onChange={(e) => setPlatformConfig({...platformConfig, allow_registration: e.target.checked})}
                                            className="sr-only"
                                        />
                                        <div className={`w-14 h-7 rounded-full transition-colors ${
                                            platformConfig.allow_registration ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                                        }`}>
                                            <div className={`w-6 h-6 bg-white dark:bg-gray-200 rounded-full shadow transform transition-transform mt-0.5 ${
                                                platformConfig.allow_registration ? 'translate-x-7' : 'translate-x-1'
                                            }`} />
                                        </div>
                                    </div>
                                </label>

                                <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors">
                                    <div>
                                        <p className="font-medium text-gray-700 dark:text-gray-300">Mode maintenance</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">La plateforme est en maintenance</p>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={platformConfig.maintenance_mode}
                                            onChange={(e) => setPlatformConfig({...platformConfig, maintenance_mode: e.target.checked})}
                                            className="sr-only"
                                        />
                                        <div className={`w-14 h-7 rounded-full transition-colors ${
                                            platformConfig.maintenance_mode ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'
                                        }`}>
                                            <div className={`w-6 h-6 bg-white dark:bg-gray-200 rounded-full shadow transform transition-transform mt-0.5 ${
                                                platformConfig.maintenance_mode ? 'translate-x-7' : 'translate-x-1'
                                            }`} />
                                        </div>
                                    </div>
                                </label>
                            </div>

                            {/* Formats vidéo */}
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Formats vidéo autorisés
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {['mp4', 'webm', 'mov', 'avi', 'mkv'].map(format => (
                                        <label key={format} className="flex items-center gap-2 px-3 py-2.5 bg-gray-50/80 dark:bg-slate-800/50 rounded-xl cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-all border border-transparent hover:border-primary-100 dark:hover:border-primary-800/50">
                                            <input
                                                type="checkbox"
                                                checked={platformConfig.allowed_video_formats?.includes(format)}
                                                onChange={(e) => {
                                                    const newFormats = e.target.checked
                                                        ? [...(platformConfig.allowed_video_formats || []), format]
                                                        : (platformConfig.allowed_video_formats || []).filter(f => f !== format);
                                                    setPlatformConfig({...platformConfig, allowed_video_formats: newFormats});
                                                }}
                                                className="rounded text-primary-600 dark:text-primary-400 focus:ring-primary-200 dark:focus:ring-primary-800"
                                            />
                                            <span className="text-sm text-gray-700 dark:text-gray-300 uppercase">{format}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* API */}
                            <div className="mt-6 p-5 bg-gradient-to-r from-primary-50/80 to-accent-50/80 dark:from-primary-900/20 dark:to-accent-900/20 backdrop-blur-sm rounded-2xl border border-primary-100 dark:border-primary-800/50">
                                <label className="flex items-center justify-between cursor-pointer">
                                    <div>
                                        <p className="font-medium text-gray-700 dark:text-gray-300">Activer l'API</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Permettre les accès API externes</p>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={platformConfig.api_enabled}
                                            onChange={(e) => setPlatformConfig({...platformConfig, api_enabled: e.target.checked})}
                                            className="sr-only"
                                        />
                                        <div className={`w-14 h-7 rounded-full transition-colors ${
                                            platformConfig.api_enabled ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
                                        }`}>
                                            <div className={`w-6 h-6 bg-white dark:bg-gray-200 rounded-full shadow transform transition-transform mt-0.5 ${
                                                platformConfig.api_enabled ? 'translate-x-7' : 'translate-x-1'
                                            }`} />
                                        </div>
                                    </div>
                                </label>

                                {platformConfig.api_enabled && (
                                    <div className="mt-3">
                                        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                                            Limite de requêtes API (par heure)
                                        </label>
                                        <input
                                            type="number"
                                            value={platformConfig.api_rate_limit}
                                            onChange={(e) => setPlatformConfig({...platformConfig, api_rate_limit: parseInt(e.target.value)})}
                                            className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:border-primary-400 dark:focus:border-primary-500 focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900/30 outline-none dark:bg-gray-900 dark:text-white"
                                            min="1"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Bouton sauvegarde */}
                            <div className="mt-6 flex justify-end">
                                <button
                                    onClick={handleSavePlatformConfig}
                                    disabled={saving}
                                    className="px-6 py-3 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                                >
                                    {saving ? (
                                        <>
                                            <RefreshCw className="w-5 h-5 animate-spin" />
                                            <span>Sauvegarde...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-5 h-5" />
                                            <span>Sauvegarder la configuration</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>

                    {/* Colonne latérale */}
                    <div className="space-y-6">
                        {/* STATUT PLATEFORME */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="bg-gradient-to-br from-primary-600 to-accent-600 rounded-3xl p-6 shadow-xl shadow-primary-500/20 text-white relative overflow-hidden"
                        >
                            <div className="absolute -top-20 -right-20 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                            <div className="relative z-10 flex items-center gap-2 mb-5">
                                <div className="p-2 bg-white/20 rounded-xl">
                                    <Activity className="w-5 h-5" />
                                </div>
                                <h3 className="font-bold text-lg">Statut de la plateforme</h3>
                            </div>
                            
                            <div className="relative z-10 space-y-3">
                                {[
                                    { label: 'Entreprises', value: platformStats.companies },
                                    { label: 'Utilisateurs', value: platformStats.users },
                                    { label: 'Vidéos', value: platformStats.videos },
                                    { label: 'Stockage utilisé', value: formatStorage(platformStats.storageUsed) }
                                ].map((stat, i) => (
                                    <div key={stat.label} className="flex justify-between items-center text-sm p-2.5 bg-white/10 rounded-xl">
                                        <span className="opacity-90 font-medium">{stat.label}</span>
                                        <span className="font-black text-lg">{stat.value}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="relative z-10 mt-5 pt-4 border-t border-white/20">
                                <div className="flex items-center gap-2 text-sm font-medium">
                                    <span className="relative flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-300 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-400"></span>
                                    </span>
                                    <span>Tout est opérationnel</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Actions rapides */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/50 dark:border-white/5"
                        >
                            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-widest">Actions rapides</h3>
                            <div className="space-y-2">
                                <button
                                    onClick={handleRefreshStats}
                                    disabled={refreshing || exporting}
                                    className="w-full px-4 py-3 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-2xl hover:bg-primary-100 dark:hover:bg-primary-800/50 disabled:opacity-50 transition-all text-sm font-medium flex items-center gap-2 border border-primary-100 dark:border-primary-800/30 hover:shadow-sm"
                                >
                                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                                    <span>{refreshing ? 'Mise à jour...' : 'Rafraîchir les stats'}</span>
                                </button>
                                <button
                                    onClick={handleExportData}
                                    disabled={refreshing || exporting}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800/50 text-gray-700 dark:text-gray-300 rounded-2xl hover:bg-gray-100 dark:hover:bg-slate-700/50 disabled:opacity-50 transition-all text-sm font-medium flex items-center gap-2 border border-gray-100 dark:border-gray-700/30 hover:shadow-sm"
                                >
                                    {exporting ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Download className="w-4 h-4" />
                                    )}
                                    <span>{exporting ? 'Exportation...' : 'Exporter les données'}</span>
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* Note de sécurité */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="text-center py-4"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 dark:bg-slate-900/40 backdrop-blur-sm rounded-full border border-gray-200 dark:border-gray-800 text-xs text-gray-400 dark:text-gray-500">
                        <Shield className="w-3.5 h-3.5 text-primary-400" />
                        <span>Paramètres protégés • Connexion sécurisée • Actions journalisées</span>
                    </div>
                </motion.div>
            </motion.div>
        </MainLayout>
    );
}