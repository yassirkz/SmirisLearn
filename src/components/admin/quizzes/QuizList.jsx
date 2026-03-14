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

export default function QuizList({ onEdit, onDelete, onDuplicate, onViewStats, refreshTrigger = 0 }) {
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

    // Utiliser user.id (primitif stable) plutôt que user (objet)
    const userId = user?.id;

    // ─── Charger les vidéos pour le filtre dropdown ───────────────────────────
    useEffect(() => {
        if (!userId) return;
        const fetchVideos = async () => {
            try {
                // 1. org_id du profil
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('organization_id')
                    .eq('id', userId)
                    .single();
                if (!profile?.organization_id) return;

                // 2. piliers de l'org
                const { data: pillars } = await supabase
                    .from('pillars')
                    .select('id')
                    .eq('organization_id', profile.organization_id);
                if (!pillars?.length) return;

                const pillarIds = pillars.map(p => p.id);

                // 3. vidéos liées à ces piliers
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
    }, [userId]); // userId est un string, stable

    // ─── Charger les quiz ─────────────────────────────────────────────────────
    useEffect(() => {
        if (!userId) return;

        // Toujours reset les états de chargement au départ
        if (hasLoadedOnce.current) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        const load = async () => {
            try {
                // 1. org_id
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('organization_id')
                    .eq('id', userId)
                    .single();
                if (!profile?.organization_id) return;

                // 2. piliers de l'org
                const { data: pillars, error: pErr } = await supabase
                    .from('pillars')
                    .select('id')
                    .eq('organization_id', profile.organization_id);
                if (pErr) throw pErr;

                const pillarIds = (pillars || []).map(p => p.id);
                if (!pillarIds.length) {
                    setQuizzes([]);
                    setTotalPages(1);
                    return;
                }

                // 3. vidéos liées à ces piliers
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

                // 4. quizzes pour ces vidéos
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
                showErrorRef.current('Impossible de charger les quiz');
            } finally {
                // Toujours reset — sans condition cancelled
                setLoading(false);
                setRefreshing(false);
            }
        };

        load();
    }, [userId, page, filters.video_id, filters.sortBy, filters.sortOrder, filters.search, refreshTrigger, localRefreshKey]);

    const handleRefresh = () => {
        setLocalRefreshKey(k => k + 1);
    };

    const formatDate = (date) => new Date(date).toLocaleDateString('fr-FR');

    const getVideoTitle = (quiz) => {
        return quiz.video?.title || 'Vidéo inconnue';
    };

    const getPillarName = (quiz) => {
        return quiz.video?.pillar?.name || 'Pilier inconnu';
    };

    if (loading && quizzes.length === 0) {
        return (
            <div className="flex justify-center py-12">
                <div className="w-10 h-10 border-4 border-indigo-200 rounded-full border-t-indigo-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Barre de filtres */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-xl border border-indigo-100">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Filter className="w-5 h-5 text-indigo-600" />
                        <h2 className="text-lg font-semibold text-gray-800">Quiz</h2>
                    </div>

                    <div className="flex-1 flex flex-col sm:flex-row gap-3">
                        {/* Recherche */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Rechercher par vidéo ou pilier..."
                                value={filters.search}
                                onChange={(e) => {
                                    setFilters({ ...filters, search: e.target.value });
                                    setPage(1);
                                }}
                                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                            />
                        </div>

                        {/* Filtre vidéo */}
                        <select
                            value={filters.video_id}
                            onChange={(e) => {
                                setFilters({ ...filters, video_id: e.target.value });
                                setPage(1);
                            }}
                            className="px-4 py-2 border border-gray-200 rounded-lg focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 bg-white"
                        >
                            <option value="all">Toutes les vidéos</option>
                            {videos.map(v => (
                                <option key={v.id} value={v.id}>
                                    {escapeText(untrusted(v.title))}
                                </option>
                            ))}
                        </select>

                        {/* Ordre */}
                        <select
                            value={`${filters.sortBy}:${filters.sortOrder}`}
                            onChange={(e) => {
                                const [sortBy, sortOrder] = e.target.value.split(':');
                                setFilters({ ...filters, sortBy, sortOrder });
                            }}
                            className="px-4 py-2 border border-gray-200 rounded-lg focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 bg-white"
                        >
                            <option value="created_at:desc">Plus récents d'abord</option>
                            <option value="created_at:asc">Plus anciens d'abord</option>
                        </select>

                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Rafraîchir"
                        >
                            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Liste des quiz */}
            {quizzes.length === 0 ? (
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-12 shadow-xl border border-indigo-100 text-center">
                    <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Aucun quiz</h3>
                    <p className="text-gray-500 mb-6">Créez votre premier quiz pour une vidéo.</p>
                </div>
            ) : (
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-indigo-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gradient-to-r from-indigo-50 to-purple-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Vidéo / Pilier</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Questions</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Score</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Tentatives</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Timer</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Créé le</th>
                                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {quizzes.map((quiz, idx) => (
                                    <motion.tr
                                        key={quiz.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.03 }}
                                        className="hover:bg-indigo-50/50 transition-colors group"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-800">
                                                {escapeText(untrusted(getVideoTitle(quiz)))}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {escapeText(untrusted(getPillarName(quiz)))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                                {quiz.questions?.length || 0}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1">
                                                <Target className="w-4 h-4 text-indigo-600" />
                                                <span>{quiz.passing_score}%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1">
                                                <RefreshCw className="w-4 h-4 text-purple-600" />
                                                <span>{quiz.max_attempts === -1 ? '∞' : quiz.max_attempts}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {quiz.timer_minutes ? (
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-4 h-4 text-green-600" />
                                                    <span>{quiz.timer_minutes} min</span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {formatDate(quiz.created_at)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => onViewStats?.(quiz)}
                                                    className="p-2 hover:bg-blue-100 rounded-lg text-blue-600"
                                                    title="Statistiques"
                                                >
                                                    <BarChart3 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => onEdit(quiz)}
                                                    className="p-2 hover:bg-purple-100 rounded-lg text-purple-600"
                                                    title="Modifier"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => onDuplicate?.(quiz)}
                                                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                                                    title="Dupliquer"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => onDelete(quiz)}
                                                    className="p-2 hover:bg-red-100 rounded-lg text-red-600"
                                                    title="Supprimer"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                            <p className="text-sm text-gray-600">
                                Page {page} sur {totalPages}
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p-1))}
                                    disabled={page === 1}
                                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p+1))}
                                    disabled={page === totalPages}
                                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}