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
                    setError('Organisation non trouvée');
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
                setError(err.message || 'Impossible de charger les piliers');
                showError('Impossible de charger les piliers');
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
        success('Données mises à jour');
    }, [fetchPillars, success, refreshing]);

    const handleCreate = useCallback(() => {
        if (isReadOnly) {
            showError('Mode lecture seule');
            return;
        }
        setShowCreateModal(true);
    }, [isReadOnly, showError]);

    const handleEdit = useCallback((pillar) => {
        if (isReadOnly) {
            showError('Mode lecture seule');
            return;
        }
        setSelectedPillar(pillar);
        setShowEditModal(true);
    }, [isReadOnly, showError]);

    const handleDelete = useCallback(async (pillar) => {
        if (isReadOnly) {
            showError('Mode lecture seule');
            return;
        }
        if (!window.confirm(`Êtes-vous sûr de vouloir supprimer "${pillar.safeName}" ?`)) return;
        try {
            const { error } = await supabase
                .from('pillars')
                .delete()
                .eq('id', pillar.id);
            if (error) throw error;
            success('Pilier supprimé avec succès');
            fetchPillars(false);
        } catch (err) {
            console.error('❌ Erreur suppression:', err);
            showError('Impossible de supprimer le pilier');
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
                                💡 Conseil : Un problème de sécurité (RLS) récursif est détecté sur la table group_members.
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
                className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-4 shadow-xl border border-indigo-100 dark:border-gray-700"
            >
                <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                            <span className="text-gray-600 dark:text-gray-300 whitespace-nowrap">{stats.total} piliers</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-purple-500 rounded-full" />
                            <span className="text-gray-600 dark:text-gray-300 whitespace-nowrap">{stats.totalVideos} vidéos</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                            <span className="text-gray-600 dark:text-gray-300 whitespace-nowrap">{stats.totalStudents} étudiants</span>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex-1 sm:flex-none">
                            <PillarFilters filters={filters} onChange={handleFilterChange} />
                        </div>

                        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1 shrink-0">
                            <button
                                onClick={() => handleViewChange('table')}
                                className={`p-2 rounded-lg transition-all ${
                                    viewMode === 'table'
                                        ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                                title="Vue tableau"
                            >
                                <TableIcon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleViewChange('cards')}
                                className={`p-2 rounded-lg transition-all ${
                                    viewMode === 'cards'
                                        ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                                title="Vue cartes"
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                        </div>

                        <motion.button
                            whileHover={{ rotate: 180 }}
                            transition={{ duration: 0.3 }}
                            onClick={handleRefresh}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors shrink-0"
                            title="Rafraîchir"
                            disabled={refreshing || loading}
                        >
                            <RefreshCw className={`w-4 h-4 text-gray-600 dark:text-gray-300 ${(refreshing || loading) ? 'animate-spin' : ''}`} />
                        </motion.button>

                        {!isReadOnly && (
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleCreate}
                                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all flex items-center gap-2 group flex-1 sm:flex-none justify-center whitespace-nowrap"
                            >
                                <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                                <span className="hidden xs:inline">Nouveau pilier</span>
                                <Plus className="w-4 h-4 xs:hidden" />
                                <Sparkles className="w-3 h-3 opacity-50" />
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
                    className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-12 shadow-xl border border-indigo-100 dark:border-gray-700 text-center"
                >
                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <svg className="w-10 h-10 text-indigo-400 dark:text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Aucun pilier</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                        Commencez par créer votre premier pilier de formation
                    </p>
                    {!isReadOnly && (
                        <button
                            onClick={handleCreate}
                            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all inline-flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Créer un pilier
                        </button>
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