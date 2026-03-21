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
                    {/* En-tête */}
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                        <div className="flex items-start gap-2 sm:gap-4">
                            <button
                                onClick={() => navigate('/admin/pillars')}
                                className="mt-1 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
                                aria-label="Retour aux piliers"
                            >
                                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            </button>
                            <div className="min-w-0">
                                <h1 className="text-xl sm:text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                                    <BookOpen className="w-6 h-6 sm:w-7 sm:h-7 text-primary-600 dark:text-primary-400 shrink-0" />
                                    <span className="truncate">{pillar.safeName}</span>
                                </h1>
                                {pillar.safeDescription && (
                                    <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 sm:line-clamp-none">
                                        {pillar.safeDescription}
                                    </p>
                                )}
                                <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 whitespace-nowrap">
                                        <Video className="w-4 h-4" />
                                        {pillar.videoCount} vidéo{pillar.videoCount > 1 ? 's' : ''}
                                    </span>
                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                        Créé le{' '}
                                        {pillar.created_at
                                            ? new Date(pillar.created_at).toLocaleDateString('fr-FR')
                                            : '-'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="hidden sm:flex bg-gradient-to-r from-primary-600 to-accent-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg items-center gap-1 shrink-0">
                            <Sparkles className="w-3 h-3" />
                            Détails du pilier
                        </div>
                    </div>

                    {/* Statistiques */}
                    <PillarStats
                        pillarId={pillar.id}
                        pillarName={pillar.safeName}
                        videos={pillar.videos}
                    />

                    {/* Liste simple des vidéos associées */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6">
                        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                            <Video className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                            Vidéos du pilier
                        </h2>
                        {pillar.videos && pillar.videos.length > 0 ? (
                            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                                {pillar.videos.map((video) => (
                                    <li key={video.id} className="py-3 flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <Video className="w-4 h-4 text-primary-400 dark:text-primary-500 shrink-0" />
                                            <span className="text-sm text-gray-800 dark:text-gray-200 truncate">
                                                {escapeText(untrusted(video.title || 'Vidéo sans titre'))}
                                            </span>
                                            {video.quizzes?.length > 0 && (
                                                <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 flex items-center gap-1">
                                                    <Award className="w-3 h-3" />
                                                    Quiz
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                                            {video.duration ? Math.round(video.duration / 60) + ' min' : '—'}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Aucune vidéo n&apos;est encore associée à ce pilier.
                            </p>
                        )}
                    </div>
                </motion.div>
            )}
        </AdminLayout>
    );
}