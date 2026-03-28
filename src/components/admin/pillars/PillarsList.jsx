// src/components/admin/pillars/PillarsList.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Plus, RefreshCw, Sparkles, Shield,
    LayoutGrid, Table as TableIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../ui/Toast';
import { untrusted, escapeText } from '../../../utils/security';
import PillarCard from './PillarCard';
import PillarTable from './PillarTable';
import PillarFilters from './PillarFilters';
import CreatePillarModal from './CreatePillarModal';
import EditPillarModal from './EditPillarModal';
import PillarSkeleton from './PillarSkeleton';

export default function PillarsList({ isReadOnly = false, orgId: propOrgId }) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { success, error: showError } = useToast();
    
    const isMounted = useRef(true);
    const fetchTimeoutRef = useRef(null);
    const initialLoadRef = useRef(true);
    const fetchingRef = useRef(false);
    
    const [pillars, setPillars] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [viewMode, setViewMode] = useState(() => {
        return localStorage.getItem('pillarViewMode') || 'table';
    });
    const [filters, setFilters] = useState({
        search: '',
        sortBy: 'name',
        sortOrder: 'asc'
    });
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedPillar, setSelectedPillar] = useState(null);
    const [stats, setStats] = useState({
        total: 0,
        withVideos: 0,
        totalVideos: 0,
        totalStudents: 0
    });
    const [error, setError] = useState(null);

    useEffect(() => {
        localStorage.setItem('pillarViewMode', viewMode);
    }, [viewMode]);

    const getOrgId = useCallback(async () => {
        if (propOrgId) return propOrgId;
        if (!user?.id) return null;
        try {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('organization_id')
                .eq('id', user.id)
                .maybeSingle();
            if (error) {
                console.error('Erreur récupération orgId:', error);
                return null;
            }
            return profile?.organization_id;
        } catch (err) {
            console.error('Exception récupération orgId:', err);
            return null;
        }
    }, [user?.id, propOrgId]);

    const fetchPillars = useCallback(async (isRefresh = false) => {
        if (fetchingRef.current) return;
        if (fetchTimeoutRef.current) {
            clearTimeout(fetchTimeoutRef.current);
            fetchTimeoutRef.current = null;
        }
        fetchingRef.current = true;
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }
        setError(null);

        try {
            const orgId = await getOrgId();
            if (!orgId) {
                if (isMounted.current) {
                    setError("ID d'organisation non trouvé");
                    if (isRefresh) setRefreshing(false); else setLoading(false);
                }
                fetchingRef.current = false;
                return;
            }

            if (!isMounted.current) {
                fetchingRef.current = false;
                return;
            }

            let query = supabase
                .from('pillars')
                .select(`
                    *,
                    videos: videos(count)
                `)
                .eq('organization_id', orgId);

            if (filters.sortBy !== 'videoCount') {
                query = query.order(filters.sortBy, { ascending: filters.sortOrder === 'asc' });
            }

            const { data, error } = await query;
            if (error) throw error;

            if (!isMounted.current) {
                fetchingRef.current = false;
                return;
            }

            const studentCountsByPillar = {};
            if (data && data.length) {
                const pillarIds = data.map(p => p.id);
                try {
                    const { data: accessData, error: accessError } = await supabase
                        .from('group_pillar_access')
                        .select('pillar_id, group_id')
                        .in('pillar_id', pillarIds);
                    if (!accessError && accessData?.length) {
                        const groupIds = [...new Set(accessData.map(r => r.group_id))];
                        const { data: membersData, error: membersError } = await supabase
                            .from('group_members')
                            .select('group_id')
                            .in('group_id', groupIds);
                        if (!membersError && membersData) {
                            const memberCountByGroup = {};
                            membersData.forEach(m => {
                                memberCountByGroup[m.group_id] = (memberCountByGroup[m.group_id] || 0) + 1;
                            });
                            accessData.forEach(row => {
                                const count = memberCountByGroup[row.group_id] || 0;
                                studentCountsByPillar[row.pillar_id] =
                                    (studentCountsByPillar[row.pillar_id] || 0) + count;
                            });
                        }
                    }
                } catch (studentsErr) {
                    console.warn('Erreur lors du calcul des étudiants par pilier:', studentsErr);
                }
            }

            let pillarsWithStats = data?.map(pillar => ({
                ...pillar,
                videoCount: pillar.videos?.[0]?.count || 0,
                studentCount: studentCountsByPillar[pillar.id] || 0,
                safeName: escapeText(untrusted(pillar.name)),
                safeDescription: escapeText(untrusted(pillar.description || ''))
            })) || [];

            if (filters.sortBy === 'videoCount') {
                pillarsWithStats = [...pillarsWithStats].sort((a, b) => {
                    return filters.sortOrder === 'asc'
                        ? a.videoCount - b.videoCount
                        : b.videoCount - a.videoCount;
                });
            }

            const filtered = pillarsWithStats.filter(pillar =>
                pillar.safeName.toLowerCase().includes(filters.search.toLowerCase()) ||
                pillar.safeDescription.toLowerCase().includes(filters.search.toLowerCase())
            );

            setPillars(filtered);
            setStats({
                total: filtered.length,
                withVideos: filtered.filter(p => p.videoCount > 0).length,
                totalVideos: filtered.reduce((acc, p) => acc + p.videoCount, 0),
                totalStudents: filtered.reduce((acc, p) => acc + p.studentCount, 0)
            });

        } catch (err) {
            console.error('Erreur chargement piliers:', err);
            if (isMounted.current) {
                setError(err.message || "Erreur lors du chargement des piliers");
                showError("Erreur lors du chargement des piliers");
            }
        } finally {
            if (isMounted.current) {
                if (isRefresh) setRefreshing(false); else setLoading(false);
            }
            fetchingRef.current = false;
        }
    }, [getOrgId, filters.sortBy, filters.sortOrder, filters.search, showError]);

    useEffect(() => {
        isMounted.current = true;
        if (initialLoadRef.current) {
            initialLoadRef.current = false;
            fetchPillars(false);
        }
        return () => {
            isMounted.current = false;
            if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
        };
    }, [fetchPillars]);

    const handleRefresh = useCallback(() => {
        if (refreshing || fetchingRef.current) return;
        fetchPillars(true);
        success("Liste des piliers actualisée");
    }, [fetchPillars, success, refreshing]);

    const handleCreate = useCallback(() => {
        if (isReadOnly) {
            showError("Vous n'avez pas les droits pour modifier les piliers");
            return;
        }
        setShowCreateModal(true);
    }, [isReadOnly, showError]);

    const handleEdit = useCallback((pillar) => {
        if (isReadOnly) {
            showError("Vous n'avez pas les droits pour modifier les piliers");
            return;
        }
        setSelectedPillar(pillar);
        setShowEditModal(true);
    }, [isReadOnly, showError]);

    const handleDelete = useCallback(async (pillar) => {
        if (isReadOnly) {
            showError("Vous n'avez pas les droits pour modifier les piliers");
            return;
        }
        if (!window.confirm(`Êtes-vous sûr de vouloir supprimer le pilier "${pillar.safeName}" ?`)) return;
        try {
            const { error } = await supabase
                .from('pillars')
                .delete()
                .eq('id', pillar.id);
            if (error) throw error;
            success("Pilier supprimé avec succès");
            fetchPillars(false);
        } catch (err) {
            console.error('❌ Erreur suppression:', err);
            showError("Erreur lors du suppression du pilier");
        }
    }, [isReadOnly, showError, success, fetchPillars]);

    const handleViewChange = useCallback((mode) => {
        setViewMode(mode);
    }, []);

    const handleFilterChange = useCallback((newFilters) => {
        setFilters(newFilters);
    }, []);

    if (error) {
        return (
            <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-red-600 dark:text-red-400" />
                    <div>
                        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                        {error.includes('infinite recursion') && (
                            <p className="text-xs text-red-500 dark:text-red-400 mt-1 font-medium">
                                Erreur d'accès à la base de données. Veuillez contacter le support.
                            </p>
                        )}
                    </div>
                </div>
                <button
                    onClick={handleRefresh}
                    className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 underline"
                >
                    Réessayer
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/50 dark:border-white/5 overflow-hidden relative"
            >
                {/* Glow de fond */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/5 dark:bg-primary-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                <div className="relative z-10 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
                    <div className="flex flex-wrap items-center gap-6">
                        <div className="flex items-center gap-3 bg-gray-50/80 dark:bg-slate-800/60 px-4 py-2 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                            <div className="w-2.5 h-2.5 bg-primary-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide">
                                {stats.total} Piliers
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 bg-purple-500 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
                            <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                                {stats.totalVideos} Vidéos
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                            <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                                {stats.totalStudents} Étudiants
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex-1 sm:flex-none">
                            <PillarFilters filters={filters} onChange={handleFilterChange} />
                        </div>

                        <div className="flex bg-gray-100/80 dark:bg-slate-800/80 p-1 rounded-xl shadow-inner border border-gray-200 dark:border-gray-700">
                            <button
                                onClick={() => handleViewChange('table')}
                                className={`p-2.5 rounded-lg transition-all ${
                                    viewMode === 'table'
                                        ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-md'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                                title="Vue Tableau"
                            >
                                <TableIcon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleViewChange('cards')}
                                className={`p-2.5 rounded-lg transition-all ${
                                    viewMode === 'cards'
                                        ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-md'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                                title="Vue Cartes"
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                        </div>

                        <motion.button
                            whileHover={{ rotate: 180 }}
                            transition={{ duration: 0.3 }}
                            onClick={handleRefresh}
                            className="p-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-500 rounded-2xl shadow-sm transition-all"
                            title="Actualiser"
                            disabled={refreshing || loading}
                        >
                            <RefreshCw className={`w-4 h-4 text-gray-600 dark:text-gray-300 ${(refreshing || loading) ? 'animate-spin' : ''}`} />
                        </motion.button>

                        {!isReadOnly && (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleCreate}
                                className="group px-6 py-3 bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-500 hover:to-accent-500 text-white rounded-2xl shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/40 transition-all flex items-center justify-center gap-3 font-bold border border-white/10 shrink-0 w-full sm:w-auto"
                            >
                                <div className="p-1 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                                    <Plus className="w-4 h-4" />
                                </div>
                                Nouveau pilier
                            </motion.button>
                        )}
                    </div>
                </div>
            </motion.div>

            {loading && pillars.length === 0 ? (
                <PillarSkeleton viewMode={viewMode} />
            ) : pillars.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl p-12 shadow-xl border border-white/50 dark:border-white/5 text-center relative overflow-hidden"
                >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="relative z-10 w-24 h-24 bg-gradient-to-br from-primary-100 to-primary-50 dark:from-primary-900/40 dark:to-primary-800/20 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-inner border border-white/50 dark:border-gray-700 transform rotate-3">
                        <BookOpen className="w-12 h-12 text-primary-500 drop-shadow-md" />
                    </div>
                    <h3 className="text-2xl font-extrabold text-gray-800 dark:text-white mb-2 tracking-tight">Aucun pilier trouvé</h3>
                    <p className="text-gray-500 dark:text-gray-400 font-medium mb-8 max-w-sm mx-auto">
                        Commencez par créer votre premier pilier de formation pour organiser votre contenu.
                    </p>
                    {!isReadOnly && (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleCreate}
                            className="px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl shadow-xl hover:shadow-2xl transition-all inline-flex items-center gap-2 font-bold text-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Créer un pilier
                        </motion.button>
                    )}
                </motion.div>
            ) : viewMode === 'table' ? (
                <PillarTable 
                    pillars={pillars}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    isReadOnly={isReadOnly}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pillars.map((pillar, index) => (
                        <PillarCard
                            key={pillar.id}
                            pillar={pillar}
                            index={index}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            isReadOnly={isReadOnly}
                        />
                    ))}
                </div>
            )}

            <CreatePillarModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={() => fetchPillars(false)}
                orgId={propOrgId}
            />

            <EditPillarModal
                isOpen={showEditModal}
                onClose={() => {
                    setShowEditModal(false);
                    setSelectedPillar(null);
                }}
                pillar={selectedPillar}
                onSuccess={() => fetchPillars(false)}
            />
        </div>
    );
}