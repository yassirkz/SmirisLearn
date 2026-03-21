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
  Search
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Groupes</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="p-2 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            title="Actualiser"
          >
            <RefreshCw className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          {!isReadOnly && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-accent-600 rounded-xl text-white font-medium hover:shadow-lg transition-all"
            >
              <Plus className="w-5 h-5" />
              Nouveau groupe
            </button>
          )}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Rechercher un groupe..."
          className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl focus:border-primary-400 dark:focus:border-primary-500 focus:ring-4 focus:ring-primary-100 dark:focus:ring-primary-900/30 outline-none transition-all dark:text-white"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nom</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Membres</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Piliers</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Créé le</th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12">
                    <div className="flex justify-center">
                      <LoadingSpinner />
                    </div>
                  </td>
                </tr>
              ) : groups.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    {debouncedSearch ? "Aucun résultat trouvé pour votre recherche" : "Aucun groupe créé pour le moment"}
                  </td>
                </tr>
              ) : (
                groups.map((group, idx) => (
                  <motion.tr
                    key={group.id || idx}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="text-gray-800 dark:text-gray-200 font-medium">
                        {escapeText(untrusted(group.name))}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400 max-w-xs truncate">
                      {group.description ? escapeText(untrusted(group.description)) : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary-400 dark:text-primary-400" />
                        <span className="text-gray-700 dark:text-gray-300">{group.group_members?.[0]?.count || 0}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-accent-400 dark:text-accent-400" />
                        <span className="text-gray-700 dark:text-gray-300">{group.group_pillar_access?.[0]?.count || 0}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                      {new Date(group.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {!isReadOnly && (
                          <>
                            <button
                              onClick={() => setShowMembers(group)}
                              className="p-2 hover:bg-primary-50 dark:hover:bg-gray-700 rounded-lg transition-colors text-primary-600 dark:text-primary-400"
                              title="Gérer les membres"
                            >
                              <UserPlus className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setShowPillarAccess(group)}
                              className="p-2 hover:bg-accent-50 dark:hover:bg-gray-700 rounded-lg transition-colors text-accent-600 dark:text-accent-400"
                              title="Gérer l'accès aux piliers"
                            >
                              <Shield className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(group)}
                              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-600 dark:text-gray-300"
                              title="Modifier le groupe"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(group)}
                              className="p-2 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-lg transition-colors text-red-500 dark:text-red-400"
                              title="Supprimer le groupe"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, totalCount)} -{' '}
              {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} sur {totalCount}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-gray-700 dark:text-gray-300"
              >
                Précédent
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-gray-700 dark:text-gray-300"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showForm && (
          <GroupForm
            isOpen={showForm}
            onClose={handleFormClose}
            onSuccess={handleFormSuccess}
            group={editingGroup}
          />
        )}

        {showMembers && (
          <GroupMembers
            isOpen={!!showMembers}
            onClose={() => setShowMembers(null)}
            group={showMembers}
            orgId={organizationId}
            onUpdate={fetchGroups}
          />
        )}

        {showPillarAccess && (
          <GroupPillarAccess
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