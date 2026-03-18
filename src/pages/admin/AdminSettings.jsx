import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Settings, Save, RefreshCw, Mail, 
    Bell, Lock, Globe, Moon, Sun, Eye, EyeOff,
    CheckCircle, AlertCircle, X, Building,
    User, Key
} from 'lucide-react';
import AdminLayout from '../../components/layout/AdminLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useSearchParams } from 'react-router-dom';
import { useUserRole } from '../../hooks/useUserRole';
import { useTheme } from '../../hooks/useTheme'; // ← AJOUT
import { untrusted, escapeText } from '../../utils/security';
import SanitizedInput from '../../components/ui/SanitizedInput';

export default function AdminSettings() {
    const { user } = useAuth();
    const { role } = useUserRole();
    const { theme, setTheme } = useTheme(); // ← AJOUT
    const [searchParams] = useSearchParams();
    const orgIdFromUrl = searchParams.get('orgId');
    const isReadOnly = role === 'super_admin' && orgIdFromUrl;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

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
        sessionTimeout: '30',
        language: 'fr' // thème retiré car géré globalement
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
        fetchSettings();
    }, [user]);

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
                    .select('name')
                    .eq('id', resolvedOrgId)
                    .maybeSingle();

                if (orgError) throw orgError;
                if (org) {
                    companyName = org.name || '';
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
                sessionTimeout: localStorage.getItem('sessionTimeout') || '30',
                language: localStorage.getItem('language') || 'fr'
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
            localStorage.setItem('language', settings.language);
            localStorage.setItem('sessionTimeout', settings.sessionTimeout);
            localStorage.setItem('emailNotifications', settings.emailNotifications);
            localStorage.setItem('memberJoined', settings.memberJoined);
            localStorage.setItem('videoUploaded', settings.videoUploaded);
            localStorage.setItem('quizCompleted', settings.quizCompleted);

            setSuccess('Paramètres mis à jour avec succès');
            setOriginalSettings(settings);

        } catch (error) {
            console.error('Erreur sauvegarde:', error);
            setError(error.message || 'Erreur lors de la sauvegarde');
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

            setSuccess('Mot de passe modifié avec succès');
            setPasswordData({ current: '', new: '', confirm: '' });
            setPasswordTouched({});

        } catch (error) {
            console.error('Erreur changement mot de passe:', error);
            setError(error.message || 'Erreur lors du changement de mot de passe');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <AdminLayout>
                <div className="min-h-[60vh] flex items-center justify-center">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-indigo-200 dark:border-indigo-800 rounded-full"></div>
                        <div className="absolute top-0 left-0 w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
            >
                {/* En-tête */}
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <Settings className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                        Paramètres
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Gérez les préférences de votre entreprise
                    </p>
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
                        {/* Informations générales */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-indigo-100 dark:border-gray-700"
                        >
                            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                <Building className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
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
                                        <Mail className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                        {settings.companyEmail}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        L'email ne peut pas être modifié. C'est votre identifiant de connexion.
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
                        </motion.div>

                        {/* Notifications */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-indigo-100 dark:border-gray-700"
                        >
                            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                <Bell className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                Notifications
                            </h2>

                            <div className="space-y-3">
                                <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-xl cursor-pointer hover:bg-indigo-50 dark:hover:bg-gray-600 transition-colors">
                                    <div>
                                        <p className="font-medium text-gray-700 dark:text-gray-300">Notifications par email</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Recevoir les notifications importantes</p>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={settings.emailNotifications}
                                            onChange={(e) => setSettings({...settings, emailNotifications: e.target.checked})}
                                            className="sr-only"
                                        />
                                        <div className={`w-12 h-6 rounded-full transition-colors ${
                                            settings.emailNotifications ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
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
                                            { key: 'memberJoined', label: 'Nouveau membre rejoint' },
                                            { key: 'videoUploaded', label: 'Nouvelle vidéo uploadée' },
                                            { key: 'quizCompleted', label: 'Quiz complété' }
                                        ].map(item => (
                                            <label key={item.key} className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg">
                                                <input
                                                    type="checkbox"
                                                    checked={settings[item.key]}
                                                    onChange={(e) => setSettings({...settings, [item.key]: e.target.checked})}
                                                    className="rounded text-indigo-600 dark:bg-gray-700 dark:border-gray-600"
                                                    disabled={isReadOnly}
                                                />
                                                <span className="text-sm text-gray-600 dark:text-gray-300">{item.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>

                        {/* Apparence */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-indigo-100 dark:border-gray-700"
                        >
                            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                <Globe className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
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
                                                    ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30'
                                                    : 'border-gray-200 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-700'
                                            }`}
                                        >
                                            <Sun className="w-5 h-5 mx-auto mb-1 text-yellow-500" />
                                            <span className="text-xs dark:text-gray-300">Clair</span>
                                        </button>
                                        <button
                                            onClick={() => setTheme('dark')}
                                            className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                                                theme === 'dark'
                                                    ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30'
                                                    : 'border-gray-200 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-700'
                                            }`}
                                        >
                                            <Moon className="w-5 h-5 mx-auto mb-1 text-indigo-600 dark:text-indigo-400" />
                                            <span className="text-xs dark:text-gray-300">Sombre</span>
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Langue</p>
                                    <select
                                        value={settings.language}
                                        onChange={(e) => setSettings({...settings, language: e.target.value})}
                                        className="w-full p-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 outline-none transition-all dark:bg-gray-700 dark:text-white"
                                        disabled={isReadOnly}
                                    >
                                        <option value="fr">Français</option>
                                        <option value="en">English</option>
                                        <option value="de">Deutsch</option>
                                        <option value="ar">العربية</option>
                                    </select>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Colonne latérale */}
                    <div className="space-y-6">
                        {/* Sécurité */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-indigo-100 dark:border-gray-700"
                        >
                            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                <Lock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                Sécurité
                            </h2>

                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Expiration de session</p>
                                <select
                                    value={settings.sessionTimeout}
                                    onChange={(e) => setSettings({...settings, sessionTimeout: e.target.value})}
                                    className="w-full p-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 outline-none transition-all dark:bg-gray-700 dark:text-white"
                                    disabled={isReadOnly}
                                >
                                    <option value="15">15 minutes</option>
                                    <option value="30">30 minutes</option>
                                    <option value="60">1 heure</option>
                                    <option value="120">2 heures</option>
                                    <option value="240">4 heures</option>
                                </select>
                            </div>
                        </motion.div>

                        {/* Changement de mot de passe */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-indigo-100 dark:border-gray-700"
                        >
                            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                <Key className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                Changer le mot de passe
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
                                                        : 'border-gray-200 dark:border-gray-700 focus:border-indigo-400 dark:focus:border-indigo-500'
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
                                                    : 'border-gray-200 dark:border-gray-700 focus:border-indigo-400 dark:focus:border-indigo-500'
                                        }`}
                                        placeholder="********"
                                    />
                                    {passwordErrors.new && passwordTouched.new && (
                                        <p className="text-xs text-red-500 dark:text-red-400 mt-1">{passwordErrors.new}</p>
                                    )}
                                </div>

                                {/* Confirmation */}
                                <div>
                                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Confirmer</label>
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
                                                    : 'border-gray-200 dark:border-gray-700 focus:border-indigo-400 dark:focus:border-indigo-500'
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
                                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg'
                                            : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                    }`}
                                >
                                    Changer le mot de passe
                                </button>
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
                            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl shadow-lg hover:shadow-xl flex items-center gap-2 group"
                        >
                            {saving ? (
                                <>
                                    <RefreshCw className="w-5 h-5 animate-spin" />
                                    <span>Sauvegarde...</span>
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    <span>Sauvegarder</span>
                                </>
                            )}
                        </button>
                    </motion.div>
                )}
            </motion.div>
        </AdminLayout>
    );
}