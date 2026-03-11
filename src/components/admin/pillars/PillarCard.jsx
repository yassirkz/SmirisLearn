// src/components/admin/pillars/PillarCard.jsx
import { motion } from 'framer-motion';
import {
    MoreVertical, Edit, Trash2, Eye,
    Video, Users, Calendar, Sparkles
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom'; // AJOUTER
import { useNavigate } from 'react-router-dom';
import { untrusted, escapeText } from '../../../utils/security';

export default function PillarCard({ pillar, index, onEdit, onDelete, isReadOnly }) {
    const [showActions, setShowActions] = useState(false);
    const buttonRef = useRef(null);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const navigate = useNavigate();

    // Fermer le menu si on clique ailleurs
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (buttonRef.current && !buttonRef.current.contains(event.target)) {
                setShowActions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Calculer la position du menu
    useEffect(() => {
        if (showActions && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setMenuPosition({
                top: rect.bottom + window.scrollY + 8,
                left: rect.right - 192, // 192px = largeur du menu
            });
        }
    }, [showActions]);

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

    const handleCardClick = (e) => {
        if (e.target.closest('button')) {
            return;
        }
        navigate(`/admin/pillars/${pillar.id}`);
    };

    const handleViewDetails = (e) => {
        e.stopPropagation();
        navigate(`/admin/pillars/${pillar.id}`);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -5 }}
            onClick={handleCardClick}
            className={`${getBgLight(pillar.color)} rounded-2xl p-6 shadow-lg border border-white/50 backdrop-blur-sm relative overflow-hidden group cursor-pointer`}
        >
            {/* Effet de shine */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />

            {/* Badge premium */}
            <div className="absolute top-4 right-4">
                <div className={`bg-gradient-to-r ${getColorGradient(pillar.color)} text-white px-2 py-1 rounded-full text-xs font-medium shadow-lg flex items-center gap-1`}>
                    <Sparkles className="w-3 h-3" />
                    {pillar.videoCount} vidéo{pillar.videoCount > 1 ? 's' : ''}
                </div>
            </div>

            {/* En-tête avec icône */}
            <div className="flex items-start gap-4 mb-4">
                <div className={`w-16 h-16 bg-gradient-to-br ${getColorGradient(pillar.color)} rounded-2xl flex items-center justify-center text-3xl shadow-lg group-hover:scale-110 transition-transform`}>
                    {pillar.icon || '📚'}
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-800 mb-1">
                        {pillar.safeName}
                    </h3>
                    {pillar.description && (
                        <p className="text-sm text-gray-500 line-clamp-2">
                            {pillar.safeDescription}
                        </p>
                    )}
                </div>
            </div>

            {/* Statistiques */}
            <div className="grid grid-cols-3 gap-2 mb-4">
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

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/50">
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
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit(pillar);
                            }}
                            className="p-2 hover:bg-purple-100 rounded-lg transition-colors text-purple-600"
                            title="Modifier"
                        >
                            <Edit className="w-4 h-4" />
                        </motion.button>
                        
                        {/* Bouton trois points avec menu en portal */}
                        <div>
                            <motion.button
                                ref={buttonRef}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowActions(!showActions);
                                }}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <MoreVertical className="w-4 h-4 text-gray-500" />
                            </motion.button>
                            
                            {showActions && createPortal(
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                    style={{
                                        position: 'absolute',
                                        top: menuPosition.top,
                                        left: menuPosition.left,
                                        zIndex: 999999,
                                    }}
                                    className="w-48 bg-white rounded-xl shadow-2xl border border-gray-100 py-1"
                                >
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEdit(pillar);
                                            setShowActions(false);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 flex items-center gap-2"
                                    >
                                        <Edit className="w-4 h-4" />
                                        Modifier
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete(pillar);
                                            setShowActions(false);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Supprimer
                                    </button>
                                </motion.div>,
                                document.body
                            )}
                        </div>
                    </>
                )}
            </div>
        </motion.div>
    );
}