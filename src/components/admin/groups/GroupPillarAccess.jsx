// src/components/admin/groups/GroupPillarAccess.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Check } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../ui/Toast';
import LoadingSpinner from '../../ui/LoadingSpinner';
import { supabase } from '../../../lib/supabase';
import { untrusted, escapeText } from '../../../utils/security';

export default function GroupPillarAccess({ isOpen, onClose, group, orgId, onUpdate }) {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [pillars, setPillars] = useState([]);
  const [selectedPillarIds, setSelectedPillarIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !group || !orgId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: pillarsData, error: pillarsError } = await supabase
          .from('pillars')
          .select('id, name, color')
          .eq('organization_id', orgId)
          .order('name');

        if (pillarsError) throw pillarsError;

        const { data: accessData, error: accessError } = await supabase
          .from('group_pillar_access')
          .select('pillar_id')
          .eq('group_id', group.id);

        if (accessError) throw accessError;

        setPillars(pillarsData || []);
        setSelectedPillarIds(new Set(accessData.map(a => a.pillar_id)));
      } catch (err) {
        console.error('Erreur chargement piliers:', err);
        showError("Erreur lors du chargement des piliers");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen, group, orgId, showError]);

  const togglePillar = (pillarId) => {
    setSelectedPillarIds(prev => {
      const next = new Set(prev);
      if (next.has(pillarId)) {
        next.delete(pillarId);
      } else {
        next.add(pillarId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: existing, error: fetchError } = await supabase
        .from('group_pillar_access')
        .select('pillar_id')
        .eq('group_id', group.id);

      if (fetchError) throw fetchError;

      const existingIds = new Set(existing.map(e => e.pillar_id));
      const toAdd = [...selectedPillarIds].filter(id => !existingIds.has(id));
      const toRemove = [...existingIds].filter(id => !selectedPillarIds.has(id));

      if (toRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from('group_pillar_access')
          .delete()
          .eq('group_id', group.id)
          .in('pillar_id', toRemove);
        if (deleteError) throw deleteError;
      }

      if (toAdd.length > 0) {
        const inserts = toAdd.map(pillarId => ({
          group_id: group.id,
          pillar_id: pillarId,
          granted_by: user.id
        }));
        const { error: insertError } = await supabase
          .from('group_pillar_access')
          .insert(inserts);
        if (insertError) throw insertError;
      }

      success("Accès aux piliers mis à jour avec succès");
      onUpdate?.();
      onClose();
    } catch (err) {
      console.error('Erreur sauvegarde:', err);
      showError("Erreur lors de la mise à jour des accès");
    } finally {
      setSaving(false);
    }
  };

  const getColorClass = (color) => {
    const colors = {
      blue: 'bg-primary-100 text-primary-700 border-primary-200 dark:bg-primary-900/30 dark:text-primary-300 dark:border-primary-800',
      purple: 'bg-accent-100 text-accent-700 border-accent-200 dark:bg-accent-900/30 dark:text-accent-300 dark:border-accent-800',
      green: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
      red: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800',
      yellow: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
      indigo: 'bg-primary-100 text-primary-700 border-primary-200 dark:bg-primary-900/30 dark:text-primary-300 dark:border-primary-800',
      pink: 'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800',
      orange: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800'
    };
    return colors[color] || colors.blue;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="group-pillar-access-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            key="group-pillar-access-modal"
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/50 dark:border-white/10 w-full max-w-md overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Background Glows */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 dark:bg-primary-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            <div className="p-8 relative z-10">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">
                    Accès piliers
                  </h2>
                  <p className="text-sm font-medium text-primary-600 dark:text-primary-400 mt-1">
                    {escapeText(untrusted(group.name))}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl transition-all shadow-sm"
                >
                  <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              {loading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : (
                <>
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {pillars.length === 0 ? (
                      <p className="text-center text-gray-500 dark:text-gray-400 py-8">Aucun pilier créé pour cette entreprise</p>
                    ) : (
                      pillars.map((pillar, idx) => {
                        const isSelected = selectedPillarIds.has(pillar.id);
                        const colorClass = getColorClass(pillar.color);
                        return (
                          <label
                            key={`pillar-access-${pillar.id || 'none'}-${idx}`}
                            className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                              isSelected
                                ? 'border-primary-300 dark:border-primary-600 bg-primary-50 dark:bg-primary-900/30'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => togglePillar(pillar.id)}
                              className="w-5 h-5 rounded text-primary-600 dark:text-primary-400"
                            />
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${colorClass}`}>
                              {escapeText(untrusted(pillar.name))}
                            </span>
                            {isSelected && <Check className="w-4 h-4 text-primary-600 dark:text-primary-400 ml-auto" />}
                          </label>
                        );
                      })
                    )}
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={onClose}
                      className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {saving ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Enregistrer</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
