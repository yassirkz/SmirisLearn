import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, RefreshCw, Sparkles, Film,
    LayoutGrid, Table as TableIcon,
    X, Monitor
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
    const initialLoadRef = useRef(true);
    
    const [videos, setVideos] = useState([]);
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

    const fetchVideos = useCallback(async () => {
        if (fetchingRef.current || !userOrgId) return;
        
        fetchingRef.current = true;
        if (videos.length > 0) {
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
                setVideos([]);
                setLoading(false);
                fetchingRef.current = false;
                return;
            }

            let query = supabase
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
                .in('pillar_id', pillarIds);

            if (filters.pillar_id !== 'all') {
                query = query.eq('pillar_id', filters.pillar_id);
            }

            query = query.order(filters.sortBy, { ascending: filters.sortOrder === 'asc' });

            const { data, error } = await query;

            if (error) throw error;

            let filtered = data || [];
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                filtered = filtered.filter(v => 
                    v.title.toLowerCase().includes(searchLower) ||
                    v.description?.toLowerCase().includes(searchLower)
                );
            }

            setVideos(filtered);
        } catch (err) {
            console.error('❌ Erreur chargement vidéos:', err);
            showError("Erreur lors du chargement des vidéos");
        } finally {
            setLoading(false);
            setRefreshing(false);
            fetchingRef.current = false;
        }
    }, [userOrgId, filters, showError, videos.length]);

    useEffect(() => {
        if (initialLoadRef.current && userOrgId) {
            initialLoadRef.current = false;
            fetchVideos();
        }
    }, [userOrgId, fetchVideos]);

    const handleRefresh = () => {
        fetchVideos();
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
        fetchVideos();
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
            fetchVideos();
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
                className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-4 shadow-xl border border-primary-100 dark:border-gray-700"
            >
                <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
                            <span className="text-gray-600 dark:text-gray-300 whitespace-nowrap">{videos.length} {videos.length > 1 ? 'vidéos' : 'vidéo'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-accent-500 rounded-full" />
                            <span className="text-gray-600 dark:text-gray-300 whitespace-nowrap">{pillars.length} {pillars.length > 1 ? 'piliers' : 'pilier'}</span>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex-1 sm:flex-none">
                            <VideoFilters 
                                filters={filters}
                                onChange={setFilters}
                                pillars={pillars}
                            />
                        </div>

                        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1 shrink-0">
                            <button
                                onClick={() => setViewMode('table')}
                                className={`p-2 rounded-lg transition-all ${
                                    viewMode === 'table'
                                        ? 'bg-white dark:bg-gray-600 text-primary-600 dark:text-primary-400 shadow-sm'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                            >
                                <TableIcon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('cards')}
                                className={`p-2 rounded-lg transition-all ${
                                    viewMode === 'cards'
                                        ? 'bg-white dark:bg-gray-600 text-primary-600 dark:text-primary-400 shadow-sm'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                        </div>

                        <button
                            onClick={handleRefresh}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors shrink-0"
                            disabled={loading}
                        >
                            <RefreshCw className={`w-4 h-4 text-gray-600 dark:text-gray-300 ${loading ? 'animate-spin' : ''}`} />
                        </button>

                        {!isReadOnly && (
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <button
                                    onClick={handleOpenUploader}
                                    className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span className="hidden xs:inline">Ajouter une vidéo</span>
                                    <Plus className="w-4 h-4 xs:hidden" />
                                </button>
                                <button
                                    onClick={handleOpenRecorder}
                                    className="flex-1 sm:flex-none px-4 py-2 bg-gray-900 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                                >
                                    <Monitor className="w-4 h-4" />
                                    <span className="hidden xs:inline">Enregistrer l'écran</span>
                                    <Monitor className="w-4 h-4 xs:hidden" />
                                </button>
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
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-2xl w-full shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Importer une vidéo</h2>
                                <button
                                    onClick={() => setShowUploader(false)}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                >
                                    <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                </button>
                            </div>
                            <VideoUploader
                                onUploadSuccess={handleUploadSuccess}
                                onClose={() => setShowUploader(false)}
                                orgId={userOrgId}
                            />
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
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-2xl w-full shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Enregistrement d'écran</h2>
                                <button
                                    onClick={() => setShowRecorder(false)}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                >
                                    <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                </button>
                            </div>
                            <ScreenRecorder
                                orgId={userOrgId}
                                onRecordSuccess={(videoData) => {
                                    setShowRecorder(false);
                                    handleUploadSuccess(videoData);
                                }}
                                onClose={() => setShowRecorder(false)}
                            />
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
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                                    {selectedVideo ? "Modifier la vidéo" : "Nouvelle vidéo"}
                                </h2>
                                <button
                                    onClick={() => {
                                        setShowForm(false);
                                        setSelectedVideo(null);
                                        setUploadedVideo(null);
                                    }}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                >
                                    <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                </button>
                            </div>
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
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Liste des vidéos */}
            {loading ? (
                <PillarSkeleton viewMode={viewMode} />
            ) : videos.length === 0 ? (
                <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-12 shadow-xl border border-primary-100 dark:border-gray-700 text-center">
                    <Film className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                        Aucune vidéo
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                        Commencez par ajouter votre première vidéo ou enregistrez votre écran.
                    </p>
                    {!isReadOnly && (
                        <button
                            onClick={handleOpenUploader}
                            className="px-6 py-3 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all"
                        >
                            Ajouter une vidéo
                        </button>
                    )}
                </div>
            ) : viewMode === 'table' ? (
                <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl border border-primary-100 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gradient-to-r from-primary-50 to-accent-50 dark:from-gray-800 dark:to-gray-800">
                                <tr>
                                    <th className="px-6 py-4 text-left dark:text-gray-300">Vidéo</th>
                                    <th className="px-6 py-4 text-left dark:text-gray-300">Pilier</th>
                                    <th className="px-6 py-4 text-left dark:text-gray-300">Durée</th>
                                    <th className="px-6 py-4 text-left dark:text-gray-300">Ajoutée le</th>
                                    <th className="px-6 py-4 text-right dark:text-gray-300">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {videos.map((video, index) => (
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
                    {videos.map((video, index) => (
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