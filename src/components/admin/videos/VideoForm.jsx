import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Save, X, Sparkles, AlertCircle,
    CheckCircle, Clock, Film, RefreshCw, ChevronDown
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../ui/Toast';
import { untrusted, escapeText } from '../../../utils/security';
import SanitizedInput from '../../ui/SanitizedInput';
import { getVideoDuration } from '../../../utils/video';

export default function VideoForm({
    video = null,
    onSuccess,
    onCancel,
    orgId: propOrgId,
    uploadedVideo = null
}) {
    const { user } = useAuth();
    const { success, error: showError } = useToast();
    const [loading, setLoading] = useState(false);
    const [pillars, setPillars] = useState([]);
    const [formData, setFormData] = useState({
        title: video?.title || '',
        description: video?.description || '',
        pillar_id: video?.pillar_id || '',
        video_url: video?.video_url || uploadedVideo?.url || '',
        video_path: video?.video_path || uploadedVideo?.path || '',
        duration: video?.duration || 0,
        sequence_order: video?.sequence_order || 0,
        thumbnail_url: video?.thumbnail_url || ''
    });
    const [availableQuizzes, setAvailableQuizzes] = useState([]);
    const [associatedQuizId, setAssociatedQuizId] = useState('');
    const [loadingQuizzes, setLoadingQuizzes] = useState(false);
    const [touched, setTouched] = useState({});
    const [errors, setErrors] = useState({});
    
    const [isPillarOpen, setIsPillarOpen] = useState(false);
    const [isQuizOpen, setIsQuizOpen] = useState(false);
    const pillarRef = useRef(null);
    const quizRef = useRef(null);

    useEffect(() => {
        const fetchPillars = async () => {
            let orgId = propOrgId;
            if (!orgId) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('organization_id')
                    .eq('id', user.id)
                    .single();
                orgId = profile?.organization_id;
            }

            if (orgId) {
                const { data } = await supabase
                    .from('pillars')
                    .select('id, name, color')
                    .eq('organization_id', orgId)
                    .order('name');
                setPillars(data || []);
                
                // Fetch quizzes for this org
                setLoadingQuizzes(true);
                try {
                    const pillarIds = (data || []).map(p => p.id);
                    if (pillarIds.length > 0) {
                        const { data: videoRows } = await supabase
                            .from('videos')
                            .select('id')
                            .in('pillar_id', pillarIds);
                        
                        const videoIds = (videoRows || []).map(v => v.id);
                        if (videoIds.length > 0) {
                            const { data: quizzesData } = await supabase
                                .from('quizzes')
                                .select('id, video_id, video:videos(title)')
                                .in('video_id', videoIds);
                            setAvailableQuizzes(quizzesData || []);
                            
                            // Check if current video has an associated quiz
                            if (video?.id) {
                                const currentQuiz = quizzesData?.find(q => q.video_id === video.id);
                                if (currentQuiz) setAssociatedQuizId(currentQuiz.id);
                            }
                        }
                    }
                } catch (err) {
                    console.error('Error fetching quizzes:', err);
                } finally {
                    setLoadingQuizzes(false);
                }
            }
        };
        fetchPillars();
    }, [user, propOrgId, video?.id]);

    // Auto-remplir la durée si détectée par le VideoUploader
    useEffect(() => {
        if (uploadedVideo?.duration && uploadedVideo.duration > 0) {
            setFormData(prev => ({ ...prev, duration: uploadedVideo.duration }));
        }
    }, [uploadedVideo]);

    // Fermer les dropdowns si on clique ailleurs
    useEffect(() => {
        function handleClickOutside(event) {
            if (pillarRef.current && !pillarRef.current.contains(event.target)) {
                setIsPillarOpen(false);
            }
            if (quizRef.current && !quizRef.current.contains(event.target)) {
                setIsQuizOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const validateForm = () => {
        const newErrors = {};
        
        if (!formData.title) newErrors.title = "Le titre est requis";
        else if (formData.title.length < 3) newErrors.title = "Le titre doit faire au moins 3 caractères";
        else if (formData.title.length > 100) newErrors.title = "Le titre ne peut pas dépasser 100 caractères";
        
        if (!formData.pillar_id) newErrors.pillar_id = "Veuillez sélectionner un pilier";
        
        if (!formData.video_url && !video) newErrors.video = "Veuillez importer une vidéo";
        
        if (formData.description && formData.description.length > 500) {
            newErrors.description = "La description ne peut pas dépasser 500 caractères";
        }
        
        if (formData.sequence_order < 0) {
            newErrors.sequence_order = "L'ordre doit être un nombre positif";
        }
        
        return newErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const validationErrors = validateForm();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            showError("Veuillez corriger les erreurs dans le formulaire");
            return;
        }

        setLoading(true);
        try {
            let orgId = propOrgId;
            if (!orgId) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('organization_id')
                    .eq('id', user.id)
                    .single();
                orgId = profile?.organization_id;
            }

            const videoData = {
                pillar_id: formData.pillar_id,
                title: formData.title.trim(),
                description: formData.description.trim() || null,
                video_url: uploadedVideo?.url || video?.video_url || '',
                video_path: uploadedVideo?.path || video?.video_path || null,
                duration: formData.duration,
                sequence_order: formData.sequence_order,
                thumbnail_url: formData.thumbnail_url || null
            };

            let result;
            if (video) {
                result = await supabase
                    .from('videos')
                    .update(videoData)
                    .eq('id', video.id)
                    .select();
            } else {
                result = await supabase
                    .from('videos')
                    .insert(videoData)
                    .select();
            }

            if (result.error) throw result.error;
            const updatedVideoId = result.data[0].id;

            // Handle Quiz Association
            if (associatedQuizId) {
                // Remove old association if any (though currently enforced 1:1 by UI)
                await supabase
                    .from('quizzes')
                    .update({ video_id: null })
                    .eq('video_id', updatedVideoId)
                    .neq('id', associatedQuizId);

                // Add new association
                const { error: quizErr } = await supabase
                    .from('quizzes')
                    .update({ video_id: updatedVideoId })
                    .eq('id', associatedQuizId);
                
                if (quizErr) throw quizErr;
            } else if (video?.id) {
                // If quiz was unselected, clear it
                await supabase
                    .from('quizzes')
                    .update({ video_id: null })
                    .eq('video_id', video.id);
            }

            success(video ? 'Vidéo modifiée' : 'Vidéo créée');
            onSuccess?.();

        } catch (err) {
            console.error('Erreur sauvegarde:', err);
            showError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDetectDuration = async () => {
        const url = formData.video_url;
        if (!url) {
            showError("Aucune URL de vidéo à analyser");
            return;
        }
        
        setLoading(true);
        try {
            const dur = await getVideoDuration(url);
            if (dur > 0) {
                setFormData(prev => ({ ...prev, duration: dur }));
                success(`Durée détectée : ${dur} secondes`);
            } else {
                showError("Impossible de détecter la durée (vérifiez l'URL)");
            }
        } catch (err) {
            showError("Erreur lors de la détection de la durée");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setErrors(prev => ({ ...prev, [field]: null }));
    };

    const getPillarColor = (pillarId) => {
        const pillar = pillars.find(p => p.id === pillarId);
        const colors = {
            primary: 'border-primary-200 bg-primary-50 dark:border-primary-800 dark:bg-primary-900/30',
            accent: 'border-accent-200 bg-accent-50 dark:border-accent-800 dark:bg-accent-900/30',
            purple: 'border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-900/30',
            green: 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/30',
            red: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/30',
            yellow: 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/30',
            pink: 'border-pink-200 bg-pink-50 dark:border-pink-800 dark:bg-pink-900/30',
            orange: 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/30'
        };
        return colors[pillar?.color] || 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800';
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Message si vidéo uploadée */}
            {uploadedVideo && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-3"
                >
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <p className="text-sm text-green-700 dark:text-green-300 flex-1">
                        Vidéo "{escapeText(untrusted(uploadedVideo.name))}" prête à être enregistrée
                    </p>
                </motion.div>
            )}

            {/* Titre */}
            <SanitizedInput
                label="Titre de la vidéo"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                onBlur={() => setTouched({ ...touched, title: true })}
                validate="text"
                minLength={3}
                maxLength={100}
                required
                error={touched.title ? errors.title : ''}
                placeholder="Ex: Introduction à la cybersécurité"
            />

            {/* Description */}
             <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Description
                    <span className="text-gray-400 dark:text-gray-500 text-xs ml-2">(optionnel)</span>
                </label>
                <textarea
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    onBlur={() => setTouched({ ...touched, description: true })}
                    rows={4}
                    className={`w-full px-4 py-3 bg-white dark:bg-gray-800 border-2 rounded-xl focus:outline-none focus:ring-4 transition-all resize-none dark:text-white ${
                        errors.description && touched.description
                            ? 'border-red-300 dark:border-red-600 focus:border-red-500 dark:focus:border-red-400 focus:ring-red-100 dark:focus:ring-red-900/30'
                            : 'border-gray-200 dark:border-gray-700 focus:border-primary-400 dark:focus:border-primary-500 focus:ring-primary-100 dark:focus:ring-primary-900/30'
                    }`}
                    placeholder="Décrivez brièvement le contenu de cette vidéo..."
                />
                <div className="flex justify-end">
                    <span className={`text-xs ${(formData.description?.length || 0) > 450 ? 'text-orange-500 dark:text-orange-400' : 'text-gray-400 dark:text-gray-500'}`}>
                        {formData.description?.length || 0}/500
                    </span>
                </div>
            </div>

            {/* Pilier */}
             <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Pilier associé
                    <span className="text-red-500 ml-1">*</span>
                </label>
                 <div className="relative" ref={pillarRef}>
                    <button
                        type="button"
                        onClick={() => setIsPillarOpen(!isPillarOpen)}
                        className={`w-full px-4 py-3 bg-white dark:bg-gray-800 border-2 rounded-xl focus:outline-none focus:ring-4 transition-all dark:text-white flex items-center justify-between gap-2 shadow-sm ${
                            errors.pillar_id && touched.pillar_id
                                ? 'border-red-300 dark:border-red-600 focus:border-red-500 dark:focus:border-red-400 focus:ring-red-100 dark:focus:ring-red-900/30'
                                : 'border-gray-200 dark:border-gray-700 focus:border-primary-400 dark:focus:border-primary-500 focus:ring-primary-100 dark:focus:ring-primary-900/30'
                        }`}
                    >
                        <span>
                            {formData.pillar_id 
                                ? escapeText(untrusted(pillars.find(p => p.id === formData.pillar_id)?.name || 'Pilier')) 
                                : 'Sélectionner un pilier'}
                        </span>
                        <ChevronDown size={14} className={`transition-transform duration-200 ${isPillarOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                        {isPillarOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                className="absolute left-0 mt-2 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-2xl shadow-xl border border-white/50 dark:border-white/5 py-2 z-50 overflow-hidden"
                            >
                                {pillars.map(pillar => (
                                    <button
                                        key={pillar.id}
                                        type="button"
                                        onClick={() => {
                                            handleChange('pillar_id', pillar.id);
                                            setIsPillarOpen(false);
                                        }}
                                        className={`w-full px-4 py-2.5 text-left text-sm transition-colors
                                            ${formData.pillar_id === pillar.id 
                                                ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400 font-bold' 
                                                : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-white/10'
                                            }`}
                                    >
                                        {escapeText(untrusted(pillar.name))}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                {errors.pillar_id && touched.pillar_id && (
                    <p className="text-sm text-red-500 dark:text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.pillar_id}
                    </p>
                )}
            </div>

            {/* Ordre séquentiel */}
            <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Ordre de lecture
                </label>
                <div className="flex items-center gap-4">
                    <input
                        type="number"
                        min="0"
                        value={formData.sequence_order}
                        onChange={(e) => handleChange('sequence_order', parseInt(e.target.value) || 0)}
                        className="w-24 px-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-primary-400 dark:focus:border-primary-500 focus:ring-4 focus:ring-primary-100 dark:focus:ring-primary-900/30 outline-none transition-all dark:text-white"
                    />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Définit la position de la vidéo dans le pilier
                    </p>
                </div>
            </div>

            {/* Quiz associé */}
            <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Quiz associé
                    <span className="text-gray-400 dark:text-gray-500 text-xs ml-2">(optionnel)</span>
                </label>
                <div className="relative" ref={quizRef}>
                    <button
                        type="button"
                        onClick={() => setIsQuizOpen(!isQuizOpen)}
                        disabled={loadingQuizzes}
                        className="w-full px-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-primary-400 dark:focus:border-primary-500 focus:ring-4 focus:ring-primary-100 dark:focus:ring-primary-900/30 outline-none transition-all dark:text-white flex items-center justify-between gap-2 shadow-sm disabled:opacity-50"
                    >
                        <span>
                            {associatedQuizId 
                                ? `Quiz de : ${escapeText(untrusted(availableQuizzes.find(q => q.id === associatedQuizId)?.video?.title || 'Inconnue'))}` 
                                : 'Aucun quiz'}
                        </span>
                        <ChevronDown size={14} className={`transition-transform duration-200 ${isQuizOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                        {isQuizOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                className="absolute left-0 mt-2 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-2xl shadow-xl border border-white/50 dark:border-white/5 py-2 z-50 overflow-hidden"
                            >
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAssociatedQuizId('');
                                        setIsQuizOpen(false);
                                    }}
                                    className={`w-full px-4 py-2.5 text-left text-sm transition-colors
                                        ${associatedQuizId === '' 
                                            ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400 font-bold' 
                                            : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-white/10'
                                        }`}
                                >
                                    Aucun quiz
                                </button>
                                {availableQuizzes.map(q => (
                                    <button
                                        key={q.id}
                                        type="button"
                                        onClick={() => {
                                            setAssociatedQuizId(q.id);
                                            setIsQuizOpen(false);
                                        }}
                                        className={`w-full px-4 py-2.5 text-left text-sm transition-colors
                                            ${associatedQuizId === q.id 
                                                ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400 font-bold' 
                                                : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-white/10'
                                            }`}
                                    >
                                        Quiz de : {escapeText(untrusted(q.video?.title || 'Inconnue'))}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    {loadingQuizzes ? 'Chargement des quiz...' : 'Vous pouvez lier un quiz existant à cette vidéo.'}
                </p>
            </div>
            <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Durée (secondes)
                </label>
                <div className="flex items-center gap-4">
                    <input
                        type="number"
                        min="0"
                        value={formData.duration}
                        onChange={(e) => handleChange('duration', parseInt(e.target.value) || 0)}
                        className="w-32 px-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-primary-400 dark:focus:border-primary-500 focus:ring-4 focus:ring-primary-100 dark:focus:ring-primary-900/30 outline-none transition-all dark:text-white"
                    />
                    
                    {formData.video_url && (
                        <button
                            type="button"
                            onClick={handleDetectDuration}
                            disabled={loading}
                            className="px-3 py-2 text-xs font-bold bg-primary-50 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/60 transition-all flex items-center gap-1"
                        >
                            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                            Détecter
                        </button>
                    )}

                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {uploadedVideo?.duration && uploadedVideo.duration > 0
                            ? <span className="text-green-600 dark:text-green-400 font-medium">✓ Durée auto-détectée</span>
                            : 'Secondes'
                        }
                    </p>
                </div>
            </div>

            {/* Boutons */}
            <div className="flex gap-3 pt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 px-6 py-4 text-gray-600 dark:text-gray-300 font-semibold rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                >
                    Annuler
                </button>
                <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-primary-600 to-accent-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {loading ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Enregistrement...</span>
                        </>
                    ) : (
                        <>
                            <Save className="w-5 h-5" />
                            <span>{video ? "Modifier la vidéo" : "Créer la vidéo"}</span>
                        </>
                    )}
                </motion.button>
            </div>
        </form>
    );
}