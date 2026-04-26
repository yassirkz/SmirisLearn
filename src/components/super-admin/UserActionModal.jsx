import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Shield, Trash2, AlertCircle, Save, Eye, Mail, Building2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

export default function UserActionModal({ isOpen, onClose, user, action, onSuccess }) {
    const { startImpersonation } = useAuth();
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        role: 'student'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData({
                full_name: user.full_name || '',
                email: user.email || '',
                role: user.role || 'student'
            });
            setShowDeleteConfirm(false);
            setError(null);
        }
    }, [user, action]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (action === 'view') return;
        
        setLoading(true);
        setError(null);

        try {
            if (action === 'edit') {
                // APPEL SÉCURISÉ À L'EDGE FUNCTION (Verrouille l'élévation de privilèges)
                const { data, error: functionError } = await supabase.functions.invoke('manage-user-role', {
                    body: { 
                        targetUserId: user.id, 
                        newRole: formData.role 
                    }
                });

                if (functionError || data?.error) {
                    throw new Error(data?.error || functionError?.message || 'Erreur lors du changement de rôle');
                }
            } else if (action === 'delete') {
                // Nettoyage des données dépendantes pour éviter les erreurs de clés étrangères
                // 1. Supprimer les progrès
                await supabase
                    .from('user_progress')
                    .delete()
                    .eq('user_id', user.id);

                // 2. Supprimer les appartenances aux groupes
                await supabase
                    .from('group_members')
                    .delete()
                    .eq('user_id', user.id);

                // 3. Supprimer le profil final
                const { error: deleteError } = await supabase
                    .from('profiles')
                    .delete()
                    .eq('id', user.id);

                if (deleteError) throw deleteError;
            }

            onSuccess?.();
            onClose();
        } catch (err) {
            console.error('Erreur action utilisateur:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !user) return null;

    const isDelete = action === 'delete' || showDeleteConfirm;
    const isEdit = action === 'edit';
    const isView = action === 'view';

    const getTitle = () => {
        if (isView) return 'Détails de l\'utilisateur';
        if (isEdit) return 'Modifier le rôle';
        if (action === 'delete') return 'Supprimer l\'utilisateur';
        return 'Action utilisateur';
    };

    const getHeaderGradient = () => {
        if (isDelete) return 'from-red-600 to-pink-600';
        if (isEdit) return 'from-primary-600 to-accent-600';
        return 'from-primary-600 to-primary-800';
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 overflow-y-auto">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md"
                    onClick={onClose}
                />

                <div className="min-h-screen px-4 text-center">
                    <span className="inline-block h-screen align-middle">&#8203;</span>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 40 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 40 }}
                        className="relative inline-block w-full max-w-md my-8 text-left align-middle"
                    >
                        <div className="relative bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-gray-800 overflow-hidden">
                            
                            {/* Header */}
                            <div className={`px-8 pt-8 pb-6 bg-gradient-to-br ${getHeaderGradient()} text-white relative`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white/20 rounded-lg">
                                            {isDelete ? <Trash2 className="w-5 h-5" /> : isEdit ? <Shield className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold">{getTitle()}</h2>
                                            <p className="text-white/80 text-xs mt-0.5">{user.email}</p>
                                        </div>
                                    </div>
                                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-all">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-8 space-y-6">
                                {action === 'delete' ? (
                                    <div className="space-y-6">
                                        <div className="p-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 rounded-xl">
                                            <div className="flex gap-3">
                                                <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 shrink-0" />
                                                <div>
                                                    <p className="text-sm font-bold text-red-800 dark:text-red-300">Action irréversible</p>
                                                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                                                        Êtes-vous sûr de vouloir supprimer <strong>{user.full_name || user.email}</strong> ? 
                                                        Toutes ses données seront définitivement effacées.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex gap-3">
                                            <button
                                                onClick={onClose}
                                                className="flex-1 py-4 text-gray-600 dark:text-gray-400 font-semibold rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all text-sm"
                                            >
                                                Annuler
                                            </button>
                                            <button
                                                onClick={handleSubmit}
                                                disabled={loading}
                                                className="flex-1 py-4 bg-red-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl hover:bg-red-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                                            >
                                                {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Trash2 className="w-5 h-5" />}
                                                <span>Supprimer</span>
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        {/* Nom complet */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1">Nom complet</label>
                                            <div className="relative group">
                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500 group-focus-within:text-primary-500 dark:group-focus-within:text-primary-400 transition-colors" />
                                                <input
                                                    type="text"
                                                    value={formData.full_name}
                                                    disabled
                                                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-2xl text-gray-500 dark:text-gray-400 cursor-not-allowed"
                                                />
                                            </div>
                                        </div>

                                        {/* Email */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1">Email</label>
                                            <div className="relative group">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                                                <input
                                                    type="email"
                                                    value={formData.email}
                                                    disabled
                                                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-2xl text-gray-500 dark:text-gray-400 cursor-not-allowed"
                                                />
                                            </div>
                                        </div>

                                        {/* Entreprise */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1">Entreprise</label>
                                            <div className="relative group">
                                                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                                                <input
                                                    type="text"
                                                    value={user.organizations?.name || 'Aucune'}
                                                    disabled
                                                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-2xl text-gray-500 dark:text-gray-400 cursor-not-allowed"
                                                />
                                            </div>
                                        </div>

                                        {/* Rôle */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1">Rôle</label>
                                            <div className="relative group">
                                                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-500 dark:text-primary-400" />
                                                <select
                                                    value={formData.role}
                                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                                    disabled={isView || loading}
                                                    className={`w-full pl-12 pr-4 py-3.5 border-2 rounded-2xl outline-none transition-all appearance-none ${
                                                        isView 
                                                        ? 'bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                                        : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 focus:border-primary-400 dark:focus:border-primary-500 focus:ring-4 focus:ring-primary-100 dark:focus:ring-primary-900/30 text-gray-800 dark:text-gray-200'
                                                    }`}
                                                >
                                                    <option value="student">Élève</option>
                                                    <option value="org_admin">Admin Organisation</option>
                                                    <option value="super_admin">Super Admin</option>
                                                </select>
                                                {!isView && (
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                                        <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {error && (
                                            <div className="p-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 rounded-xl text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                                                <AlertCircle className="w-4 h-4" />
                                                {error}
                                            </div>
                                        )}

                                        <div className="flex gap-3 pt-4">
                                            <button
                                                type="button"
                                                onClick={onClose}
                                                className="flex-1 py-4 text-gray-600 dark:text-gray-400 font-semibold rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all text-sm"
                                            >
                                                {isView ? 'Fermer' : 'Annuler'}
                                            </button>
                                            {isView && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        onClose();
                                                        startImpersonation(user.id);
                                                    }}
                                                    className="flex-1 py-4 bg-blue-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 text-sm"
                                                >
                                                    <Eye className="w-5 h-5" />
                                                    <span>Voir comme l'utilisateur</span>
                                                </button>
                                            )}
                                            {!isView && (
                                                <button
                                                    type="submit"
                                                    disabled={loading}
                                                    className="flex-1 py-4 bg-primary-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl hover:bg-primary-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                                                >
                                                    {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                                                    <span>Enregistrer</span>
                                                </button>
                                            )}
                                        </div>
                                    </form>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </AnimatePresence>
    );
}