// src/components/admin/groups/GroupsList.jsx
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  BookOpen,
  Edit,
  Trash2,
  UserPlus,
  Shield,
  Plus,
  RefreshCw,
  Search,
  X
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../ui/Toast';
import { useDebounce } from '../../../hooks/useDebounce';
import LoadingSpinner from '../../ui/LoadingSpinner';
import ConfirmationModal from '../../ui/ConfirmationModal';
import GroupForm from './GroupForm';
import GroupMembers from './GroupMembers';
import GroupPillarAccess from './GroupPillarAccess';
import { supabase } from '../../../lib/supabase';
import { untrusted, escapeText } from '../../../utils/security';

const ITEMS_PER_PAGE = 10;

export default function GroupsList({ isReadOnly = false, orgId: propOrgId }) {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [organizationId, setOrganizationId] = useState(null);

  // Modals
  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [showMembers, setShowMembers] = useState(null);
  const [showPillarAccess, setShowPillarAccess] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  // Récupérer l'organization_id
  useEffect(() => {
    const getOrgId = async () => {
      try {
        if (propOrgId) {
          setOrganizationId(propOrgId);
          return;
        }
        if (user?.organization_id) {
          setOrganizationId(user.organization_id);
        } else if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single();
          if (profile?.organization_id) {
            setOrganizationId(profile.organization_id);
          } else {
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("Error fetching orgId:", err);
        setLoading(false);
      }
    };
    getOrgId();
  }, [user, propOrgId]);

  const fetchGroups = useCallback(async () => {
    if (!organizationId) return;

    setLoading(true);
    try {
      let query = supabase
        .from('groups')
        .select(
          `
          *,
          group_members:group_members(count),
          group_pillar_access:group_pillar_access(count)
        `,
          { count: 'exact' }
        )
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (debouncedSearch) {
        query = query.ilike('name', `%${debouncedSearch}%`);
      }

      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      setGroups(data || []);
      setTotalCount(count || 0);
      setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE));
    } catch (error) {
      console.error('Erreur lors du chargement des groupes:', error);
      showError("Erreur lors du chargement des groupes");
    } finally {
      setLoading(false);
    }
  }, [organizationId, debouncedSearch, currentPage, showError]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleDelete = async (groupId) => {
    try {
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId)
        .eq('organization_id', organizationId);

      if (error) throw error;

      success("Groupe supprimé avec succès");
      setShowDeleteConfirm(null);
      fetchGroups();
    } catch (error) {
      console.error('Erreur suppression groupe:', error);
      showError("Erreur lors du suppression du groupe");
    }
  };

  const handleRefresh = () => {
    fetchGroups();
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleEdit = (group) => {
    setEditingGroup(group);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingGroup(null);
  };

  const handleFormSuccess = () => {
    handleFormClose();
    fetchGroups();
  };

  return (
    <div className="space-y-6">
      {/* Barre d'outils */}
      <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl p-5 shadow-lg border border-white/50 dark:border-white/5 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-center gap-3 px-2 h-11">
            <div className="p-2 bg-primary-50 dark:bg-primary-900/30 rounded-xl">
              <Users className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 uppercase tracking-tight">Groupes</h2>
          </div>

          <div className="flex-1 flex flex-col sm:flex-row gap-3 items-center w-full lg:w-auto lg:max-w-2xl justify-end">
            <div className="relative flex-1 group w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5 group-focus-within:text-primary-500 transition-colors" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Rechercher..."
                className="w-full pl-11 pr-4 h-11 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-gray-700 rounded-xl focus:border-primary-400 dark:focus:border-primary-500 focus:ring-4 focus:ring-primary-100 dark:focus:ring-primary-900/30 dark:text-white transition-all font-medium placeholder:text-gray-400"
              />
            </div>

            <motion.button
              whileHover={{ rotate: 180 }}
              transition={{ duration: 0.3 }}
              onClick={handleRefresh}
              className="w-11 h-11 flex items-center justify-center bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-500 rounded-xl shadow-sm transition-all shrink-0"
              title="Actualiser"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 text-gray-600 dark:text-gray-300 ${loading ? 'animate-spin' : ''}`} />
            </motion.button>

            {!isReadOnly && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowForm(true)}
                className="group px-6 h-11 bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-500 hover:to-accent-500 text-white rounded-xl shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/40 transition-all flex items-center justify-center gap-3 font-bold border border-white/10 shrink-0 w-full sm:w-auto"
              >
                <div className="p-1 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                  <Plus className="w-4 h-4" />
                </div>
                Nouveau
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 dark:border-white/5 overflow-hidden transition-all duration-300 relative">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-700/50">
              <tr>
                <th className="px-6 py-5 text-left text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest whitespace-nowrap">Nom / Description</th>
                <th className="px-6 py-5 text-center text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest whitespace-nowrap w-32">Membres</th>
                <th className="px-6 py-5 text-center text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest whitespace-nowrap w-32">Piliers</th>
                <th className="px-6 py-5 text-left text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest whitespace-nowrap w-32">Créé le</th>
                <th className="px-6 py-5 text-right text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest whitespace-nowrap w-48">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100/50 dark:divide-gray-800/50">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12">
                    <div className="flex justify-center">
                      <LoadingSpinner />
                    </div>
                  </td>
                </tr>
              ) : groups.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-16 text-center relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary-500/5 dark:bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="relative z-10 flex flex-col items-center">
                      <div className="w-20 h-20 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 shadow-inner border border-gray-100 dark:border-gray-700">
                        <Users className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-2">
                        {debouncedSearch ? "Aucun groupe trouvé" : "Aucun groupe créé"}
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                        {debouncedSearch ? "Essayez avec d'autres termes de recherche." : "Commencez par créer votre premier groupe d'étudiants."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                groups.map((group, idx) => (
                  <motion.tr
                    key={group.id || idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="hover:bg-white/60 dark:hover:bg-slate-700/40 transition-all duration-300 group/row cursor-default"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary-50 to-accent-50 dark:from-primary-900/20 dark:to-accent-900/20 rounded-2xl flex items-center justify-center text-primary-500 dark:text-primary-400 shadow-sm border border-primary-100/50 dark:border-primary-800/30 group-hover/row:scale-105 transition-transform">
                          <Users className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="font-bold text-gray-800 dark:text-gray-200 group-hover/row:text-primary-600 dark:group-hover/row:text-primary-400 transition-colors">
                            {escapeText(untrusted(group.name))}
                          </div>
                          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1 max-w-xs truncate">
                            {group.description ? escapeText(untrusted(group.description)) : 'Aucune description'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center px-3 py-1.5 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-xl text-xs font-bold border border-primary-200/50 dark:border-primary-800/50 shadow-sm">
                        <Users className="w-3.5 h-3.5 mr-1.5" />
                        {group.group_members?.[0]?.count || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center px-3 py-1.5 bg-accent-50 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 rounded-xl text-xs font-bold border border-accent-200/50 dark:border-accent-800/50 shadow-sm">
                        <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                        {group.group_pillar_access?.[0]?.count || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                      {new Date(group.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!isReadOnly && (
                          <>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => setShowMembers(group)}
                              className="p-2.5 bg-gray-50 dark:bg-slate-800 hover:bg-primary-100 dark:hover:bg-primary-900/50 border border-gray-200 dark:border-gray-700 hover:border-primary-200 dark:hover:border-primary-800/50 rounded-xl transition-all text-primary-600 dark:text-primary-400 shadow-sm"
                              title="Gérer les membres"
                            >
                              <UserPlus className="w-4 h-4" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => setShowPillarAccess(group)}
                              className="p-2.5 bg-gray-50 dark:bg-slate-800 hover:bg-accent-100 dark:hover:bg-accent-900/50 border border-gray-200 dark:border-gray-700 hover:border-accent-200 dark:hover:border-accent-800/50 rounded-xl transition-all text-accent-600 dark:text-accent-400 shadow-sm"
                              title="Gérer l'accès aux piliers"
                            >
                              <Shield className="w-4 h-4" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleEdit(group)}
                              className="p-2.5 bg-gray-50 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-gray-200 dark:border-gray-700 hover:border-emerald-200 dark:hover:border-emerald-800/50 rounded-xl transition-all text-emerald-600 dark:text-emerald-400 shadow-sm"
                              title="Modifier le groupe"
                            >
                              <Edit className="w-4 h-4" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => setShowDeleteConfirm(group)}
                              className="p-2.5 bg-gray-50 dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-900/50 border border-gray-200 dark:border-gray-700 hover:border-red-200 dark:hover:border-red-800/50 rounded-xl transition-all text-red-600 dark:text-red-400 shadow-sm"
                              title="Supprimer le groupe"
                            >
                              <Trash2 className="w-4 h-4" />
                            </motion.button>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-gray-50/50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-gray-700/50 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, totalCount)} -{' '}
              {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} sur {totalCount}
            </p>
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:hover:bg-white dark:disabled:hover:bg-slate-800 shadow-sm transition-all font-medium text-gray-700 dark:text-gray-300 text-sm"
              >
                Précédent
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:hover:bg-white dark:disabled:hover:bg-slate-800 shadow-sm transition-all font-medium text-gray-700 dark:text-gray-300 text-sm"
              >
                Suivant
              </motion.button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showForm && (
          <GroupForm
            key="group-form"
            isOpen={showForm}
            onClose={handleFormClose}
            onSuccess={handleFormSuccess}
            group={editingGroup}
            orgId={organizationId}
          />
        )}

        {showMembers && (
          <GroupMembers
            key={`group-members-${showMembers.id || 'new'}`}
            isOpen={!!showMembers}
            onClose={() => setShowMembers(null)}
            group={showMembers}
            orgId={organizationId}
            onUpdate={fetchGroups}
          />
        )}

        {showPillarAccess && (
          <GroupPillarAccess
            key={`group-pillar-access-${showPillarAccess.id || 'new'}`}
            isOpen={!!showPillarAccess}
            onClose={() => setShowPillarAccess(null)}
            group={showPillarAccess}
            orgId={organizationId}
            onUpdate={fetchGroups}
          />
        )}

        {showDeleteConfirm && (
          <ConfirmationModal
            isOpen={!!showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(null)}
            onConfirm={() => handleDelete(showDeleteConfirm.id)}
            title="Supprimer le groupe"
            message={`Êtes-vous sûr de vouloir supprimer le groupe "${escapeText(untrusted(showDeleteConfirm.name))}" ? Cette action est irréversible.`}
            confirmText="Supprimer"
            cancelText="Annuler"
            type="danger"
          />
        )}
      </AnimatePresence>
    </div>
  );
}