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
            blue: 'bg-blue-50',
            purple: 'bg-purple-50',
            green: 'bg-green-50',
            red: 'bg-red-50',
            yellow: 'bg-yellow-50',
            indigo: 'bg-indigo-50',
            pink: 'bg-pink-50',
            orange: 'bg-orange-50'
        };
        return bgs[color] || bgs.blue;
    };

    // Gestion du clic sur la carte
    const handleCardClick = (e) => {
        // Ne pas naviguer si on clique sur un bouton
        if (e.target.closest('button')) {
            return;
        }
        navigate(`/admin/pillars/${pillar.id}`);
    };

    // Gestion du clic sur "Voir détails"
    const handleViewDetails = (e) => {
        e.stopPropagation();
        e.preventDefault();
        navigate(`/admin/pillars/${pillar.id}`);
    };

    // Gestion du clic sur "Modifier"
    const handleEditClick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        onEdit(pillar);
    };

    // Gestion du clic sur "Supprimer"
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
                rotateY: 5, 
                rotateX: -5, 
                scale: 1.05, 
                z: 20,
                boxShadow: "0 20px 40px rgba(0,0,0,0.1)"
            }}
            style={{ transformStyle: "preserve-3d" }}
            onClick={handleCardClick}
            className={`${getBgLight(pillar.color)} rounded-2xl p-6 shadow-lg border border-white/50 backdrop-blur-sm relative overflow-hidden group cursor-pointer`}
        >
            {/* Effet de shine */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />

            {/* Badge premium */}
            <div className="absolute top-4 right-4" style={{ transform: "translateZ(30px)" }}>
                <div className={`bg-gradient-to-r ${getColorGradient(pillar.color)} text-white px-2 py-1 rounded-full text-xs font-medium shadow-lg flex items-center gap-1`}>
                    <Sparkles className="w-3 h-3" />
                    {pillar.videoCount} vidéo{pillar.videoCount > 1 ? 's' : ''}
                </div>
            </div>

            {/* En-tête avec icône */}
            <div className="flex items-start gap-4 mb-4" style={{ transform: "translateZ(40px)" }}>
                <div className={`w-16 h-16 bg-gradient-to-br ${getColorGradient(pillar.color)} rounded-2xl flex items-center justify-center text-3xl shadow-lg group-hover:scale-110 transition-transform`}>
                    {pillar.icon || '📚'}
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-800 mb-1">
                        {escapeText(untrusted(pillar.safeName))}
                    </h3>
                    {pillar.description && (
                        <p className="text-sm text-gray-500 line-clamp-2">
                            {escapeText(untrusted(pillar.safeDescription))}
                        </p>
                    )}
                </div>
            </div>

            {/* Statistiques */}
            <div className="grid grid-cols-3 gap-2 mb-4" style={{ transform: "translateZ(20px)" }}>
                <div className="text-center p-2 bg-white/50 rounded-lg">
                    <Video className="w-4 h-4 mx-auto mb-1 text-indigo-600" />
                    <p className="text-xs text-gray-500">Vidéos</p>
                    <p className="text-lg font-bold text-gray-800">{pillar.videoCount}</p>
                </div>
                <div className="text-center p-2 bg-white/50 rounded-lg">
                    <Users className="w-4 h-4 mx-auto mb-1 text-purple-600" />
                    <p className="text-xs text-gray-500">Étudiants</p>
                    <p className="text-lg font-bold text-gray-800">{pillar.studentCount}</p>
                </div>
                <div className="text-center p-2 bg-white/50 rounded-lg">
                    <Calendar className="w-4 h-4 mx-auto mb-1 text-green-600" />
                    <p className="text-xs text-gray-500">Création</p>
                    <p className="text-sm font-bold text-gray-800">
                        {new Date(pillar.created_at).toLocaleDateString('fr-FR')}
                    </p>
                </div>
            </div>

            {/* Actions - SANS TROIS POINTS */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/50">
                {/* Bouton Voir détails */}
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleViewDetails}
                    className="p-2 hover:bg-blue-100 rounded-lg transition-colors text-blue-600"
                    title="Voir détails"
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
                            className="p-2 hover:bg-purple-100 rounded-lg transition-colors text-purple-600"
                            title="Modifier"
                        >
                            <Edit className="w-4 h-4" />
                        </motion.button>
                        
                        {/* Bouton Supprimer */}
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={handleDeleteClick}
                            className="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-600"
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