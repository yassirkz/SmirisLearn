// src/components/admin/members/MembersList.jsx
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  UserPlus,
  Trash2,
  Shield,
  GraduationCap,
  Loader2,
  Search,
  Mail,
  AlertCircle,
  Check,
  Filter,
  Ban
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { useDebounce } from '../../../hooks/useDebounce';
import { useMemberInvitation } from '../../../hooks/useMemberInvitation';
import { supabase } from '../../../lib/supabase';
import { untrusted, escapeText, validateEmail } from '../../../utils/security';
import ConfirmationModal from '../../ui/ConfirmationModal';
import SanitizedInput from '../../ui/SanitizedInput';

const ROLE_CONFIG = {
  org_admin: {
    label: "Administrateur",
    icon: Shield,
    color: 'bg-accent-100 text-accent-700 border-accent-200 dark:bg-accent-900/30 dark:text-accent-300 dark:border-accent-800'
  },
  student: {
    label: "Étudiant",
    icon: GraduationCap,
    color: 'bg-primary-100 text-primary-700 border-primary-200 dark:bg-primary-900/30 dark:text-primary-300 dark:border-primary-800'
  }
};

export default function MembersList({ isReadOnly = false, orgId: propOrgId }) {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const { createInvitation, loading: inviting } = useMemberInvitation();

  const [members, setMembers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('student');

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

  // Charger les groupes pour le filtre
  useEffect(() => {
    const fetchGroups = async () => {
      if (!organizationId) return;
      const { data } = await supabase
        .from('groups')
        .select('id, name')
        .eq('organization_id', organizationId)
        .order('name');
      setGroups(data || []);
    };
    fetchGroups();
  }, [organizationId]);

  const fetchMembers = useCallback(async () => {
    if (!organizationId) return;

    setLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          role,
          created_at
        `)
        .eq('organization_id', organizationId)
        .in('role', ['student', 'org_admin']);

      if (debouncedSearch) {
        query = query.or(
          `full_name.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%`
        );
      }

      const { data: profiles, error: profilesError } = await query;
      if (profilesError) throw profilesError;

      if (!profiles || profiles.length === 0) {
        setMembers([]);
        setLoading(false);
        return;
      }

      const memberIds = profiles.map(p => p.id);
      const { data: memberships, error: membershipsError } = await supabase
        .from('group_members')
        .select(`
          user_id,
          groups ( id, name )
        `)
        .in('user_id', memberIds);

      if (membershipsError) throw membershipsError;

      const groupsByUser = {};
      memberships?.forEach(m => {
        if (!groupsByUser[m.user_id]) groupsByUser[m.user_id] = [];
        groupsByUser[m.user_id].push(m.groups);
      });

      const formatted = profiles.map(p => ({
        ...p,
        groups: groupsByUser[p.id] || []
      }));

      let filtered = formatted;
      if (selectedGroup !== 'all') {
        filtered = formatted.filter(m =>
          m.groups.some(g => g.id === selectedGroup)
        );
      }

      setMembers(filtered);
    } catch (err) {
      console.error('Erreur chargement membres:', err);
      showError("Erreur lors du chargement des membres");
    } finally {
      setLoading(false);
    }
  }, [organizationId, debouncedSearch, selectedGroup, showError]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleChangeRole = async (member) => {
    if (member.id === user.id) {
      showError("Vous ne pouvez pas modifier votre propre rôle");
      return;
    }
    const newRole = member.role === 'student' ? 'org_admin' : 'student';
    if (!confirm(`Êtes-vous sûr de vouloir changer le rôle de ${member.full_name || member.email} en ${ROLE_CONFIG[newRole].label} ?`)) return;

    setUpdatingId(member.id);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', member.id);
      if (error) throw error;
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, role: newRole } : m));
      success("Rôle mis à jour avec succès");
    } catch (err) {
      showError(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemove = async (member) => {
    if (member.id === user.id) {
      showError("Vous ne pouvez pas vous retirer vous-même de l'entreprise");
      return;
    }
    if (!confirm(`Êtes-vous sûr de vouloir retirer ${member.full_name || member.email} de l'entreprise ?`)) return;

    setDeletingId(member.id);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ organization_id: null, role: 'student' })
        .eq('id', member.id);
      if (error) throw error;
      setMembers(prev => prev.filter(m => m.id !== member.id));
      success("Membre retiré de l'entreprise avec succès");
    } catch (err) {
      showError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!organizationId) return;

    try {
      await createInvitation({
        email: inviteEmail,
        role: inviteRole,
        organization_id: organizationId,
        invited_by: user.id,
      });
      success("Invitation envoyée avec succès");
      setInviteEmail('');
      setShowInviteForm(false);
      fetchMembers();
    } catch (err) {
      showError(err.message);
    }
  };

  const stats = {
    total: members.length,
    admins: members.filter(m => m.role === 'org_admin').length,
    students: members.filter(m => m.role === 'student').length
  };

  return (
    <div className="space-y-6">
      {/* Barre d'outils */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Rechercher un membre..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-primary-400 dark:focus:border-primary-500 focus:ring-4 focus:ring-primary-100 dark:focus:ring-primary-900/30 outline-none transition-all text-sm dark:bg-gray-800 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <select
              value={selectedGroup}
              onChange={e => setSelectedGroup(e.target.value)}
              className="pl-10 pr-8 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-primary-400 dark:focus:border-primary-500 focus:ring-4 focus:ring-primary-100 dark:focus:ring-primary-900/30 outline-none transition-all text-sm appearance-none bg-white dark:bg-gray-800 dark:text-white"
            >
              <option value="all">Tous les groupes</option>
              {groups.map((g, idx) => (
                <option key={g.id || `grp-${idx}`} value={g.id}>
                  {escapeText(untrusted(g.name))}
                </option>
              ))}
            </select>
          </div>

          {!isReadOnly && (
            <button
              onClick={() => setShowInviteForm(!showInviteForm)}
              className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all whitespace-nowrap"
            >
              <UserPlus className="w-4 h-4" />
              Inviter un membre
            </button>
          )}
        </div>
      </div>

      {/* Formulaire d'invitation */}
      <AnimatePresence>
        {showInviteForm && !isReadOnly && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleInvite}
            className="bg-primary-50 dark:bg-primary-900/30 border-2 border-primary-200 dark:border-primary-800 rounded-2xl p-5 flex flex-col sm:flex-row gap-3 items-end overflow-hidden"
          >
            <div className="flex-1 space-y-1">
              <label className="text-xs font-semibold text-primary-700 dark:text-primary-300">Adresse email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400 dark:text-primary-400" />
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="exemple@email.com"
                  className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border-2 border-primary-200 dark:border-primary-800 rounded-xl focus:border-primary-400 dark:focus:border-primary-500 outline-none text-sm dark:text-white"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-primary-700 dark:text-primary-300">Rôle</label>
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value)}
                className="px-4 py-3 bg-white dark:bg-gray-800 border-2 border-primary-200 dark:border-primary-800 rounded-xl focus:border-primary-400 dark:focus:border-primary-500 outline-none text-sm dark:text-white"
              >
                <option value="student">Étudiant</option>
                <option value="org_admin">Administrateur</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={inviting}
              className="flex items-center gap-2 px-5 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Envoyer l'invitation
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total membres", value: stats.total, color: 'text-gray-800 dark:text-gray-200' },
          { label: "Étudiants", value: stats.students, color: 'text-primary-600 dark:text-primary-400' },
          { label: "Administrateurs", value: stats.admins, color: 'text-accent-600 dark:text-accent-400' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-4 text-center">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Tableau des membres */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600 dark:text-primary-400" />
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-12 h-12 mx-auto text-gray-200 dark:text-gray-600 mb-3" />
          <p className="text-gray-400 dark:text-gray-500">
            {search || selectedGroup !== 'all' ? "Aucun membre trouvé pour votre recherche" : "Aucun membre dans cette entreprise"}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Membre</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rôle</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">Groupes</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">Date d'arrivée</th>
                  {!isReadOnly && (
                    <th className="text-right px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {members.map((member, i) => {
                  const rc = ROLE_CONFIG[member.role] || ROLE_CONFIG.student;
                  const initials = (member.full_name || member.email || '?')[0].toUpperCase();
                  return (
                    <motion.tr
                      key={member.id || `member-${i}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center font-bold text-white text-sm shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm truncate">
                              {escapeText(untrusted(member.full_name || "Chargement..."))}
                              {member.id === user.id && (
                                <span className="ml-2 text-xs text-primary-500 dark:text-primary-400">(Vous)</span>
                              )}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${rc.color}`}>
                          <rc.icon className="w-3 h-3" />
                          {rc.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {member.groups.length === 0 ? (
                              <span className="text-xs text-gray-400 dark:text-gray-500">Aucun groupe</span>
                            ) : (
                              member.groups.slice(0, 3).map((g, idx) => (
                                <span key={g.id || `m-g-${idx}`} className="inline-block px-2 py-1 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-lg text-xs">
                                  {escapeText(untrusted(g.name))}
                                </span>
                              ))
                            )}
                          {member.groups.length > 3 && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">+{member.groups.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden sm:table-cell">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(member.created_at).toLocaleDateString('fr-FR')}
                        </span>
                      </td>
                      {!isReadOnly && (
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {/* Changer rôle */}
                            <button
                              onClick={() => handleChangeRole(member)}
                              disabled={updatingId === member.id || member.id === user.id}
                              title={member.role === 'student' ? "Promouvoir administrateur" : "Rétrograder étudiant"}
                              className="p-2 hover:bg-accent-50 dark:hover:bg-accent-900/30 rounded-xl transition-colors disabled:opacity-30"
                            >
                              {updatingId === member.id ? (
                                <Loader2 className="w-4 h-4 animate-spin text-accent-500 dark:text-accent-400" />
                              ) : (
                                <Shield className="w-4 h-4 text-accent-500 dark:text-accent-400" />
                              )}
                            </button>
 
                            {/* Supprimer (uniquement étudiants) */}
                            {member.role === 'student' && (
                              <button
                                onClick={() => handleRemove(member)}
                                disabled={deletingId === member.id || member.id === user.id}
                                title="Retirer de l'entreprise"
                                className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors disabled:opacity-30"
                              >
                                {deletingId === member.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-red-400 dark:text-red-400" />
                                ) : (
                                  <Trash2 className="w-4 h-4 text-red-400 dark:text-red-400" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}