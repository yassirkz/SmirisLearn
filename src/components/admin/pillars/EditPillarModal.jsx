// src/components/admin/pillars/EditPillarModal.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Sparkles, Save, Eye
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../ui/Toast';
import SanitizedInput from '../../ui/SanitizedInput';

const ICONS = ['📚', '🎓', '💻', '📊', '🎯', '⚡', '🌟', '🔥', '💡', '🎨', '📝', '🔬'];
const COLORS = [
    { name: 'blue', class: 'bg-blue-500', gradient: 'from-blue-500 to-indigo-600' },
    { name: 'purple', class: 'bg-purple-500', gradient: 'from-purple-500 to-pink-600' },
    { name: 'green', class: 'bg-green-500', gradient: 'from-green-500 to-emerald-600' },
    { name: 'red', class: 'bg-red-500', gradient: 'from-red-500 to-pink-600' },
    { name: 'yellow', class: 'bg-yellow-500', gradient: 'from-yellow-500 to-orange-600' },
    { name: 'indigo', class: 'bg-indigo-500', gradient: 'from-indigo-500 to-purple-600' },
    { name: 'pink', class: 'bg-pink-500', gradient: 'from-pink-500 to-rose-600' },
    { name: 'orange', class: 'bg-orange-500', gradient: 'from-orange-500 to-red-600' }
];

export default function EditPillarModal({ isOpen, onClose, pillar, onSuccess }) {
    const { success, error: showError } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        icon: '📚',
        color: 'blue'
    });
    const [touched, setTouched] = useState({});
    const [previewMode, setPreviewMode] = useState(false);

    useEffect(() => {
        if (pillar) {
            setFormData({
                name: pillar.name || '',
                description: pillar.description || '',
                icon: pillar.icon || '📚',
                color: pillar.color || 'blue'
            });
        }
    }, [pillar]);

    const validateForm = () => {
        const errors = {};
        if (!formData.name) errors.name = "Ce champ est obligatoire";
        else if (formData.name.length < 3) errors.name = "Minimum 3 caractères";
        else if (formData.name.length > 50) errors.name = "Maximum 50 caractères";
        
        if (formData.description && formData.description.length > 200) {
            errors.description = "La description ne peut pas dépasser 200 caractères";
        }
        return errors;
    };

    const errors = validateForm();
    const isValid = Object.keys(errors).length === 0;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isValid || loading || !pillar) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('pillars')
                .update({
                    name: formData.name.trim(),
                    description: formData.description.trim() || null,
                    icon: formData.icon,
                    color: formData.color
                })
                .eq('id', pillar.id);

            if (error) throw error;

            success('Pilier modifié avec succès');
            onSuccess?.();
            onClose();
        } catch (err) {
            console.error('Erreur modification pilier:', err);
            showError(err.message || 'Erreur lors de la modification');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !pillar) return null;

    const selectedColor = COLORS.find(c => c.name === formData.color);

    return (
        <AnimatePresence>
            {isOpen && (
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
                            className="relative inline-block w-full max-w-2xl my-8 text-left align-middle"
                        >
                            <div className="relative bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-gray-800 overflow-hidden">
                                <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-full opacity-20 blur-3xl" />
                                <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-br from-pink-400 to-orange-400 rounded-full opacity-20 blur-3xl" />

                                <div className="absolute top-4 right-4 z-10">
                                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 shadow-lg">
                                        <Sparkles className="w-3 h-3" />
                                        Modifier le pilier
                                    </div>
                                </div>

                                <div className={`relative px-8 pt-8 pb-6 bg-gradient-to-br ${selectedColor.gradient} text-white`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="text-4xl">{formData.icon}</div>
                                            <div>
                                                <h2 className="text-2xl font-bold">
                                                    Modifier le pilier
                                                </h2>
                                                <p className="text-white/80 text-sm mt-1">
                                                    {pillar.name}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={onClose}
                                            className="p-2 hover:bg-white/20 rounded-xl transition-all"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <button
                                        onClick={() => setPreviewMode(!previewMode)}
                                        className="absolute bottom-6 right-8 flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-lg hover:bg-white/30 transition-all text-sm"
                                    >
                                        <Eye className="w-4 h-4" />
                                        {previewMode ? "Mode Édition" : "Aperçu"}
                                    </button>
                                </div>

                                {previewMode ? (
                                    <div className="p-8">
                                        <div className={`bg-gradient-to-br ${selectedColor.gradient} rounded-2xl p-8 text-white shadow-xl`}>
                                            <div className="text-6xl mb-4">{formData.icon}</div>
                                            <h3 className="text-2xl font-bold mb-2">{formData.name}</h3>
                                            <p className="text-white/80">{formData.description}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit} className="p-8 space-y-6">
                                        <SanitizedInput
                                            label="Nom du pilier"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            onBlur={() => setTouched({ ...touched, name: true })}
                                            validate="text"
                                            minLength={3}
                                            maxLength={50}
                                            required
                                            error={touched.name ? errors.name : ''}
                                        />

                                        <div className="space-y-2">
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                Description
                                            </label>
                                            <textarea
                                                value={formData.description}
                                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                rows={3}
                                                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 outline-none transition-all resize-none dark:text-white"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Icône</label>
                                            <div className="grid grid-cols-6 gap-2">
                                                {ICONS.map(icon => (
                                                    <button
                                                        key={icon}
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, icon })}
                                                        className={`p-3 text-2xl rounded-xl border-2 transition-all ${
                                                            formData.icon === icon
                                                                ? `border-${formData.color}-500 bg-${formData.color}-50 dark:bg-${formData.color}-900/30`
                                                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                                        }`}
                                                    >
                                                        {icon}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Couleur</label>
                                            <div className="flex gap-2">
                                                {COLORS.map(color => (
                                                    <button
                                                        key={color.name}
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, color: color.name })}
                                                        className={`w-10 h-10 rounded-xl ${color.class} transition-all ${
                                                            formData.color === color.name
                                                                ? 'ring-4 ring-offset-2 ring-' + color.name + '-300 dark:ring-offset-gray-900 scale-110'
                                                                : 'hover:scale-105'
                                                        }`}
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex gap-3 pt-4">
                                            <button
                                                type="button"
                                                onClick={onClose}
                                                className="flex-1 px-6 py-4 text-gray-600 dark:text-gray-400 font-semibold rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                                            >
                                                Annuler
                                            </button>
                                            <motion.button
                                                type="submit"
                                                disabled={!isValid || loading}
                                                whileHover={isValid ? { scale: 1.02 } : {}}
                                                whileTap={isValid ? { scale: 0.98 } : {}}
                                                className={`flex-1 px-6 py-4 rounded-2xl font-semibold text-white relative overflow-hidden group ${
                                                    isValid && !loading
                                                        ? `bg-gradient-to-r ${selectedColor.gradient} shadow-lg`
                                                        : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                                                }`}
                                            >
                                                <div className="absolute inset-0 bg-white/20 transform -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                                {loading ? (
                                                    <div className="flex items-center justify-center gap-2">
                                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                        <span>Modification en cours...</span>
                                                    </div>
                                                ) : (
                                                    <span className="flex items-center justify-center gap-2">
                                                        <Save className="w-5 h-5" />
                                                        Enregistrer les modifications
                                                    </span>
                                                )}
                                            </motion.button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </div>
            )}
        </AnimatePresence>
    );
}