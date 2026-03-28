// src/components/admin/pillars/PillarCard.jsx
import { motion } from 'framer-motion';
import {
    Edit, Trash2, Eye,
    Video, Users, Calendar, Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { untrusted, escapeText } from '../../../utils/security';

export default function PillarCard({ pillar, index, onEdit, onDelete, isReadOnly }) {
    const navigate = useNavigate();

    const getColorGradient = (color) => {
        const gradients = {
            blue: 'from-blue-500 to-indigo-600',
            purple: 'from-purple-500 to-pink-600',
            green: 'from-green-500 to-emerald-600',
            red: 'from-red-500 to-pink-600',
            yellow: 'from-yellow-500 to-orange-600',
            indigo: 'from-indigo-500 to-purple-600',
            pink: 'from-pink-500 to-rose-600',
            orange: 'from-orange-500 to-red-600'
        };
        return gradients[color] || gradients.blue;
    };

    const getBgLight = (color) => {
        const bgs = {
            blue: 'bg-blue-50 dark:bg-blue-900/30',
            purple: 'bg-purple-50 dark:bg-purple-900/30',
            green: 'bg-green-50 dark:bg-green-900/30',
            red: 'bg-red-50 dark:bg-red-900/30',
            yellow: 'bg-yellow-50 dark:bg-yellow-900/30',
            indigo: 'bg-indigo-50 dark:bg-indigo-900/30',
            pink: 'bg-pink-50 dark:bg-pink-900/30',
            orange: 'bg-orange-50 dark:bg-orange-900/30'
        };
        return bgs[color] || bgs.blue;
    };

    const handleCardClick = (e) => {
        if (e.target.closest('button')) return;
        navigate(`/admin/pillars/${pillar.id}`);
    };

    const handleViewDetails = (e) => {
        e.stopPropagation();
        e.preventDefault();
        navigate(`/admin/pillars/${pillar.id}`);
    };

    const handleEditClick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        onEdit(pillar);
    };

    const handleDeleteClick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        onDelete(pillar);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ 
                rotateY: window.innerWidth > 768 ? 5 : 0, 
                rotateX: window.innerWidth > 768 ? -5 : 0, 
                scale: 1.05, 
                z: 20,
                boxShadow: "0 20px 40px rgba(0,0,0,0.15)"
            }}
            style={{ transformStyle: "preserve-3d" }}
            onClick={handleCardClick}
            className={`${getBgLight(pillar.color)} rounded-3xl p-4 sm:p-6 shadow-xl border border-white/50 dark:border-white/5 backdrop-blur-xl relative overflow-hidden group cursor-pointer`}
        >
            {/* Effet de shine et de fond premium */}
            <div className={`absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br ${getColorGradient(pillar.color)} rounded-full opacity-0 dark:opacity-20 blur-3xl group-hover:opacity-10 dark:group-hover:opacity-30 transition-opacity duration-700 pointer-events-none`} />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 dark:via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />

            {/* Badge premium */}
            <div className="absolute top-4 right-4" style={{ transform: "translateZ(30px)" }}>
                <div className={`bg-gradient-to-r ${getColorGradient(pillar.color)} text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5 shadow-${pillar.color}-500/30`}>
                    <Sparkles className="w-3.5 h-3.5" />
                    {pillar.videoCount} Vidéo{pillar.videoCount !== 1 ? 's' : ''}
                </div>
            </div>

            {/* En-tête avec icône */}
            <div className="flex items-start gap-4 mb-6" style={{ transform: "translateZ(40px)" }}>
                <div className={`w-14 h-14 sm:w-16 sm:h-16 shrink-0 bg-gradient-to-br ${getColorGradient(pillar.color)} rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-${pillar.color}-500/30 sm:group-hover:scale-110 sm:group-hover:rotate-6 transition-all duration-500`}>
                    {pillar.icon || '📚'}
                </div>
                <div className="flex-1 min-w-0 pt-1">
                    <h3 className="text-lg sm:text-xl font-extrabold text-gray-800 dark:text-white mb-1.5 truncate tracking-tight">
                        {escapeText(untrusted(pillar.safeName))}
                    </h3>
                    {pillar.description && (
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium line-clamp-2 leading-relaxed">
                            {escapeText(untrusted(pillar.safeDescription))}
                        </p>
                    )}
                </div>
            </div>

            {/* Statistiques */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5" style={{ transform: "translateZ(20px)" }}>
                <div className="flex sm:flex-col items-center justify-between sm:justify-center p-3 sm:py-4 bg-white/60 dark:bg-slate-800/60 rounded-xl border border-white/50 dark:border-gray-700 shadow-sm transition-colors group-hover:bg-white dark:group-hover:bg-slate-800">
                    <div className="flex items-center gap-2 sm:block sm:text-center">
                        <Video className="w-4 h-4 sm:mx-auto mb-0 sm:mb-1.5 text-primary-500 sm:group-hover:scale-110 transition-transform" />
                        <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Vidéos</p>
                    </div>
                    <p className="text-sm sm:text-xl font-black text-gray-800 dark:text-white">{pillar.videoCount}</p>
                </div>
                <div className="flex sm:flex-col items-center justify-between sm:justify-center p-3 sm:py-4 bg-white/60 dark:bg-slate-800/60 rounded-xl border border-white/50 dark:border-gray-700 shadow-sm transition-colors group-hover:bg-white dark:group-hover:bg-slate-800">
                    <div className="flex items-center gap-2 sm:block sm:text-center">
                        <Users className="w-4 h-4 sm:mx-auto mb-0 sm:mb-1.5 text-accent-500 sm:group-hover:scale-110 transition-transform" />
                        <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Apprenants</p>
                    </div>
                    <p className="text-sm sm:text-xl font-black text-gray-800 dark:text-white">{pillar.studentCount}</p>
                </div>
                <div className="flex sm:flex-col items-center justify-between sm:justify-center p-3 sm:py-4 bg-white/60 dark:bg-slate-800/60 rounded-xl border border-white/50 dark:border-gray-700 shadow-sm transition-colors group-hover:bg-white dark:group-hover:bg-slate-800">
                    <div className="flex items-center gap-2 sm:block sm:text-center">
                        <Calendar className="w-4 h-4 sm:mx-auto mb-0 sm:mb-1.5 text-emerald-500 sm:group-hover:scale-110 transition-transform" />
                        <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Création</p>
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-gray-800 dark:text-white">
                        {new Date(pillar.created_at).toLocaleDateString('fr-FR')}
                    </p>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/50 dark:border-gray-700">
                {/* Bouton Voir détails */}
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleViewDetails}
                    className="p-2 hover:bg-primary-100 dark:hover:bg-primary-900/50 rounded-lg transition-colors text-primary-600 dark:text-primary-400"
                    title="Voir les détails"
                >
                    <Eye className="w-4 h-4" />
                </motion.button>
                
                {!isReadOnly && (
                    <>
                        {/* Bouton Modifier */}
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={handleEditClick}
                            className="p-2 hover:bg-accent-100 dark:hover:bg-accent-900/50 rounded-lg transition-colors text-accent-600 dark:text-accent-400"
                            title="Modifier"
                        >
                            <Edit className="w-4 h-4" />
                        </motion.button>
                        
                        {/* Bouton Supprimer */}
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={handleDeleteClick}
                            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg transition-colors text-red-600 dark:text-red-400"
                            title="Supprimer"
                        >
                            <Trash2 className="w-4 h-4" />
                        </motion.button>
                    </>
                )}
            </div>
        </motion.div>
    );
}