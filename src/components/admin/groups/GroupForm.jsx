// src/components/admin/groups/GroupForm.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { supabase } from '../../../lib/supabase';
import SanitizedInput from '../../ui/SanitizedInput';

export default function GroupForm({ isOpen, onClose, onSuccess, group }) {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (group) {
      setFormData({ name: group.name || '', description: group.description || '' });
    } else {
      setFormData({ name: '', description: '' });
    }
    setErrors({});
  }, [group, isOpen]);

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = "Le nom du groupe est requis";
    else if (formData.name.trim().length < 2) errs.name = "Le nom doit faire au moins 2 caractères";
    else if (formData.name.trim().length > 60) errs.name = "Le nom ne doit pas dépasser 60 caractères";
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        organization_id: user.organization_id,
      };

      let error;
      if (group) {
        ({ error } = await supabase.from('groups').update(payload).eq('id', group.id));
      } else {
        ({ error } = await supabase.from('groups').insert(payload));
      }
      if (error) throw error;

      success(group ? "Groupe mis à jour avec succès" : "Groupe créé avec succès");
      onSuccess?.();
      onClose();
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/50 dark:border-white/10 w-full max-w-md overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Background Glows */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 dark:bg-primary-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            
            <div className="p-8 relative z-10">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">
                    {group ? "Modifier le groupe" : "Nouveau groupe"}
                  </h2>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
                    {group ? "Mettez à jour les informations du groupe." : "Créez un nouveau groupe d'étudiants."}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl transition-all shadow-sm"
                >
                  <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <SanitizedInput
                  label="Nom du groupe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  validate="text"
                  minLength={2}
                  maxLength={60}
                  required
                  error={errors.name}
                  className='dark:bg-gray-800/50 dark:border-gray-500 dark:text-white'
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description <span className="text-gray-400 dark:text-gray-500 text-xs">(optionnel)</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    maxLength={200}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl focus:border-primary-400 dark:focus:border-primary-500 focus:ring-4 focus:ring-primary-100 dark:focus:ring-primary-900/30 outline-none transition-all resize-none dark:bg-gray-900 dark:text-white"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>{group ? "Enregistrer" : "Créer"}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}