import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft, Edit, Trash2,
    Clock, Film, Calendar, Award, Plus, X , RefreshCw
} from 'lucide-react';
import AdminLayout from '../../components/layout/AdminLayout';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toast';
import { untrusted, escapeText } from '../../utils/security';
import VideoForm from '../../components/admin/videos/VideoForm';
import QuizCreator from '../../components/admin/quizzes/QuizCreator';

export default function VideoDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { success, error: showError } = useToast();
    const [loading, setLoading] = useState(true);
    const [video, setVideo] = useState(null);
    const [pillar, setPillar] = useState(null);
    const [quiz, setQuiz] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showQuizModal, setShowQuizModal] = useState(false);

    useEffect(() => {
        if (id) fetchVideoDetails();
    }, [id]);

    const fetchVideoDetails = async () => {
        try {
            const { data, error } = await supabase
                .from('videos')
                .select(`
                    *,
                    pillar:pillars (
                        id,
                        name,
                        color,
                        organization_id
                    )
                `)
                .eq('id', id)
                .single();

            if (error) throw error;
            
            setVideo(data);
            setPillar(data.pillar);

            const { data: quizData } = await supabase
                .from('quizzes')
                .select('id, passing_score, timer_minutes, questions, max_attempts')
                .eq('video_id', id)
                .maybeSingle();
            setQuiz(quizData || null);
        } catch (err) {
            console.error('Erreur chargement vidéo:', err);
            showError('Impossible de charger la vidéo');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette vidéo ?')) return;
        
        try {
            if (video.video_path) {
                await supabase.storage
                    .from('videos')
                    .remove([video.video_path]);
            }

            const { error } = await supabase
                .from('videos')
                .delete()
                .eq('id', id);

            if (error) throw error;

            success('Vidéo supprimée');
            navigate('/admin/videos');
        } catch (err) {
            console.error('❌ Erreur suppression:', err);
            showError('Impossible de supprimer la vidéo');
        }
    };

    const formatDuration = (seconds) => {
        if (!seconds) return '--:--';
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    if (loading) {
        return (
            <AdminLayout>
                <div className="min-h-[60vh] flex items-center justify-center">
                    <div className="w-16 h-16 border-4 border-indigo-200 dark:border-indigo-800 rounded-full border-t-indigo-600 animate-spin" />
                </div>
            </AdminLayout>
        );
    }

    if (!video) {
        return (
            <AdminLayout>
                <div className="text-center py-12">
                    <Film className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Vidéo non trouvée</h2>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
            >
                {/* Navigation */}
                <button
                    onClick={() => navigate('/admin/videos')}
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Retour aux vidéos
                </button>

                {/* En-tête */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-lg border border-indigo-100 dark:border-gray-700">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div className="min-w-0">
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white truncate">
                                {escapeText(untrusted(video.title))}
                            </h1>
                            {video.description && (
                                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-2 line-clamp-2 sm:line-clamp-none">
                                    {escapeText(untrusted(video.description))}
                                </p>
                            )}
                        </div>
                        <div className="flex gap-2 self-end sm:self-start">
                            <button
                                onClick={() => setShowEditModal(true)}
                                className="p-2 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded-lg text-purple-600 dark:text-purple-400 transition-colors"
                                title="Modifier"
                            >
                                <Edit className="w-5 h-5" />
                            </button>
                            <button
                                onClick={handleDelete}
                                className="p-2 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg text-red-600 dark:text-red-400 transition-colors"
                                title="Supprimer"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Métadonnées */}
                    <div className="flex flex-wrap gap-3 sm:gap-6 mt-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-2 whitespace-nowrap">
                            <Clock className="w-4 h-4" />
                            <span>{formatDuration(video.duration)}</span>
                        </div>
                        <div className="flex items-center gap-2 whitespace-nowrap">
                            <Calendar className="w-4 h-4" />
                            <span>Ajoutée le {formatDate(video.created_at)}</span>
                        </div>
                        {pillar && (
                            <div className="flex items-center gap-2 whitespace-nowrap">
                                <Film className="w-4 h-4" />
                                <span>Pilier: {escapeText(untrusted(pillar.name))}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Lecteur vidéo */}
                <div className="bg-black rounded-2xl overflow-hidden aspect-video" style={{ maxHeight: '70vh' }}>
                    <video
                        src={video.video_url}
                        controls
                        controlsList="noplaybackrate"
                        className="w-full h-auto max-h-[70vh] object-contain"
                        poster={video.thumbnail_url}
                        onError={(e) => {
                            console.error('❌ Erreur chargement vidéo:', e);
                            console.log('URL tentative:', video.video_url);
                        }}
                    >
                        Votre navigateur ne supporte pas la lecture vidéo.
                    </video>
                </div>

                {/* Section Quiz associé */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-indigo-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                            <Award className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            Quiz associé
                        </h2>
                        {!quiz && (
                            <button
                                onClick={() => setShowQuizModal(true)}
                                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm shadow hover:shadow-md transition-all flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Créer un quiz
                            </button>
                        )}
                    </div>

                    {quiz ? (
                        <div className="space-y-3">
                            <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-300 flex-wrap">
                                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full font-medium">
                                    {quiz.questions?.length || 0} question{(quiz.questions?.length || 0) > 1 ? 's' : ''}
                                </span>
                                <span className="flex items-center gap-1">
                                    Score minimum : <strong>{quiz.passing_score}%</strong>
                                </span>
                                <span className="flex items-center gap-1">
                                    <RefreshCw className="w-4 h-4" />
                                    Tentatives : <strong>{quiz.max_attempts === -1 ? '∞' : quiz.max_attempts}</strong>
                                </span>
                                {quiz.timer_minutes && (
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-4 h-4" />
                                        {quiz.timer_minutes} min
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={() => setShowQuizModal(true)}
                                className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 underline"
                            >
                                Modifier le quiz
                            </button>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">Aucun quiz n'est associé à cette vidéo.</p>
                    )}
                </div>

                {/* Modal Quiz */}
                {showQuizModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold dark:text-white">
                                    {quiz ? 'Modifier le quiz' : 'Créer un quiz'}
                                </h2>
                                <button
                                    onClick={() => setShowQuizModal(false)}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                >
                                    <X className="w-5 h-5 dark:text-gray-300" />
                                </button>
                            </div>
                            <QuizCreator
                                quiz={quiz}
                                videoId={id}
                                onSuccess={() => {
                                    setShowQuizModal(false);
                                    fetchVideoDetails();
                                }}
                                onCancel={() => setShowQuizModal(false)}
                            />
                        </motion.div>
                    </div>
                )}

                {/* Modal d'édition */}
                {showEditModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <h2 className="text-xl font-bold mb-4 dark:text-white">Modifier la vidéo</h2>
                            <VideoForm
                                video={video}
                                onSuccess={() => {
                                    setShowEditModal(false);
                                    fetchVideoDetails();
                                }}
                                onCancel={() => setShowEditModal(false)}
                                orgId={pillar?.organization_id}
                            />
                        </div>
                    </div>
                )}
            </motion.div>
        </AdminLayout>
    );
}