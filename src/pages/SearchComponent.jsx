import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Search, X, Building2, User, Video, 
    ArrowRight, Loader2, Sparkles 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '../hooks/useDebounce';

export default function SearchComponent({ 
    placeholder = "Rechercher entreprises, utilisateurs, vidéos...",
    onResultClick,
    autoFocus = false,
    className = ""
}) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [recentSearches, setRecentSearches] = useState([]);
    const navigate = useNavigate();
    const debouncedQuery = useDebounce(query, 300);

    useEffect(() => {
        if (debouncedQuery.length >= 2) {
            handleSearch();
        } else {
            setResults(null);
        }
    }, [debouncedQuery]);

    const handleSearch = async () => {
        if (!query.trim() || query.length < 2) return;

        setLoading(true);
        try {
            const { data, error } = await supabase
                .rpc('search_platform', {
                    search_query: query
                });

            if (error) throw error;
            
            setResults(data);
            setShowResults(true);

            if (data.total_results > 0) {
                const searches = JSON.parse(localStorage.getItem('recentSearches') || '[]');
                const newSearch = { query, timestamp: Date.now() };
                const updated = [newSearch, ...searches.filter(s => s.query !== query)].slice(0, 5);
                localStorage.setItem('recentSearches', JSON.stringify(updated));
                setRecentSearches(updated);
            }

        } catch (error) {
            console.error('Erreur recherche:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        handleSearch();
    };

    const handleResultClick = (result) => {
        setShowResults(false);
        setQuery('');
        
        if (onResultClick) {
            onResultClick(result);
            return;
        }

        if (result.type === 'organization') {
            navigate(`/super-admin/companies/${result.id}`);
        } else if (result.type === 'user') {
            navigate(`/super-admin/users?userId=${result.id}`);
        } else if (result.type === 'video') {
            navigate(`/admin/videos?videoId=${result.id}`);
        }
    };

    const getIcon = (type) => {
        switch(type) {
            case 'organization': return Building2;
            case 'user': return User;
            case 'video': return Video;
            default: return Search;
        }
    };

    const getColor = (type) => {
        switch(type) {
            case 'organization': return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30';
            case 'user': return 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30';
            case 'video': return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
            default: return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800';
        }
    };

    const getBadge = (result) => {
        if (result.type === 'organization') return result.plan;
        if (result.type === 'user') return result.role;
        if (result.type === 'video') return result.pillar;
        return '';
    };

    return (
        <div className={`relative ${className}`}>
            <form onSubmit={handleSubmit} className="relative">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => {
                        if (results) setShowResults(true);
                        const saved = JSON.parse(localStorage.getItem('recentSearches') || '[]');
                        setRecentSearches(saved);
                    }}
                    onBlur={() => {
                        setTimeout(() => setShowResults(false), 200);
                    }}
                    placeholder={placeholder}
                    autoFocus={autoFocus}
                    className="w-full pl-10 pr-20 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-blue-400 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30 outline-none transition-all text-sm dark:text-white dark:placeholder-gray-400"
                />
                
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                
                {query && (
                    <button
                        type="button"
                        onClick={() => {
                            setQuery('');
                            setResults(null);
                            setShowResults(false);
                        }}
                        className="absolute right-12 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
                
                <button
                    type="submit"
                    disabled={loading || !query.trim()}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-xs font-medium disabled:opacity-50 hover:shadow-md transition-all"
                >
                    {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Rechercher'}
                </button>
            </form>

            <AnimatePresence>
                {showResults && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto z-50"
                    >
                        {/* Résultats */}
                        {results ? (
                            results.total_results === 0 ? (
                                <div className="p-6 text-center">
                                    <Search className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Aucun résultat pour "{results.query}"</p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Essayez d'autres mots-clés</p>
                                </div>
                            ) : (
                                <div className="p-2">
                                    <div className="flex items-center justify-between px-3 py-2">
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                            {results.total_results} résultat(s) trouvé(s)
                                        </p>
                                        <Sparkles className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                                    </div>
                                    
                                    {/* Organisations */}
                                    {results.organizations?.map((org) => (
                                        <ResultItem
                                            key={`org-${org.id}`}
                                            result={org}
                                            onClick={handleResultClick}
                                            icon={Building2}
                                            color={getColor('organization')}
                                            badge={org.plan}
                                        />
                                    ))}

                                    {/* Utilisateurs */}
                                    {results.users?.map((user) => (
                                        <ResultItem
                                            key={`user-${user.id}`}
                                            result={user}
                                            onClick={handleResultClick}
                                            icon={User}
                                            color={getColor('user')}
                                            badge={user.role}
                                        />
                                    ))}

                                    {/* Vidéos */}
                                    {results.videos?.map((video) => (
                                        <ResultItem
                                            key={`video-${video.id}`}
                                            result={video}
                                            onClick={handleResultClick}
                                            icon={Video}
                                            color={getColor('video')}
                                            badge={video.pillar}
                                        />
                                    ))}
                                </div>
                            )
                        ) : (
                            /* Recherches récentes */
                            recentSearches.length > 0 && (
                                <div className="p-2">
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 py-2">
                                        Recherches récentes
                                    </p>
                                    {recentSearches.map((search, index) => (
                                        <button
                                            key={index}
                                            onClick={() => {
                                                setQuery(search.query);
                                                handleSearch();
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-left"
                                        >
                                            <Search className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                                            <span className="text-sm text-gray-600 dark:text-gray-300">{search.query}</span>
                                        </button>
                                    ))}
                                </div>
                            )
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function ResultItem({ result, onClick, icon: Icon, color, badge }) {
    // color est une chaîne comme "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30"
    // On extrait les classes pour le conteneur et l'icône
    const [textColor, bgColor] = color.split(' ');
    // Pour l'icône, on utilise seulement la classe de texte
    const iconColor = textColor;
    
    return (
        <motion.button
            whileHover={{ x: 5 }}
            onClick={() => onClick(result)}
            className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all text-left group"
        >
            <div className={`p-2 ${bgColor} rounded-lg`}>
                <Icon className={`w-4 h-4 ${iconColor}`} />
            </div>
            
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                        {result.name || result.title}
                    </p>
                    {badge && (
                        <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">
                            {badge}
                        </span>
                    )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    {result.type === 'organization' && `${result.email || ''}`}
                    {result.type === 'user' && result.email}
                    {result.type === 'video' && result.description?.substring(0, 50)}
                </p>
            </div>

            <ArrowRight className="w-4 h-4 text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </motion.button>
    );
}