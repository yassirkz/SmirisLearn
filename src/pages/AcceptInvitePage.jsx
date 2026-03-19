import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Building, Mail, Lock, AlertCircle, Eye, EyeOff, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { isTokenExpired } from '../utils/tokenGenerator';
import { useMemberInvitation } from '../hooks/useMemberInvitation';

export default function AcceptInvitePage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const { getInvitationByToken: getMemberInvitation, acceptInvitation: acceptMemberInvitation } = useMemberInvitation();

    const [loading, setLoading] = useState(true);
    const [invitation, setInvitation] = useState(null);
    const [invitationType, setInvitationType] = useState(null); // 'company' ou 'member'
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
    const [existingUser, setExistingUser] = useState(null);

    // ============================================
    // VÉRIFICATION DU TOKEN
    // ============================================
    useEffect(() => {
        const verifyToken = async () => {
            if (!token) {
                setError("Lien d'invitation invalide ou manquant");
                setLoading(false);
                return;
            }

            try {
                // 1. Chercher d'abord dans member_invitations
                const memberInv = await getMemberInvitation(token);
                if (memberInv) {
                    if (isTokenExpired(memberInv.expires_at)) {
                        setError("L'invitation a expiré");
                        setLoading(false);
                        return;
                    }
                    setInvitation(memberInv);
                    setInvitationType('member');

                    // Vérifier si l'utilisateur avec cet email existe déjà
                    const { data: user } = await supabase
                        .from('profiles')
                        .select('id, email')
                        .eq('email', memberInv.email)
                        .maybeSingle();
                    setExistingUser(user);
                    setLoading(false);
                    return;
                }

                // 2. Sinon, chercher dans pending_companies
                const { data: companyInv, error: companyError } = await supabase
                    .from('pending_companies')
                    .select('*')
                    .eq('token', token)
                    .maybeSingle();

                if (companyError) throw companyError;

                if (!companyInv) {
                    setError("Invitation introuvable");
                    setLoading(false);
                    return;
                }

                // Vérifier l'expiration
                if (isTokenExpired(companyInv.expires_at)) {
                    setError("L'invitation a expiré");
                    setLoading(false);
                    return;
                }

                setInvitation(companyInv);
                setInvitationType('company');
                setLoading(false);

            } catch (err) {
                console.error('Erreur vérification:', err);
                setError("Erreur de vérification");
                setLoading(false);
            }
        };

        verifyToken();
    }, [token, getMemberInvitation]);

    // ============================================
    // VALIDATION DU FORMULAIRE
    // ============================================
    const validatePassword = (value) => {
        if (!value) return "Requis";
        if (value.length < 8) return "Trop court (min. 8)";
        if (!/[A-Z]/.test(value)) return "Une majuscule requise";
        if (!/[0-9]/.test(value)) return "Un chiffre requis";
        return "";
    };

    const validateConfirmPassword = (value) => {
        if (!value) return "Veuillez confirmer le mot de passe";
        if (value !== formData.password) return "Les mots de passe ne correspondent pas";
        return "";
    };

    const passwordError = touched.password ? validatePassword(formData.password) : "";
    const confirmError = touched.confirmPassword ? validateConfirmPassword(formData.confirmPassword) : "";

    const isValid = !passwordError && !confirmError && formData.password && formData.confirmPassword;

    // ============================================
    // CRÉATION DU COMPTE ET ACCEPTATION
    // ============================================
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isValid || !invitation) return;

        setSubmitting(true);
        setError(null);

        try {
            if (invitationType === 'company') {
                // === INVITATION ENTREPRISE ===
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
                    throw new Error("Erreur à la création du compte");
                }

                // CONNEXION IMMÉDIATE (pour que l'utilisateur soit authentifié)
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email: invitation.admin_email,
                    password: formData.password
                });

                if (signInError) throw signInError;

                // Appeler la fonction sécurisée pour créer l'organisation
                const { error: rpcError } = await supabase
                    .rpc('accept_invitation_and_create_org', {
                        p_org_name: invitation.name,
                        p_admin_id: authData.user.id,
                        p_admin_name: invitation.admin_name,
                        p_token: token
                    });

                if (rpcError) throw rpcError;

                navigate('/admin', { replace: true });

            } else {
                // === INVITATION MEMBRE ===
                if (existingUser) {
                    // L'utilisateur existe déjà : on le connecte puis on accepte l'invitation
                    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
                        email: existingUser.email,
                        password: formData.password,
                    });
                    if (signInError) throw signInError;
                    await acceptMemberInvitation(token, authData.user.id);
                } else {
                    // Nouvel utilisateur : on crée le compte
                    const { data: authData, error: signUpError } = await supabase.auth.signUp({
                        email: invitation.email,
                        password: formData.password,
                        options: {
                            data: { role: invitation.role }
                        }
                    });
                    if (signUpError) throw signUpError;
                    await acceptMemberInvitation(token, authData.user.id);
                }
                navigate('/student/learning', { replace: true });
            }

        } catch (err) {
            console.error('Erreur création compte:', err);
            setError(err.message || "Erreur à la création du compte");
        } finally {
            setSubmitting(false);
        }
    };

    // ============================================
    // AFFICHAGE
    // ============================================
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4 transition-colors duration-300">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center"
                >
                    <div className="relative mx-auto w-20 h-20 mb-6">
                        <div className="absolute inset-0 rounded-full border-4 border-blue-200 dark:border-blue-800"></div>
                        <motion.div
                            className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">Validation de l'invitation...</h2>
                    <p className="text-gray-500 dark:text-gray-400">Veuillez patienter quelques instants</p>
                </motion.div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4 transition-colors duration-300">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl dark:shadow-gray-900/50 max-w-md w-full text-center transition-colors duration-300"
                >
                    <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full mx-auto mb-6 flex items-center justify-center">
                        <AlertCircle className="w-10 h-10 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Oups !</h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
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
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4 transition-colors duration-300">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl dark:shadow-gray-900/50 border border-blue-100 dark:border-gray-700 max-w-md w-full relative overflow-hidden transition-colors duration-300"
            >
                {/* Badge */}
                <div className="absolute -top-1 -right-1">
                    <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-bl-2xl rounded-tr-2xl text-xs font-bold shadow-lg">
                        Invitation Valide
                    </div>
                </div>

                {/* Logo / Icône selon le type */}
                <div className="text-center mb-8">
                    <div className={`w-20 h-20 bg-gradient-to-br ${invitationType === 'company' ? 'from-green-500 to-emerald-600' : 'from-indigo-500 to-purple-600'} rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg`}>
                        {invitationType === 'company' ? (
                            <Building className="w-10 h-10 text-white" />
                        ) : (
                            <Users className="w-10 h-10 text-white" />
                        )}
                    </div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Bienvenue !</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                        {invitationType === 'company' 
                            ? `Vous avez été invité à administrer ${invitation?.name}`
                            : `Rejoignez ${invitation?.organizations?.name} en tant que ${invitation?.role === 'org_admin' ? 'Administrateur' : 'Étudiant'}`
                        }
                    </p>
                </div>

                {/* Informations de l'invitation */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 mb-6 border border-blue-100 dark:border-gray-600">
                    {invitationType === 'company' ? (
                        <>
                            <div className="flex items-center gap-3 mb-3">
                                <Building className="w-5 h-5 text-blue-600" />
                                <span className="text-gray-700 dark:text-gray-200 font-medium">{invitation?.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Mail className="w-5 h-5 text-blue-600" />
                                <span className="text-gray-600 dark:text-gray-300 text-sm">{invitation?.admin_email}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-2">
                                <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs px-2 py-1 rounded-full">
                                    Plan Pro
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center gap-3 mb-3">
                                <Building className="w-5 h-5 text-blue-600" />
                                <span className="text-gray-700 dark:text-gray-200 font-medium">{invitation?.organizations?.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Mail className="w-5 h-5 text-blue-600" />
                                <span className="text-gray-600 dark:text-gray-300 text-sm">{invitation?.email}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-2">
                                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    invitation?.role === 'org_admin' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                }`}>
                                    {invitation?.role === 'org_admin' ? 'Administrateur' : 'Étudiant'}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Formulaire */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    {invitationType === 'member' && existingUser && (
                        <p className="text-sm text-indigo-600 dark:text-indigo-400 text-center">
                            Entrez votre mot de passe pour accepter l'invitation et lier ce compte.
                        </p>
                    )}

                    {!(invitationType === 'member' && existingUser) && (
                        <>
                            {/* Mot de passe */}
                            <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Mot de passe <span className="text-red-500">*</span>
                                </label>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        onBlur={() => setTouched({ ...touched, password: true })}
                                        className={`
                                            w-full pl-10 pr-12 py-3 border-2 rounded-xl outline-none transition-all bg-white dark:bg-gray-700 dark:text-white
                                            ${passwordError && touched.password
                                                ? 'border-red-300 dark:border-red-500/50 focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-900/30'
                                                : formData.password && !passwordError
                                                    ? 'border-green-300 dark:border-green-500/50 focus:border-green-500 focus:ring-4 focus:ring-green-100 dark:focus:ring-green-900/30'
                                                    : 'border-gray-200 dark:border-gray-600 focus:border-blue-400 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30'
                                            }
                                        `}
                                        placeholder="********"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
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
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Confirmer le mot de passe <span className="text-red-500">*</span>
                                </label>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                        onBlur={() => setTouched({ ...touched, confirmPassword: true })}
                                        className={`
                                            w-full pl-10 pr-12 py-3 border-2 rounded-xl outline-none transition-all bg-white dark:bg-gray-700 dark:text-white
                                            ${confirmError && touched.confirmPassword
                                                ? 'border-red-300 dark:border-red-500/50 focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-900/30'
                                                : formData.confirmPassword && !confirmError
                                                    ? 'border-green-300 dark:border-green-500/50 focus:border-green-500 focus:ring-4 focus:ring-green-100 dark:focus:ring-green-900/30'
                                                    : 'border-gray-200 dark:border-gray-600 focus:border-blue-400 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30'
                                            }
                                        `}
                                        placeholder="********"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
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
                        </>
                    )}

                    {/* Message d'erreur global */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="p-3 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 rounded-lg"
                            >
                                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Bouton de création */}
                    <motion.button
                        type="submit"
                        disabled={!isValid || submitting || (invitationType === 'member' && existingUser && !formData.password)}
                        whileHover={(isValid || (invitationType === 'member' && existingUser && formData.password)) ? { scale: 1.02 } : {}}
                        whileTap={(isValid || (invitationType === 'member' && existingUser && formData.password)) ? { scale: 0.98 } : {}}
                        className={`
                            w-full py-4 rounded-xl font-semibold text-white
                            transition-all duration-300 relative overflow-hidden
                            ${(isValid || (invitationType === 'member' && existingUser && formData.password)) && !submitting
                                ? 'bg-gradient-to-r from-green-600 to-emerald-600 shadow-lg shadow-green-200 hover:shadow-xl'
                                : 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                            }
                        `}
                    >
                        {submitting ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>Enregistrement...</span>
                            </div>
                        ) : invitationType === 'member' && existingUser ? (
                            "Accepter l'invitation"
                        ) : (
                            "Créer mon compte"
                        )}
                    </motion.button>
                </form>

                {/* Lien vers connexion */}
                <p className="text-center mt-6">
                    <button
                        onClick={() => navigate('/login')}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
                    >
                        Déjà un compte ? Connectez-vous
                    </button>
                </p>
            </motion.div>
        </div>
    );
}