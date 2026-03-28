import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, RefreshCw, Sparkles, Film,
    LayoutGrid, Table as TableIcon,
    X, Monitor, BookOpen
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../ui/Toast';
import { untrusted, escapeText } from '../../../utils/security';
import VideoCard from './VideoCard';
import VideoFilters from './VideoFilters';
import VideoUploader from './VideoUploader';
import ScreenRecorder from './ScreenRecorder';
import VideoForm from './VideoForm';
import PillarSkeleton from '../pillars/PillarSkeleton';

export default function VideoList({ isReadOnly = false, orgId: propOrgId }) {
    const { user } = useAuth();
    const { success, error: showError } = useToast();
    
    const isMounted = useRef(true);
    const fetchingRef = useRef(false);
    
    const [allVideos, setAllVideos] = useState([]);
    const [pillars, setPillars] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [userOrgId, setUserOrgId] = useState(null);
    const [viewMode, setViewMode] = useState(() => {
        return localStorage.getItem('videoViewMode') || 'table';
    });
    const [filters, setFilters] = useState({
        search: '',
        pillar_id: 'all',
        sortBy: 'created_at',
        sortOrder: 'desc'
    });
    const [showUploader, setShowUploader] = useState(false);
    const [showRecorder, setShowRecorder] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [uploadedVideo, setUploadedVideo] = useState(null);

    useEffect(() => {
        localStorage.setItem('videoViewMode', viewMode);
    }, [viewMode]);

    useEffect(() => {
        const fetchOrgId = async () => {
            if (propOrgId) {
                setUserOrgId(propOrgId);
                return;
            }
            if (user?.id) {
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('organization_id')
                    .eq('id', user.id)
                    .maybeSingle();

                if (error) {
                    console.error('❌ Erreur récupération profil:', error);
                    return;
                }
                if (profile?.organization_id) {
                    setUserOrgId(profile.organization_id);
                }
            }
        };
        fetchOrgId();
    }, [user, propOrgId]);

    useEffect(() => {
        const fetchPillars = async () => {
            if (!userOrgId) return;
            const { data } = await supabase
                .from('pillars')
                .select('id, name, color')
                .eq('organization_id', userOrgId)
                .order('name');
            setPillars(data || []);
        };
        fetchPillars();
    }, [userOrgId]);

    const fetchVideos = useCallback(async (isSilent = false) => {
        if (fetchingRef.current || !userOrgId) return;
        
        fetchingRef.current = true;
        if (isSilent) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            const { data: pillarRows } = await supabase
                .from('pillars')
                .select('id')
                .eq('organization_id', userOrgId);

            const pillarIds = (pillarRows || []).map(p => p.id);
            if (!pillarIds.length) {
                setAllVideos([]);
                return;
            }

            const { data, error } = await supabase
                .from('videos')
                .select(`
                    *,
                    pillar:pillars (
                        id,
                        name,
                        color
                    ),
                    quizzes (id)
                `)
                .in('pillar_id', pillarIds)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAllVideos(data || []);
        } catch (err) {
            console.error('❌ Erreur chargement vidéos:', err);
            showError("Erreur lors du chargement des vidéos");
        } finally {
            setLoading(false);
            setRefreshing(false);
            fetchingRef.current = false;
        }
    }, [userOrgId, showError]);

    // Filtrage et tri local
    const filteredVideos = useMemo(() => {
        let result = allVideos.filter(video => {
            // Filtre par pilier
            if (filters.pillar_id !== 'all' && video.pillar_id !== filters.pillar_id) {
                return false;
            }
            
            // Recherche textuelle
            const searchLower = filters.search.toLowerCase();
            return video.title.toLowerCase().includes(searchLower) ||
                   video.description?.toLowerCase().includes(searchLower);
        });

        // Tri
        const { sortBy, sortOrder } = filters;
        result.sort((a, b) => {
            let valA, valB;
            if (sortBy === 'created_at') {
                valA = new Date(a.created_at).getTime();
                valB = new Date(b.created_at).getTime();
            } else {
                valA = a[sortBy]?.toString().toLowerCase() || '';
                valB = b[sortBy]?.toString().toLowerCase() || '';
            }

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [allVideos, filters]);

    useEffect(() => {
        isMounted.current = true;
        if (userOrgId) {
            fetchVideos();
        }
        return () => { isMounted.current = false; };
    }, [userOrgId, fetchVideos]);

    const handleRefresh = () => {
        fetchVideos(true);
        success("Vidéos actualisées");
    };

    const handleOpenUploader = () => {
        if (!userOrgId) {
            showError("Organisation non trouvée");
            return;
        }
        setShowUploader(true);
    };

    const handleOpenRecorder = () => {
        if (!userOrgId) {
            showError("Organisation non trouvée");
            return;
        }
        setShowRecorder(true);
    };

    const handleUploadSuccess = (videoData) => {
        setUploadedVideo(videoData);
        setShowUploader(false);
        setShowForm(true);
    };

    const handleFormSuccess = () => {
        setShowForm(false);
        setSelectedVideo(null);
        setUploadedVideo(null);
        fetchVideos(true);
        success("Vidéo enregistrée avec succès");
    };

    const handleEdit = (video) => {
        setSelectedVideo(video);
        setShowForm(true);
    };

    const handleDelete = async (video) => {
        if (!window.confirm(`Êtes-vous sûr de vouloir supprimer la vidéo "${video.title}" ?`)) return;

        try {
            if (video.video_path) {
                await supabase.storage
                    .from('videos')
                    .remove([video.video_path]);
            }

            const { error } = await supabase
                .from('videos')
                .delete()
                .eq('id', video.id);

            if (error) throw error;

            success('Vidéo supprimée');
            fetchVideos(true);
        } catch (err) {
            console.error('❌ Erreur suppression:', err);
            showError("Erreur lors de la suppression de la vidéo");
        }
    };

    return (
        <div className="space-y-6">
            {/* Barre d'outils */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/50 dark:border-white/5 overflow-hidden relative"
            >
                {/* Glow de fond */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/5 dark:bg-primary-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                <div className="relative z-10 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
                    <div className="flex flex-wrap items-center gap-6">
                        <div className="flex items-center gap-3 bg-gray-50/80 dark:bg-slate-800/60 px-4 h-11 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                            <div className="w-2.5 h-2.5 bg-primary-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide">
                                {filteredVideos.length} {filteredVideos.length > 1 ? 'vidéos' : 'vidéo'}
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 bg-purple-500 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
                            <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                                {pillars.length} {pillars.length > 1 ? 'piliers' : 'pilier'}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex-1 sm:flex-none">
                            <VideoFilters 
                                filters={filters}
                                onChange={setFilters}
                                pillars={pillars}
                            />
                        </div>

                        <div className="flex bg-gray-100/80 dark:bg-slate-800/80 p-1.5 rounded-xl shadow-inner border border-gray-200 dark:border-gray-700 h-11 items-center">
                            <button
                                onClick={() => setViewMode('table')}
                                className={`p-2 rounded-lg transition-all ${
                                    viewMode === 'table'
                                        ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-md'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                                title="Vue Tableau"
                            >
                                <TableIcon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('cards')}
                                className={`p-2 rounded-lg transition-all ${
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
                            className="w-11 h-11 flex items-center justify-center bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-500 rounded-xl shadow-sm transition-all"
                            title="Actualiser"
                            disabled={loading || refreshing}
                        >
                            <RefreshCw className={`w-4 h-4 text-gray-600 dark:text-gray-300 ${(loading || refreshing) ? 'animate-spin' : ''}`} />
                        </motion.button>

                        {!isReadOnly && (
                            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleOpenUploader}
                                    className="group px-6 h-11 bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-500 hover:to-accent-500 text-white rounded-xl shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/40 transition-all flex items-center justify-center gap-3 font-bold border border-white/10 shrink-0 w-full sm:w-auto"
                                >
                                    <div className="p-1 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                                        <Plus className="w-4 h-4" />
                                    </div>
                                    Ajouter
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleOpenRecorder}
                                    className="group px-6 h-11 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md text-gray-700 dark:text-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-3 font-bold border border-gray-200 dark:border-gray-700 shrink-0 w-full sm:w-auto"
                                >
                                    <div className="p-1 bg-gray-100 dark:bg-slate-700 rounded-lg group-hover:bg-gray-200 dark:group-hover:bg-slate-600 transition-colors">
                                        <Monitor className="w-4 h-4" />
                                    </div>
                                    Enregistrer
                                </motion.button>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Uploader Modal */}
            <AnimatePresence>
                {showUploader && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
                        onClick={() => setShowUploader(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl max-w-2xl w-full shadow-2xl border border-white/50 dark:border-white/10 ring-1 ring-black/5 relative overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* En-tête avec dégradé premium (Style Piliers) */}
                            <div className="relative px-8 pt-8 pb-6 bg-gradient-to-br from-primary-600 to-accent-600 text-white">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                                            <Plus className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold">
                                                Importer une vidéo
                                            </h2>
                                            <p className="text-white/80 text-sm mt-1">
                                                Ajoutez du contenu à votre bibliothèque
                                            </p>
                                        </div>
                                    </div>
                                    <motion.button
                                        whileHover={{ scale: 1.1, rotate: 90 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => setShowUploader(false)}
                                        className="p-2 hover:bg-white/20 rounded-xl transition-all"
                                        title="Fermer"
                                    >
                                        <X className="w-5 h-5" />
                                    </motion.button>
                                </div>
                            </div>
                            
                            <div className="p-8">
                                <VideoUploader
                                    orgId={userOrgId}
                                    onUploadSuccess={handleUploadSuccess}
                                    onClose={() => setShowUploader(false)}
                                />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Screen Recorder Modal */}
            <AnimatePresence>
                {showRecorder && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
                        onClick={() => setShowRecorder(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl max-w-2xl w-full shadow-2xl border border-white/50 dark:border-white/10 ring-1 ring-black/5 relative overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* En-tête avec dégradé premium (Style Piliers) */}
                            <div className="relative px-8 pt-8 pb-6 bg-gradient-to-br from-primary-600 to-accent-600 text-white">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                                            <Monitor className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold">
                                                Enregistrement d'écran
                                            </h2>
                                            <p className="text-white/80 text-sm mt-1">
                                                Capturez votre écran et votre voix
                                            </p>
                                        </div>
                                    </div>
                                    <motion.button
                                        whileHover={{ scale: 1.1, rotate: 90 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => setShowRecorder(false)}
                                        className="p-2 hover:bg-white/20 rounded-xl transition-all"
                                        title="Fermer"
                                    >
                                        <X className="w-5 h-5 text-white" />
                                    </motion.button>
                                </div>
                            </div>
                            
                            <div className="p-8">
                                <ScreenRecorder
                                    orgId={userOrgId}
                                    onRecordSuccess={(videoData) => {
                                        setShowRecorder(false);
                                        handleUploadSuccess(videoData);
                                    }}
                                    onClose={() => setShowRecorder(false)}
                                />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Form Modal */}
            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
                        onClick={() => {
                            setShowForm(false);
                            setSelectedVideo(null);
                            setUploadedVideo(null);
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl max-w-2xl w-full shadow-2xl border border-white/50 dark:border-white/10 ring-1 ring-black/5 relative overflow-hidden max-h-[90vh] overflow-y-auto"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* En-tête avec dégradé premium (Style Piliers) */}
                            <div className="relative px-8 pt-8 pb-6 bg-gradient-to-br from-primary-600 to-accent-600 text-white">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                                            <Film className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold">
                                                Détails de la vidéo
                                            </h2>
                                            <p className="text-white/80 text-sm mt-1">
                                                Modifiez les informations de votre contenu
                                            </p>
                                        </div>
                                    </div>
                                    <motion.button
                                        whileHover={{ scale: 1.1, rotate: 90 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => {
                                            setShowForm(false);
                                            setSelectedVideo(null);
                                            setUploadedVideo(null);
                                        }}
                                        className="p-2 hover:bg-white/20 rounded-xl transition-all"
                                        title="Fermer"
                                    >
                                        <X className="w-5 h-5 text-white" />
                                    </motion.button>
                                </div>
                            </div>
                            
                            <div className="p-8">
                                <VideoForm
                                    video={selectedVideo}
                                    uploadedVideo={uploadedVideo}
                                    onSuccess={handleFormSuccess}
                                    onCancel={() => {
                                        setShowForm(false);
                                        setSelectedVideo(null);
                                        setUploadedVideo(null);
                                    }}
                                    orgId={userOrgId}
                                />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Liste des vidéos */}
            {loading && allVideos.length === 0 ? (
                <PillarSkeleton viewMode={viewMode} />
            ) : filteredVideos.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl p-12 shadow-xl border border-white/50 dark:border-white/5 text-center relative overflow-hidden"
                >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="relative z-10 w-24 h-24 bg-gradient-to-br from-primary-100 to-primary-50 dark:from-primary-900/40 dark:to-primary-800/20 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-inner border border-white/50 dark:border-gray-700 transform rotate-3">
                        <Film className="w-12 h-12 text-primary-500 drop-shadow-md" />
                    </div>
                    <h3 className="text-2xl font-extrabold text-gray-800 dark:text-white mb-2 tracking-tight">
                        {filters.search || filters.pillar_id !== 'all' ? "Aucune vidéo ne correspond à vos filtres" : "Aucune vidéo"}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 font-medium mb-8 max-w-sm mx-auto">
                        {filters.search || filters.pillar_id !== 'all' ? "Essayez de modifier vos critères de recherche." : "Commencez par ajouter votre première vidéo ou enregistrez votre écran."}
                    </p>
                    {!isReadOnly && !filters.search && filters.pillar_id === 'all' && (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleOpenUploader}
                            className="px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl shadow-xl hover:shadow-2xl transition-all inline-flex items-center gap-2 font-bold text-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Ajouter une vidéo
                        </motion.button>
                    )}
                </motion.div>
            ) : viewMode === 'table' ? (
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/50 dark:border-white/5 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px]">
                            <thead className="bg-gray-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-gray-700/50 backdrop-blur-sm">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Vidéo</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Pilier</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Durée</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Ajoutée le</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100/80 dark:divide-gray-800/80">
                                {filteredVideos.map((video, index) => (
                                    <VideoCard
                                        key={video.id}
                                        video={video}
                                        index={index}
                                        onEdit={handleEdit}
                                        onDelete={handleDelete}
                                        isReadOnly={isReadOnly}
                                        viewMode="table"
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredVideos.map((video, index) => (
                        <VideoCard
                            key={video.id}
                            video={video}
                            index={index}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            isReadOnly={isReadOnly}
                            viewMode="cards"
                        />
                    ))}
                </div>
            )}
        </div>
    );
}