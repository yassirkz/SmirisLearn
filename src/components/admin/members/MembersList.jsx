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
  Ban,
  RefreshCw,
  Plus,
  X,
  Eye
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
  },
  super_admin: {
    label: "Super Admin",
    icon: Shield,
    color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'
  }
};

export default function MembersList({ isReadOnly = false, orgId: propOrgId }) {
  const { user, startImpersonation } = useAuth();
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
        .in('role', ['student', 'org_admin', 'super_admin']);

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
    // Un super_admin peut retirer n'importe qui (sauf lui-même)
    // Un admin normal ne peut retirer que des étudiants
    const isSuperAdmin = user?.role === 'super_admin';
    const isAdmin = user?.role === 'org_admin';

    if (member.id === user.id) {
      showError("Vous ne pouvez pas vous retirer vous-même");
      return;
    }

    if (!isSuperAdmin && member.role === 'org_admin') {
      showError("Vous n'avez pas les droits pour retirer un autre administrateur");
      return;
    }

    if (!confirm(`Êtes-vous sûr de vouloir retirer ${member.full_name || member.email} de l'entreprise ?`)) return;

    setDeletingId(member.id);
    try {
      // Pour une suppression propre, on pourrait aussi supprimer ses progrès (cascade ou manuel)
      // Mais ici on se contente de le "détacher" de l'organisation
      const { error } = await supabase
        .from('profiles')
        .update({ 
          organization_id: null, 
          role: 'student' // On le remet en simple étudiant système
        })
        .eq('id', member.id);

      if (error) throw error;
      
      setMembers(prev => prev.filter(m => m.id !== member.id));
      success("Membre retiré avec succès");
    } catch (err) {
      console.error("Error removing member:", err);
      showError(`Erreur: ${err.message}`);
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
      <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl p-5 shadow-lg border border-white/50 dark:border-white/5 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-center gap-3 px-2 h-11">
            <div className="p-2 bg-primary-50 dark:bg-primary-900/30 rounded-xl">
              <Users className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">Membres</h2>
          </div>

          <div className="flex-1 flex flex-col sm:flex-row gap-3 items-center w-full lg:w-auto lg:max-w-3xl justify-end">
            <div className="relative flex-1 group w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5 group-focus-within:text-primary-500 transition-colors" />
              <input
                type="text"
                placeholder="Nom, email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 h-11 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-gray-700 rounded-xl focus:border-primary-400 dark:focus:border-primary-500 focus:ring-4 focus:ring-primary-100 dark:focus:ring-primary-900/30 dark:text-white transition-all font-medium placeholder:text-gray-400"
              />
            </div>

            <div className="relative flex-1 group w-full">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5 group-focus-within:text-primary-500 transition-colors" />
              <select
                value={selectedGroup}
                onChange={e => setSelectedGroup(e.target.value)}
                className="w-full pl-11 pr-8 h-11 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-gray-700 rounded-xl focus:border-primary-400 dark:focus:border-primary-500 focus:ring-4 focus:ring-primary-100 dark:focus:ring-primary-900/30 dark:text-white transition-all font-medium appearance-none cursor-pointer"
              >
                <option value="all">Tous les groupes</option>
                {groups.map((g, idx) => (
                  <option key={g.id || `grp-${idx}`} value={g.id}>
                    {escapeText(untrusted(g.name))}
                  </option>
                ))}
              </select>
            </div>

            <motion.button
              whileHover={{ rotate: 180 }}
              transition={{ duration: 0.3 }}
              onClick={fetchMembers}
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
                onClick={() => setShowInviteForm(!showInviteForm)}
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

      {/* Modale d'invitation */}
      <AnimatePresence>
        {showInviteForm && !isReadOnly && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm" onClick={() => setShowInviteForm(false)}>
            <motion.div
              key="invite-member-modal"
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl max-w-md w-full shadow-2xl border border-white/50 dark:border-white/10 ring-1 ring-black/5 relative overflow-hidden"
            >
              {/* En-tête avec dégradé premium (Style Piliers) */}
              <div className="relative px-8 pt-8 pb-6 bg-gradient-to-br from-primary-600 to-accent-600 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                      <UserPlus className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">Inviter un membre</h2>
                      <p className="text-white/80 text-sm mt-1">Ajoutez un collaborateur à l'équipe</p>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowInviteForm(false)}
                    className="p-2 hover:bg-white/20 rounded-xl transition-all"
                  >
                    <X className="w-5 h-5 text-white" />
                  </motion.button>
                </div>
              </div>

              <div className="p-8">
                <form onSubmit={handleInvite} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Adresse email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        required
                        value={inviteEmail}
                        onChange={e => setInviteEmail(e.target.value)}
                        placeholder="exemple@email.com"
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-slate-800/50 border-2 border-gray-100 dark:border-gray-700 rounded-xl focus:border-primary-400 dark:focus:border-primary-500 outline-none transition-all dark:text-white"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Rôle</label>
                    <select
                      value={inviteRole}
                      onChange={e => setInviteRole(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border-2 border-gray-100 dark:border-gray-700 rounded-xl focus:border-primary-400 dark:focus:border-primary-500 outline-none transition-all dark:text-white cursor-pointer"
                    >
                      <option value="student">Étudiant</option>
                      <option value="org_admin">Administrateur</option>
                    </select>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowInviteForm(false)}
                      className="flex-1 px-4 py-3 text-gray-500 dark:text-gray-400 font-bold hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                    >
                      Annuler
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={inviting}
                      className="flex-1 items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-xl font-bold shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/40 transition-all disabled:opacity-50 flex"
                    >
                      {inviting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                      Envoyer
                    </motion.button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { label: "Total membres", value: stats.total, color: 'text-gray-800 dark:text-white', bg: 'bg-white/80 dark:bg-slate-900/60', glow: 'from-gray-400/20 to-transparent' },
          { label: "Étudiants", value: stats.students, color: 'text-primary-600 dark:text-primary-400', bg: 'bg-primary-50/80 dark:bg-primary-900/20', glow: 'from-primary-500/20 to-transparent' },
          { label: "Administrateurs", value: stats.admins, color: 'text-accent-600 dark:text-accent-400', bg: 'bg-accent-50/80 dark:bg-accent-900/20', glow: 'from-accent-500/20 to-transparent' },
        ].map((stat, idx) => (
          <div key={idx} className={`relative backdrop-blur-xl border border-white/50 dark:border-white/5 rounded-3xl p-6 overflow-hidden shadow-lg ${stat.bg}`}>
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${stat.glow} rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none`} />
            <p className={`text-4xl font-black ${stat.color} mb-1 relative z-10`}>{stat.value}</p>
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider relative z-10">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Tableau des membres */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600 dark:text-primary-400" />
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-16 bg-white/50 dark:bg-slate-900/40 rounded-3xl border border-white/50 dark:border-white/5 backdrop-blur-sm">
          <div className="w-20 h-20 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner border border-gray-100 dark:border-gray-700">
            <Users className="w-10 h-10 text-gray-300 dark:text-gray-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-2">
            {search || selectedGroup !== 'all' ? "Aucun membre trouvé" : "Aucun membre dans cette entreprise"}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            {search || selectedGroup !== 'all' ? "Essayez de modifier vos critères de recherche ou filtres." : "Commencez par inviter des membres à rejoindre votre organisation."}
          </p>
        </div>
      ) : (
        <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 dark:border-white/5 overflow-hidden transition-all duration-300">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-700/50">
                <tr>
                  <th className="px-6 py-5 text-left text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest whitespace-nowrap">Membre</th>
                  <th className="px-6 py-5 text-left text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest whitespace-nowrap">Rôle</th>
                  <th className="px-6 py-5 text-left text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest whitespace-nowrap hidden lg:table-cell">Groupes</th>
                  <th className="px-6 py-5 text-left text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest whitespace-nowrap hidden sm:table-cell">Date d'arrivée</th>
                  {!isReadOnly && (
                    <th className="px-6 py-5 text-right text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest whitespace-nowrap">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/50 dark:divide-gray-800/50">
                {members.map((member, i) => {
                  const rc = ROLE_CONFIG[member.role] || ROLE_CONFIG.student;
                  const initials = (member.full_name || member.email || '?')[0].toUpperCase();
                  return (
                    <motion.tr
                      key={member.id || `member-${i}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-white/60 dark:hover:bg-slate-700/40 transition-all duration-300 group/row cursor-default"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center font-bold text-white text-lg shrink-0 shadow-md group-hover/row:scale-105 transition-transform">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-gray-800 dark:text-gray-200 text-sm truncate group-hover/row:text-primary-600 dark:group-hover/row:text-primary-400 transition-colors">
                              {escapeText(untrusted(member.full_name || "Chargement..."))}
                              {member.id === user.id && (
                                <span className="ml-2 text-xs font-bold text-primary-500 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-2 py-0.5 rounded-md">(Vous)</span>
                              )}
                            </p>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate mt-0.5">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border shadow-sm ${rc.color}`}>
                          <rc.icon className="w-3.5 h-3.5" />
                          {rc.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell">
                          <div className="flex flex-wrap gap-1.5 max-w-xs">
                            {member.groups.length === 0 ? (
                              <span className="text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 px-2 py-1 rounded-lg">Aucun groupe</span>
                            ) : (
                              member.groups.slice(0, 3).map((g, idx) => (
                                <span key={g.id || `m-g-${idx}`} className="inline-block px-2.5 py-1 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-medium shadow-sm">
                                  {escapeText(untrusted(g.name))}
                                </span>
                              ))
                            )}
                          {member.groups.length > 3 && (
                            <span className="inline-flex items-center px-2 py-1 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-lg text-xs font-bold border border-primary-200/50 dark:border-primary-800/50">
                              +{member.groups.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden sm:table-cell">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          {new Date(member.created_at).toLocaleDateString('fr-FR')}
                        </span>
                      </td>
                      {!isReadOnly && (
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover/row:opacity-100 transition-opacity">
                            {/* Changer rôle */}
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleChangeRole(member)}
                              disabled={updatingId === member.id || member.id === user.id}
                              title={member.role === 'student' ? "Promouvoir administrateur" : "Rétrograder étudiant"}
                              className="p-2.5 bg-gray-50 dark:bg-slate-800 hover:bg-accent-100 dark:hover:bg-accent-900/50 border border-gray-200 dark:border-gray-700 hover:border-accent-200 dark:hover:border-accent-800/50 rounded-xl transition-all disabled:opacity-50 shadow-sm"
                            >
                              {updatingId === member.id ? (
                                <Loader2 className="w-4 h-4 animate-spin text-accent-500 dark:text-accent-400" />
                              ) : (
                                <Shield className="w-4 h-4 text-accent-600 dark:text-accent-400" />
                              )}
                            </motion.button>

                            {/* Impersonate */}
                            {member.id !== user.id && (
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => startImpersonation(member.id)}
                                title="Voir comme l'utilisateur"
                                className="p-2.5 bg-gray-50 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-gray-200 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800/50 rounded-xl transition-all shadow-sm"
                              >
                                <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              </motion.button>
                            )}
 
                            {/* Supprimer (étudiants pour les admins, tout le monde pour super_admin) */}
                            {(member.role === 'student' || user?.role === 'super_admin') && (
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleRemove(member)}
                                disabled={deletingId === member.id || member.id === user.id}
                                title="Retirer de l'entreprise"
                                className="p-2.5 bg-gray-50 dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-900/50 border border-gray-200 dark:border-gray-700 hover:border-red-200 dark:hover:border-red-800/50 rounded-xl transition-all disabled:opacity-50 shadow-sm"
                              >
                                {deletingId === member.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-red-500 dark:text-red-400" />
                                ) : (
                                  <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                                )}
                              </motion.button>
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