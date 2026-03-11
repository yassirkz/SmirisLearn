// src/components/admin/pillars/PillarTable.jsx
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MoreVertical, Edit, Trash2, Eye,
    Video, Users, Calendar, ChevronLeft, ChevronRight,
    Sparkles
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { untrusted, escapeText } from '../../../utils/security';

export default function PillarTable({ pillars, onEdit, onDelete, isReadOnly }) {
    const [page, setPage] = useState(1);
    const [showActions, setShowActions] = useState(null); // ID du pilier dont le menu est ouvert
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const [selectedPillar, setSelectedPillar] = useState(null);
    const buttonRef = useRef(null);
    const menuRef = useRef(null); // Réf pour détecter les clics dans le menu
    const itemsPerPage = 8;
    const navigate = useNavigate();

    const totalPages = Math.ceil(pillars.length / itemsPerPage);
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentPillars = pillars.slice(startIndex, endIndex);

    // Fermer le menu si on clique ailleurs
    useEffect(() => {
        const handleClickOutside = (event) => {
            // Si le menu est ouvert
            if (showActions) {
                // Vérifier si le clic est sur le bouton qui a ouvert le menu
                if (buttonRef.current && buttonRef.current.contains(event.target)) {
                    // Clic sur le bouton - on laisse le toggle gérer
                    return;
                }
                
                // Vérifier si le clic est à l'intérieur du menu
                if (menuRef.current && menuRef.current.contains(event.target)) {
                    // Clic dans le menu - ne pas fermer
                    return;
                }

                // Sinon, fermer le menu
                setShowActions(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showActions]);

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

    const getColorStyle = (color) => {
        const colors = {
            blue: 'bg-blue-100 text-blue-600 border-blue-200',
            purple: 'bg-purple-100 text-purple-600 border-purple-200',
            green: 'bg-green-100 text-green-600 border-green-200',
            red: 'bg-red-100 text-red-600 border-red-200',
            yellow: 'bg-yellow-100 text-yellow-600 border-yellow-200',
            indigo: 'bg-indigo-100 text-indigo-600 border-indigo-200',
            pink: 'bg-pink-100 text-pink-600 border-pink-200',
            orange: 'bg-orange-100 text-orange-600 border-orange-200'
        };
        return colors[color] || colors.blue;
    };

    const handleRowClick = (pillarId) => {
        navigate(`/admin/pillars/${pillarId}`);
    };

    const handleActionClick = (e, callback) => {
        e.stopPropagation();
        callback();
    };

    const handleViewDetails = (e, pillarId) => {
        e.stopPropagation();
        navigate(`/admin/pillars/${pillarId}`);
    };

    const handleMenuToggle = (e, pillar) => {
        e.stopPropagation();
        
        // Si on clique sur le même pilier, on ferme le menu
        if (showActions === pillar.id) {
            setShowActions(null);
        } else {
            // Sinon, on ouvre le menu pour ce pilier
            buttonRef.current = e.currentTarget;
            setSelectedPillar(pillar);
            setShowActions(pillar.id);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-indigo-100 overflow-hidden"
        >
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gradient-to-r from-indigo-50 to-purple-50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                Pilier
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                Vidéos
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                Étudiants
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                Création
                            </th>
                            <th className="px-6 py-4 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {currentPillars.map((pillar, index) => {
                            const colorStyle = getColorStyle(pillar.color);
                            
                            return (
                                <motion.tr
                                    key={pillar.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    onClick={() => handleRowClick(pillar.id)}
                                    className="hover:bg-indigo-50/50 transition-colors group cursor-pointer"
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 ${colorStyle} rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}>
                                                <span className="text-lg">{pillar.icon || '📚'}</span>
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-800 flex items-center gap-2">
                                                    {pillar.safeName}
                                                    {pillar.description && (
                                                        <span className="text-xs text-gray-400 font-normal">
                                                            {pillar.safeDescription.substring(0, 30)}...
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Video className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm text-gray-600">{pillar.videoCount}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Users className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm text-gray-600">{pillar.studentCount}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm text-gray-600">
                                                {new Date(pillar.created_at).toLocaleDateString('fr-FR')}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <motion.button
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={(e) => handleViewDetails(e, pillar.id)}
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
                                                        onClick={(e) => handleActionClick(e, () => onEdit(pillar))}
                                                        className="p-2 hover:bg-purple-100 rounded-lg transition-colors text-purple-600 opacity-0 group-hover:opacity-100"
                                                        title="Modifier"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </motion.button>
                                                    
                                                    {/* Bouton trois points */}
                                                    <div>
                                                        <motion.button
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            onClick={(e) => handleMenuToggle(e, pillar)}
                                                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                                        >
                                                            <MoreVertical className="w-4 h-4 text-gray-500" />
                                                        </motion.button>
                                                    </div>
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

            {/* Menu en portal pour les trois points */}
            {showActions && selectedPillar && createPortal(
                <motion.div
                    ref={menuRef}
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
                            onEdit(selectedPillar);
                            setShowActions(null);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 flex items-center gap-2"
                    >
                        <Edit className="w-4 h-4" />
                        Modifier
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(selectedPillar);
                            setShowActions(null);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                        <Trash2 className="w-4 h-4" />
                        Supprimer
                    </button>
                </motion.div>,
                document.body
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                        Page {page} sur {totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}
        </motion.div>
    );
}