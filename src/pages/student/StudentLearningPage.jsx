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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-primary-50 dark:from-secondary-950 dark:to-secondary-900 flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-primary-100 dark:border-primary-900 rounded-full"></div>
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-primary-600 dark:border-primary-400 border-t-transparent rounded-full animate-spin" />
        </div>
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
          className="flex items-center gap-2 text-primary-600 dark:text-primary-400 font-medium hover:text-primary-700 dark:hover:text-primary-300 transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          Retour au tableau de bord
        </motion.button>
        {/* En-tête avec badge */}
        <div className="relative">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-4 -right-4 hidden sm:block"
          >
            <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white px-4 py-2 rounded-bl-2xl rounded-tr-2xl text-xs font-bold shadow-lg flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Modules
            </div>
          </motion.div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <BookOpen className="w-7 h-7 sm:w-8 sm:h-8 text-primary-600 dark:text-primary-400" />
              Parcours d'apprentissage
            </h1>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Suivez les vidéos dans l'ordre pour progresser
            </p>
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
                  boxShadow: "0 40px 80px -20px rgba(99, 102, 241, 0.15)"
                }}
                style={{ transformStyle: "preserve-3d" }}
                className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-xl border border-primary-100 dark:border-gray-700 relative overflow-hidden group"
              >
                {/* Effet de shine */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-gray-700/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />

                {/* En-tête du pilier */}
                <div className="flex items-center gap-4 mb-6" style={{ transform: "translateZ(40px)" }}>
                  <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center text-3xl shadow-lg group-hover:scale-110 transition-transform">
                    {pillar.icon || '📚'}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                      {escapeText(untrusted(pillar.name))}
                    </h2>
                    {pillar.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {escapeText(untrusted(pillar.description))}
                      </p>
                    )}
                  </div>
                </div>

                {/* Liste des vidéos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pillar.videos.map((video) => (
                    <motion.div
                      key={video.id}
                      whileHover={{ 
                        z: 20, 
                        scale: 1.02
                      }}
                      className={`relative group flex items-center justify-between p-4 rounded-xl transition-all duration-300 border-2 ${
                        video.canAccess
                          ? 'bg-white dark:bg-gray-800 border-primary-100 dark:border-primary-900 hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700'
                          : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 opacity-75 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                      onMouseEnter={() => setHoveredVideo(video.id)}
                      onMouseLeave={() => setHoveredVideo(null)}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-sm transition-transform group-hover:scale-110 ${
                          video.canAccess ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                        }`}>
                          {video.canAccess ? <PlayCircle className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`font-medium truncate ${video.canAccess ? 'text-gray-800 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                            {escapeText(untrusted(video.title))}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 mt-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatDuration(video.duration)}</span>
                          </div>
                        </div>
                      </div>

                      {video.canAccess ? (
                        <Link
                          to={`/student/video/${video.id}`}
                          className="px-4 py-2 bg-primary-600 dark:bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 dark:hover:bg-primary-700 transition-colors shadow-md hover:shadow-lg"
                        >
                          Voir la vidéo
                        </Link>
                      ) : (
                        <div className="relative">
                          <div className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-gray-400 dark:text-gray-500 cursor-not-allowed">
                            <Lock className="w-4 h-4" />
                          </div>

                          <AnimatePresence>
                            {hoveredVideo === video.id && (
                              <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute bottom-full right-0 mb-2 z-10 w-48 p-3 bg-gray-900 dark:bg-gray-800 text-white dark:text-gray-200 text-xs rounded-lg shadow-xl"
                              >
                                <div className="flex items-start gap-2">
                                  <AlertCircle className="w-4 h-4 text-amber-400 dark:text-amber-400 flex-shrink-0" />
                                  <p>Cette vidéo sera débloquée une fois la précédente terminée.</p>
                                </div>
                                <div className="absolute top-full right-6 w-3 h-3 bg-gray-900 dark:bg-gray-800 rotate-45 -translate-y-1.5" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
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