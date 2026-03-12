import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, RefreshCw, Sparkles, Film,
    LayoutGrid, Table as TableIcon,
    X
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../ui/Toast';
import { untrusted, escapeText } from '../../../utils/security';
import VideoCard from './VideoCard';
import VideoFilters from './VideoFilters';
import VideoUploader from './VideoUploader';
import VideoForm from './VideoForm';
import PillarSkeleton from '../pillars/PillarSkeleton';

export default function VideoList({ isReadOnly = false, orgId: propOrgId }) {
    const { user } = useAuth();
    const { success, error: showError } = useToast();
    
    const isMounted = useRef(true);
    const fetchingRef = useRef(false);
    const initialLoadRef = useRef(true);
    
    // États
    const [videos, setVideos] = useState([]);
    const [pillars, setPillars] = useState([]);
    const [loading, setLoading] = useState(true);
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
    const [showForm, setShowForm] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [uploadedVideo, setUploadedVideo] = useState(null);

    // Sauvegarder la préférence de vue
    useEffect(() => {
        localStorage.setItem('videoViewMode', viewMode);
    }, [viewMode]);

    // Récupérer l'organization ID
    useEffect(() => {
        const fetchOrgId = async () => {
            if (propOrgId) {
                console.log('🏢 Utilisation propOrgId:', propOrgId);
                setUserOrgId(propOrgId);
                return;
            }
            
            if (user?.id) {
                console.log('👤 Récupération orgId pour user:', user.id);
                
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('organization_id')
                    .eq('id', user.id)
                    .maybeSingle();

                if (error) {
                    console.error('❌ Erreur récupération profil:', error);
                    return;
                }

                console.log('📊 Profile:', profile);
                
                if (profile?.organization_id) {
                    setUserOrgId(profile.organization_id);
                } else {
                    console.warn('⚠️ Aucune organisation trouvée pour cet utilisateur');
                }
            }
        };

        fetchOrgId();
    }, [user, propOrgId]);

    // Charger les piliers
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

    // Charger les vidéos
    const fetchVideos = useCallback(async () => {
        if (fetchingRef.current || !userOrgId) return;
        
        fetchingRef.current = true;
        setLoading(true);

        try {
            console.log('📦 Chargement des vidéos pour org:', userOrgId);

            let query = supabase
                .from('videos')
                .select(`
                    *,
                    pillar:pillars (
                        id,
                        name,
                        color
                    )
                `)
                .eq('pillar.organization_id', userOrgId);

            if (filters.pillar_id !== 'all') {
                query = query.eq('pillar_id', filters.pillar_id);
            }

            query = query.order(filters.sortBy, { ascending: filters.sortOrder === 'asc' });

            const { data, error } = await query;

            if (error) throw error;

            // Filtrer par recherche
            let filtered = data || [];
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                filtered = filtered.filter(v => 
                    v.title.toLowerCase().includes(searchLower) ||
                    v.description?.toLowerCase().includes(searchLower)
                );
            }

            console.log('✅ Vidéos chargées:', filtered.length);
            setVideos(filtered);

        } catch (err) {
            console.error('❌ Erreur chargement vidéos:', err);
            showError('Impossible de charger les vidéos');
        } finally {
            setLoading(false);
            fetchingRef.current = false;
        }
    }, [userOrgId, filters, showError]);

    // Charger les vidéos au montage
    useEffect(() => {
        if (initialLoadRef.current && userOrgId) {
            initialLoadRef.current = false;
            fetchVideos();
        }
    }, [userOrgId, fetchVideos]);

    // Handlers
    const handleRefresh = () => {
        fetchVideos();
        success('Données mises à jour');
    };

    const handleOpenUploader = () => {
        if (!userOrgId) {
            showError('Impossible de déterminer votre organisation');
            return;
        }
        setShowUploader(true);
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
        success('Vidéo enregistrée');
    };

    const handleEdit = (video) => {
        setSelectedVideo(video);
        setShowForm(true);
    };

    const handleDelete = async (video) => {
        if (!window.confirm(`Supprimer "${video.title}" ?`)) return;

        try {
            // ✅ Utiliser video_path directement (plus besoin de getPathFromUrl)
            if (video.video_path) {
                await supabase.storage
                    .from('videos')
                    .remove([video.video_path]);
            }

            // Supprimer de la base
            const { error } = await supabase
                .from('videos')
                .delete()
                .eq('id', video.id);

            if (error) throw error;

            success('Vidéo supprimée');
            fetchVideos();
        } catch (err) {
            console.error('❌ Erreur suppression:', err);
            showError('Impossible de supprimer la vidéo');
        }
    };
    return (
        <div className="space-y-6">
            {/* Barre d'outils */}
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
                            <span className="text-gray-600">{videos.length} vidéos</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-purple-500 rounded-full" />
                            <span className="text-gray-600">{pillars.length} piliers</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        <VideoFilters 
                            filters={filters}
                            onChange={setFilters}
                            pillars={pillars}
                        />

                        <div className="flex bg-gray-100 rounded-lg p-1">
                            <button
                                onClick={() => setViewMode('table')}
                                className={`p-2 rounded-lg transition-all ${
                                    viewMode === 'table'
                                        ? 'bg-white text-indigo-600 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                <TableIcon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('cards')}
                                className={`p-2 rounded-lg transition-all ${
                                    viewMode === 'cards'
                                        ? 'bg-white text-indigo-600 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                        </div>

                        <button
                            onClick={handleRefresh}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            disabled={loading}
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>

                        {!isReadOnly && (
                            <button
                                onClick={handleOpenUploader}
                                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Nouvelle vidéo
                            </button>
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
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                        onClick={() => setShowUploader(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold">Uploader une vidéo</h2>
                                <button
                                    onClick={() => setShowUploader(false)}
                                    className="p-2 hover:bg-gray-100 rounded-lg"
                                >
                                    <X className="w-5 h-5" />
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

            {/* Form Modal */}
            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
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
                            className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold">
                                    {selectedVideo ? 'Modifier' : 'Nouvelle'} vidéo
                                </h2>
                                <button
                                    onClick={() => {
                                        setShowForm(false);
                                        setSelectedVideo(null);
                                        setUploadedVideo(null);
                                    }}
                                    className="p-2 hover:bg-gray-100 rounded-lg"
                                >
                                    <X className="w-5 h-5" />
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
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-12 shadow-xl border border-indigo-100 text-center">
                    <Film className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                        Aucune vidéo
                    </h3>
                    <p className="text-gray-500 mb-6">
                        Commencez par uploader votre première vidéo
                    </p>
                    {!isReadOnly && (
                        <button
                            onClick={handleOpenUploader}
                            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all"
                        >
                            Uploader une vidéo
                        </button>
                    )}
                </div>
            ) : viewMode === 'table' ? (
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-indigo-100 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gradient-to-r from-indigo-50 to-purple-50">
                            <tr>
                                <th className="px-6 py-4 text-left">Vidéo</th>
                                <th className="px-6 py-4 text-left">Pilier</th>
                                <th className="px-6 py-4 text-left">Durée</th>
                                <th className="px-6 py-4 text-left">Ajoutée le</th>
                                <th className="px-6 py-4 text-right">Actions</th>
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