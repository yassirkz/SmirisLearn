// src/components/admin/quizzes/QuizList.jsx
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Filter, X, Edit, Trash2, Copy, Eye,
    RefreshCw, Plus, Sparkles, Award, Clock,
    BarChart3, ChevronLeft, ChevronRight, Target,
    History as HistoryIcon
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../ui/Toast';
import { untrusted, escapeText } from '../../../utils/security';

export default function QuizList({ isReadOnly = false, orgId: propOrgId, onEdit, onDelete, onDuplicate, onCreate, onViewStats, refreshTrigger = 0 }) {
    const { user } = useAuth();
    const { success, error: showError } = useToast();
    const showErrorRef = useRef(showError);
    useEffect(() => { showErrorRef.current = showError; }, [showError]);
    
    const [allQuizzes, setAllQuizzes] = useState([]);
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [localRefreshKey, setLocalRefreshKey] = useState(0);
    const fetchingRef = useRef(false);
    
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState({
        search: '',
        video_id: 'all',
        sortBy: 'created_at',
        sortOrder: 'desc'
    });
    const itemsPerPage = 10;

    const userId = user?.id;
    const [organizationId, setOrganizationId] = useState(null);

    useEffect(() => {
        const fetchOrgId = async () => {
            try {
                if (propOrgId) {
                    setOrganizationId(propOrgId);
                    return;
                }
                if (userId) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('organization_id')
                        .eq('id', userId)
                        .single();
                    if (profile?.organization_id) {
                        setOrganizationId(profile.organization_id);
                    }
                }
            } catch (err) {
                console.error("Error fetching orgId:", err);
            }
        };
        fetchOrgId();
    }, [userId, propOrgId]);

    useEffect(() => {
        if (!organizationId) return;
        const fetchVideosList = async () => {
            try {
                const { data: pillars } = await supabase
                    .from('pillars')
                    .select('id')
                    .eq('organization_id', organizationId);
                if (!pillars?.length) return;
                const pillarIds = pillars.map(p => p.id);
                const { data } = await supabase
                    .from('videos')
                    .select('id, title')
                    .in('pillar_id', pillarIds)
                    .order('title');
                setVideos(data || []);
            } catch (err) {
                console.error('Erreur chargement vidéos filtre:', err);
            }
        };
        fetchVideosList();
    }, [organizationId]);

    const loadQuizzes = useCallback(async (isSilent = false) => {
        if (!organizationId || fetchingRef.current) return;
        
        fetchingRef.current = true;
        if (isSilent) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            const { data: pillars, error: pErr } = await supabase
                .from('pillars')
                .select('id')
                .eq('organization_id', organizationId);
            if (pErr) throw pErr;

            const pillarIds = (pillars || []).map(p => p.id);
            if (!pillarIds.length) {
                setAllQuizzes([]);
                return;
            }

            const { data: videoRows, error: vErr } = await supabase
                .from('videos')
                .select('id')
                .in('pillar_id', pillarIds);
            if (vErr) throw vErr;

            const videoIds = (videoRows || []).map(v => v.id);
            if (!videoIds.length) {
                setAllQuizzes([]);
                return;
            }

            const { data, error } = await supabase
                .from('quizzes')
                .select(`
                    *,
                    video:videos(
                        id, title,
                        pillar:pillars(name)
                    )
                `)
                .in('video_id', videoIds)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAllQuizzes(data || []);
        } catch (err) {
            console.error('Erreur chargement quiz:', err);
            showErrorRef.current('Échec du chargement des quiz');
        } finally {
            setLoading(false);
            setRefreshing(false);
            fetchingRef.current = false;
        }
    }, [organizationId]);

    useEffect(() => {
        loadQuizzes();
    }, [loadQuizzes, refreshTrigger, localRefreshKey]);

    // Filtrage et tri local
    const filteredQuizzes = useMemo(() => {
        let result = allQuizzes.filter(q => {
            // Filtre par vidéo
            if (filters.video_id !== 'all' && q.video_id !== filters.video_id) {
                return false;
            }

            // Recherche textuelle
            if (filters.search) {
                const s = filters.search.toLowerCase();
                const videoTitle = q.video?.title?.toLowerCase() || '';
                const pillarName = q.video?.pillar?.name?.toLowerCase() || '';
                if (!videoTitle.includes(s) && !pillarName.includes(s)) {
                    return false;
                }
            }
            return true;
        });

        // Tri
        const { sortBy, sortOrder } = filters;
        result.sort((a, b) => {
            let valA, valB;
            if (sortBy === 'created_at') {
                valA = new Date(a.created_at).getTime();
                valB = new Date(b.created_at).getTime();
            } else {
                valA = a[sortBy] || 0;
                valB = b[sortBy] || 0;
            }

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [allQuizzes, filters]);

    // Pagination locale
    const totalPages = Math.ceil(filteredQuizzes.length / itemsPerPage);
    const paginatedQuizzes = useMemo(() => {
        const start = (page - 1) * itemsPerPage;
        return filteredQuizzes.slice(start, start + itemsPerPage);
    }, [filteredQuizzes, page]);

    const handleRefresh = () => {
        setLocalRefreshKey(k => k + 1);
    };

    const formatDate = (date) => new Date(date).toLocaleDateString('fr-FR');
    const getVideoTitle = (quiz) => quiz.video?.title || 'Vidéo inconnue';
    const getPillarName = (quiz) => quiz.video?.pillar?.name || 'Pilier inconnu';

    if (loading && allQuizzes.length === 0) {
        return (
            <div className="flex justify-center py-12">
                <div className="w-10 h-10 border-4 border-primary-200 dark:border-primary-800 rounded-full border-t-primary-600 dark:border-t-primary-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Barre de filtres */}
            <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl p-5 shadow-lg border border-white/50 dark:border-white/5 relative overflow-hidden">
                <div className="flex flex-col lg:flex-row lg:items-center gap-5">
                    <div className="flex items-center gap-3 px-2 h-11">
                        <div className="p-2 bg-primary-50 dark:bg-primary-900/30 rounded-xl">
                            <Filter className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 uppercase tracking-tight">Filtres</h2>
                    </div>

                    <div className="flex-1 flex flex-col sm:flex-row gap-3 items-center">
                        <div className="relative flex-1 group w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5 group-focus-within:text-primary-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Rechercher..."
                                value={filters.search}
                                onChange={(e) => {
                                    setFilters({ ...filters, search: e.target.value });
                                    setPage(1);
                                }}
                                className="w-full pl-11 pr-4 h-11 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-gray-700 rounded-xl focus:border-primary-400 dark:focus:border-primary-500 focus:ring-4 focus:ring-primary-100 dark:focus:ring-primary-900/30 dark:text-white transition-all font-medium placeholder:text-gray-400"
                            />
                        </div>

                        <select
                            value={filters.video_id}
                            onChange={(e) => {
                                setFilters({ ...filters, video_id: e.target.value });
                                setPage(1);
                            }}
                            className="w-full sm:w-auto px-4 h-11 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-gray-700 rounded-xl focus:border-primary-400 dark:focus:border-primary-500 focus:ring-4 focus:ring-primary-100 dark:focus:ring-primary-900/30 dark:text-white transition-all font-medium min-w-[200px] cursor-pointer"
                        >
                            <option value="all">Toutes les vidéos</option>
                            {videos.map((v, idx) => (
                                <option key={v.id || `v-opt-${idx}`} value={v.id}>
                                    {escapeText(untrusted(v.title))}
                                </option>
                            ))}
                        </select>

                        <div className="flex bg-gray-100/80 dark:bg-slate-800/80 p-1.5 rounded-xl shadow-inner border border-gray-200 dark:border-gray-700 h-11 items-center">
                            <button
                                onClick={() => setFilters({ ...filters, sortOrder: 'desc' })}
                                className={`p-2 rounded-lg transition-all ${
                                    filters.sortOrder === 'desc'
                                        ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-md'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                                title="Plus récents"
                            >
                                <Clock className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setFilters({ ...filters, sortOrder: 'asc' })}
                                className={`p-2 rounded-lg transition-all ${
                                    filters.sortOrder === 'asc'
                                        ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-md'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                                title="Plus anciens"
                            >
                                <HistoryIcon className="w-4 h-4" />
                            </button>
                        </div>

                        <motion.button
                            whileHover={{ rotate: 180 }}
                            transition={{ duration: 0.3 }}
                            onClick={handleRefresh}
                            className="w-11 h-11 flex items-center justify-center bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-500 rounded-xl shadow-sm transition-all shrink-0"
                            title="Actualiser"
                            disabled={loading && allQuizzes.length === 0}
                        >
                            <RefreshCw className={`w-4 h-4 text-gray-600 dark:text-gray-300 ${loading ? 'animate-spin' : ''}`} />
                        </motion.button>

                        {!isReadOnly && onCreate && (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => onCreate?.()}
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

            {/* Liste des quiz */}
            {filteredQuizzes.length === 0 ? (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl p-16 shadow-xl border border-white/50 dark:border-white/5 text-center relative overflow-hidden"
                >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary-500/5 dark:bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
                    
                    <div className="relative z-10">
                        <div className="w-24 h-24 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-gray-100 dark:border-gray-700">
                            <Award className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-3">
                            {filters.search || filters.video_id !== 'all' ? "Aucun quiz ne correspond" : "Aucun quiz trouvé"}
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                            {filters.search || filters.video_id !== 'all' ? "Essayez de modifier vos filtres." : "Créez des quiz pour évaluer les connaissances de vos étudiants."}
                        </p>
                    </div>
                </motion.div>
            ) : (
                <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 dark:border-white/5 overflow-hidden transition-all duration-300 relative">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[800px]">
                            <thead className="bg-gray-50/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-700/50">
                                <tr>
                                    <th className="px-6 py-5 text-left text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest whitespace-nowrap w-2">Vidéo / Pilier</th>
                                    <th className="px-6 py-5 text-center text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest whitespace-nowrap w-24">Questions</th>
                                    <th className="px-6 py-5 text-center text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest whitespace-nowrap w-32">Config</th>
                                    <th className="px-6 py-5 text-left text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest whitespace-nowrap w-32">Créé le</th>
                                    <th className="px-6 py-5 text-right text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest whitespace-nowrap w-40">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100/50 dark:divide-gray-800/50">
                                {paginatedQuizzes.map((quiz, idx) => (
                                    <motion.tr
                                        key={quiz.id || `quiz-${idx}`}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="hover:bg-white/60 dark:hover:bg-slate-700/40 transition-all duration-300 group cursor-default"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-gradient-to-br from-primary-50 to-accent-50 dark:from-primary-900/20 dark:to-accent-900/20 rounded-2xl flex items-center justify-center text-primary-500 dark:text-primary-400 shadow-sm border border-primary-100/50 dark:border-primary-800/30 group-hover:scale-105 transition-transform">
                                                    <Award className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-800 dark:text-gray-200 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                                        {escapeText(untrusted(getVideoTitle(quiz)))}
                                                    </div>
                                                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">
                                                        {escapeText(untrusted(getPillarName(quiz)))}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-flex items-center justify-center px-3 py-1.5 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-xl text-xs font-bold border border-primary-200/50 dark:border-primary-800/50 shadow-sm">
                                                {quiz.questions?.length || 0} QS
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col items-center gap-1.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 w-8 text-right">Score</span>
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-bold shadow-sm border border-green-200/50 dark:border-green-800/50 w-12 justify-center">
                                                        {quiz.passing_score}%
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 w-8 text-right">Essais</span>
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-accent-50 dark:bg-accent-900/20 text-accent-700 dark:text-accent-400 text-xs font-bold shadow-sm border border-accent-200/50 dark:border-accent-800/50 w-12 justify-center">
                                                        {quiz.max_attempts === -1 ? '∞' : quiz.max_attempts}
                                                    </span>
                                                </div>
                                                {quiz.timer_minutes && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 w-8 text-right">Temps</span>
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 text-xs font-bold shadow-sm border border-gray-200/50 dark:border-gray-700/50 w-16 justify-center">
                                                            <Clock className="w-3 h-3 mr-1 opacity-70" /> {quiz.timer_minutes}'
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                                            {formatDate(quiz.created_at)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                <motion.button
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => onViewStats?.(quiz)}
                                                    className="p-2.5 bg-gray-50 dark:bg-slate-800 hover:bg-primary-100 dark:hover:bg-primary-900/50 border border-gray-200 dark:border-gray-700 hover:border-primary-200 dark:hover:border-primary-800/50 rounded-xl transition-all text-primary-600 dark:text-primary-400 shadow-sm"
                                                    title="Statistiques"
                                                >
                                                    <BarChart3 className="w-4 h-4" />
                                                </motion.button>
                                                {!isReadOnly && (
                                                    <>
                                                        <motion.button
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            onClick={() => onEdit(quiz)}
                                                            className="p-2.5 bg-gray-50 dark:bg-slate-800 hover:bg-accent-100 dark:hover:bg-accent-900/50 border border-gray-200 dark:border-gray-700 hover:border-accent-200 dark:hover:border-accent-800/50 rounded-xl transition-all text-accent-600 dark:text-accent-400 shadow-sm"
                                                            title="Modifier"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </motion.button>
                                                        <motion.button
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            onClick={() => onDuplicate?.(quiz)}
                                                            className="p-2.5 bg-gray-50 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl transition-all text-gray-600 dark:text-gray-300 shadow-sm"
                                                            title="Dupliquer"
                                                        >
                                                            <Copy className="w-4 h-4" />
                                                        </motion.button>
                                                        <motion.button
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            onClick={() => onDelete(quiz)}
                                                            className="p-2.5 bg-gray-50 dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-900/50 border border-gray-200 dark:border-gray-700 hover:border-red-200 dark:hover:border-red-800/50 rounded-xl transition-all text-red-600 dark:text-red-400 shadow-sm"
                                                            title="Supprimer"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </motion.button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="px-6 py-4 bg-gray-50/50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-gray-700/50 flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                Page {page} sur {totalPages}
                            </p>
                            <div className="flex gap-2">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setPage(p => Math.max(1, p-1))}
                                    disabled={page === 1}
                                    className="p-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:hover:bg-white dark:disabled:hover:bg-slate-800 shadow-sm transition-all"
                                >
                                    <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setPage(p => Math.min(totalPages, p+1))}
                                    disabled={page === totalPages}
                                    className="p-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:hover:bg-white dark:disabled:hover:bg-slate-800 shadow-sm transition-all"
                                >
                                    <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                </motion.button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}