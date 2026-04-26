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
    placeholder,
    onResultClick,
    autoFocus = false,
    className = ""
}) {
    const displayPlaceholder = placeholder || 'Rechercher...';
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
            case 'organization': return 'text-primary-600 bg-primary-100 dark:text-primary-400 dark:bg-primary-900/30';
            case 'user': return 'text-accent-600 bg-accent-100 dark:text-accent-400 dark:bg-accent-900/30';
            case 'video': return 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30';
            default: return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800';
        }
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
                    placeholder={displayPlaceholder}
                    autoFocus={autoFocus}
                    className="w-full pl-11 pr-24 py-3 bg-white/50 dark:bg-white/5 backdrop-blur-md border border-white/50 dark:border-white/5 rounded-2xl focus:border-primary-400/50 dark:focus:border-primary-500/30 focus:ring-4 focus:ring-primary-100/50 dark:focus:ring-primary-900/20 outline-none transition-all text-sm dark:text-white dark:placeholder-gray-500 shadow-sm focus:shadow-md"
                />
                
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4.5 h-4.5" />
                
                {query && (
                    <button
                        type="button"
                        onClick={() => {
                            setQuery('');
                            setResults(null);
                            setShowResults(false);
                        }}
                        className="absolute right-[4.5rem] top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg hover:bg-white/50 dark:hover:bg-white/5 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
                
                <button
                    type="submit"
                    disabled={loading || !query.trim()}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 px-3.5 py-1.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl text-xs font-semibold disabled:opacity-40 hover:shadow-md hover:shadow-primary-500/25 transition-all"
                >
                    {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Rechercher'}
                </button>
            </form>

            <AnimatePresence>
                {showResults && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.4)] border border-white/50 dark:border-white/5 max-h-96 overflow-y-auto z-50"
                    >
                        {/* Results */}
                        {results ? (
                            results.total_results === 0 ? (
                                <div className="p-6 text-center">
                                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                        <Search className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                                        Aucun résultat pour "{results.query}"
                                    </p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                        Essayez d'autres mots-clés.
                                    </p>
                                </div>
                            ) : (
                                <div className="p-2">
                                    <div className="flex items-center justify-between px-3 py-2">
                                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            {results.total_results} résultats
                                        </p>
                                        <Sparkles className="w-3 h-3 text-primary-500 dark:text-primary-400" />
                                    </div>
                                    
                                    {/* Organizations */}
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

                                    {/* Users */}
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

                                    {/* Videos */}
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
                            /* Recent searches */
                            recentSearches.length > 0 && (
                                <div className="p-2">
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-3 py-2 uppercase tracking-wider">
                                        Recherches récentes
                                    </p>
                                    {recentSearches.map((search, index) => (
                                        <button
                                            key={index}
                                            onClick={() => {
                                                setQuery(search.query);
                                                handleSearch();
                                            }}
                                            className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/50 dark:hover:bg-white/5 rounded-xl text-left transition-colors"
                                        >
                                            <Search className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
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
    // color is a string like "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30"
    const [textColor, bgColor] = color.split(' ');
    const iconColor = textColor;
    
    return (
        <motion.button
            whileHover={{ x: 3 }}
            onClick={() => onClick(result)}
            className="w-full flex items-center gap-3 p-3 hover:bg-white/50 dark:hover:bg-white/5 rounded-xl transition-all text-left group"
        >
            <div className={`p-2 ${bgColor} rounded-xl`}>
                <Icon className={`w-4 h-4 ${iconColor}`} />
            </div>
            
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">
                        {result.name || result.title}
                    </p>
                    {badge && (
                        <span className="text-[10px] px-2 py-0.5 bg-white/60 dark:bg-white/5 text-gray-600 dark:text-gray-300 rounded-full font-medium border border-white/50 dark:border-white/5">
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