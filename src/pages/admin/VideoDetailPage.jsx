import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
            showError('Erreur lors du chargement de la vidéo.');
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

            success('Vidéo supprimée avec succès');
            navigate('/admin/videos');
        } catch (err) {
            console.error('❌ Erreur suppression:', err);
            showError('Erreur lors de la suppression');
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
                    <div className="w-16 h-16 border-4 border-primary-200 dark:border-primary-800 rounded-full border-t-primary-600 animate-spin" />
                </div>
            </AdminLayout>
        );
    }

    if (!video) {
        return (
            <AdminLayout>
                <div className="text-center py-12">
                    <Film className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                        Vidéo introuvable
                    </h2>
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
                <motion.button
                    whileHover={{ scale: 1.05, x: -5 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/admin/videos')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-slate-800/80 shadow-sm backdrop-blur-md rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-all border border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium text-sm"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Retour aux vidéos
                </motion.button>

                {/* En-tête */}
                <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-xl border border-white/50 dark:border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/5 dark:bg-primary-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                    
                    <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start gap-6">
                        <div className="min-w-0 flex-1">
                            <h1 className="text-2xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 tracking-tight mb-3">
                                {escapeText(untrusted(video.title))}
                            </h1>
                            {video.description && (
                                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 font-medium leading-relaxed max-w-3xl">
                                    {escapeText(untrusted(video.description))}
                                </p>
                            )}
                        </div>
                        <div className="flex gap-2 self-end sm:self-start shrink-0">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setShowEditModal(true)}
                                className="p-2.5 bg-accent-50 dark:bg-accent-900/20 text-accent-600 dark:text-accent-400 hover:bg-accent-100 dark:hover:bg-accent-900/40 rounded-xl transition-colors shadow-sm border border-accent-200/50 dark:border-accent-800/50"
                                title="Modifier"
                            >
                                <Edit className="w-5 h-5" />
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleDelete}
                                className="p-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl transition-colors shadow-sm border border-red-200/50 dark:border-red-800/50"
                                title="Supprimer"
                            >
                                <Trash2 className="w-5 h-5" />
                            </motion.button>
                        </div>
                    </div>

                    {/* Métadonnées */}
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-6 text-xs sm:text-sm font-semibold relative z-10">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 shadow-sm border border-gray-200 dark:border-gray-700">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span>{formatDuration(video.duration)}</span>
                        </div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 shadow-sm border border-gray-200 dark:border-gray-700">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span>Ajouté le {formatDate(video.created_at)}</span>
                        </div>
                        {pillar && (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 shadow-sm border border-primary-200/50 dark:border-primary-800/50">
                                <Film className="w-4 h-4 text-primary-500" />
                                <span>Pilier : {escapeText(untrusted(pillar.name))}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Lecteur vidéo */}
                <div className="bg-black/95 rounded-3xl overflow-hidden aspect-video shadow-2xl border border-gray-800/50" style={{ maxHeight: '70vh' }}>
                    <video
                        src={video.video_url}
                        controls
                        controlsList="noplaybackrate"
                        className="w-full h-full object-contain"
                        poster={video.thumbnail_url}
                        onError={(e) => {
                            console.error('❌ Erreur chargement vidéo:', e);
                            console.log('URL tentative:', video.video_url);
                        }}
                    >
                        Votre navigateur ne supporte pas la lecture de vidéos.
                    </video>
                </div>

                {/* Section Quiz associé */}
                <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-xl border border-white/50 dark:border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-40 h-40 bg-amber-500/5 dark:bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                    <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl text-amber-600 dark:text-amber-400">
                                <Award className="w-5 h-5" />
                            </div>
                            Quiz associé
                        </h2>
                        {!quiz && (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setShowQuizModal(true)}
                                className="group px-6 py-3 bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-500 hover:to-accent-500 text-white rounded-2xl shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/40 transition-all flex items-center justify-center gap-3 font-bold border border-white/10 shrink-0 w-full sm:w-auto"
                            >
                                <div className="p-1 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                                    <Plus className="w-4 h-4" />
                                </div>
                                Créer un quiz
                            </motion.button>
                        )}
                    </div>

                    {quiz ? (
                        <div className="relative z-10 p-6 bg-gray-50/50 dark:bg-slate-800/40 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-inner group">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 sm:gap-4 text-sm text-gray-600 dark:text-gray-300 flex-wrap">
                                        <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/50 rounded-xl font-bold shadow-sm">
                                            {quiz.questions?.length || 0} questions
                                        </div>
                                        <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-100 dark:border-white/5 rounded-xl font-medium shadow-sm">
                                            Score minimum : <strong className="text-gray-900 dark:text-white ml-1">{quiz.passing_score}%</strong>
                                        </div>
                                        <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-100 dark:border-white/5 rounded-xl font-medium shadow-sm">
                                            <RefreshCw className="w-4 h-4 text-gray-400" />
                                            Tentatives : <strong className="text-gray-900 dark:text-white ml-1">{quiz.max_attempts === -1 ? '∞' : quiz.max_attempts}</strong>
                                        </div>
                                        {quiz.timer_minutes && (
                                            <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-100 dark:border-white/5 rounded-xl font-medium shadow-sm">
                                                <Clock className="w-4 h-4 text-gray-400" />
                                                <strong className="text-gray-900 dark:text-white">{quiz.timer_minutes} min</strong>
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setShowQuizModal(true)}
                                        className="text-sm font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 flex items-center gap-1.5 transition-colors"
                                    >
                                        <Edit className="w-4 h-4" />
                                        Modifier les réglages du quiz
                                    </button>
                                </div>
                                <div className="shrink-0">
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => navigate(`/admin/quizzes`)}
                                        className="px-6 py-3 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 font-bold rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all shadow-sm flex items-center gap-2"
                                    >
                                        Gérer toutes les questions
                                    </motion.button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="relative z-10 text-center py-12 px-4 bg-gray-50/50 dark:bg-slate-800/20 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700/50">
                            <Award className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3 opacity-50" />
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Aucun quiz n'est encore associé à cette vidéo.</p>
                        </div>
                    )}
                </div>

                {/* Modal Quiz */}
                <AnimatePresence>
                    {showQuizModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm" onClick={() => setShowQuizModal(false)}>
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                                className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl max-w-4xl w-full shadow-2xl border border-white/50 dark:border-white/10 ring-1 ring-black/5 relative overflow-hidden flex flex-col max-h-[90vh]"
                                onClick={e => e.stopPropagation()}
                            >
                                {/* En-tête premium */}
                                <div className="relative px-8 pt-8 pb-6 bg-gradient-to-br from-primary-600 to-accent-600 text-white shrink-0">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                                                <Award className="w-6 h-6 text-white" />
                                            </div>
                                            <div>
                                                <h2 className="text-2xl font-bold">
                                                    {quiz ? 'Modifier le quiz' : 'Nouveau quiz'}
                                                </h2>
                                                <p className="text-white/80 text-sm mt-1">
                                                    Configurez les questions et les critères de réussite
                                                </p>
                                            </div>
                                        </div>
                                        <motion.button
                                            whileHover={{ scale: 1.1, rotate: 90 }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => setShowQuizModal(false)}
                                            className="p-2 hover:bg-white/20 rounded-xl transition-all"
                                        >
                                            <X className="w-5 h-5" />
                                        </motion.button>
                                    </div>
                                </div>

                                <div className="p-8 overflow-y-auto">
                                    <QuizCreator
                                        quiz={quiz}
                                        videoId={id}
                                        onSuccess={() => {
                                            setShowQuizModal(false);
                                            fetchVideoDetails();
                                        }}
                                        onCancel={() => setShowQuizModal(false)}
                                    />
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Modal d'édition Vidéo */}
                <AnimatePresence>
                    {showEditModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm" onClick={() => setShowEditModal(false)}>
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                                className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl max-w-2xl w-full shadow-2xl border border-white/50 dark:border-white/10 ring-1 ring-black/5 relative overflow-hidden flex flex-col max-h-[90vh]"
                                onClick={e => e.stopPropagation()}
                            >
                                {/* En-tête premium */}
                                <div className="relative px-8 pt-8 pb-6 bg-gradient-to-br from-primary-600 to-accent-600 text-white shrink-0">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                                                <Film className="w-6 h-6 text-white" />
                                            </div>
                                            <div>
                                                <h2 className="text-2xl font-bold">Modifier la vidéo</h2>
                                                <p className="text-white/80 text-sm mt-1">Mettez à jour les informations et la durée</p>
                                            </div>
                                        </div>
                                        <motion.button
                                            whileHover={{ scale: 1.1, rotate: 90 }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => setShowEditModal(false)}
                                            className="p-2 hover:bg-white/20 rounded-xl transition-all"
                                        >
                                            <X className="w-5 h-5" />
                                        </motion.button>
                                    </div>
                                </div>

                                <div className="p-8 overflow-y-auto">
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
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </motion.div>
        </AdminLayout>
    );
}