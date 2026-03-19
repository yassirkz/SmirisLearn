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
                className="hover:bg-indigo-50/50 dark:hover:bg-gray-700/50 transition-colors group cursor-pointer"
            >
                <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white">
                            <Film className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-medium text-gray-800 dark:text-gray-200">
                                {escapeText(untrusted(video.title))}
                            </p>
                            {video.description && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                                    {escapeText(untrusted(video.description))}
                                </p>
                            )}
                        </div>
                    </div>
                </td>
                <td className="px-6 py-4">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${pillarColor}`}>
                            {escapeText(untrusted(video.pillar?.name))}
                        </span>
                        {video.quizzes?.length > 0 && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1 shadow-sm">
                                <Award className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                Quiz rattaché
                            </span>
                        )}
                    </div>
                </td>
                <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                        <Clock className="w-4 h-4" />
                        <span>{formatDuration(video.duration)}</span>
                    </div>
                </td>
                <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                    {formatDate(video.created_at)}
                </td>
                <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 sm:gap-2">
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={handleView}
                            className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors text-blue-600 dark:text-blue-400 sm:opacity-0 sm:group-hover:opacity-100"
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
                                    className="p-2 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded-lg transition-colors text-purple-600 dark:text-purple-400 sm:opacity-0 sm:group-hover:opacity-100"
                                    title="Modifier"
                                >
                                    <Edit className="w-4 h-4" />
                                </motion.button>
                                
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={handleDelete}
                                    className="p-2 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg transition-colors text-red-600 dark:text-red-400 sm:opacity-0 sm:group-hover:opacity-100"
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
            whileHover={{ y: -5 }}
            onClick={handleCardClick}
            className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-5 shadow-lg border border-indigo-100 dark:border-gray-700 relative overflow-hidden group cursor-pointer"
        >
            {/* Effet de shine */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-gray-700/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />

            {/* Badge durée */}
            <div className="absolute top-4 right-4">
                <div className="bg-black/60 dark:bg-gray-900/80 text-white px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 backdrop-blur-sm">
                    <Clock className="w-3 h-3" />
                    {formatDuration(video.duration)}
                </div>
            </div>

            {/* Miniature placeholder */}
            <div className="w-full h-32 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-xl mb-4 flex items-center justify-center">
                <Play className="w-8 h-8 text-indigo-400 dark:text-indigo-400" />
            </div>

            {/* Contenu */}
            <div className="space-y-3">
                <div>
                    <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-1 line-clamp-1">
                        {escapeText(untrusted(video.title))}
                    </h3>
                    {video.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                            {escapeText(untrusted(video.description))}
                        </p>
                    )}
                </div>

                <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${pillarColor}`}>
                            {escapeText(untrusted(video.pillar?.name))}
                        </span>
                        {video.quizzes?.length > 0 && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1 shadow-sm">
                                <Award className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                Quiz rattaché
                            </span>
                        )}
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                        {formatDate(video.created_at)}
                    </span>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={handleView}
                        className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors text-blue-600 dark:text-blue-400"
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
                                className="p-2 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded-lg transition-colors text-purple-600 dark:text-purple-400"
                                title="Modifier"
                            >
                                <Edit className="w-4 h-4" />
                            </motion.button>
                            
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={handleDelete}
                                className="p-2 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg transition-colors text-red-600 dark:text-red-400"
                                title="Supprimer"
                            >
                                <Trash2 className="w-4 h-4" />
                            </motion.button>
                        </>
                    )}
                </div>
            </div>
        </motion.div>
    );
}