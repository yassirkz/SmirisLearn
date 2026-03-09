import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Building, Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { isTokenExpired } from '../utils/tokenGenerator';

export default function AcceptInvitePage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [loading, setLoading] = useState(true);
    const [invitation, setInvitation] = useState(null);
    const [error, setError] = useState(null);

    // Formulaire d'inscription
    const [formData, setFormData] = useState({
        password: '',
        confirmPassword: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [touched, setTouched] = useState({
        password: false,
        confirmPassword: false
    });
    const [submitting, setSubmitting] = useState(false);

    // ============================================
    // VÉRIFICATION DU TOKEN
    // ============================================
    useEffect(() => {
        const verifyToken = async () => {
            if (!token) {
                setError('Lien d\'invitation invalide (token manquant)');
                setLoading(false);
                return;
            }

            try {
                // Récupérer l'invitation depuis pending_companies
                const { data, error } = await supabase
                    .from('pending_companies')
                    .select('*')
                    .eq('token', token)
                    .maybeSingle();

                if (error) throw error;

                if (!data) {
                    setError('Cette invitation n\'existe pas ou a déjà été utilisée');
                    setLoading(false);
                    return;
                }

                // Vérifier l'expiration
                if (isTokenExpired(data.expires_at)) {
                    setError('Cette invitation a expiré (24h)');
                    setLoading(false);
                    return;
                }

                // Tout est bon
                setInvitation(data);
                setLoading(false);

            } catch (err) {
                console.error('Erreur vérification:', err);
                setError('Erreur lors de la vérification de l\'invitation');
                setLoading(false);
            }
        };

        verifyToken();
    }, [token]);

    // ============================================
    // VALIDATION DU FORMULAIRE
    // ============================================
    const validatePassword = (value) => {
        if (!value) return "Mot de passe requis";
        if (value.length < 8) return "Minimum 8 caractères";
        if (!/[A-Z]/.test(value)) return "Au moins une majuscule";
        if (!/[0-9]/.test(value)) return "Au moins un chiffre";
        return "";
    };

    const validateConfirmPassword = (value) => {
        if (!value) return "Confirmation requise";
        if (value !== formData.password) return "Les mots de passe ne correspondent pas";
        return "";
    };

    const passwordError = touched.password ? validatePassword(formData.password) : "";
    const confirmError = touched.confirmPassword ? validateConfirmPassword(formData.confirmPassword) : "";

    const isValid = !passwordError && !confirmError && formData.password && formData.confirmPassword;

    // ============================================
    // CRÉATION DU COMPTE ET DE L'ORGANISATION
    // ============================================
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isValid || !invitation) return;

        setSubmitting(true);
        setError(null);

        try {
            // Créer l'utilisateur dans auth.users
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: invitation.admin_email,
                password: formData.password,
                options: {
                    data: {
                        full_name: invitation.admin_name,
                        role: 'org_admin'
                    }
                }
            });

            if (authError) throw authError;

            if (!authData.user) {
                throw new Error("Erreur lors de la création du compte");
            }

            // CONNEXION IMMÉDIATE (pour que l'utilisateur soit authentifié)
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: invitation.admin_email,
                password: formData.password
            });

            if (signInError) throw signInError;

            // Appeler la fonction sécurisée pour créer l'organisation
            // Le plan par défaut est 'free' (géré dans la fonction SQL)
            const { data: orgId, error: rpcError } = await supabase
                .rpc('accept_invitation_and_create_org', {
                    p_org_name: invitation.name,
                    p_admin_id: authData.user.id,
                    p_admin_name: invitation.admin_name,
                    p_token: token
                });

            if (rpcError) throw rpcError;

            // Succès ! Rediriger vers le dashboard admin
            navigate('/admin', { replace: true });

        } catch (err) {
            console.error('Erreur création compte:', err);
            setError(err.message || "Erreur lors de la création du compte");
        } finally {
            setSubmitting(false);
        }
    };

    // ============================================
    // 4. AFFICHAGE
    // ============================================
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center"
                >
                    <div className="relative mx-auto w-20 h-20 mb-6">
                        <div className="absolute inset-0 rounded-full border-4 border-blue-200"></div>
                        <motion.div
                            className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">Vérification de votre invitation</h2>
                    <p className="text-gray-500">Veuillez patienter...</p>
                </motion.div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl p-8 shadow-xl max-w-md w-full text-center"
                >
                    <div className="w-20 h-20 bg-red-100 rounded-full mx-auto mb-6 flex items-center justify-center">
                        <AlertCircle className="w-10 h-10 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Oups !</h2>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <button
                        onClick={() => navigate('/login')}
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all"
                    >
                        Retour à l'accueil
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl p-8 shadow-xl border border-blue-100 max-w-md w-full relative overflow-hidden"
            >
                {/* Badge */}
                <div className="absolute -top-1 -right-1">
                    <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-bl-2xl rounded-tr-2xl text-xs font-bold shadow-lg">
                        Invitation valide
                    </div>
                </div>

                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
                        <span className="text-3xl font-bold text-white">✓</span>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">Bienvenue !</h1>
                    <p className="text-gray-500 text-sm">
                        Créez votre compte pour rejoindre <span className="font-semibold">{invitation?.name}</span>
                    </p>
                </div>

                {/* Informations de l'invitation */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-6 border border-blue-100">
                    <div className="flex items-center gap-3 mb-3">
                        <Building className="w-5 h-5 text-blue-600" />
                        <span className="text-gray-700 font-medium">{invitation?.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-blue-600" />
                        <span className="text-gray-600 text-sm">{invitation?.admin_email}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                        <div className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                            Plan Starter - Essai 14 jours
                        </div>
                    </div>
                </div>

                {/* Formulaire */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Mot de passe */}
                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">
                            Mot de passe <span className="text-red-500">*</span>
                        </label>
                        <div className="relative group">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type={showPassword ? "text" : "password"}
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                onBlur={() => setTouched({ ...touched, password: true })}
                                className={`
                                    w-full pl-10 pr-12 py-3 border-2 rounded-xl outline-none transition-all
                                    ${passwordError && touched.password
                                        ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                                        : formData.password && !passwordError
                                            ? 'border-green-300 focus:border-green-500 focus:ring-4 focus:ring-green-100'
                                            : 'border-gray-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100'
                                    }
                                `}
                                placeholder="********"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                        <AnimatePresence>
                            {passwordError && touched.password && (
                                <motion.p
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="text-sm text-red-500 flex items-center gap-1"
                                >
                                    <AlertCircle className="w-4 h-4" />
                                    {passwordError}
                                </motion.p>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Confirmation mot de passe */}
                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">
                            Confirmer le mot de passe <span className="text-red-500">*</span>
                        </label>
                        <div className="relative group">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                onBlur={() => setTouched({ ...touched, confirmPassword: true })}
                                className={`
                                    w-full pl-10 pr-12 py-3 border-2 rounded-xl outline-none transition-all
                                    ${confirmError && touched.confirmPassword
                                        ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                                        : formData.confirmPassword && !confirmError
                                            ? 'border-green-300 focus:border-green-500 focus:ring-4 focus:ring-green-100'
                                            : 'border-gray-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100'
                                    }
                                `}
                                placeholder="********"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                        <AnimatePresence>
                            {confirmError && touched.confirmPassword && (
                                <motion.p
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="text-sm text-red-500 flex items-center gap-1"
                                >
                                    <AlertCircle className="w-4 h-4" />
                                    {confirmError}
                                </motion.p>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Message d'erreur global */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="p-3 bg-red-50 border-l-4 border-red-500 rounded-lg"
                            >
                                <p className="text-sm text-red-600">{error}</p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Bouton de création */}
                    <motion.button
                        type="submit"
                        disabled={!isValid || submitting}
                        whileHover={isValid ? { scale: 1.02 } : {}}
                        whileTap={isValid ? { scale: 0.98 } : {}}
                        className={`
                            w-full py-4 rounded-xl font-semibold text-white
                            transition-all duration-300 relative overflow-hidden
                            ${isValid && !submitting
                                ? 'bg-gradient-to-r from-green-600 to-emerald-600 shadow-lg shadow-green-200 hover:shadow-xl'
                                : 'bg-gray-300 cursor-not-allowed'
                            }
                        `}
                    >
                        {submitting ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>Création en cours...</span>
                            </div>
                        ) : (
                            'Créer mon compte'
                        )}
                    </motion.button>
                </form>

                {/* Lien vers connexion */}
                <p className="text-center mt-6">
                    <button
                        onClick={() => navigate('/login')}
                        className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                    >
                        Déjà un compte ? Se connecter
                    </button>
                </p>
            </motion.div>
        </div>
    );
}