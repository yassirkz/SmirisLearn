import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, Sparkles, Video, Award } from 'lucide-react';
import AdminLayout from '../../components/layout/AdminLayout';
import { supabase } from '../../lib/supabase';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import PillarStats from '../../components/admin/pillars/PillarStats';
import { untrusted, escapeText } from '../../utils/security';

export default function PillarDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [pillar, setPillar] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPillar = async () => {
            try {
                setLoading(true);
                setError(null);

                const { data, error } = await supabase
                    .from('pillars')
                    .select(`
                        *,
                        videos: videos (
                            id,
                            title,
                            duration,
                            quizzes (id)
                        )
                    `)
                    .eq('id', id)
                    .maybeSingle();

                if (error) throw error;
                if (!data) {
                    setError('Pilier introuvable');
                    return;
                }

                setPillar({
                    ...data,
                    safeName: escapeText(untrusted(data.name)),
                    safeDescription: escapeText(untrusted(data.description || '')),
                    videoCount: data.videos?.length || 0,
                });
            } catch (err) {
                console.error('Erreur chargement pilier:', err);
                setError(err.message || 'Impossible de charger ce pilier');
            } finally {
                setLoading(false);
            }
        };

        fetchPillar();
    }, [id]);

    return (
        <AdminLayout>
            {loading && (
                <div className="min-h-[200px] flex items-center justify-center">
                    <LoadingSpinner size="lg" color="primary" />
                </div>
            )}

            {!loading && error && (
                <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 rounded-lg">
                    <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                    <button
                        onClick={() => navigate('/admin/pillars')}
                        className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 underline"
                    >
                        Revenir à la liste des piliers
                    </button>
                </div>
            )}

            {!loading && pillar && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                >
                    {/* En-tête Premium */}
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-6 relative">
                        <div className="flex items-start gap-4 z-10">
                            <motion.button
                                whileHover={{ scale: 1.05, x: -5 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => navigate('/admin/pillars')}
                                className="mt-1 p-2.5 bg-white/60 dark:bg-slate-800/60 shadow-lg backdrop-blur-xl rounded-xl hover:bg-white/80 dark:hover:bg-slate-700/80 transition-all border border-white/50 dark:border-white/5 shrink-0"
                                aria-label="Retour aux piliers"
                            >
                                <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                            </motion.button>
                            <div className="min-w-0">
                                <h1 className="text-2xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 flex items-center gap-3 tracking-tight">
                                    <div className="p-2 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl shadow-lg shadow-primary-500/30 text-white shrink-0">
                                        <BookOpen className="w-6 h-6 sm:w-8 sm:h-8" />
                                    </div>
                                    <span className="truncate py-1">{pillar.safeName}</span>
                                </h1>
                                {pillar.safeDescription && (
                                    <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-3 font-medium leading-relaxed max-w-3xl">
                                        {pillar.safeDescription}
                                    </p>
                                )}
                                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs sm:text-sm font-semibold">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 shadow-sm border border-primary-200 dark:border-primary-800/50">
                                        <Video className="w-4 h-4" />
                                        {pillar.videoCount} vidéo{pillar.videoCount > 1 ? 's' : ''}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 shadow-sm border border-slate-200 dark:border-slate-700">
                                        Créé le{' '}
                                        {pillar.created_at
                                            ? new Date(pillar.created_at).toLocaleDateString('fr-FR')
                                            : '-'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="hidden sm:flex bg-gradient-to-r from-primary-600 to-accent-600 text-white px-4 py-2 rounded-2xl text-xs font-bold shadow-lg items-center gap-2 shrink-0 border border-white/20 backdrop-blur-md">
                            <Sparkles className="w-4 h-4" />
                            Détails du pilier
                        </div>

                        {/* Glow d'arrière-plan */}
                        <div className="absolute top-0 right-1/4 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
                    </div>

                    {/* Statistiques */}
                    <PillarStats
                        pillarId={pillar.id}
                        pillarName={pillar.safeName}
                        videos={pillar.videos}
                    />

                    {/* Liste premium des vidéos associées */}
                    <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl rounded-3xl shadow-lg border border-white/50 dark:border-white/5 p-6 sm:p-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-primary-500/5 rounded-full blur-3xl pointer-events-none" />
                        
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-3 relative z-10">
                            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg text-primary-600 dark:text-primary-400">
                                <Video className="w-5 h-5" />
                            </div>
                            Vidéos du pilier
                        </h2>
                        
                        {pillar.videos && pillar.videos.length > 0 ? (
                            <ul className="divide-y divide-white/50 dark:divide-white/5 relative z-10 bg-white/40 dark:bg-white/5 rounded-2xl border border-white/50 dark:border-white/5 overflow-hidden shadow-sm">
                                {pillar.videos.map((video) => (
                                    <li key={video.id} className="p-4 sm:px-6 hover:bg-white/60 dark:hover:bg-white/10 transition-colors flex items-center justify-between gap-4 group">
                                        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                            <div className="p-2.5 bg-primary-50 dark:bg-primary-900/20 text-primary-500 rounded-xl group-hover:scale-110 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/40 transition-all">
                                                <Video className="w-4 h-4 shrink-0" />
                                            </div>
                                            <span className="text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-200 truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                                {escapeText(untrusted(video.title || 'Vidéo sans titre'))}
                                            </span>
                                            {video.quizzes?.length > 0 && (
                                                <span className="shrink-0 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 flex items-center gap-1.5 border border-amber-200 dark:border-amber-800/50">
                                                    <Award className="w-3 h-3" />
                                                    Quiz
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 shrink-0 bg-white/50 dark:bg-white/10 px-3 py-1.5 rounded-lg border border-white/50 dark:border-white/5 shadow-sm">
                                            {video.duration ? Math.round(video.duration / 60) + ' min' : '—'}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="text-center py-10 px-4 relative z-10 bg-white/40 dark:bg-white/5 rounded-2xl border border-white/50 dark:border-white/5 border-dashed shadow-sm">
                                <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Video className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                                </div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                    Aucune vidéo n&apos;est encore associée à ce pilier.
                                </p>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AdminLayout>
    );
}