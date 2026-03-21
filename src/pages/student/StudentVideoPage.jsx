// src/pages/student/StudentVideoPage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, Clock, Info, Shield, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import MainLayout from '../../components/layout/MainLayout';
import StudentVideoPlayer from '../../components/student/StudentVideoPlayer';
import { untrusted, escapeText } from '../../utils/security';

export default function StudentVideoPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { error: showError } = useToast();
  const [video, setVideo] = useState(null);
  const [nextVideoId, setNextVideoId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [quizId, setQuizId] = useState(null);

  useEffect(() => {
    const fetchVideoAndNext = async () => {
      if (!user) return;
      try {
        const { data: canAccess, error: accessError } = await supabase
          .rpc('can_access_video', {
            p_student_id: user.id,
            p_video_id: id
          });

        if (accessError || !canAccess) {
          showError("Accès refusé ou vidéo non trouvée");
          navigate('/student/learning');
          return;
        }

        const { data: videoData, error: videoError } = await supabase
          .from('videos')
          .select('*, pillars(id, name, icon)')
          .eq('id', id)
          .single();

        if (videoError) throw videoError;
        setVideo(videoData);

        const { data: progress } = await supabase
          .from('user_progress')
          .select('watched')
          .eq('user_id', user.id)
          .eq('video_id', id)
          .maybeSingle();

        setIsCompleted(progress?.watched || false);

        const { data: nextVideo } = await supabase
          .from('videos')
          .select('id')
          .eq('pillar_id', videoData.pillar_id)
          .gt('sequence_order', videoData.sequence_order)
          .order('sequence_order', { ascending: true })
          .limit(1)
          .maybeSingle();

        setNextVideoId(nextVideo?.id || null);

        const { data: quizData } = await supabase
          .from('quizzes')
          .select('id')
          .eq('video_id', id)
          .maybeSingle();
        setQuizId(quizData?.id || null);
      } catch (err) {
        console.error('Erreur chargement vidéo:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchVideoAndNext();
  }, [id, user, navigate, showError]);

  const formatDuration = (seconds) => {
    if (!seconds) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-primary-50 dark:from-secondary-950 dark:to-secondary-900 flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-primary-100 dark:border-primary-900 rounded-full"></div>
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-primary-600 dark:border-primary-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!video) return null;

  return (
    <MainLayout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-6xl mx-auto space-y-6"
        style={{ perspective: "1200px" }}
      >
        <button
          onClick={() => navigate('/student/learning')}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span>Retour aux modules</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-4 bg-primary-50/80 dark:bg-primary-900/30 backdrop-blur-sm border border-primary-100 dark:border-gray-800 rounded-xl flex items-start gap-3"
            >
              <Info className="w-5 h-5 text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-primary-800 dark:text-primary-300">
                <span className="font-semibold">Lecture linéaire</span> Vous devez visionner la vidéo en entier pour passer à la suite.
              </p>
            </motion.div>

            <motion.div
                whileHover={{ 
                    rotateY: 2, 
                    rotateX: -1, 
                    scale: 1.01,
                    boxShadow: "0 50px 100px -20px rgba(99, 102, 241, 0.2)"
                }}
                style={{ transformStyle: "preserve-3d" }}
            >
                <StudentVideoPlayer
                    video={video}
                    nextVideoId={nextVideoId}
                    onComplete={() => setIsCompleted(true)}
                />
            </motion.div>

            <motion.div 
                whileHover={{ z: 30, y: -5 }}
                style={{ transformStyle: "preserve-3d" }}
                className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-primary-100 dark:border-gray-700"
            >
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-3" style={{ transform: "translateZ(20px)" }}>
                {escapeText(untrusted(video.title))}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400" style={{ transform: "translateZ(10px)" }}>
                <span className="flex items-center gap-2 px-3 py-1 bg-primary-50 dark:bg-primary-900/30 rounded-full">
                  <BookOpen className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                  {video.pillars?.name}
                </span>
                <span className="flex items-center gap-2 px-3 py-1 bg-primary-50/50 dark:bg-primary-800/20 rounded-full">
                  <Clock className="w-4 h-4 text-primary-500 dark:text-primary-300" />
                  {formatDuration(video.duration)}
                </span>
              </div>
              {video.description && (
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg" style={{ transform: "translateZ(5px)" }}>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                    {escapeText(untrusted(video.description))}
                  </p>
                </div>
              )}
            </motion.div>
          </div>

          <div className="space-y-6">
            <motion.div 
                whileHover={{ rotateY: -5, scale: 1.02 }}
                style={{ transformStyle: "preserve-3d" }}
                className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-primary-100 dark:border-gray-700 sticky top-24"
            >
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2" style={{ transform: "translateZ(20px)" }}>
                <span className="text-xl">{video.pillars?.icon || '📚'}</span>
                {video.pillars?.name}
              </h3>

              <div style={{ transform: "translateZ(10px)" }}>
                {isCompleted ? (
                  nextVideoId || quizId ? (
                    <button
                      onClick={() => {
                        if (quizId) {
                          navigate(`/student/quiz/${quizId}`, { state: { nextVideoId } });
                        } else {
                          navigate(`/student/video/${nextVideoId}`);
                        }
                      }}
                      className="w-full py-4 bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 group"
                    >
                      <span>Passer à la suite</span>
                      <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  ) : (
                    <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl text-center">
                      <p className="text-green-700 dark:text-green-300 font-semibold">Module terminé !</p>
                      <button
                        onClick={() => navigate('/student/learning')}
                        className="mt-2 text-sm text-green-600 dark:text-green-400 hover:underline"
                      >
                        Retour aux modules
                      </button>
                    </div>
                  )
                ) : (
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl">
                    <p className="text-amber-700 dark:text-amber-300 text-sm">
                      Terminez cette vidéo pour débloquer la suite.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center text-xs text-gray-400 dark:text-gray-500 flex items-center justify-center gap-1"
        >
          <Shield className="w-3 h-3" />
          <span>Progression sauvegardée automatiquement</span>
        </motion.div>
      </motion.div>
    </MainLayout>
  );
}