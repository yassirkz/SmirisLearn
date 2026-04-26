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

        // --- SÉCURITÉ : Génération d'une URL signée (TTL 1 heure) ---
        // On suppose que l'URL stockée est soit le path relatif, soit on extrait le path
        const videoPath = videoData.video_url.includes('storage/v1/object/public/videos/') 
            ? videoData.video_url.split('storage/v1/object/public/videos/')[1]
            : videoData.video_url;

        const { data: signedData, error: signedError } = await supabase.storage
            .from('videos')
            .createSignedUrl(videoPath, 3600);

        if (signedError) {
            console.error('Erreur URL signée:', signedError);
        } else {
            videoData.video_url = signedData.signedUrl;
        }

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
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary-50 via-white to-accent-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col items-center justify-center">
        <motion.div
           animate={{ scale: [1, 1.1, 1], rotate: [0, 180, 360] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
           className="relative"
        >
          <div className="w-20 h-20 border-4 border-primary-100/50 dark:border-gray-700 rounded-full shadow-2xl"></div>
          <div className="absolute top-0 left-0 w-20 h-20 border-4 border-primary-600 dark:border-primary-400 border-t-transparent rounded-full"></div>
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-primary-900 dark:text-primary-300 font-medium tracking-wide animate-pulse"
        >
          Chargement de la vidéo racontée...
        </motion.p>
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
          className="inline-flex items-center gap-2 px-4 py-2 bg-white/40 dark:bg-gray-800/40 backdrop-blur-md rounded-xl text-primary-600 dark:text-primary-400 font-bold hover:bg-white/70 dark:hover:bg-gray-800/70 hover:shadow-lg transition-all group border border-white/50 dark:border-gray-700/50"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span>Retour aux modules</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 xl:gap-12">
          <div className="lg:col-span-2 space-y-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-5 bg-gradient-to-r from-primary-50 to-primary-100/50 dark:from-primary-900/20 dark:to-primary-800/10 backdrop-blur-xl border border-primary-100/50 dark:border-primary-900/50 rounded-2xl flex items-start gap-4 shadow-sm"
            >
              <div className="p-2 bg-primary-100 dark:bg-primary-900/50 rounded-xl shrink-0">
                  <Info className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <p className="text-sm md:text-base text-primary-800 dark:text-primary-200 leading-relaxed font-medium mt-0.5">
                <span className="font-black uppercase tracking-wide text-primary-900 dark:text-primary-100">Lecture linéaire</span> — Vous devez visionner la vidéo en entier pour passer à la suite.
              </p>
            </motion.div>

            <motion.div
                whileHover={{ 
                    rotateY: 1, 
                    rotateX: -1, 
                    scale: 1.01,
                    boxShadow: "0 50px 100px -20px rgba(99, 102, 241, 0.25)"
                }}
                style={{ transformStyle: "preserve-3d" }}
                className="rounded-3xl overflow-hidden shadow-2xl border border-black/5 dark:border-white/10 bg-black"
            >
                <StudentVideoPlayer
                    video={video}
                    nextVideoId={nextVideoId}
                    onComplete={() => setIsCompleted(true)}
                />
            </motion.div>

            <motion.div 
                whileHover={{ z: 20, y: -2 }}
                style={{ transformStyle: "preserve-3d" }}
                className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-2xl rounded-[2rem] p-8 sm:p-10 shadow-xl border border-white/60 dark:border-gray-700/50 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                  <BookOpen className="w-40 h-40" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white mb-6 tracking-tight leading-tight" style={{ transform: "translateZ(20px)" }}>
                {escapeText(untrusted(video.title))}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm font-bold uppercase tracking-wider" style={{ transform: "translateZ(10px)" }}>
                <span className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/60 dark:to-primary-800/60 text-primary-700 dark:text-primary-300 rounded-xl shadow-inner">
                  <BookOpen className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  {video.pillars?.name}
                </span>
                <span className="flex items-center gap-2 px-4 py-2 bg-white/60 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 rounded-xl border border-white dark:border-gray-600 shadow-sm">
                  <Clock className="w-5 h-5 text-primary-500 dark:text-primary-400" />
                  {formatDuration(video.duration)}
                </span>
              </div>
              {video.description && (
                <div className="mt-8 p-6 bg-white/50 dark:bg-gray-900/50 rounded-2xl border border-white/40 dark:border-gray-700 backdrop-blur-md" style={{ transform: "translateZ(5px)" }}>
                  <p className="text-gray-600 dark:text-gray-300 whitespace-pre-line text-lg leading-relaxed font-medium">
                    {escapeText(untrusted(video.description))}
                  </p>
                </div>
              )}
            </motion.div>
          </div>

          <div className="space-y-6">
            <motion.div 
                whileHover={{ rotateY: -2, scale: 1.02 }}
                style={{ transformStyle: "preserve-3d" }}
                className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-2xl rounded-[2rem] p-8 shadow-2xl border border-white/60 dark:border-gray-700/50 sticky top-28"
            >
              <h3 className="text-xl font-black text-gray-900 dark:text-white mb-6 flex items-center gap-4 tracking-tight" style={{ transform: "translateZ(20px)" }}>
                <div className="w-14 h-14 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/60 dark:to-primary-800/60 rounded-xl flex items-center justify-center text-3xl shadow-inner shrink-0">
                    {video.pillars?.icon || '📚'}
                </div>
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
                      className="w-full py-5 bg-gradient-to-r from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 text-white rounded-2xl font-black text-lg shadow-[0_10px_25px_rgba(16,185,129,0.3)] hover:shadow-[0_15px_30px_rgba(16,185,129,0.4)] transition-all flex items-center justify-center gap-3 group overflow-hidden relative"
                    >
                      <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out z-0"></div>
                      <span className="relative z-10">{quizId ? 'Lancer le quiz' : 'Vidéo suivante'}</span>
                      <ChevronRight className="w-6 h-6 group-hover:translate-x-1.5 transition-transform relative z-10" />
                    </button>
                  ) : (
                    <div className="p-6 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl text-center shadow-lg">
                      <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-800/50 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
                          <BookOpen className="w-8 h-8" />
                      </div>
                      <p className="text-emerald-700 dark:text-emerald-300 font-black text-xl tracking-tight">Module terminé !</p>
                      <button
                        onClick={() => navigate('/student/learning')}
                        className="mt-4 px-6 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 shadow-md transition-colors"
                      >
                        Retour aux modules
                      </button>
                    </div>
                  )
                ) : (
                  <div className="p-6 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-2xl shadow-inner relative overflow-hidden group">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-amber-200/50 dark:bg-amber-800/30 rounded-bl-full translate-x-12 -translate-y-12 transition-transform group-hover:scale-110"></div>
                    <div className="flex items-start gap-4 relative z-10">
                        <div className="p-2 bg-amber-500/20 rounded-xl">
                            <Lock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                        </div>
                        <p className="text-amber-800 dark:text-amber-300 font-bold leading-snug">
                          Visionnez cette vidéo jusqu'à la fin pour débloquer le reste du parcours.
                        </p>
                    </div>
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