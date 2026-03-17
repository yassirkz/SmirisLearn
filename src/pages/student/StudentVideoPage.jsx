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
          showError("Accès refusé. Terminez la vidéo précédente et son quiz.");
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
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-200 rounded-full"></div>
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
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
          className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span>Retour aux formations</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-4 bg-indigo-50/80 backdrop-blur-sm border border-indigo-200 rounded-xl flex items-start gap-3"
            >
              <Info className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-indigo-800">
                <span className="font-semibold">Visionnage linéaire :</span> Pour garantir un apprentissage progressif, vous ne pouvez pas avancer rapidement.
              </p>
            </motion.div>

            <motion.div
                whileHover={{ 
                    rotateY: 2, 
                    rotateX: -1, 
                    scale: 1.01,
                    boxShadow: "0 50px 100px -20px rgba(79, 70, 229, 0.2)"
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
                className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-indigo-100"
            >
              <h1 className="text-2xl font-bold text-gray-800 mb-3" style={{ transform: "translateZ(20px)" }}>
                {escapeText(untrusted(video.title))}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600" style={{ transform: "translateZ(10px)" }}>
                <span className="flex items-center gap-2 px-3 py-1 bg-indigo-50 rounded-full">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  {video.pillars?.name}
                </span>
                <span className="flex items-center gap-2 px-3 py-1 bg-purple-50 rounded-full">
                  <Clock className="w-4 h-4 text-purple-600" />
                  {formatDuration(video.duration)}
                </span>
              </div>
              {video.description && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg" style={{ transform: "translateZ(5px)" }}>
                  <p className="text-gray-700 whitespace-pre-line">
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
                className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-indigo-100 sticky top-24"
            >
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2" style={{ transform: "translateZ(20px)" }}>
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
                      className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 group"
                    >
                      <span>Suivant</span>
                      <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  ) : (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-center">
                      <p className="text-green-700 font-semibold">✨ Parcours terminé !</p>
                      <button
                        onClick={() => navigate('/student/learning')}
                        className="mt-2 text-sm text-green-600 hover:underline"
                      >
                        Retour aux formations
                      </button>
                    </div>
                  )
                ) : (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-amber-700 text-sm">
                      Terminez le visionnage pour débloquer la suite.
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
          className="text-center text-xs text-gray-400 flex items-center justify-center gap-1"
        >
          <Shield className="w-3 h-3" />
          <span>Progression enregistrée automatiquement</span>
        </motion.div>
      </motion.div>
    </MainLayout>
  );
}