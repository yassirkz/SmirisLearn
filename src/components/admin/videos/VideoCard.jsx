// src/components/admin/videos/VideoCard.jsx
import { motion } from 'framer-motion';
import {
    Play, Edit, Trash2, Eye,
    Clock, Film, Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { untrusted, escapeText } from '../../../utils/security';

export default function VideoCard({ video, index, onEdit, onDelete, isReadOnly, viewMode = 'cards' }) {
    const navigate = useNavigate();

    const getPillarColor = (color) => {
        const colors = {
            blue: 'bg-blue-100 text-blue-700 border-blue-200',
            purple: 'bg-purple-100 text-purple-700 border-purple-200',
            green: 'bg-green-100 text-green-700 border-green-200',
            red: 'bg-red-100 text-red-700 border-red-200',
            yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
            indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
            pink: 'bg-pink-100 text-pink-700 border-pink-200',
            orange: 'bg-orange-100 text-orange-700 border-orange-200'
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
                className="hover:bg-indigo-50/50 transition-colors group cursor-pointer"
            >
                <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white">
                            <Film className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-medium text-gray-800">
                                {escapeText(untrusted(video.title))}
                            </p>
                            {video.description && (
                                <p className="text-xs text-gray-500 line-clamp-1">
                                    {escapeText(untrusted(video.description))}
                                </p>
                            )}
                        </div>
                    </div>
                </td>
                <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${pillarColor}`}>
                        {escapeText(untrusted(video.pillar?.name))}
                    </span>
                </td>
                <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>{formatDuration(video.duration)}</span>
                    </div>
                </td>
                <td className="px-6 py-4 text-gray-600">
                    {formatDate(video.created_at)}
                </td>
                <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={handleView}
                            className="p-2 hover:bg-blue-100 rounded-lg transition-colors text-blue-600 opacity-0 group-hover:opacity-100"
                            title="Voir détails"
                        >
                            <Eye className="w-4 h-4" />
                        </motion.button>
                        
                        {!isReadOnly && (
                            <>
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={handleEdit}
                                    className="p-2 hover:bg-purple-100 rounded-lg transition-colors text-purple-600 opacity-0 group-hover:opacity-100"
                                    title="Modifier"
                                >
                                    <Edit className="w-4 h-4" />
                                </motion.button>
                                
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={handleDelete}
                                    className="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-600 opacity-0 group-hover:opacity-100"
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
            className="bg-white/90 backdrop-blur-sm rounded-2xl p-5 shadow-lg border border-indigo-100 relative overflow-hidden group cursor-pointer"
        >
            {/* Effet de shine */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />

            {/* Badge durée */}
            <div className="absolute top-4 right-4">
                <div className="bg-black/60 text-white px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 backdrop-blur-sm">
                    <Clock className="w-3 h-3" />
                    {formatDuration(video.duration)}
                </div>
            </div>

            {/* Miniature placeholder */}
            <div className="w-full h-32 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl mb-4 flex items-center justify-center">
                <Play className="w-8 h-8 text-indigo-400" />
            </div>

            {/* Contenu */}
            <div className="space-y-3">
                <div>
                    <h3 className="font-bold text-gray-800 mb-1 line-clamp-1">
                        {escapeText(untrusted(video.title))}
                    </h3>
                    {video.description && (
                        <p className="text-xs text-gray-500 line-clamp-2">
                            {escapeText(untrusted(video.description))}
                        </p>
                    )}
                </div>

                <div className="flex items-center justify-between">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${pillarColor}`}>
                        {escapeText(untrusted(video.pillar?.name))}
                    </span>
                    <span className="text-xs text-gray-400">
                        {formatDate(video.created_at)}
                    </span>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={handleView}
                        className="p-2 hover:bg-blue-100 rounded-lg transition-colors text-blue-600"
                        title="Voir détails"
                    >
                        <Eye className="w-4 h-4" />
                    </motion.button>
                    
                    {!isReadOnly && (
                        <>
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={handleEdit}
                                className="p-2 hover:bg-purple-100 rounded-lg transition-colors text-purple-600"
                                title="Modifier"
                            >
                                <Edit className="w-4 h-4" />
                            </motion.button>
                            
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={handleDelete}
                                className="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-600"
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