// src/pages/admin/VideoDetailPage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft, Edit, Trash2,
    Clock, Film, Calendar, Award, Plus, X
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

            // Charger le quiz associé (sans max_attempts qui n'existe pas)
            const { data: quizData } = await supabase
                .from('quizzes')
                .select('id, passing_score, timer_minutes, questions')
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
            // Supprimer du storage
            if (video.video_path) {
                await supabase.storage
                    .from('videos')
                    .remove([video.video_path]);
            }

            // Supprimer de la base
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
                    <div className="w-16 h-16 border-4 border-indigo-200 rounded-full border-t-indigo-600 animate-spin" />
                </div>
            </AdminLayout>
        );
    }

    if (!video) {
        return (
            <AdminLayout>
                <div className="text-center py-12">
                    <Film className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800">Vidéo non trouvée</h2>
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
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Retour aux vidéos
                </button>

                {/* En-tête */}
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-indigo-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">
                                {escapeText(untrusted(video.title))}
                            </h1>
                            {video.description && (
                                <p className="text-gray-600 mt-2">
                                    {escapeText(untrusted(video.description))}
                                </p>
                            )}
                        </div>
                        <div className="flex gap-2">
                            {/* Bouton Modifier - Ouvre le modal */}
                            <button
                                onClick={() => setShowEditModal(true)}
                                className="p-2 hover:bg-purple-100 rounded-lg text-purple-600"
                                title="Modifier"
                            >
                                <Edit className="w-5 h-5" />
                            </button>
                            
                            {/* Bouton Supprimer - Corrigé */}
                            <button
                                onClick={handleDelete}
                                className="p-2 hover:bg-red-100 rounded-lg text-red-600"
                                title="Supprimer"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Métadonnées */}
                    <div className="flex gap-6 mt-4 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>{formatDuration(video.duration)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>Ajoutée le {formatDate(video.created_at)}</span>
                        </div>
                        {pillar && (
                            <div className="flex items-center gap-2">
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
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-indigo-100">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                            <Award className="w-5 h-5 text-indigo-600" />
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
                            <div className="flex items-center gap-6 text-sm text-gray-600">
                                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                                    {quiz.questions?.length || 0} question{(quiz.questions?.length || 0) > 1 ? 's' : ''}
                                </span>
                                <span className="flex items-center gap-1">
                                    Score minimum : <strong>{quiz.passing_score}%</strong>
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
                                className="text-sm text-indigo-600 hover:text-indigo-700 underline"
                            >
                                Modifier le quiz
                            </button>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500">
                            Aucun quiz n'est associé à cette vidéo.
                        </p>
                    )}
                </div>

                {/* Modal Quiz */}
                {showQuizModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            className="bg-white rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold">
                                    {quiz ? 'Modifier le quiz' : 'Créer un quiz'}
                                </h2>
                                <button
                                    onClick={() => setShowQuizModal(false)}
                                    className="p-2 hover:bg-gray-100 rounded-lg"
                                >
                                    <X className="w-5 h-5" />
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
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <h2 className="text-xl font-bold mb-4">Modifier la vidéo</h2>
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