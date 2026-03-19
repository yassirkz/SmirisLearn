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
      blue: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
      purple: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
      green: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
      red: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
      yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800',
      indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800',
      pink: 'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800',
      orange: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800'
    };
    return colors[color] || colors.blue;
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
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                  Accès piliers: {escapeText(untrusted(group.name))}
                </h2>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
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
                            key={pillar.id || idx}
                            className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                              isSelected
                                ? 'border-indigo-300 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => togglePillar(pillar.id)}
                              className="w-5 h-5 rounded text-indigo-600 dark:text-indigo-400"
                            />
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${colorClass}`}>
                              {escapeText(untrusted(pillar.name))}
                            </span>
                            {isSelected && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 ml-auto" />}
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
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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