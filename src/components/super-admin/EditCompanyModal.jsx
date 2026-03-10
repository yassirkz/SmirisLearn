import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Building, CheckCircle, AlertCircle, Sparkles, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function EditCompanyModal({ isOpen, onClose, company, onSuccess }) {
    const [formData, setFormData] = useState({
        name: '',
        plan_type: 'free'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (company) {
            setFormData({
                name: company.name || '',
                plan_type: company.plan_type || 'free'
            });
        }
    }, [company]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error: updateError } = await supabase
                .from('organizations')
                .update({
                    name: formData.name,
                    plan_type: formData.plan_type
                })
                .eq('id', company.id);

            if (updateError) throw updateError;

            onSuccess?.();
            onClose();
        } catch (err) {
            console.error('Erreur mise à jour:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
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
                                <div className="px-8 pt-8 pb-6 bg-gradient-to-br from-blue-600 to-indigo-600 text-white relative">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-2xl font-bold">Modifier l'entreprise</h2>
                                            <p className="text-blue-100 text-sm mt-1">Mettez à jour les informations</p>
                                        </div>
                                        <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-all">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Form */}
                                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-semibold text-gray-700">Nom de l'entreprise</label>
                                        <div className="relative">
                                            <Building className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                            <input
                                                type="text"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleChange}
                                                required
                                                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-sm font-semibold text-gray-700">Type de plan</label>
                                        <select
                                            name="plan_type"
                                            value={formData.plan_type}
                                            onChange={handleChange}
                                            className="w-full px-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                                        >
                                            <option value="free">Gratuit</option>
                                            <option value="starter">Starter</option>
                                            <option value="business">Business</option>
                                        </select>
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
                                            className="flex-1 py-4 text-gray-600 font-semibold rounded-2xl hover:bg-gray-100 transition-all"
                                        >
                                            Annuler
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="flex-1 py-4 bg-blue-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                                            <span>Enregistrer</span>
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                </div>
            )}
        </AnimatePresence>
    );
}
