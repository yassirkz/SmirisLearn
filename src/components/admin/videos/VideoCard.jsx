// src/components/admin/videos/VideoCard.jsx
import { motion } from 'framer-motion';
import {
    Play, Edit, Trash2, Eye,
    Clock, Film, Sparkles, Award
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { untrusted, escapeText } from '../../../utils/security';

export default function VideoCard({ video, index, onEdit, onDelete, isReadOnly, viewMode = 'cards' }) {
    const navigate = useNavigate();

    const getPillarColor = (color) => {
        const colors = {
            blue: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
            purple: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
            green: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
            red: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
            yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800',
            indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800',
            pink: 'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800',
            orange: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800'
        };
        return colors[color] || colors.blue;
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

    const handleCardClick = (e) => {
        if (e.target.closest('button')) return;
        navigate(`/admin/videos/${video.id}`);
    };

    const handleView = (e) => {
        e.stopPropagation();
        e.preventDefault();
        navigate(`/admin/videos/${video.id}`);
    };

    const handleEdit = (e) => {
        e.stopPropagation();
        e.preventDefault();
        onEdit(video);
    };

    const handleDelete = (e) => {
        e.stopPropagation();
        e.preventDefault();
        onDelete(video);
    };

    const pillarColor = getPillarColor(video.pillar?.color);

    if (viewMode === 'table') {
        return (
            <motion.tr
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={handleCardClick}
                className="hover:bg-white/60 dark:hover:bg-slate-700/40 transition-all duration-300 group cursor-pointer border-b border-transparent hover:border-gray-100 dark:hover:border-gray-700/50"
            >
                <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary-500/20 group-hover:scale-105 transition-transform">
                            <Film className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-bold text-gray-800 dark:text-gray-200 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                {escapeText(untrusted(video.title))}
                            </p>
                            {video.description && (
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                                    {escapeText(untrusted(video.description))}
                                </p>
                            )}
                        </div>
                    </div>
                </td>
                <td className="px-6 py-4">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider ${pillarColor} shadow-sm border border-black/5 dark:border-white/5`}>
                            {escapeText(untrusted(video.pillar?.name))}
                        </span>
                        {video.quizzes?.length > 0 && (
                            <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 flex items-center gap-1 shadow-sm">
                                <Award className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                {video.quizzes.length} {video.quizzes.length > 1 ? 'Quizz' : 'Quiz'}
                            </span>
                        )}
                    </div>
                </td>
                <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white/50 dark:bg-white/5 w-fit px-3 py-1.5 rounded-lg border border-gray-100 dark:border-gray-700/50">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>{formatDuration(video.duration)}</span>
                    </div>
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                    {formatDate(video.created_at)}
                </td>
                <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 sm:gap-2">
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={handleView}
                            className="p-2.5 bg-white/50 dark:bg-white/5 hover:bg-primary-100 dark:hover:bg-primary-900/50 border border-gray-200 dark:border-gray-700 hover:border-primary-200 dark:hover:border-primary-800/50 rounded-xl transition-all text-primary-600 dark:text-primary-400 sm:opacity-0 sm:group-hover:opacity-100 shadow-sm"
                            title="Voir les détails"
                        >
                            <Eye className="w-4 h-4" />
                        </motion.button>
                        
                        {!isReadOnly && (
                            <>
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={handleEdit}
                                    className="p-2.5 bg-white/50 dark:bg-white/5 hover:bg-accent-100 dark:hover:bg-accent-900/50 border border-gray-200 dark:border-gray-700 hover:border-accent-200 dark:hover:border-accent-800/50 rounded-xl transition-all text-accent-600 dark:text-accent-400 sm:opacity-0 sm:group-hover:opacity-100 shadow-sm"
                                    title="Modifier"
                                >
                                    <Edit className="w-4 h-4" />
                                </motion.button>
                                
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={handleDelete}
                                    className="p-2.5 bg-white/50 dark:bg-white/5 hover:bg-red-100 dark:hover:bg-red-900/50 border border-gray-200 dark:border-gray-700 hover:border-red-200 dark:hover:border-red-800/50 rounded-xl transition-all text-red-600 dark:text-red-400 sm:opacity-0 sm:group-hover:opacity-100 shadow-sm"
                                    title="Supprimer"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </motion.button>
                            </>
                        )}
                    </div>
                </td>
            </motion.tr>
        );
    }

    // Vue cartes
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -5, scale: 1.01 }}
            onClick={handleCardClick}
            className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl rounded-3xl p-6 shadow-lg hover:shadow-xl border border-white/50 dark:border-white/5 relative overflow-hidden group cursor-pointer transition-all duration-300"
        >
            {/* Effet de shine */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            {/* Badge durée */}
            <div className="absolute top-5 right-5 z-10">
                <div className="bg-black/70 dark:bg-gray-900/90 text-white px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 backdrop-blur-md shadow-lg">
                    <Clock className="w-3.5 h-3.5 text-gray-300" />
                    {formatDuration(video.duration)}
                </div>
            </div>

            {/* Miniature placeholder */}
            <div className="w-full h-40 bg-gradient-to-br from-primary-100 to-accent-100 dark:from-primary-900/40 dark:to-accent-900/40 rounded-2xl mb-5 flex items-center justify-center relative overflow-hidden group-hover:shadow-inner transition-all border border-white/40 dark:border-white/5">
                <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors" />
                <div className="w-14 h-14 bg-white/90 dark:bg-gray-800/90 rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300">
                    <Play className="w-6 h-6 text-primary-500 ml-1" />
                </div>
            </div>

            {/* Contenu */}
            <div className="space-y-4 relative z-10">
                <div>
                    <h3 className="text-lg font-extrabold text-gray-800 dark:text-white mb-1.5 line-clamp-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                        {escapeText(untrusted(video.title))}
                    </h3>
                    {video.description && (
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                            {escapeText(untrusted(video.description))}
                        </p>
                    )}
                </div>

                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider ${pillarColor} shadow-sm border border-black/5 dark:border-white/5`}>
                            {escapeText(untrusted(video.pillar?.name))}
                        </span>
                        {video.quizzes?.length > 0 && (
                            <span className="px-2.5 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 flex items-center gap-1.5 shadow-sm">
                                <Award className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                {video.quizzes.length} {video.quizzes.length > 1 ? 'Quizz' : 'Quiz'}
                            </span>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800/50 mt-2">
                    <span className="text-xs font-medium text-gray-400 dark:text-gray-500 bg-white/50 dark:bg-white/5 px-2 py-1 rounded-lg border border-gray-100 dark:border-gray-700/50 shadow-sm">
                        {formatDate(video.created_at)}
                    </span>
                    
                    <div className="flex items-center justify-end gap-2">
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={handleView}
                            className="p-2.5 bg-white/50 dark:bg-white/5 hover:bg-primary-100 dark:hover:bg-primary-900/50 border border-gray-200 dark:border-gray-700/50 hover:border-primary-200 dark:hover:border-primary-800/50 rounded-xl transition-all text-primary-600 dark:text-primary-400 shadow-sm"
                            title="Voir les détails"
                        >
                            <Eye className="w-4 h-4" />
                        </motion.button>
                        
                        {!isReadOnly && (
                            <>
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={handleEdit}
                                    className="p-2.5 bg-white/50 dark:bg-white/5 hover:bg-accent-100 dark:hover:bg-accent-900/50 border border-gray-200 dark:border-gray-700/50 hover:border-accent-200 dark:hover:border-accent-800/50 rounded-xl transition-all text-accent-600 dark:text-accent-400 shadow-sm"
                                    title="Modifier"
                                >
                                    <Edit className="w-4 h-4" />
                                </motion.button>
                                
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={handleDelete}
                                    className="p-2.5 bg-white/50 dark:bg-white/5 hover:bg-red-100 dark:hover:bg-red-900/50 border border-gray-200 dark:border-gray-700/50 hover:border-red-200 dark:hover:border-red-800/50 rounded-xl transition-all text-red-600 dark:text-red-400 shadow-sm"
                                    title="Supprimer"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </motion.button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}