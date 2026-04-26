// src/pages/student/StudentDashboard.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpen,
  PlayCircle,
  Award,
  Clock,
  ChevronRight,
  TrendingUp,
  Sparkles,
  Shield,
  Users,
  Video,
  RefreshCw,
  Flame,
  Hourglass,
  Zap,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import { supabase } from "../../lib/supabase";
import { untrusted, escapeText } from "../../utils/security";
import MainLayout from "../../components/layout/MainLayout";
import ProgressChart from "../../components/ui/ProgressChart";

export default function StudentDashboard() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pillarsCount: 0,
    completedVideos: 0,
    passedQuizzes: 0,
    overallProgress: 0,
    totalVideos: 0,
    totalQuizzes: 0,
    pendingQuizzes: 0,
  });
  const [recentVideos, setRecentVideos] = useState([]);
  const [upcomingQuizzes, setUpcomingQuizzes] = useState([]);
  const [progressByPillar, setProgressByPillar] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [totalTimeSpent, setTotalTimeSpent] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      try {
        // 1. Récupérer le nom de l'organisation
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, organization_id")
          .eq("id", user.id)
          .single();

        if (profile?.organization_id) {
          const { data: org } = await supabase
            .from("organizations")
            .select("name")
            .eq("id", profile.organization_id)
            .single();
          if (org) setOrgName(escapeText(untrusted(org.name)));
        }

        // 2. Récupérer les groupes de l'étudiant et les piliers accessibles
        const { data: memberships } = await supabase
          .from("group_members")
          .select("group_id")
          .eq("user_id", user.id);

        const groupIds = memberships?.map((m) => m.group_id) || [];

        let pillarIds = [];
        if (groupIds.length > 0) {
          const { data: pillarAccess } = await supabase
            .from("group_pillar_access")
            .select("pillar_id")
            .in("group_id", groupIds);
          pillarIds = [...new Set(pillarAccess?.map((p) => p.pillar_id) || [])];
        }

        // 3. Récupérer toutes les vidéos accessibles avec leur durée
        let totalVideos = 0;
        let videosByPillar = [];
        let pillarsWithVideosData = [];
        let allVideos = [];
        if (pillarIds.length > 0) {
          const { data: pillarsWithVideos } = await supabase
            .from("pillars")
            .select(
              `
              id,
              name,
              videos ( id, duration, sequence_order )
            `,
            )
            .in("id", pillarIds);

          pillarsWithVideosData = pillarsWithVideos || [];

          const { data: videos } = await supabase
            .from("videos")
            .select("id, duration, pillar_id, sequence_order")
            .in("pillar_id", pillarIds);
          allVideos = videos || [];

          if (pillarsWithVideos) {
            videosByPillar = pillarsWithVideos.map((p) => ({
              id: p.id,
              name: p.name,
              total: p.videos?.length || 0,
              videos: p.videos || [],
            }));
          }

          const { count } = await supabase
            .from("videos")
            .select("*", { count: "exact", head: true })
            .in("pillar_id", pillarIds);
          totalVideos = count || 0;
        }

        // 4. Récupérer la progression de l'utilisateur
        const { data: progress, error: progressError } = await supabase
          .from("user_progress")
          .select("*")
          .eq("user_id", user.id);

        if (progressError) {
          console.error("Erreur SQL progression:", progressError);
        }

        const progressData = progress || [];
        const watchedVideos = progressData.filter(
          (p) => p.watched === true || p.watched === 1,
        );
        const watchedVideoIds = watchedVideos.map((p) => p.video_id);
        const completedVideos = watchedVideoIds.length;
        const passedQuizzes = progressData.filter(
          (p) => p.quiz_passed === true || p.quiz_passed === 1,
        ).length;

        // Nombre total de quiz accessibles
        let totalQuizzes = 0;
        if (pillarIds.length > 0) {
          const { data: allAccessibleVideos } = await supabase
            .from("videos")
            .select("id")
            .in("pillar_id", pillarIds);
          const videoIds = allAccessibleVideos?.map((v) => v.id) || [];
          if (videoIds.length > 0) {
            const { count } = await supabase
              .from("quizzes")
              .select("*", { count: "exact", head: true })
              .in("video_id", videoIds);
            totalQuizzes = count || 0;
          }
        }

        // Quiz en attente
        const pendingQuizVideoIds = progressData
          .filter(
            (p) =>
              (p.watched === true || p.watched === 1) &&
              !(p.quiz_passed === true || p.quiz_passed === 1),
          )
          .map((p) => p.video_id);

        let pendingQuizzes = 0;
        if (pendingQuizVideoIds.length > 0) {
          const { count } = await supabase
            .from("quizzes")
            .select("*", { count: "exact", head: true })
            .in("video_id", pendingQuizVideoIds);
          pendingQuizzes = count || 0;
        }

        // 5. Progression par pilier
        const pillarProgress = videosByPillar.map((pillar) => {
          const pillarVideoIds = pillar.videos.map((v) => v.id);
          const watchedInPillar = watchedVideos.filter((p) =>
            pillarVideoIds.includes(p.video_id),
          ).length;
          return {
            id: pillar.id,
            name: pillar.name,
            value:
              pillar.total > 0
                ? Math.round((watchedInPillar / pillar.total) * 100)
                : 0,
            total: pillar.total,
            watched: watchedInPillar,
          };
        });
        setProgressByPillar(pillarProgress);

        // 6. Vidéos récentes
        if (watchedVideoIds.length > 0) {
          const recent = watchedVideos
            .sort((a, b) => {
              const dateA = a.completed_at
                ? new Date(a.completed_at)
                : new Date(0);
              const dateB = b.completed_at
                ? new Date(b.completed_at)
                : new Date(0);
              return dateB - dateA;
            })
            .slice(0, 3)
            .map((p) => p.video_id);

          if (recent.length > 0) {
            const { data: videosData } = await supabase
              .from("videos")
              .select(
                `
                id,
                title,
                duration,
                thumbnail_url,
                pillar:pillars(name)
              `,
              )
              .in("id", recent);
            setRecentVideos(videosData || []);
          }
        }

        // 7. Quiz à venir
        if (pendingQuizVideoIds.length > 0) {
          const { data: quizzesData } = await supabase
            .from("quizzes")
            .select(
              `
              id,
              video_id,
              video:videos(title)
            `,
            )
            .in("video_id", pendingQuizVideoIds)
            .limit(3);
          setUpcomingQuizzes(quizzesData || []);
        }

        // 8. Calcul des recommandations
        const recs = [];
        for (const pillar of videosByPillar) {
          const sortedVideos = pillar.videos.sort(
            (a, b) => a.sequence_order - b.sequence_order,
          );
          const nextVideo = sortedVideos.find(
            (v) => !watchedVideoIds.includes(v.id),
          );
          if (nextVideo) {
            const videoInfo = allVideos.find((v) => v.id === nextVideo.id);
            recs.push({
              pillarId: pillar.id,
              pillarName: pillar.name,
              videoId: nextVideo.id,
              title: videoInfo?.title || "Sans titre",
              sequence: nextVideo.sequence_order,
              duration: videoInfo?.duration,
            });
          }
        }
        setRecommendations(recs);

        // 9. Calcul du temps total passé
        let totalTime = 0;
        for (const vid of watchedVideos) {
          const videoInfo = allVideos.find((v) => v.id === vid.video_id);
          if (videoInfo?.duration) {
            totalTime += videoInfo.duration;
          }
        }
        setTotalTimeSpent(totalTime);

        // 10. Calcul du streak
        const dates = watchedVideos
          .map((p) =>
            p.completed_at ? new Date(p.completed_at).toDateString() : null,
          )
          .filter((d) => d !== null);
        const uniqueDates = [...new Set(dates)];
        uniqueDates.sort((a, b) => new Date(b) - new Date(a));
        let currentStreak = 0;
        const today = new Date().toDateString();
        if (uniqueDates.includes(today)) {
          currentStreak = 1;
          let previousDate = new Date(today);
          for (let i = 1; i < uniqueDates.length; i++) {
            const prevDay = new Date(previousDate);
            prevDay.setDate(prevDay.getDate() - 1);
            if (uniqueDates[i] === prevDay.toDateString()) {
              currentStreak++;
              previousDate = prevDay;
            } else {
              break;
            }
          }
        } else {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          if (uniqueDates.includes(yesterday.toDateString())) {
            currentStreak = 1;
            let previousDate = yesterday;
            for (let i = 1; i < uniqueDates.length; i++) {
              const prevDay = new Date(previousDate);
              prevDay.setDate(prevDay.getDate() - 1);
              if (uniqueDates[i] === prevDay.toDateString()) {
                currentStreak++;
                previousDate = prevDay;
              } else {
                break;
              }
            }
          }
        }
        setStreak(currentStreak);

        setStats({
          pillarsCount: pillarIds.length,
          completedVideos,
          passedQuizzes,
          overallProgress:
            totalVideos > 0
              ? Math.round((completedVideos / totalVideos) * 100)
              : 0,
          totalVideos,
          totalQuizzes,
          pendingQuizzes,
        });
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();

    const channel = supabase
      .channel("dashboard-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_progress",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchDashboardData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary-50 via-white to-accent-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col items-center justify-center">
        <motion.div
           animate={{ scale: [1, 1.1, 1], rotate: [0, 180, 360] }}
           transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
           className="relative"
        >
          <div className="w-20 h-20 border-4 border-primary-100/50 dark:border-gray-700 rounded-full shadow-2xl"></div>
          <div className="absolute top-0 left-0 w-20 h-20 border-4 border-primary-600 dark:border-primary-400 border-t-transparent rounded-full"></div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
             <Sparkles className="w-6 h-6 text-primary-500 animate-pulse delay-700" />
          </div>
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-primary-900 dark:text-primary-300 font-medium tracking-wide animate-pulse"
        >
          Chargement de votre espace...
        </motion.p>
      </div>
    );
  }

  const formatDuration = (seconds) => {
    if (!seconds) return "--:--";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const formatTimeSpent = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}min`;
    return `${minutes} minutes`;
  };

  const COLORS = [
    "#4f46e5",
    "#8b5cf6",
    "#ec4899",
    "#10b981",
    "#f59e0b",
    "#6366f1",
  ];

  return (
    <MainLayout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-7xl mx-auto space-y-6 sm:space-y-8 px-1 sm:px-2"
        style={{ perspective: "1200px" }}
      >
        {/* En-tête avec badge */}
        <div className="relative">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-4 -right-4 hidden sm:flex"
          >
            <div className="bg-gradient-to-r from-primary-600 to-accent-600 text-white px-4 py-2 rounded-bl-2xl rounded-tr-2xl text-xs font-bold shadow-lg flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Espace Étudiant
            </div>
          </motion.div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
                Bonjour,{" "}
                {escapeText(
                  untrusted(user?.email?.split("@")[0] || "étudiant"),
                )}{" "}
                👋
              </h1>
              <div className="flex items-center gap-3 mt-1">
                {orgName && (
                  <p className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                    Organisation :{" "}
                    <span className="font-medium text-primary-600 dark:text-primary-400">
                      {orgName}
                    </span>
                  </p>
                )}
                <button
                  onClick={() => window.location.reload()}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-400 dark:text-gray-500"
                  title="Rafraîchir"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Progression globale avec cercle */}
            <div className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-xl px-6 py-4 rounded-3xl shadow-xl border border-white/50 dark:border-gray-700/50 flex items-center gap-5 hover:bg-white/60 dark:hover:bg-gray-800/60 transition-colors">
              <div className="text-right">
                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest font-black mb-0.5">
                  Progression Globale
                </p>
                <div className="flex items-center justify-end gap-1.5">
                  <p className="text-3xl font-black bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent drop-shadow-sm">
                    {stats.overallProgress}%
                  </p>
                  {stats.overallProgress > 0 && (
                    <Sparkles className="w-5 h-5 text-amber-400 dark:text-amber-300 animate-[pulse_2s_ease-in-out_infinite]" />
                  )}
                </div>
              </div>
              <div className="relative w-16 h-16 drop-shadow-md">
                <svg className="w-16 h-16 transform -rotate-90">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="transparent"
                    className="text-gray-100 dark:text-gray-800"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="url(#progressGradient)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 28}
                    strokeDashoffset={
                      2 * Math.PI * 28 * (1 - stats.overallProgress / 100)
                    }
                    className="transition-all duration-1000 ease-out"
                  />
                  <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#4f46e5" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Cartes de statistiques supplémentaires */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            whileHover={{ y: -5, scale: 1.02 }}
            className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 dark:border-gray-700/50 flex items-center gap-4 relative overflow-hidden group"
          >
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-primary-100/50 dark:bg-primary-900/20 rounded-full blur-2xl group-hover:bg-primary-200/50 transition-colors"></div>
            <div className="p-3 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/40 dark:to-primary-800/40 rounded-2xl shadow-inner relative z-10">
              <BookOpen className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="relative z-10">
              <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold">
                Piliers accessibles
              </p>
              <p className="text-2xl font-black text-gray-800 dark:text-white mt-0.5">
                {stats.pillarsCount}
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ y: -5, scale: 1.02 }}
            className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 dark:border-gray-700/50 flex items-center gap-4 relative overflow-hidden group"
          >
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-100/50 dark:bg-blue-900/20 rounded-full blur-2xl group-hover:bg-blue-200/50 transition-colors"></div>
            <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-800/40 rounded-2xl shadow-inner relative z-10">
              <Hourglass className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="relative z-10">
              <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold">
                Temps d'étude
              </p>
              <p className="text-2xl font-black text-gray-800 dark:text-white mt-0.5">
                {formatTimeSpent(totalTimeSpent)}
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            whileHover={{ y: -5, scale: 1.02 }}
            className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 dark:border-gray-700/50 flex items-center gap-4 relative overflow-hidden group"
          >
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-accent-100/50 dark:bg-accent-900/20 rounded-full blur-2xl group-hover:bg-accent-200/50 transition-colors"></div>
            <div className="p-3 bg-gradient-to-br from-accent-50 to-accent-100 dark:from-accent-900/40 dark:to-accent-800/40 rounded-2xl shadow-inner relative z-10">
              <Zap className="w-6 h-6 text-accent-600 dark:text-accent-400" />
            </div>
            <div className="relative z-10">
              <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold">
                Quiz réussis
              </p>
              <p className="text-2xl font-black text-gray-800 dark:text-white mt-0.5">
                {stats.passedQuizzes} <span className="text-gray-400 text-lg">/ {stats.totalQuizzes}</span>
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ y: -5, scale: 1.02 }}
            className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 dark:border-gray-700/50 flex items-center gap-4 relative overflow-hidden group"
          >
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-100/50 dark:bg-emerald-900/20 rounded-full blur-2xl group-hover:bg-emerald-200/50 transition-colors"></div>
            <div className="p-3 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/40 dark:to-emerald-800/40 rounded-2xl shadow-inner relative z-10">
              <PlayCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="relative z-10">
              <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold">
                Vidéos terminées
              </p>
              <p className="text-2xl font-black text-gray-800 dark:text-white mt-0.5">
                {stats.completedVideos} <span className="text-gray-400 text-lg">/ {stats.totalVideos}</span>
              </p>
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
            className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-xl rounded-[2rem] p-8 sm:p-10 shadow-2xl border border-white/60 dark:border-gray-700/50 hover:shadow-primary-500/10 transition-shadow relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                <TrendingUp className="w-64 h-64 text-primary-500" />
            </div>
            <div className="flex items-center gap-3 mb-8 relative z-10">
              <div className="p-3 bg-gradient-to-br from-primary-500 to-primary-700 text-white rounded-xl shadow-lg">
                  <TrendingUp className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">
                Progression par module
              </h2>
            </div>
            <div
              className="h-52 sm:h-64 md:h-80 w-full relative z-10"
              style={{ minHeight: "240px" }}
            >
              <ProgressChart data={progressByPillar} />
              {progressByPillar.length === 1 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center translate-y-[-10px] bg-white/80 dark:bg-gray-900/80 px-6 py-4 rounded-3xl backdrop-blur-md shadow-lg border border-white/50 dark:border-gray-700">
                    <p className="text-4xl font-black bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                      {progressByPillar[0].value}%
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-widest mt-1">
                      Avancement
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Section Recommandations */}
        {recommendations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-xl rounded-[2rem] p-8 shadow-xl border border-white/60 dark:border-gray-700/50 cursor-default"
          >
            <h3 className="text-xl font-black text-gray-800 dark:text-white flex items-center gap-3 mb-6 tracking-tight">
              <div className="p-2.5 bg-gradient-to-br from-accent-500 to-amber-500 text-white rounded-xl shadow-md">
                 <PlayCircle className="w-5 h-5" />
              </div>
              Reprendre l'apprentissage
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {recommendations.map((rec) => (
                <motion.div
                  key={rec.videoId}
                  whileHover={{ scale: 1.03, y: -2 }}
                  className="flex items-center gap-4 p-5 bg-gradient-to-br from-white to-primary-50/50 dark:from-gray-800 dark:to-primary-900/20 rounded-2xl border border-white dark:border-gray-700 cursor-pointer shadow-[0_4px_15px_rgb(0,0,0,0.05)] hover:shadow-[0_10px_25px_rgb(99,102,241,0.15)] transition-all group"
                  onClick={() => navigate(`/student/video/${rec.videoId}`)}
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/60 dark:to-primary-800/60 rounded-2xl flex items-center justify-center text-primary-600 dark:text-primary-300 shadow-inner group-hover:rotate-12 transition-transform">
                    <PlayCircle className="w-7 h-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 dark:text-white truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      {escapeText(untrusted(rec.title))}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium uppercase mt-0.5 tracking-wider">
                      {rec.pillarName} • {formatDuration(rec.duration)}
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-primary-50 dark:bg-gray-700 flex items-center justify-center group-hover:bg-primary-600 group-hover:text-white transition-colors">
                      <ChevronRight className="w-4 h-4 text-primary-400 group-hover:text-white" />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Deux colonnes : vidéos récentes et quiz à venir */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Vidéos récentes */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-xl rounded-[2rem] p-7 shadow-xl border border-white/60 dark:border-gray-700/50"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-gray-800 dark:text-white flex items-center gap-3 tracking-tight">
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <Video className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </div>
                Vidéos récentes
              </h3>
              <button
                onClick={() => navigate("/student/learning")}
                className="text-sm text-primary-600 dark:text-primary-400 font-bold hover:text-primary-800 dark:hover:text-primary-300 flex items-center gap-1 group"
              >
                Tout voir <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {recentVideos.length === 0 ? (
              <div className="text-center py-12 bg-white/50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                <Video className="w-14 h-14 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 font-medium tracking-wide">
                  Aucune vidéo visionnée récemment.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentVideos.map((video) => (
                  <motion.div
                    key={video.id}
                    whileHover={{ scale: 1.02 }}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-white/60 dark:bg-gray-800/60 hover:bg-white/90 dark:hover:bg-gray-700/80 transition-all cursor-pointer border border-white/50 dark:border-gray-700 shadow-sm hover:shadow-md group"
                    onClick={() => navigate(`/student/video/${video.id}`)}
                  >
                    <div className="w-24 h-16 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/50 dark:to-primary-800/50 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center border border-primary-100/50 dark:border-primary-800/50">
                      {video.thumbnail_url ? (
                        <img
                          src={video.thumbnail_url}
                          alt={video.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          loading="lazy"
                        />
                      ) : (
                        <PlayCircle className="w-8 h-8 text-primary-400 dark:text-primary-500 group-hover:scale-110 transition-transform" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-800 dark:text-white truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                        {escapeText(untrusted(video.title))}
                      </h4>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold mt-1 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-400"></span> {video.pillar?.name} • {formatDuration(video.duration)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Quiz à venir */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-xl rounded-[2rem] p-7 shadow-xl border border-white/60 dark:border-gray-700/50"
          >
            <h3 className="text-xl font-black text-gray-800 dark:text-white flex items-center gap-3 mb-6 tracking-tight">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">
                  <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              Quiz en attente
            </h3>

            {upcomingQuizzes.length === 0 ? (
              <div className="text-center py-12 bg-white/50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Award className="w-10 h-10 text-emerald-300 dark:text-emerald-600" />
                </div>
                <p className="text-emerald-600 dark:text-emerald-400 font-bold tracking-wide">
                  Super ! Vous êtes à jour.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingQuizzes.map((quiz) => (
                  <motion.div
                    key={quiz.id}
                    whileHover={{ scale: 1.02 }}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/20 border border-emerald-100 dark:border-emerald-800/50 hover:shadow-lg transition-all cursor-pointer group"
                    onClick={() => navigate(`/student/quiz/${quiz.id}`)}
                  >
                    <div className="w-14 h-14 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center text-emerald-500 shadow-sm border border-emerald-50 dark:border-gray-700 group-hover:rotate-12 transition-transform">
                      <Award className="w-7 h-7" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-800 dark:text-white truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                        {escapeText(untrusted(quiz.video?.title || "Quiz"))}
                      </h4>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-bold mt-1 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Prêt à être passé
                      </p>
                    </div>
                    <button className="hidden sm:flex items-center justify-center px-5 py-2.5 bg-emerald-600 dark:bg-emerald-600 text-white rounded-xl text-sm font-black shadow-md hover:bg-emerald-700 dark:hover:bg-emerald-500 transition-colors shrink-0 hover:scale-105 active:scale-95">
                      Go !
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
          transition={{ delay: 0.9 }}
          className="text-center text-xs text-gray-400 dark:text-gray-500 flex flex-col items-center justify-center gap-1"
        >
          <div className="flex items-center gap-1">
            <Shield className="w-3 h-3" />
            <span>Votre progression est enregistrée et cryptée.</span>
          </div>
        </motion.div>
      </motion.div>
    </MainLayout>
  );
}
