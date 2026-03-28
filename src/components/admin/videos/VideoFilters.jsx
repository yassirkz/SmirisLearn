// src/components/admin/videos/VideoFilters.jsx
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Filter, ArrowUpDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { untrusted, escapeText } from '../../../utils/security';

export default function VideoFilters({ filters, onChange, pillars }) {
    const [showFilters, setShowFilters] = useState(false);
    const filterRef = useRef(null);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterRef.current && !filterRef.current.contains(event.target) && !event.target.closest('.video-filter-portal')) {
                setShowFilters(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (showFilters && filterRef.current) {
            const rect = filterRef.current.getBoundingClientRect();
            setMenuPosition({
                top: rect.bottom + window.scrollY + 8,
                left: rect.right - 256,
            });
        }
    }, [showFilters]);

    const handleSearchChange = (e) => {
        const value = untrusted(e.target.value);
        onChange({ ...filters, search: value });
    };

    const handlePillarChange = (e) => {
        onChange({ ...filters, pillar_id: e.target.value });
    };

    const handleSortChange = (field) => {
        if (filters.sortBy === field) {
            onChange({
                ...filters,
                sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc'
            });
        } else {
            onChange({
                ...filters,
                sortBy: field,
                sortOrder: 'asc'
            });
        }
        setShowFilters(false);
    };

    const clearSearch = () => {
        onChange({ ...filters, search: '' });
    };

    return (
        <div className="relative w-full sm:w-auto" ref={filterRef}>
            <div className="flex flex-wrap items-center gap-2">
                {/* Barre de recherche */}
                <div className="relative flex-1 sm:flex-none">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
                    <input
                        type="text"
                        value={filters.search}
                        onChange={handleSearchChange}
                        placeholder="Rechercher une vidéo..."
                        className="pl-9 pr-8 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-primary-400 dark:focus:border-primary-500 focus:ring-4 focus:ring-primary-100 dark:focus:ring-primary-900/30 transition-all w-full sm:w-48 md:w-64 dark:bg-gray-800 dark:text-white"
                    />
                    {filters.search && (
                        <button
                            onClick={clearSearch}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Filtre pilier */}
                <select
                    value={filters.pillar_id}
                    onChange={handlePillarChange}
                    className="flex-1 sm:flex-none px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-primary-400 dark:focus:border-primary-500 focus:ring-4 focus:ring-primary-100 dark:focus:ring-primary-900/30 bg-white dark:bg-gray-800 dark:text-white"
                >
                    <option value="all">Tous les piliers</option>
                    {pillars.map(pillar => (
                        <option key={pillar.id} value={pillar.id}>
                            {escapeText(untrusted(pillar.name))}
                        </option>
                    ))}
                </select>

                {/* Bouton filtres */}
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowFilters(!showFilters)}
                    className={`p-3 rounded-xl transition-all ${
                        showFilters || filters.sortBy !== 'created_at'
                            ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                >
                    <Filter className="w-4 h-4" />
                </motion.button>
            </div>

            {/* Panneau de filtres via Portal */}
            {showFilters && createPortal(
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    style={{
                        position: 'absolute',
                        top: menuPosition.top,
                        left: menuPosition.left,
                        zIndex: 999999,
                    }}
                    className="video-filter-portal w-64 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 p-4"
                >
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        Trier par
                    </h3>
                        
                        <div className="space-y-2">
                            {[
                                { field: 'title', label: "Titre" },
                                { field: 'created_at', label: "Date d'ajout" },
                                { field: 'duration', label: "Durée" }
                            ].map((option) => (
                                <button
                                    key={option.field}
                                    onClick={() => handleSortChange(option.field)}
                                    className="w-full flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    <span className="text-sm text-gray-600 dark:text-gray-300">
                                        {option.label}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        {filters.sortBy === option.field && (
                                            <ArrowUpDown className={`w-3 h-3 ${
                                                filters.sortOrder === 'asc' ? 'text-primary-600 dark:text-primary-400' : 'text-primary-600 dark:text-primary-400 rotate-180'
                                            }`} />
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                            <button
                                onClick={() => {
                                    onChange({
                                        search: '',
                                        pillar_id: 'all',
                                        sortBy: 'created_at',
                                        sortOrder: 'desc'
                                    });
                                    setShowFilters(false);
                                }}
                                className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                            >
                                Réinitialiser les filtres
                            </button>
                        </div>
                </motion.div>,
                document.body
            )}
        </div>
    );
}