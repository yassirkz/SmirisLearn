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
            className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/50 dark:border-white/5 overflow-hidden"
        >
            <div className="overflow-x-auto">
                <table className="w-full min-w-[640px]">
                    <thead className="bg-gray-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-gray-700/50 backdrop-blur-sm">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest min-w-[200px]">
                                Pilier
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                                Vidéos
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                                Étudiants
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                                Création
                            </th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100/80 dark:divide-gray-800/80">
                        {currentPillars.map((pillar, index) => {
                            const colorStyle = getColorStyle(pillar.color);
                            
                            return (
                                <motion.tr
                                    key={pillar.id || `pillar-${index}`}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    onClick={() => handleRowClick(pillar.id)}
                                    className="transition-colors group cursor-pointer hover:bg-white/60 dark:hover:bg-slate-800/40"
                                >
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 ${colorStyle} rounded-2xl flex items-center justify-center shadow-lg transform sm:group-hover:scale-110 sm:group-hover:rotate-3 transition-all duration-300`}>
                                                <span className="text-xl">{pillar.icon || '📚'}</span>
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-bold text-gray-800 dark:text-white flex items-center gap-2 text-base">
                                                    <span className="truncate">{escapeText(untrusted(pillar.safeName))}</span>
                                                </div>
                                                {pillar.description && (
                                                    <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5 truncate max-w-[200px] sm:max-w-xs">
                                                        {escapeText(untrusted(pillar.safeDescription))}
                                                    </div>
                                                )}
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
                                                className="p-2 hover:bg-primary-100 dark:hover:bg-primary-900/50 rounded-lg transition-colors text-primary-600 dark:text-primary-400 sm:opacity-0 sm:group-hover:opacity-100"
                                                title="Voir les détails"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </motion.button>
                                            
                                            {!isReadOnly && (
                                                <>
                                                    <motion.button
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={(e) => handleEditClick(e, pillar)}
                                                        className="p-2 hover:bg-accent-100 dark:hover:bg-accent-900/50 rounded-lg transition-colors text-accent-600 dark:text-accent-400 sm:opacity-0 sm:group-hover:opacity-100"
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