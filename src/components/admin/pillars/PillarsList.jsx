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
    
    // ============================================
    // RÉFS SIMPLIFIÉES (SANS AbortController)
    // ============================================
    const isMounted = useRef(true);
    const fetchTimeoutRef = useRef(null);
    const initialLoadRef = useRef(true);
    const renderCountRef = useRef(0);
    const fetchingRef = useRef(false);
    
    // ============================================
    // ÉTATS
    // ============================================
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

    // ============================================
    // DEBUG - COMPTER LES RENDUS (optionnel)
    // ============================================
    useEffect(() => {
        renderCountRef.current += 1;
        console.log('🔄 PillarsList render #', renderCountRef.current);
    });

    // ============================================
    // SAUVEGARDER LA PRÉFÉRENCE DE VUE
    // ============================================
    useEffect(() => {
        localStorage.setItem('pillarViewMode', viewMode);
    }, [viewMode]);

    // ============================================
    // RÉCUPÉRER L'ORGANIZATION ID
    // ============================================
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

    // ============================================
    // CHARGER LES PILIERS (SANS AbortController)
    // ============================================
    const fetchPillars = useCallback(async (isRefresh = false) => {
        // Éviter les appels simultanés
        if (fetchingRef.current) {
            console.log('⏳ Fetch déjà en cours, ignoré');
            return;
        }

        // Nettoyer les timeouts précédents
        if (fetchTimeoutRef.current) {
            clearTimeout(fetchTimeoutRef.current);
            fetchTimeoutRef.current = null;
        }

        fetchingRef.current = true;

        // Gérer l'état de chargement
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
                    if (isRefresh) {
                        setRefreshing(false);
                    } else {
                        setLoading(false);
                    }
                }
                fetchingRef.current = false;
                return;
            }

            if (!isMounted.current) {
                fetchingRef.current = false;
                return;
            }

            // Construire la requête principale pour les piliers
            let query = supabase
                .from('pillars')
                .select(`
                    *,
                    videos: videos(count)
                `)
                .eq('organization_id', orgId);

            // Tri côté Supabase si possible
            if (filters.sortBy !== 'videoCount') {
                query = query.order(filters.sortBy, { ascending: filters.sortOrder === 'asc' });
            }

            // Exécuter la requête
            const { data, error } = await query;

            if (error) {
                throw error;
            }

            if (!isMounted.current) {
                fetchingRef.current = false;
                return;
            }

            // ============================================
            // RÉCUPÉRER LE NOMBRE D'ÉTUDIANTS PAR PILIER
            // ============================================
            let studentCountsByPillar = {};

            if (data && data.length) {
                const pillarIds = data.map(p => p.id);

                try {
                    const { data: accessData, error: accessError } = await supabase
                        .from('group_pillar_access')
                        .select(`
                            pillar_id,
                            group:groups(
                                group_members(count)
                            )
                        `)
                        .in('pillar_id', pillarIds);

                    if (!accessError && accessData) {
                        accessData.forEach(row => {
                            const count = row.group?.group_members?.[0]?.count || 0;
                            studentCountsByPillar[row.pillar_id] =
                                (studentCountsByPillar[row.pillar_id] || 0) + count;
                        });
                    } else if (accessError) {
                        console.warn('⚠️ Impossible de charger les étudiants par pilier:', accessError);
                    }
                } catch (studentsErr) {
                    console.warn('⚠️ Erreur lors du calcul des étudiants par pilier:', studentsErr);
                }
            }

            // Traiter les données
            let pillarsWithStats = data?.map(pillar => ({
                ...pillar,
                videoCount: pillar.videos?.[0]?.count || 0,
                studentCount: studentCountsByPillar[pillar.id] || 0,
                safeName: escapeText(untrusted(pillar.name)),
                safeDescription: escapeText(untrusted(pillar.description || ''))
            })) || [];

            // Tri sur videoCount (côté client)
            if (filters.sortBy === 'videoCount') {
                pillarsWithStats = [...pillarsWithStats].sort((a, b) => {
                    return filters.sortOrder === 'asc'
                        ? a.videoCount - b.videoCount
                        : b.videoCount - a.videoCount;
                });
            }

            // Filtrer par recherche
            const filtered = pillarsWithStats.filter(pillar =>
                pillar.safeName.toLowerCase().includes(filters.search.toLowerCase()) ||
                pillar.safeDescription.toLowerCase().includes(filters.search.toLowerCase())
            );

            setPillars(filtered);
            
            // Mettre à jour les stats
            setStats({
                total: filtered.length,
                withVideos: filtered.filter(p => p.videoCount > 0).length,
                totalVideos: filtered.reduce((acc, p) => acc + p.videoCount, 0),
                totalStudents: filtered.reduce((acc, p) => acc + p.studentCount, 0)
            });

        } catch (err) {
            console.error('❌ Erreur chargement piliers:', err);
            if (isMounted.current) {
                setError(err.message || 'Impossible de charger les piliers');
                showError('Impossible de charger les piliers');
            }
        } finally {
            if (isMounted.current) {
                if (isRefresh) {
                    setRefreshing(false);
                } else {
                    setLoading(false);
                }
            }
            fetchingRef.current = false;
        }
    }, [getOrgId, filters.sortBy, filters.sortOrder, filters.search, showError]);

    // ============================================
    // CLEANUP AU DÉMONTAGE
    // ============================================
    useEffect(() => {
        isMounted.current = true;
        
        // Charger les données UNE SEULE fois au montage
        if (initialLoadRef.current) {
            initialLoadRef.current = false;
            fetchPillars(false);
        }

        return () => {
            isMounted.current = false;
            
            // Nettoyer les timeouts
            if (fetchTimeoutRef.current) {
                clearTimeout(fetchTimeoutRef.current);
                fetchTimeoutRef.current = null;
            }
        };
    }, [fetchPillars]);

    // ============================================
    // HANDLERS
    // ============================================
    const handleRefresh = useCallback(() => {
        if (refreshing || fetchingRef.current) {
            console.log('⏳ Rafraîchissement déjà en cours');
            return;
        }
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

        if (!window.confirm(`Êtes-vous sûr de vouloir supprimer "${pillar.safeName}" ?`)) {
            return;
        }

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

    // ============================================
    // AFFICHAGE DES ERREURS
    // ============================================
    if (error) {
        return (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-red-600" />
                    <p className="text-sm text-red-700">{error}</p>
                </div>
                <button
                    onClick={handleRefresh}
                    className="mt-2 text-sm text-red-600 hover:text-red-700 underline"
                >
                    Réessayer
                </button>
            </div>
        );
    }

    // ============================================
    // RENDU PRINCIPAL (inchangé)
    // ============================================
    return (
        <div className="space-y-6">
            {/* Barre d'outils premium */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-xl border border-indigo-100"
            >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Stats rapides */}
                    <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                            <span className="text-gray-600">{stats.total} piliers</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-purple-500 rounded-full" />
                            <span className="text-gray-600">{stats.totalVideos} vidéos</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                            <span className="text-gray-600">{stats.totalStudents} étudiants</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        <PillarFilters filters={filters} onChange={handleFilterChange} />

                        {/* Switch vue */}
                        <div className="flex bg-gray-100 rounded-lg p-1">
                            <button
                                onClick={() => handleViewChange('table')}
                                className={`p-2 rounded-lg transition-all ${
                                    viewMode === 'table'
                                        ? 'bg-white text-indigo-600 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                                title="Vue tableau"
                            >
                                <TableIcon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleViewChange('cards')}
                                className={`p-2 rounded-lg transition-all ${
                                    viewMode === 'cards'
                                        ? 'bg-white text-indigo-600 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                                title="Vue cartes"
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Rafraîchir - SIMPLIFIÉ */}
                        <motion.button
                            whileHover={{ rotate: 180 }}
                            transition={{ duration: 0.3 }}
                            onClick={handleRefresh}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Rafraîchir"
                            disabled={refreshing || loading}
                        >
                            <RefreshCw className={`w-4 h-4 text-gray-600 ${(refreshing || loading) ? 'animate-spin' : ''}`} />
                        </motion.button>

                        {/* Nouveau pilier */}
                        {!isReadOnly && (
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleCreate}
                                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all flex items-center gap-2 group"
                            >
                                <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                                Nouveau pilier
                                <Sparkles className="w-3 h-3 opacity-50" />
                            </motion.button>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Liste des piliers */}
            {loading && pillars.length === 0 ? (
                <PillarSkeleton viewMode={viewMode} />
            ) : pillars.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/90 backdrop-blur-sm rounded-2xl p-12 shadow-xl border border-indigo-100 text-center"
                >
                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Aucun pilier</h3>
                    <p className="text-gray-500 mb-6">
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

            {/* Modals */}
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