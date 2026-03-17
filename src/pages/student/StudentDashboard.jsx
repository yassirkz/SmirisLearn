// src/pages/student/StudentDashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  BookOpen, PlayCircle, Award, Clock, ChevronRight, 
  TrendingUp, Sparkles, Shield, Users, Video, RefreshCw 
} from 'lucide-react';
import { Cell, RadialBar, RadialBarChart, PolarAngleAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { untrusted, escapeText } from '../../utils/security';
import MainLayout from '../../components/layout/MainLayout';

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pillarsCount: 0,
    completedVideos: 0,
    passedQuizzes: 0,
    overallProgress: 0,
    totalVideos: 0,
    totalQuizzes: 0,
    pendingQuizzes: 0
  });
  const [recentVideos, setRecentVideos] = useState([]);
  const [upcomingQuizzes, setUpcomingQuizzes] = useState([]);
  const [progressByPillar, setProgressByPillar] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      console.log('--- Fetching Dashboard Data ---');
      console.log('User ID:', user.id);
      try {
        // 1. Récupérer le nom de l'organisation
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, organization_id')
          .eq('id', user.id)
          .single();
        
        console.log('User Auth ID:', user.id);
        console.log('Profile ID from DB:', profile?.id);

        if (profile?.organization_id) {
          const { data: org } = await supabase
            .from('organizations')
            .select('name')
            .eq('id', profile.organization_id)
            .single();
          if (org) setOrgName(escapeText(untrusted(org.name)));
        }

        // 2. Récupérer les groupes de l'étudiant et les piliers accessibles
        const { data: memberships } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', user.id);

        const groupIds = memberships?.map(m => m.group_id) || [];

        let pillarIds = [];
        if (groupIds.length > 0) {
          const { data: pillarAccess } = await supabase
            .from('group_pillar_access')
            .select('pillar_id')
            .in('group_id', groupIds);
          pillarIds = [...new Set(pillarAccess?.map(p => p.pillar_id) || [])];
        }
        console.log('Pillar IDs accessible:', pillarIds);

        // 3. Récupérer toutes les vidéos accessibles
        let totalVideos = 0;
        let videosByPillar = [];
        let pillarsWithVideosData = [];
        if (pillarIds.length > 0) {
          // Récupérer les vidéos par pilier pour le graphique
          const { data: pillarsWithVideos } = await supabase
            .from('pillars')
            .select(`
              id,
              name,
              videos ( id )
            `)
            .in('id', pillarIds);
          
          pillarsWithVideosData = pillarsWithVideos || [];

          if (pillarsWithVideos) {
            videosByPillar = pillarsWithVideos.map(p => ({
              id: p.id,
              name: p.name,
              total: p.videos?.length || 0
            }));
          }

          // Compter toutes les vidéos
          const { count } = await supabase
            .from('videos')
            .select('*', { count: 'exact', head: true })
            .in('pillar_id', pillarIds);
          totalVideos = count || 0;
        }

        // 4. Récupérer la progression de l'utilisateur
        const { data: progress, error: progressError } = await supabase
          .from('user_progress')
          .select('*')
          .eq('user_id', user.id);

        if (progressError) {
          console.error('Erreur SQL progression:', progressError);
        }
        
        const progressData = progress || [];
        console.log('DEBUG - User ID:', user.id);
        console.log('DEBUG - Progress Count:', progressData.length);
        console.log('DEBUG - Data:', progressData);

        const watchedVideoIds = progressData
          .filter(p => p.watched === true || p.watched === 1)
          .map(p => p.video_id);
          
        const completedVideos = watchedVideoIds.length;
        const passedQuizzes = progressData.filter(p => p.quiz_passed === true || p.quiz_passed === 1).length;

        // Nombre total de quiz accessibles
        let totalQuizzes = 0;
        if (pillarIds.length > 0) {
          const { data: allAccessibleVideos } = await supabase
            .from('videos')
            .select('id')
            .in('pillar_id', pillarIds);
          const videoIds = allAccessibleVideos?.map(v => v.id) || [];
          if (videoIds.length > 0) {
            const { count } = await supabase
              .from('quizzes')
              .select('*', { count: 'exact', head: true })
              .in('video_id', videoIds);
            totalQuizzes = count || 0;
          }
        }

        // Quiz en attente (vidéo regardée mais quiz non réussi)
        const pendingQuizVideoIds = progressData
          .filter(p => (p.watched === true || p.watched === 1) && !(p.quiz_passed === true || p.quiz_passed === 1))
          .map(p => p.video_id);

        let pendingQuizzes = 0;
        if (pendingQuizVideoIds.length > 0) {
          const { count } = await supabase
            .from('quizzes')
            .select('*', { count: 'exact', head: true })
            .in('video_id', pendingQuizVideoIds);
          pendingQuizzes = count || 0;
        }

        // 5. Progression par pilier pour le graphique (Optimisé)
        const pillarProgress = videosByPillar.map((pillar) => {
          const pData = pillarsWithVideosData?.find(p => p.id === pillar.id);
          const pillarVideoIds = pData?.videos?.map(v => v.id) || [];
          
          const watchedInPillar = progressData.filter(p =>
            pillarVideoIds.includes(p.video_id) && (p.watched === true || p.watched === 1)
          ).length;
          
          return {
            id: pillar.id,
            name: pillar.name,
            value: pillar.total > 0 ? Math.round((watchedInPillar / pillar.total) * 100) : 0,
            total: pillar.total,
            watched: watchedInPillar
          };
        });
        setProgressByPillar(pillarProgress);
        console.log('Pillar Progress calculated:', pillarProgress);

        // 6. Vidéos récentes
        if (watchedVideoIds.length > 0) {
          const recent = progressData
            .filter(p => p.watched)
            .sort((a, b) => {
              const dateA = a.completed_at ? new Date(a.completed_at) : new Date(0);
              const dateB = b.completed_at ? new Date(b.completed_at) : new Date(0);
              return dateB - dateA;
            })
            .slice(0, 3)
            .map(p => p.video_id);

          if (recent.length > 0) {
            const { data: videosData } = await supabase
              .from('videos')
              .select(`
                id,
                title,
                duration,
                thumbnail_url,
                pillar:pillars(name)
              `)
              .in('id', recent);
            setRecentVideos(videosData || []);
          }
        }

        // 7. Quiz à venir
        if (pendingQuizVideoIds.length > 0) {
          const { data: quizzesData } = await supabase
            .from('quizzes')
            .select(`
              id,
              video_id,
              video:videos(title)
            `)
            .in('video_id', pendingQuizVideoIds)
            .limit(3);
          setUpcomingQuizzes(quizzesData || []);
        }

        setStats({
          pillarsCount: pillarIds.length,
          completedVideos,
          passedQuizzes,
          overallProgress: totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0,
          totalVideos,
          totalQuizzes,
          pendingQuizzes
        });

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
 
    // 8. Abonnement en temps réel
    const channel = supabase
      .channel('dashboard-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_progress',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchDashboardData();
        }
      )
      .subscribe();
 
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-200 rounded-full"></div>
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  const formatDuration = (seconds) => {
    if (!seconds) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const COLORS = ['#4f46e5', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#6366f1'];

  return (
    <MainLayout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-7xl mx-auto space-y-8"
        style={{ perspective: "1200px" }}
      >
        {/* En-tête avec badge */}
        <div className="relative">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-4 -right-4"
          >
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-bl-2xl rounded-tr-2xl text-xs font-bold shadow-lg flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Mon tableau de bord
            </div>
          </motion.div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                Bonjour, {escapeText(untrusted(user?.email?.split('@')[0] || 'étudiant'))} 👋
              </h1>
              <div className="flex items-center gap-3 mt-1">
                {orgName && (
                  <p className="text-gray-500 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-indigo-600" />
                    Organisation : <span className="font-medium text-indigo-600">{orgName}</span>
                  </p>
                )}
                <button 
                  onClick={() => window.location.reload()} 
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
                  title="Rafraîchir les données"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Progression globale avec cercle (comme SuperAdmin) */}
            <div className="bg-white/80 backdrop-blur-sm px-6 py-3 rounded-2xl shadow-lg border border-indigo-100 flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Progression Totale</p>
                <div className="flex items-center justify-end gap-1">
                  <p className="text-2xl font-bold text-indigo-600">{stats.overallProgress}%</p>
                  {stats.overallProgress > 0 && <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />}
                </div>
              </div>
              <div className="relative w-14 h-14">
                <svg className="w-14 h-14 transform -rotate-90">
                  <circle
                    cx="28"
                    cy="28"
                    r="24"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="transparent"
                    className="text-gray-200"
                  />
                  <circle
                    cx="28"
                    cy="28"
                    r="24"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 24}
                    strokeDashoffset={2 * Math.PI * 24 * (1 - stats.overallProgress / 100)}
                    className="text-indigo-600 transition-all duration-500"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Cartes de statistiques (style glassmorphisme) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Carte Piliers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ 
              rotateY: 8, 
              rotateX: -4, 
              scale: 1.05,
              z: 50,
              boxShadow: "0 25px 50px -12px rgba(79, 70, 229, 0.2)"
            }}
            style={{ transformStyle: "preserve-3d" }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-indigo-100 relative overflow-hidden group cursor-pointer"
            onClick={() => navigate('/student/learning')}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <div className="relative flex items-start justify-between" style={{ transform: "translateZ(30px)" }}>
              <div>
                <p className="text-sm text-gray-500 mb-1">Mes piliers</p>
                <p className="text-3xl font-bold text-gray-800">{stats.pillarsCount}</p>
                <p className="text-xs text-gray-400 mt-2">Accédez à vos formations</p>
              </div>
              <motion.div 
                whileHover={{ translateZ: 40, scale: 1.2, rotate: 10 }}
                className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg transition-transform"
              >
                <BookOpen className="w-6 h-6 text-white" />
              </motion.div>
            </div>
          </motion.div>

          {/* Carte Vidéos vues */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ 
              rotateY: -8, 
              rotateX: -4, 
              scale: 1.05,
              z: 50,
              boxShadow: "0 25px 50px -12px rgba(139, 92, 246, 0.2)"
            }}
            style={{ transformStyle: "preserve-3d" }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-indigo-100 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <div className="relative flex items-start justify-between" style={{ transform: "translateZ(30px)" }}>
              <div>
                <p className="text-sm text-gray-500 mb-1">Vidéos vues</p>
                <p className="text-3xl font-bold text-gray-800">{stats.completedVideos} <span className="text-lg text-gray-400">/ {stats.totalVideos}</span></p>
                <p className="text-xs text-gray-400 mt-2">Continuez sur votre lancée</p>
              </div>
              <motion.div 
                whileHover={{ translateZ: 40, scale: 1.2, rotate: -10 }}
                className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg transition-transform"
              >
                <PlayCircle className="w-6 h-6 text-white" />
              </motion.div>
            </div>
          </motion.div>

          {/* Carte Quiz réussis */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ 
              rotateY: 8, 
              rotateX: 4, 
              scale: 1.05,
              z: 50,
              boxShadow: "0 25px 50px -12px rgba(16, 185, 129, 0.2)"
            }}
            style={{ transformStyle: "preserve-3d" }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-indigo-100 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <div className="relative flex items-start justify-between" style={{ transform: "translateZ(30px)" }}>
              <div>
                <p className="text-sm text-gray-500 mb-1">Quiz réussis</p>
                <p className="text-3xl font-bold text-gray-800">{stats.passedQuizzes} <span className="text-lg text-gray-400">/ {stats.totalQuizzes}</span></p>
                <p className="text-xs text-gray-400 mt-2">{stats.pendingQuizzes > 0 ? `${stats.pendingQuizzes} en attente` : 'Bravo !'}</p>
              </div>
              <motion.div 
                whileHover={{ translateZ: 40, scale: 1.2, rotate: 10 }}
                className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg transition-transform"
              >
                <Award className="w-6 h-6 text-white" />
              </motion.div>
            </div>
          </motion.div>

          {/* Carte Prochain quiz */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            whileHover={{ 
              rotateY: -8, 
              rotateX: 4, 
              scale: 1.05,
              z: 50,
              boxShadow: "0 25px 50px -12px rgba(245, 158, 11, 0.2)"
            }}
            style={{ transformStyle: "preserve-3d" }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-indigo-100 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <div className="relative flex items-start justify-between" style={{ transform: "translateZ(30px)" }}>
              <div>
                <p className="text-sm text-gray-500 mb-1">Prochain quiz</p>
                <p className="text-3xl font-bold text-gray-800">{upcomingQuizzes.length > 0 ? upcomingQuizzes.length : '0'}</p>
                <p className="text-xs text-gray-400 mt-2">{upcomingQuizzes.length > 0 ? 'À passer' : 'Tous terminés'}</p>
              </div>
              <motion.div 
                whileHover={{ translateZ: 40, scale: 1.2, rotate: -10 }}
                className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg transition-transform"
              >
                <Clock className="w-6 h-6 text-white" />
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Graphique de progression par pilier */}
        {progressByPillar.length > 0 && (
          <motion.div
            initial={{ opacity: 0, rotateX: 20, scale: 0.95 }}
            animate={{ opacity: 1, rotateX: 0, scale: 1 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 100 }}
            whileHover={{ rotateX: 2, rotateY: -2 }}
            className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-indigo-100 transition-shadow hover:shadow-indigo-200/50"
          >
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-800">Progression par pilier</h2>
            </div>
            <div className="h-80 w-full relative" style={{ minHeight: '320px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  cx="50%"
                  cy="50%"
                  innerRadius="30%"
                  outerRadius="100%"
                  barSize={20}
                  data={progressByPillar}
                  startAngle={90}
                  endAngle={450}
                >
                  <PolarAngleAxis
                    type="number"
                    domain={[0, 100]}
                    angleAxisId={0}
                    tick={false}
                  />
                  <RadialBar
                    minAngle={15}
                    background={{ fill: '#f3f4f6' }}
                    clockWise
                    dataKey="value"
                    cornerRadius={10}
                    isAnimationActive={true}
                  >
                    {progressByPillar.map((entry, index) => (
                      <Cell key={`cell-${entry.id}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </RadialBar>
                  <Tooltip
                    cursor={false}
                    formatter={(value, name, props) => [`${value}%`, props.payload.name]}
                    contentStyle={{
                      backgroundColor: 'rgba(255,255,255,0.9)',
                      backdropFilter: 'blur(8px)',
                      borderRadius: '12px',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Legend 
                    iconSize={10} 
                    layout="vertical" 
                    verticalAlign="middle" 
                    align="right"
                    wrapperStyle={{ fontSize: '12px', fontWeight: 500 }}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
              {progressByPillar.length === 1 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center translate-y-[-10px]">
                    <p className="text-3xl font-bold text-indigo-600 animate-pulse">{progressByPillar[0].value}%</p>
                    <p className="text-[10px] text-gray-500 uppercase font-semibold">Progression</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Deux colonnes : vidéos récentes et quiz à venir */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Vidéos récentes */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-indigo-100"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-indigo-600" />
                Continuer à apprendre
              </h3>
              <button
                onClick={() => navigate('/student/learning')}
                className="text-sm text-indigo-600 font-semibold hover:underline"
              >
                Tout voir
              </button>
            </div>

            {recentVideos.length === 0 ? (
              <div className="text-center py-8">
                <Video className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-400 italic">Aucune vidéo visionnée récemment</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentVideos.map(video => (
                  <motion.div
                    key={video.id}
                    whileHover={{ x: 5 }}
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-indigo-50/50 transition-colors cursor-pointer border border-transparent hover:border-indigo-200"
                    onClick={() => navigate(`/student/video/${video.id}`)}
                  >
                    <div className="w-20 h-14 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {video.thumbnail_url ? (
                        <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                      ) : (
                        <PlayCircle className="w-6 h-6 text-indigo-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-800 truncate">{escapeText(untrusted(video.title))}</h4>
                      <p className="text-xs text-gray-500">{video.pillar?.name} • {formatDuration(video.duration)}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Quiz à venir */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-indigo-100"
          >
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-green-600" />
              Quiz à passer
            </h3>

            {upcomingQuizzes.length === 0 ? (
              <div className="text-center py-8">
                <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-400 italic">Tous vos quiz sont à jour ! ✨</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingQuizzes.map(quiz => (
                  <motion.div
                    key={quiz.id}
                    whileHover={{ scale: 1.02 }}
                    className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(`/student/quiz/${quiz.id}`)}
                  >
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-green-600 shadow-sm">
                      <Award className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800">{escapeText(untrusted(quiz.video?.title || 'Quiz'))}</h4>
                      <p className="text-xs text-green-600">Prêt à être passé</p>
                    </div>
                    <button className="px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-green-700 transition-colors">
                      Démarrer
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Note de sécurité */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-xs text-gray-400 flex flex-col items-center justify-center gap-1"
        >
          <div className="flex items-center gap-1">
            <Shield className="w-3 h-3" />
            <span>Données mises à jour en temps réel • Progression sécurisée</span>
          </div>
        </motion.div>
      </motion.div>
    </MainLayout>
  );
}