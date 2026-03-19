// src/components/admin/pillars/PillarTable.jsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Edit, Trash2, Eye,
    Video, Users, Calendar, ChevronLeft, ChevronRight,
    Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { untrusted, escapeText } from '../../../utils/security';

export default function PillarTable({ pillars, onEdit, onDelete, isReadOnly }) {
    const [page, setPage] = useState(1);
    const itemsPerPage = 8;
    const navigate = useNavigate();

    const totalPages = Math.ceil(pillars.length / itemsPerPage);
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentPillars = pillars.slice(startIndex, endIndex);

    const getColorStyle = (color) => {
        const colors = {
            blue: 'bg-blue-100 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
            purple: 'bg-purple-100 text-purple-600 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
            green: 'bg-green-100 text-green-600 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
            red: 'bg-red-100 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
            yellow: 'bg-yellow-100 text-yellow-600 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800',
            indigo: 'bg-indigo-100 text-indigo-600 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800',
            pink: 'bg-pink-100 text-pink-600 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800',
            orange: 'bg-orange-100 text-orange-600 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800'
        };
        return colors[color] || colors.blue;
    };

    const handleRowClick = (pillarId) => {
        navigate(`/admin/pillars/${pillarId}`);
    };

    const handleViewDetails = (e, pillarId) => {
        e.stopPropagation();
        e.preventDefault();
        navigate(`/admin/pillars/${pillarId}`);
    };

    const handleEditClick = (e, pillar) => {
        e.stopPropagation();
        e.preventDefault();
        onEdit(pillar);
    };

    const handleDeleteClick = (e, pillar) => {
        e.stopPropagation();
        e.preventDefault();
        onDelete(pillar);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl border border-indigo-100 dark:border-gray-700 overflow-hidden"
            style={{ perspective: "1200px" }}
        >
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-800">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                Pilier
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                Vidéos
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                Étudiants
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                Création
                            </th>
                            <th className="px-6 py-4 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {currentPillars.map((pillar, index) => {
                            const colorStyle = getColorStyle(pillar.color);
                            
                            return (
                                <motion.tr
                                    key={pillar.id || `pillar-${index}`}
                                    initial={{ opacity: 0, y: 10, rotateX: -2 }}
                                    animate={{ opacity: 1, y: 0, rotateX: 0 }}
                                    transition={{ 
                                        delay: index * 0.05,
                                        type: "spring",
                                        stiffness: 100
                                    }}
                                    whileHover={{ 
                                        rotateY: 1, 
                                        rotateX: -1, 
                                        scale: 1.005,
                                        z: 10,
                                        boxShadow: "0 10px 30px -10px rgba(79, 70, 229, 0.2)"
                                    }}
                                    style={{ transformStyle: "preserve-3d" }}
                                    onClick={() => handleRowClick(pillar.id)}
                                    className="transition-colors group cursor-pointer hover:bg-indigo-50/80 dark:hover:bg-gray-700/80"
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3 min-w-[200px]">
                                            <div className={`w-10 h-10 ${colorStyle} rounded-xl flex items-center justify-center shadow-sm sm:group-hover:scale-110 transition-transform`}>
                                                <span className="text-lg">{pillar.icon || '📚'}</span>
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-medium text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                                    <span className="truncate">{escapeText(untrusted(pillar.safeName))}</span>
                                                    {pillar.description && (
                                                        <span className="text-xs text-gray-400 dark:text-gray-500 font-normal hidden sm:inline truncate">
                                                            {escapeText(untrusted(pillar.safeDescription.substring(0, 30)))}...
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 min-w-[80px]">
                                            <Video className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                            <span className="text-sm text-gray-600 dark:text-gray-300">{pillar.videoCount}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 min-w-[100px]">
                                            <Users className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                            <span className="text-sm text-gray-600 dark:text-gray-300">{pillar.studentCount}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 min-w-[120px]">
                                            <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                            <span className="text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                                {new Date(pillar.created_at).toLocaleDateString('fr-FR')}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1 sm:gap-2">
                                            {/* Bouton Voir détails */}
                                            <motion.button
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={(e) => handleViewDetails(e, pillar.id)}
                                                className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors text-blue-600 dark:text-blue-400 sm:opacity-0 sm:group-hover:opacity-100"
                                                title="Voir détails"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </motion.button>
                                            
                                            {!isReadOnly && (
                                                <>
                                                    <motion.button
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={(e) => handleEditClick(e, pillar)}
                                                        className="p-2 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded-lg transition-colors text-purple-600 dark:text-purple-400 sm:opacity-0 sm:group-hover:opacity-100"
                                                        title="Modifier"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </motion.button>
                                                    
                                                    <motion.button
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={(e) => handleDeleteClick(e, pillar)}
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
                        })}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Page {page} sur {totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
                        >
                            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </button>
                    </div>
                </div>
            )}
        </motion.div>
    );
}