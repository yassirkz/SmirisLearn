import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Shield, Trash2, AlertCircle, Save, Eye, Mail, Building2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function UserActionModal({ isOpen, onClose, user, action, onSuccess }) {
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
                const { error: updateError } = await supabase
                    .from('profiles')
                    .update({ role: formData.role })
                    .eq('id', user.id);

                if (updateError) throw updateError;
            } else if (action === 'delete') {
                const { error: deleteError } = await supabase
                    .from('profiles')
                    .delete()
                    .eq('id', user.id);

                if (deleteError) throw deleteError;
                
                // Note: Auth user deletion usually requires admin privileges or Edge Function
                // For now we delete from profiles table.
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
        if (isEdit) return 'from-purple-600 to-indigo-600';
        return 'from-blue-600 to-indigo-600';
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 overflow-y-auto">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/40 backdrop-blur-md"
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
                        <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
                            
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
                                        <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-xl">
                                            <div className="flex gap-3">
                                                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                                                <div>
                                                    <p className="text-sm font-bold text-red-800">Action irréversible</p>
                                                    <p className="text-sm text-red-700 mt-1">
                                                        Êtes-vous sûr de vouloir supprimer <strong>{user.full_name || user.email}</strong> ? 
                                                        Toutes ses données seront définitivement effacées.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex gap-3">
                                            <button
                                                onClick={onClose}
                                                className="flex-1 py-4 text-gray-600 font-semibold rounded-2xl hover:bg-gray-100 transition-all text-sm"
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
                                            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Nom complet</label>
                                            <div className="relative group">
                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                                                <input
                                                    type="text"
                                                    value={formData.full_name}
                                                    disabled
                                                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-gray-500 cursor-not-allowed"
                                                />
                                            </div>
                                        </div>

                                        {/* Email */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Email</label>
                                            <div className="relative group">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                <input
                                                    type="email"
                                                    value={formData.email}
                                                    disabled
                                                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-gray-500 cursor-not-allowed"
                                                />
                                            </div>
                                        </div>

                                        {/* Entreprise */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Entreprise</label>
                                            <div className="relative group">
                                                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                <input
                                                    type="text"
                                                    value={user.organizations?.name || 'Aucune'}
                                                    disabled
                                                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-gray-500 cursor-not-allowed"
                                                />
                                            </div>
                                        </div>

                                        {/* Rôle */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Rôle</label>
                                            <div className="relative group">
                                                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-500" />
                                                <select
                                                    value={formData.role}
                                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                                    disabled={isView || loading}
                                                    className={`w-full pl-12 pr-4 py-3.5 border-2 rounded-2xl outline-none transition-all appearance-none ${
                                                        isView 
                                                        ? 'bg-gray-50 border-gray-100 text-gray-500 cursor-not-allowed'
                                                        : 'bg-white border-gray-100 focus:border-purple-400 focus:ring-4 focus:ring-purple-100 text-gray-800'
                                                    }`}
                                                >
                                                    <option value="student">Élève</option>
                                                    <option value="org_admin">Admin Organisation</option>
                                                    <option value="super_admin">Super Admin</option>
                                                </select>
                                                {!isView && (
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {error && (
                                            <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-xl text-sm text-red-600 flex items-center gap-2">
                                                <AlertCircle className="w-4 h-4" />
                                                {error}
                                            </div>
                                        )}

                                        <div className="flex gap-3 pt-4">
                                            <button
                                                type="button"
                                                onClick={onClose}
                                                className="flex-1 py-4 text-gray-600 font-semibold rounded-2xl hover:bg-gray-100 transition-all text-sm"
                                            >
                                                {isView ? 'Fermer' : 'Annuler'}
                                            </button>
                                            {!isView && (
                                                <button
                                                    type="submit"
                                                    disabled={loading}
                                                    className="flex-1 py-4 bg-purple-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl hover:bg-purple-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
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
