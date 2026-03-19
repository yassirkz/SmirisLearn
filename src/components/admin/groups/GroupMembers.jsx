// src/components/admin/groups/GroupMembers.jsx
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserMinus, Search, Plus, Upload, Loader2 } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../ui/Toast';
import { useDebounce } from '../../../hooks/useDebounce';
import LoadingSpinner from '../../ui/LoadingSpinner';
import ConfirmationModal from '../../ui/ConfirmationModal';
import { supabase } from '../../../lib/supabase';
import { untrusted, escapeText } from '../../../utils/security';

export default function GroupMembers({ isOpen, onClose, group, orgId, onUpdate }) {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [members, setMembers] = useState([]);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const [adding, setAdding] = useState(false);
  const [removeCandidate, setRemoveCandidate] = useState(null);

  const fetchMembers = useCallback(async () => {
    if (!group) return;
    try {
      const { data: memberships, error: membershipsError } = await supabase
        .from('group_members')
        .select('id, user_id, joined_at')
        .eq('group_id', group.id)
        .order('joined_at', { ascending: false });

      if (membershipsError) throw membershipsError;

      if (!memberships || memberships.length === 0) {
        setMembers([]);
        return;
      }

      const userIds = memberships.map(m => m.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const profileMap = profiles.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
      const mergedMembers = memberships.map(m => ({
        ...m,
        profiles: profileMap[m.user_id] || null
      }));

      setMembers(mergedMembers);
    } catch (err) {
      console.error('Erreur chargement membres:', err);
      showError("Erreur lors du chargement des membres");
    }
  }, [group, showError]);

  const fetchAvailableStudents = useCallback(async () => {
    if (!orgId || !group) return;
    try {
      const { data: existingMembers, error: membersError } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', group.id);

      if (membersError) throw membersError;
      const excludedIds = existingMembers?.map(m => m.user_id) || [];

      let query = supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('organization_id', orgId)
        .eq('role', 'student');

      if (excludedIds.length > 0) {
        query = query.not('id', 'in', `(${excludedIds.join(',')})`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setAvailableStudents(data || []);
    } catch (err) {
      console.error('Erreur chargement étudiants disponibles:', err);
    }
  }, [orgId, group]);

  useEffect(() => {
    if (isOpen && group) {
      setLoading(true);
      Promise.all([fetchMembers(), fetchAvailableStudents()]).finally(() => setLoading(false));
    }
  }, [isOpen, group, fetchMembers, fetchAvailableStudents]);

  const filteredAvailable = availableStudents.filter(
    s =>
      (s.email?.toLowerCase() || '').includes(debouncedSearch.toLowerCase()) ||
      (s.full_name?.toLowerCase() || '').includes(debouncedSearch.toLowerCase())
  );

  const handleAddMember = async () => {
    let studentToInvite = selectedStudent;

    if (!studentToInvite && filteredAvailable.length === 1) {
      studentToInvite = filteredAvailable[0];
    }

    if (!studentToInvite) {
      showError("Veuillez sélectionner un étudiant à ajouter");
      return;
    }

    setAdding(true);
    try {
      const { error } = await supabase
        .from('group_members')
        .insert({
          group_id: group.id,
          user_id: studentToInvite.id,
          added_by: user.id
        });

      if (error) throw error;

      success("Membre ajouté avec succès");
      setSelectedStudent(null);
      setShowAddDropdown(false);
      setSearchTerm('');
      fetchMembers();
      fetchAvailableStudents();
      onUpdate?.();
    } catch (err) {
      console.error('Erreur ajout membre:', err);
      showError("Erreur lors de l'ajout du membre");
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      success("Membre retiré avec succès");
      setRemoveCandidate(null);
      fetchMembers();
      fetchAvailableStudents();
      onUpdate?.();
    } catch (err) {
      console.error('Erreur retrait membre:', err);
      showError("Erreur lors du retrait du membre");
    }
  };

  const handleImportCSV = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const emails = text.split(/[,\n]/).map(e => e.trim()).filter(e => e.includes('@'));

      if (emails.length === 0) {
        showError('Aucun email valide trouvé');
        return;
      }

      success(`Importation de ${emails.length} emails en cours...`);
      setAdding(true);

      let successCount = 0;
      let failCount = 0;

      for (const email of emails) {
        try {
          const { data: profile, error: pError } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', email)
            .eq('organization_id', orgId)
            .single();

          if (pError || !profile) {
            failCount++;
            continue;
          }

          const { error: iError } = await supabase
            .from('group_members')
            .insert({
              group_id: group.id,
              user_id: profile.id,
              added_by: user.id
            });

          if (iError) {
            failCount++;
          } else {
            successCount++;
          }
        } catch (innerErr) {
          failCount++;
        }
      }

      success(`Import terminé : ${successCount} succès${failCount > 0 ? `, ${failCount} échecs` : ""}`);
      fetchMembers();
      fetchAvailableStudents();
      onUpdate?.();
    } catch (err) {
      showError("Erreur lors de l'importation CVS");
    } finally {
      setAdding(false);
      if (e.target) e.target.value = '';
    }
  };

  if (!isOpen) return null;

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
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">
                  Membres du groupe: {escapeText(untrusted(group.name))}
                </h2>
                <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 dark:bg-gray-800">
              {/* Ajout de membres */}
              <div className="mb-6">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                    <input
                      type="text"
                      placeholder="Rechercher un membre à ajouter..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setShowAddDropdown(true);
                      }}
                      onFocus={() => setShowAddDropdown(true)}
                      className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 outline-none transition-all text-sm dark:bg-gray-900 dark:text-white"
                    />
                    <AnimatePresence>
                      {showAddDropdown && searchTerm.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 max-h-60 overflow-y-auto"
                        >
                          {filteredAvailable.length > 0 ? (
                            filteredAvailable.map((student, idx) => (
                              <button
                                key={student.id || idx}
                                onClick={() => {
                                  setSelectedStudent(student);
                                  setSearchTerm('');
                                  setShowAddDropdown(false);
                                }}
                                className="w-full px-4 py-3 text-left hover:bg-indigo-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-between"
                              >
                                <div>
                                  <p className="font-medium text-gray-800 dark:text-gray-200">
                                    {escapeText(untrusted(student.full_name || 'Nom non renseigné'))}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">{student.email}</p>
                                </div>
                                <Plus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                              Aucun étudiant trouvé
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <button
                    onClick={handleAddMember}
                    disabled={adding}
                    className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Ajouter
                  </button>
                  <label className="px-4 py-2.5 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer flex items-center justify-center">
                    <Upload className="w-4 h-4" />
                    <input
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleImportCSV}
                      className="hidden"
                    />
                  </label>
                </div>
                {selectedStudent && (
                  <div className="mt-2 p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-between">
                    <span className="text-sm text-indigo-800 dark:text-indigo-300 font-medium">
                      Sélectionné: {selectedStudent.full_name || selectedStudent.email}
                    </span>
                    <button onClick={() => setSelectedStudent(null)} className="p-1 hover:bg-indigo-100 dark:hover:bg-indigo-800 rounded">
                      <X className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    </button>
                  </div>
                )}
              </div>

              {/* Liste des membres actuels */}
              <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">
                {members.length} membres actuels
              </h3>
              {loading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : members.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">Aucun membre dans ce groupe</p>
              ) : (
                <div className="space-y-3">
                  {members.map((member, idx) => (
                    <div key={member.id || idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 dark:text-gray-200 truncate">
                          {escapeText(untrusted(member.profiles?.full_name || 'Nom non renseigné'))}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{member.profiles?.email || 'Pas d\'email'}</p>
                      </div>
                      <button
                        onClick={() => setRemoveCandidate(member)}
                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg transition-colors text-red-500 dark:text-red-400 shrink-0"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Confirmation de retrait */}
      <AnimatePresence>
        {removeCandidate && (
          <ConfirmationModal
            isOpen={!!removeCandidate}
            onClose={() => setRemoveCandidate(null)}
            onConfirm={() => handleRemoveMember(removeCandidate.id)}
            title="Retirer membre"
            message={
              removeCandidate.profiles?.full_name
                ? `Êtes-vous sûr de vouloir retirer ${escapeText(untrusted(removeCandidate.profiles.full_name))} de ce groupe ?`
                : "Êtes-vous sûr de vouloir retirer ce membre de ce groupe ?"
            }
            confirmText="Retirer"
            cancelText="Annuler"
            type="warning"
          />
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}