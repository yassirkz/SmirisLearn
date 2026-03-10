import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Settings, User, Mail, Bell, Moon, Sun,
    Shield, Eye, EyeOff, Save, RefreshCw, CheckCircle,
    AlertCircle, X, Key, Download, Zap, Activity,  Server, Sparkles
} from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { untrusted, escapeText } from '../../utils/security';
import SanitizedInput from '../../components/ui/SanitizedInput';

export default function SuperAdminSettings() {
    const { user } = useAuth();
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
        theme: 'light',
        language: 'fr',
        sessionTimeout: '30'
    });

    // ============================================
    // 4. CONFIGURATION PLATEFORME (DYNAMIQUE - Supabase)
    // ============================================
    const [platformConfig, setPlatformConfig] = useState({
        default_limits: {
            free: { users: 5, videos: 5, storage: 1 },
            starter: { users: 20, videos: 50, storage: 10 },
            business: { users: -1, videos: -1, storage: 100 }
        },
        trial_days: 14,
        allow_registration: true,
        maintenance_mode: false,
        max_file_size: 500,
        allowed_video_formats: ['mp4', 'webm', 'mov'],
        api_enabled: false,
        api_rate_limit: 1000
    });

    // ============================================
    // 5. STATISTIQUES PLATEFORME (DYNAMIQUES)
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

    // ============================================
    // Récupérer le profil
    // ============================================
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

    // ============================================
    // Récupérer les préférences (localStorage)
    // ============================================
    const fetchPreferences = () => {
        setPreferences({
            emailNotifications: localStorage.getItem('emailNotifications') !== 'false',
            newCompanyAlert: localStorage.getItem('newCompanyAlert') !== 'false',
            newUserAlert: localStorage.getItem('newUserAlert') !== 'false',
            theme: localStorage.getItem('theme') || 'light',
            language: localStorage.getItem('language') || 'fr',
            sessionTimeout: localStorage.getItem('sessionTimeout') || '30'
        });

        // Appliquer le thème
        if (localStorage.getItem('theme') === 'dark') {
            document.documentElement.classList.add('dark');
        }
    };

    // ============================================
    // Récupérer la configuration depuis Supabase
    // ============================================
    const fetchPlatformConfig = async () => {
    try {
        // Vérifier si la ligne existe
        const { data: existing, error: checkError } = await supabase
            .from('system_settings')
            .select('*')
            .eq('id', 1)
            .maybeSingle();

        if (checkError) throw checkError;

        // Créer la ligne si elle n'existe pas
        if (!existing) {
            const { error: insertError } = await supabase
                .from('system_settings')
                .insert({ id: 1 });

            if (insertError) throw insertError;
        }

        // Récupérer les settings
        const { data, error } = await supabase
            .from('system_settings')
            .select('*')
            .eq('id', 1)
            .single();

        if (error) throw error;
        
        if (data) {
            setPlatformConfig({
                default_limits: data.default_limits || platformConfig.default_limits,
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

    // ============================================
    // Récupérer les statistiques plateforme
    // ============================================
    const fetchPlatformStats = async () => {
        try {
            // Compter les entreprises
            const { count: companiesCount } = await supabase
                .from('organizations')
                .select('*', { count: 'exact', head: true });

            // Compter les utilisateurs
            const { count: usersCount } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true });

            // Compter les vidéos
            const { count: videosCount } = await supabase
                .from('videos')
                .select('*', { count: 'exact', head: true });

            // Calculer le stockage utilisé (estimation: 50 Mo par vidéo)
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

    // ============================================
    // Validation mot de passe
    // ============================================
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

    // ============================================
    // Sauvegarde du profil
    // ============================================
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

    // ============================================
    // Changement de mot de passe
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

    // ============================================
    // Sauvegarde des préférences
    // ============================================
    const handleSavePreferences = () => {
        Object.entries(preferences).forEach(([key, value]) => {
            localStorage.setItem(key, value.toString());
        });

        // Appliquer le thème
        if (preferences.theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        setSuccess('Préférences sauvegardées');
    };

    // ============================================
    // Sauvegarde de la configuration plateforme
    // ============================================
    const handleSavePlatformConfig = async () => {
        setSaving(true);
        setError('');
        setSuccess('');

        try {
            const { error } = await supabase
                .rpc('update_system_settings', {
                    p_default_limits: platformConfig.default_limits,
                    p_trial_days: platformConfig.trial_days,
                    p_allow_registration: platformConfig.allow_registration,
                    p_maintenance_mode: platformConfig.maintenance_mode,
                    p_max_file_size: platformConfig.max_file_size,
                    p_allowed_video_formats: platformConfig.allowed_video_formats,
                    p_api_enabled: platformConfig.api_enabled,
                    p_api_rate_limit: platformConfig.api_rate_limit
                });

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
    // Formater la taille de stockage
    // ============================================
    const formatStorage = (mb) => {
        if (mb > 1024) {
            return `${(mb / 1024).toFixed(1)} Go`;
        }
        return `${mb} Mo`;
    };

    // ============================================
    // Rafraîchir les stats
    // ============================================
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

    // ============================================
    // Exporter les données (CSV)
    // ============================================
    const handleExportData = async () => {
        setExporting(true);
        setError('');
        
        try {
            // Récupérer les données des organisations
            const { data: orgs, error: orgsError } = await supabase
                .from('organizations')
                .select('name, plan_type, created_at');

            if (orgsError) throw orgsError;

            if (!orgs || orgs.length === 0) {
                setError('Aucune donnée à exporter');
                return;
            }

            // Créer le contenu CSV
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

            // Créer le blob et déclencher le téléchargement
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
                        <div className="w-20 h-20 border-4 border-purple-200 rounded-full"></div>
                        <div className="absolute top-0 left-0 w-20 h-20 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="mt-4 text-gray-500">Chargement des paramètres...</p>
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
                {/* En-tête */}
                <div className="relative">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-4 -right-4"
                    >
                        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-bl-2xl rounded-tr-2xl text-xs font-bold shadow-lg flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            Administration
                        </div>
                    </motion.div>

                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                            <Settings className="w-8 h-8 text-purple-600" />
                            Paramètres
                        </h1>
                        <p className="text-gray-500 mt-1">
                            Gérez votre profil et la configuration de la plateforme
                        </p>
                    </div>
                </div>

                {/* Messages de succès/erreur */}
                <AnimatePresence>
                    {success && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3"
                        >
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <p className="text-sm text-green-700 flex-1">{success}</p>
                            <button onClick={() => setSuccess('')} className="text-green-600 hover:text-green-800">
                                <X className="w-4 h-4" />
                            </button>
                        </motion.div>
                    )}

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3"
                        >
                            <AlertCircle className="w-5 h-5 text-red-600" />
                            <p className="text-sm text-red-700 flex-1">{error}</p>
                            <button onClick={() => setError('')} className="text-red-600 hover:text-red-800">
                                <X className="w-4 h-4" />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Grille des paramètres */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Colonne principale (2/3) */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* ============================================
                            1. PROFIL SUPER ADMIN
                        ============================================ */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-purple-100"
                        >
                            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <User className="w-5 h-5 text-purple-600" />
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
                                />

                                <div className="bg-gray-50 p-4 rounded-xl">
                                    <p className="text-sm text-gray-600 mb-1">Email</p>
                                    <p className="text-lg font-medium text-gray-800 flex items-center gap-2">
                                        <Mail className="w-4 h-4 text-purple-600" />
                                        {profile.email}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        L'email ne peut pas être modifié.
                                    </p>
                                </div>

                                <button
                                    onClick={handleSaveProfile}
                                    disabled={saving}
                                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all"
                                >
                                    Mettre à jour le profil
                                </button>
                            </div>
                        </motion.div>

                        {/* ============================================
                            2. CHANGEMENT DE MOT DE PASSE
                        ============================================ */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-purple-100"
                        >
                            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <Key className="w-5 h-5 text-purple-600" />
                                Changer le mot de passe
                            </h2>

                            <div className="space-y-4">
                                {/* Mot de passe actuel */}
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">Mot de passe actuel</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword.current ? "text" : "password"}
                                            value={passwordData.current}
                                            onChange={(e) => setPasswordData({...passwordData, current: e.target.value})}
                                            onBlur={() => setPasswordTouched({...passwordTouched, current: true})}
                                            className={`w-full p-3 pr-10 border-2 rounded-xl outline-none transition-all ${
                                                passwordErrors.current && passwordTouched.current
                                                    ? 'border-red-300 focus:border-red-500'
                                                    : passwordData.current && !passwordErrors.current
                                                        ? 'border-green-300 focus:border-green-500'
                                                        : 'border-gray-200 focus:border-purple-400'
                                            }`}
                                            placeholder="********"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword({...showPassword, current: !showPassword.current})}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                                        >
                                            {showPassword.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    {passwordErrors.current && passwordTouched.current && (
                                        <p className="text-xs text-red-500 mt-1">{passwordErrors.current}</p>
                                    )}
                                </div>

                                {/* Nouveau mot de passe */}
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">Nouveau mot de passe</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword.new ? "text" : "password"}
                                            value={passwordData.new}
                                            onChange={(e) => setPasswordData({...passwordData, new: e.target.value})}
                                            onBlur={() => setPasswordTouched({...passwordTouched, new: true})}
                                            className={`w-full p-3 pr-10 border-2 rounded-xl outline-none transition-all ${
                                                passwordErrors.new && passwordTouched.new
                                                    ? 'border-red-300 focus:border-red-500'
                                                    : passwordData.new && !passwordErrors.new
                                                        ? 'border-green-300 focus:border-green-500'
                                                        : 'border-gray-200 focus:border-purple-400'
                                            }`}
                                            placeholder="********"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword({...showPassword, new: !showPassword.new})}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                                        >
                                            {showPassword.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    {passwordErrors.new && passwordTouched.new && (
                                        <p className="text-xs text-red-500 mt-1">{passwordErrors.new}</p>
                                    )}
                                </div>

                                {/* Confirmation */}
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">Confirmer</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword.confirm ? "text" : "password"}
                                            value={passwordData.confirm}
                                            onChange={(e) => setPasswordData({...passwordData, confirm: e.target.value})}
                                            onBlur={() => setPasswordTouched({...passwordTouched, confirm: true})}
                                            className={`w-full p-3 pr-10 border-2 rounded-xl outline-none transition-all ${
                                                passwordErrors.confirm && passwordTouched.confirm
                                                    ? 'border-red-300 focus:border-red-500'
                                                    : passwordData.confirm && !passwordErrors.confirm
                                                        ? 'border-green-300 focus:border-green-500'
                                                        : 'border-gray-200 focus:border-purple-400'
                                            }`}
                                            placeholder="********"
                                        />
                                    </div>
                                    {passwordErrors.confirm && passwordTouched.confirm && (
                                        <p className="text-xs text-red-500 mt-1">{passwordErrors.confirm}</p>
                                    )}
                                </div>

                                <button
                                    onClick={handleChangePassword}
                                    disabled={!isPasswordValid || saving}
                                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                                        isPasswordValid && !saving
                                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg'
                                            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                    }`}
                                >
                                    Changer le mot de passe
                                </button>
                            </div>
                        </motion.div>

                        {/* ============================================
                            3. PRÉFÉRENCES
                        ============================================ */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-purple-100"
                        >
                            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <Bell className="w-5 h-5 text-purple-600" />
                                Préférences
                            </h2>

                            {/* Notifications */}
                            <div className="mb-6">
                                <h3 className="text-sm font-medium text-gray-700 mb-3">Notifications</h3>
                                <div className="space-y-3">
                                    {[
                                        { key: 'emailNotifications', label: 'Notifications par email' },
                                        { key: 'newCompanyAlert', label: 'Nouvelle entreprise créée' },
                                        { key: 'newUserAlert', label: 'Nouvel utilisateur inscrit' }
                                    ].map(item => (
                                        <label key={item.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-purple-50 transition-colors">
                                            <span className="text-sm text-gray-700">{item.label}</span>
                                            <div className="relative">
                                                <input
                                                    type="checkbox"
                                                    checked={preferences[item.key]}
                                                    onChange={(e) => setPreferences({...preferences, [item.key]: e.target.checked})}
                                                    className="sr-only"
                                                />
                                                <div className={`w-12 h-6 rounded-full transition-colors ${
                                                    preferences[item.key] ? 'bg-purple-600' : 'bg-gray-300'
                                                }`}>
                                                    <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                                                        preferences[item.key] ? 'translate-x-6' : 'translate-x-1'
                                                    }`} />
                                                </div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Thème et langue */}
                            <div className="mb-6">
                                <h3 className="text-sm font-medium text-gray-700 mb-3">Apparence</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-500 mb-2">Thème</p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setPreferences({...preferences, theme: 'light'})}
                                                className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                                                    preferences.theme === 'light'
                                                        ? 'border-purple-600 bg-purple-50'
                                                        : 'border-gray-200 hover:border-purple-200'
                                                }`}
                                            >
                                                <Sun className="w-5 h-5 mx-auto mb-1 text-yellow-500" />
                                                <span className="text-xs">Clair</span>
                                            </button>
                                            <button
                                                onClick={() => setPreferences({...preferences, theme: 'dark'})}
                                                className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                                                    preferences.theme === 'dark'
                                                        ? 'border-purple-600 bg-purple-50'
                                                        : 'border-gray-200 hover:border-purple-200'
                                                }`}
                                            >
                                                <Moon className="w-5 h-5 mx-auto mb-1 text-indigo-600" />
                                                <span className="text-xs">Sombre</span>
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-2">Langue</p>
                                        <select
                                            value={preferences.language}
                                            onChange={(e) => setPreferences({...preferences, language: e.target.value})}
                                            className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none transition-all"
                                        >
                                            <option value="fr">Français</option>
                                            <option value="en">English</option>
                                            <option value="de">Deutsch</option>
                                            <option value="ar">العربية</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Sécurité */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-700 mb-3">Sécurité</h3>
                                <div>
                                    <p className="text-xs text-gray-500 mb-2">Expiration de session</p>
                                    <select
                                        value={preferences.sessionTimeout}
                                        onChange={(e) => setPreferences({...preferences, sessionTimeout: e.target.value})}
                                        className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none transition-all"
                                    >
                                        <option value="15">15 minutes</option>
                                        <option value="30">30 minutes</option>
                                        <option value="60">1 heure</option>
                                        <option value="120">2 heures</option>
                                        <option value="240">4 heures</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                onClick={handleSavePreferences}
                                className="mt-4 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all"
                            >
                                Sauvegarder les préférences
                            </button>
                        </motion.div>

                        {/* ============================================
                            4. CONFIGURATION PLATEFORME
                        ============================================ */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-purple-100"
                        >
                            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <Server className="w-5 h-5 text-purple-600" />
                                Configuration plateforme
                            </h2>

                            {/* Limites par défaut */}
                            <div className="mb-6">
                                <h3 className="text-sm font-medium text-gray-700 mb-3">Limites par défaut</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {['free', 'starter', 'business'].map(plan => (
                                        <div key={plan} className="p-4 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200">
                                            <p className="font-bold text-gray-800 capitalize mb-3 flex items-center gap-2">
                                                {plan === 'free' && <span className="w-2 h-2 bg-gray-400 rounded-full"></span>}
                                                {plan === 'starter' && <span className="w-2 h-2 bg-blue-500 rounded-full"></span>}
                                                {plan === 'business' && <span className="w-2 h-2 bg-purple-500 rounded-full"></span>}
                                                {plan}
                                            </p>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-500">Utilisateurs:</span>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="number"
                                                            value={platformConfig.default_limits[plan]?.users === -1 ? '' : platformConfig.default_limits[plan]?.users}
                                                            onChange={(e) => {
                                                                const value = e.target.value === '' ? -1 : parseInt(e.target.value);
                                                                setPlatformConfig({
                                                                    ...platformConfig,
                                                                    default_limits: {
                                                                        ...platformConfig.default_limits,
                                                                        [plan]: {
                                                                            ...platformConfig.default_limits[plan],
                                                                            users: value
                                                                        }
                                                                    }
                                                                });
                                                            }}
                                                            className="w-16 p-1 text-right border border-gray-200 rounded focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none"
                                                            placeholder="∞"
                                                        />
                                                        {platformConfig.default_limits[plan]?.users === -1 && (
                                                            <span className="text-xs text-gray-400">(illimité)</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-500">Vidéos:</span>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="number"
                                                            value={platformConfig.default_limits[plan]?.videos === -1 ? '' : platformConfig.default_limits[plan]?.videos}
                                                            onChange={(e) => {
                                                                const value = e.target.value === '' ? -1 : parseInt(e.target.value);
                                                                setPlatformConfig({
                                                                    ...platformConfig,
                                                                    default_limits: {
                                                                        ...platformConfig.default_limits,
                                                                        [plan]: {
                                                                            ...platformConfig.default_limits[plan],
                                                                            videos: value
                                                                        }
                                                                    }
                                                                });
                                                            }}
                                                            className="w-16 p-1 text-right border border-gray-200 rounded focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none"
                                                            placeholder="∞"
                                                        />
                                                        {platformConfig.default_limits[plan]?.videos === -1 && (
                                                            <span className="text-xs text-gray-400">(illimité)</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-500">Stockage:</span>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="number"
                                                            value={platformConfig.default_limits[plan]?.storage}
                                                            onChange={(e) => {
                                                                setPlatformConfig({
                                                                    ...platformConfig,
                                                                    default_limits: {
                                                                        ...platformConfig.default_limits,
                                                                        [plan]: {
                                                                            ...platformConfig.default_limits[plan],
                                                                            storage: parseInt(e.target.value)
                                                                        }
                                                                    }
                                                                });
                                                            }}
                                                            className="w-16 p-1 text-right border border-gray-200 rounded focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none"
                                                        />
                                                        <span className="text-xs text-gray-500">Go</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Paramètres généraux */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Période d'essai (jours)
                                    </label>
                                    <input
                                        type="number"
                                        value={platformConfig.trial_days}
                                        onChange={(e) => setPlatformConfig({...platformConfig, trial_days: parseInt(e.target.value)})}
                                        className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none transition-all"
                                        min="0"
                                        max="90"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Taille maximale des fichiers (Mo)
                                    </label>
                                    <input
                                        type="number"
                                        value={platformConfig.max_file_size}
                                        onChange={(e) => setPlatformConfig({...platformConfig, max_file_size: parseInt(e.target.value)})}
                                        className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none transition-all"
                                        min="1"
                                        max="10240"
                                    />
                                </div>
                            </div>

                            {/* Toggles */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-purple-50 transition-colors">
                                    <div>
                                        <p className="font-medium text-gray-700">Autoriser les inscriptions</p>
                                        <p className="text-xs text-gray-500">Les nouveaux utilisateurs peuvent s'inscrire</p>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={platformConfig.allow_registration}
                                            onChange={(e) => setPlatformConfig({...platformConfig, allow_registration: e.target.checked})}
                                            className="sr-only"
                                        />
                                        <div className={`w-14 h-7 rounded-full transition-colors ${
                                            platformConfig.allow_registration ? 'bg-green-500' : 'bg-gray-300'
                                        }`}>
                                            <div className={`w-6 h-6 bg-white rounded-full shadow transform transition-transform mt-0.5 ${
                                                platformConfig.allow_registration ? 'translate-x-7' : 'translate-x-1'
                                            }`} />
                                        </div>
                                    </div>
                                </label>

                                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-purple-50 transition-colors">
                                    <div>
                                        <p className="font-medium text-gray-700">Mode maintenance</p>
                                        <p className="text-xs text-gray-500">La plateforme est en maintenance</p>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={platformConfig.maintenance_mode}
                                            onChange={(e) => setPlatformConfig({...platformConfig, maintenance_mode: e.target.checked})}
                                            className="sr-only"
                                        />
                                        <div className={`w-14 h-7 rounded-full transition-colors ${
                                            platformConfig.maintenance_mode ? 'bg-red-500' : 'bg-gray-300'
                                        }`}>
                                            <div className={`w-6 h-6 bg-white rounded-full shadow transform transition-transform mt-0.5 ${
                                                platformConfig.maintenance_mode ? 'translate-x-7' : 'translate-x-1'
                                            }`} />
                                        </div>
                                    </div>
                                </label>
                            </div>

                            {/* Formats vidéo autorisés */}
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Formats vidéo autorisés
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {['mp4', 'webm', 'mov', 'avi', 'mkv'].map(format => (
                                        <label key={format} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-purple-50 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={platformConfig.allowed_video_formats?.includes(format)}
                                                onChange={(e) => {
                                                    const newFormats = e.target.checked
                                                        ? [...(platformConfig.allowed_video_formats || []), format]
                                                        : (platformConfig.allowed_video_formats || []).filter(f => f !== format);
                                                    setPlatformConfig({...platformConfig, allowed_video_formats: newFormats});
                                                }}
                                                className="rounded text-purple-600 focus:ring-purple-200"
                                            />
                                            <span className="text-sm text-gray-700 uppercase">{format}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* API */}
                            <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
                                <label className="flex items-center justify-between cursor-pointer">
                                    <div>
                                        <p className="font-medium text-gray-700">Activer l'API</p>
                                        <p className="text-xs text-gray-500">Permettre les accès API externes</p>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={platformConfig.api_enabled}
                                            onChange={(e) => setPlatformConfig({...platformConfig, api_enabled: e.target.checked})}
                                            className="sr-only"
                                        />
                                        <div className={`w-14 h-7 rounded-full transition-colors ${
                                            platformConfig.api_enabled ? 'bg-purple-600' : 'bg-gray-300'
                                        }`}>
                                            <div className={`w-6 h-6 bg-white rounded-full shadow transform transition-transform mt-0.5 ${
                                                platformConfig.api_enabled ? 'translate-x-7' : 'translate-x-1'
                                            }`} />
                                        </div>
                                    </div>
                                </label>

                                {platformConfig.api_enabled && (
                                    <div className="mt-3">
                                        <label className="block text-sm text-gray-600 mb-1">
                                            Limite de requêtes API (par heure)
                                        </label>
                                        <input
                                            type="number"
                                            value={platformConfig.api_rate_limit}
                                            onChange={(e) => setPlatformConfig({...platformConfig, api_rate_limit: parseInt(e.target.value)})}
                                            className="w-full p-2 border border-gray-200 rounded-lg focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none"
                                            min="1"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Bouton de sauvegarde */}
                            <div className="mt-6 flex justify-end">
                                <button
                                    onClick={handleSavePlatformConfig}
                                    disabled={saving}
                                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
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

                    {/* Colonne latérale (1/3) */}
                    <div className="space-y-6">
                        {/* ============================================
                            STATUT DE LA PLATEFORME (DYNAMIQUE)
                        ============================================ */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl p-6 shadow-xl text-white"
                        >
                            <div className="flex items-center gap-2 mb-4">
                                <Activity className="w-5 h-5" />
                                <h3 className="font-semibold">Statut de la plateforme</h3>
                            </div>
                            
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="opacity-80">Entreprises</span>
                                    <span className="font-bold">{platformStats.companies}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="opacity-80">Utilisateurs</span>
                                    <span className="font-bold">{platformStats.users}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="opacity-80">Vidéos</span>
                                    <span className="font-bold">{platformStats.videos}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="opacity-80">Stockage utilisé</span>
                                    <span className="font-bold">{formatStorage(platformStats.storageUsed)}</span>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-white/20">
                                <div className="flex items-center gap-2 text-sm">
                                    <Zap className="w-4 h-4" />
                                    <span>Tout est opérationnel</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Actions rapides */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-purple-100"
                        >
                            <h3 className="text-sm font-medium text-gray-700 mb-4">Actions rapides</h3>
                            <div className="space-y-2">
                                <button
                                    onClick={handleRefreshStats}
                                    disabled={refreshing || exporting}
                                    className="w-full px-4 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 disabled:opacity-50 transition-colors text-sm flex items-center gap-2"
                                >
                                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                                    <span>{refreshing ? 'Mise à jour...' : 'Rafraîchir les stats'}</span>
                                </button>
                                <button
                                    onClick={handleExportData}
                                    disabled={refreshing || exporting}
                                    className="w-full px-4 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors text-sm flex items-center gap-2"
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
                    className="text-center text-xs text-gray-400 flex items-center justify-center gap-1"
                >
                    <Shield className="w-3 h-3" />
                    <span>Paramètres protégés • Connexion sécurisée • Actions journalisées</span>
                </motion.div>
            </motion.div>
        </MainLayout>
    );
}