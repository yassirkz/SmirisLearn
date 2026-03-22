// src/components/admin/quizzes/QuizList.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Filter, X, Edit, Trash2, Copy, Eye,
    RefreshCw, Plus, Sparkles, Award, Clock,
    BarChart3, ChevronLeft, ChevronRight, Target
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../ui/Toast';
import { untrusted, escapeText } from '../../../utils/security';

export default function QuizList({ isReadOnly = false, orgId: propOrgId, onEdit, onDelete, onDuplicate, onViewStats, refreshTrigger = 0 }) {
    const { user } = useAuth();
    const { success, error: showError } = useToast();
    const showErrorRef = useRef(showError);
    useEffect(() => { showErrorRef.current = showError; }, [showError]);
    const [quizzes, setQuizzes] = useState([]);
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [localRefreshKey, setLocalRefreshKey] = useState(0);
    const hasLoadedOnce = useRef(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
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
        const fetchVideos = async () => {
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
        fetchVideos();
    }, [organizationId]);

    useEffect(() => {
        if (!organizationId) return;

        if (hasLoadedOnce.current) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        const load = async () => {
            try {
                const { data: pillars, error: pErr } = await supabase
                    .from('pillars')
                    .select('id')
                    .eq('organization_id', organizationId);
                if (pErr) throw pErr;

                const pillarIds = (pillars || []).map(p => p.id);
                if (!pillarIds.length) {
                    setQuizzes([]);
                    setTotalPages(1);
                    return;
                }

                const { data: videoRows, error: vErr } = await supabase
                    .from('videos')
                    .select('id')
                    .in('pillar_id', pillarIds);
                if (vErr) throw vErr;

                const videoIds = (videoRows || []).map(v => v.id);
                if (!videoIds.length) {
                    setQuizzes([]);
                    setTotalPages(1);
                    return;
                }

                let query = supabase
                    .from('quizzes')
                    .select(`
                        *,
                        video:videos(
                            id, title,
                            pillar:pillars(name)
                        )
                    `, { count: 'exact' })
                    .in('video_id', videoIds);

                if (filters.video_id !== 'all') {
                    query = query.eq('video_id', filters.video_id);
                }

                query = query
                    .order(filters.sortBy, { ascending: filters.sortOrder === 'asc' })
                    .range((page - 1) * itemsPerPage, page * itemsPerPage - 1);

                const { data, error, count } = await query;
                if (error) throw error;

                setTotalPages(Math.ceil((count || 0) / itemsPerPage));

                let filtered = data || [];
                if (filters.search) {
                    const s = filters.search.toLowerCase();
                    filtered = filtered.filter(q =>
                        q.video?.title?.toLowerCase().includes(s) ||
                        q.video?.pillar?.name?.toLowerCase().includes(s)
                    );
                }

                setQuizzes(filtered);
                hasLoadedOnce.current = true;
            } catch (err) {
                console.error('Erreur chargement quiz:', err);
                showErrorRef.current('Échec du chargement des quiz');
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        };

        load();
    }, [organizationId, page, filters.video_id, filters.sortBy, filters.sortOrder, filters.search, refreshTrigger, localRefreshKey]);

    const handleRefresh = () => {
        setLocalRefreshKey(k => k + 1);
    };

    const formatDate = (date) => new Date(date).toLocaleDateString('fr-FR');

    const getVideoTitle = (quiz) => quiz.video?.title || 'Vidéo inconnue';
    const getPillarName = (quiz) => quiz.video?.pillar?.name || 'Pilier inconnu';

    if (loading && quizzes.length === 0) {
        return (
            <div className="flex justify-center py-12">
                <div className="w-10 h-10 border-4 border-primary-200 dark:border-primary-800 rounded-full border-t-primary-600 dark:border-t-primary-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Barre de filtres */}
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-4 shadow-xl border border-primary-100 dark:border-gray-700">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Filter className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Gestion des Quiz</h2>
                    </div>

                    <div className="flex-1 flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Rechercher un quiz..."
                                value={filters.search}
                                onChange={(e) => {
                                    setFilters({ ...filters, search: e.target.value });
                                    setPage(1);
                                }}
                                className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:border-primary-400 dark:focus:border-primary-500 focus:ring-4 focus:ring-primary-100 dark:focus:ring-primary-900/30 dark:bg-gray-900 dark:text-white"
                            />
                        </div>

                        <select
                            value={filters.video_id}
                            onChange={(e) => {
                                setFilters({ ...filters, video_id: e.target.value });
                                setPage(1);
                            }}
                            className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:border-primary-400 dark:focus:border-primary-500 focus:ring-4 focus:ring-primary-100 dark:focus:ring-primary-900/30 bg-white dark:bg-gray-900 dark:text-white"
                        >
                            <option value="all">Toutes les vidéos</option>
                            {videos.map((v, idx) => (
                                <option key={v.id || `v-opt-${idx}`} value={v.id}>
                                    {escapeText(untrusted(v.title))}
                                </option>
                            ))}
                        </select>

                        <select
                            value={`${filters.sortBy}:${filters.sortOrder}`}
                            onChange={(e) => {
                                const [sortBy, sortOrder] = e.target.value.split(':');
                                setFilters({ ...filters, sortBy, sortOrder });
                            }}
                            className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:border-primary-400 dark:focus:border-primary-500 focus:ring-4 focus:ring-primary-100 dark:focus:ring-primary-900/30 bg-white dark:bg-gray-900 dark:text-white"
                        >
                            <option value="created_at:desc">Plus récents</option>
                            <option value="created_at:asc">Plus anciens</option>
                        </select>

                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            title="Actualiser"
                        >
                            <RefreshCw className={`w-5 h-5 text-gray-600 dark:text-gray-300 ${refreshing ? 'animate-spin text-primary-600 dark:text-primary-400' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Liste des quiz */}
            {quizzes.length === 0 ? (
                <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-12 shadow-xl border border-primary-100 dark:border-gray-700 text-center">
                    <Award className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Aucun quiz trouvé</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">Créez des quiz pour évaluer les connaissances de vos étudiants.</p>
                </div>
            ) : (
                <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl border border-primary-100 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px]">
                            <thead className="bg-gradient-to-r from-primary-50 to-accent-50 dark:from-gray-800 dark:to-gray-800">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Vidéo / Pilier</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Questions</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Score requis</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Tentatives</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Chronomètre</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Créé le</th>
                                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {quizzes.map((quiz, idx) => (
                                    <motion.tr
                                        key={quiz.id || `quiz-${idx}`}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.03 }}
                                        className="hover:bg-primary-50/50 dark:hover:bg-gray-700/50 transition-colors group"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-800 dark:text-gray-200">
                                                {escapeText(untrusted(getVideoTitle(quiz)))}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {escapeText(untrusted(getPillarName(quiz)))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-xs font-medium">
                                                {quiz.questions?.length || 0}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1">
                                                <Target className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                                                <span className="text-gray-700 dark:text-gray-300">{quiz.passing_score}%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1">
                                                <RefreshCw className="w-4 h-4 text-accent-600 dark:text-accent-400" />
                                                <span className="text-gray-700 dark:text-gray-300">{quiz.max_attempts === -1 ? '∞' : quiz.max_attempts}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {quiz.timer_minutes ? (
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-4 h-4 text-green-600 dark:text-green-400" />
                                                    <span className="text-gray-700 dark:text-gray-300">{quiz.timer_minutes} min</span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 dark:text-gray-500">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                            {formatDate(quiz.created_at)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => onViewStats?.(quiz)}
                                                    className="p-2 hover:bg-primary-100 dark:hover:bg-primary-900/50 rounded-lg text-primary-600 dark:text-primary-400"
                                                    title="Statistiques"
                                                >
                                                    <BarChart3 className="w-4 h-4" />
                                                </button>
                                                {!isReadOnly && (
                                                    <>
                                                        <button
                                                            onClick={() => onEdit(quiz)}
                                                            className="p-2 hover:bg-accent-100 dark:hover:bg-accent-900/50 rounded-lg text-accent-600 dark:text-accent-400"
                                                            title="Modifier"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => onDuplicate?.(quiz)}
                                                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300"
                                                            title="Dupliquer"
                                                        >
                                                            <Copy className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => onDelete(quiz)}
                                                            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg text-red-600 dark:text-red-400"
                                                            title="Supprimer"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
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
                        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Page {page} sur {totalPages}
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p-1))}
                                    disabled={page === 1}
                                    className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                                >
                                    <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p+1))}
                                    disabled={page === totalPages}
                                    className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                                >
                                    <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}