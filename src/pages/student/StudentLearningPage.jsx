// src/pages/student/StudentLearningPage.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { BookOpen, Lock, PlayCircle, Clock, AlertCircle, Sparkles, Shield, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { supabase } from '../../lib/supabase';
import { untrusted, escapeText } from '../../utils/security';
import MainLayout from '../../components/layout/MainLayout';
import { useNavigate } from 'react-router-dom';

export default function StudentLearningPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { error: showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [pillars, setPillars] = useState([]);
  const [hoveredVideo, setHoveredVideo] = useState(null);

  useEffect(() => {
    if (!user) return;
    fetchAccessibleContent();
  }, [user]);

  const fetchAccessibleContent = async () => {
    try {
      const { data: memberships, error: membersError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);
      if (membersError) throw membersError;
      const groupIds = memberships.map(m => m.group_id);
      if (groupIds.length === 0) {
        setPillars([]);
        return;
      }

      const { data: pillarAccess, error: accessError } = await supabase
        .from('group_pillar_access')
        .select('pillar_id')
        .in('group_id', groupIds);
      if (accessError) throw accessError;
      const pillarIds = [...new Set(pillarAccess.map(p => p.pillar_id))];
      if (pillarIds.length === 0) {
        setPillars([]);
        return;
      }

      const { data: pillarsData, error: pillarsError } = await supabase
        .from('pillars')
        .select(`
          id,
          name,
          description,
          icon,
          color,
          videos (
            id,
            title,
            duration,
            sequence_order,
            thumbnail_url,
            description
          )
        `)
        .in('id', pillarIds)
        .order('name');

      if (pillarsError) throw pillarsError;

      const pillarsWithAccess = await Promise.all(
        (pillarsData || []).map(async (pillar) => {
          const videosWithAccess = await Promise.all(
            (pillar.videos || []).map(async (video) => {
              const { data: accessResult } = await supabase
                .rpc('can_access_video', {
                  p_student_id: user.id,
                  p_video_id: video.id
                });
              return { ...video, canAccess: accessResult || false };
            })
          );
          videosWithAccess.sort((a, b) => a.sequence_order - b.sequence_order);
          return { ...pillar, videos: videosWithAccess };
        })
      );

      setPillars(pillarsWithAccess);
    } catch (err) {
      console.error('Erreur chargement contenu:', err);
      showError("Erreur lors du chargement des modules d'apprentissage.");
    } finally {
      setLoading(false);
    }
  };

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
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
             <Sparkles className="w-6 h-6 text-primary-500 animate-pulse delay-300" />
          </div>
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-primary-900 dark:text-primary-300 font-medium tracking-wide animate-pulse"
        >
          Chargement des modules...
        </motion.p>
      </div>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Bouton Retour */}
        <motion.button
          onClick={() => navigate('/student')}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ x: -5 }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl text-primary-600 dark:text-primary-400 font-bold hover:bg-white/80 dark:hover:bg-gray-800/80 hover:shadow-md transition-all group border border-white/60 dark:border-gray-700"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          Tableau de bord
        </motion.button>
        {/* En-tête avec badge */}
        <div className="relative bg-white/40 dark:bg-gray-800/40 backdrop-blur-xl p-8 rounded-[2rem] border border-white/60 dark:border-gray-700/50 shadow-xl overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary-200/40 dark:bg-primary-900/40 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative z-10 flex flex-col md:flex-row gap-6 md:items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-primary-500 to-primary-700 text-white rounded-full text-xs font-black shadow-lg mb-4">
                <Sparkles className="w-3.5 h-3.5" /> MODULES
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white flex items-center gap-3 tracking-tight">
                <div className="p-3 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800 rounded-2xl shadow-inner text-primary-600 dark:text-primary-400">
                  <BookOpen className="w-8 h-8" />
                </div>
                Parcours d'apprentissage
              </h1>
              <p className="text-base text-gray-500 dark:text-gray-400 mt-3 flex items-center gap-2 font-medium">
                <Shield className="w-5 h-5 text-emerald-500" />
                Suivez les vidéos dans l'ordre pour débloquer les suivantes.
              </p>
            </div>
          </div>
        </div>

        {pillars.length === 0 ? (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-8 sm:p-12 shadow-xl border border-primary-100 dark:border-gray-700 text-center">
            <BookOpen className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Aucun module disponible</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Vous n'avez pas encore accès aux modules d'apprentissage.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {pillars.map((pillar, index) => (
              <motion.div
                key={pillar.id}
                initial={{ opacity: 0, rotateX: 10, y: 30 }}
                animate={{ opacity: 1, rotateX: 0, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ 
                  rotateY: window.innerWidth > 768 ? 2 : 0, 
                  rotateX: window.innerWidth > 768 ? -2 : 0, 
                  scale: 1.01,
                  boxShadow: "0 50px 100px -20px rgba(99, 102, 241, 0.25)"
                }}
                style={{ transformStyle: "preserve-3d" }}
                className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-2xl rounded-[2.5rem] p-6 sm:p-10 shadow-2xl border border-white/60 dark:border-gray-700/50 relative overflow-hidden group"
              >
                {/* Effet de shine */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 dark:via-gray-700/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />

                {/* En-tête du pilier */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-6 mb-8 border-b border-gray-100 dark:border-gray-700/50 pb-6" style={{ transform: "translateZ(40px)" }}>
                  <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-700 rounded-[1.5rem] flex items-center justify-center text-4xl shadow-xl shadow-primary-500/30 group-hover:scale-105 group-hover:rotate-6 transition-all shrink-0">
                    {pillar.icon || '📚'}
                  </div>
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                      {escapeText(untrusted(pillar.name))}
                    </h2>
                    {pillar.description && (
                      <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-2 font-medium leading-relaxed max-w-3xl">
                        {escapeText(untrusted(pillar.description))}
                      </p>
                    )}
                  </div>
                </div>

                {/* Liste des vidéos */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" style={{ transform: "translateZ(20px)" }}>
                  {pillar.videos.map((video) => (
                    <motion.div
                      key={video.id}
                      whileHover={{ 
                        z: 30, 
                        scale: 1.03,
                        y: -5
                      }}
                      className={`relative flex flex-col justify-between p-5 rounded-[1.5rem] transition-all duration-300 border backdrop-blur-md ${
                        video.canAccess
                          ? 'bg-white/80 dark:bg-gray-800/80 border-white dark:border-gray-700 shadow-lg hover:shadow-primary-500/20'
                          : 'bg-gray-100/50 dark:bg-gray-900/50 border-gray-200/50 dark:border-gray-800/50 shadow-inner overflow-hidden'
                      }`}
                      onMouseEnter={() => setHoveredVideo(video.id)}
                      onMouseLeave={() => setHoveredVideo(null)}
                    >
                      {!video.canAccess && (
                          <div className="absolute inset-0 bg-gray-900/5 dark:bg-black/20 z-10 backdrop-blur-[1px]"></div>
                      )}
                      <div className="flex items-start gap-4 mb-4 relative z-20">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner group-hover:rotate-12 transition-all duration-300 ${
                          video.canAccess ? 'bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/80 dark:to-primary-800/80 text-primary-600 dark:text-primary-300' : 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                        }`}>
                          {video.canAccess ? <PlayCircle className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`font-bold leading-tight line-clamp-2 ${video.canAccess ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                            {escapeText(untrusted(video.title))}
                          </p>
                          <div className={`flex items-center gap-1.5 text-xs mt-2 font-bold uppercase tracking-wider ${video.canAccess ? 'text-primary-500 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'}`}>
                            <Clock className="w-3.5 h-3.5" />
                            <span>{formatDuration(video.duration)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-auto pt-4 relative z-20">
                      {video.canAccess ? (
                        <Link
                          to={`/student/video/${video.id}`}
                          className="flex items-center justify-center w-full py-3 bg-gray-900 hover:bg-black dark:bg-primary-600 dark:hover:bg-primary-500 text-white rounded-xl text-sm font-black transition-all shadow-[0_4px_14px_0_rgb(0,0,0,0.2)] dark:shadow-primary-500/30 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                        >
                          Lancer la vidéo
                        </Link>
                      ) : (
                        <div className="relative w-full">
                          <div className="flex items-center justify-center w-full py-3 bg-gray-200/50 dark:bg-gray-800/80 text-gray-400 dark:text-gray-500 rounded-xl text-sm font-black cursor-not-allowed border border-gray-200 dark:border-gray-700/50">
                            Bloqué
                          </div>

                          <AnimatePresence>
                            {hoveredVideo === video.id && (
                              <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-30 w-56 p-4 bg-gray-900 dark:bg-gray-700 text-white dark:text-gray-200 text-xs rounded-2xl shadow-2xl border border-gray-700 dark:border-gray-600"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="p-1.5 bg-amber-500/20 rounded-lg shrink-0">
                                      <Lock className="w-4 h-4 text-amber-400" />
                                  </div>
                                  <p className="font-medium leading-relaxed drop-shadow-md">Vidéo verrouillée. Terminez la vidéo précédente.</p>
                                </div>
                                <div className="absolute top-full left-1/2 -translate-x-1/2 w-4 h-4 bg-gray-900 dark:bg-gray-700 rotate-45 -translate-y-2 border-r border-b border-gray-700 dark:border-gray-600" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Note de sécurité */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-xs text-gray-400 dark:text-gray-500 flex items-center justify-center gap-1"
        >
          <Shield className="w-3 h-3" />
          <span>Contenu protégé • Lecture linéaire obligatoire</span>
        </motion.div>
      </div>
    </MainLayout>
  );
}