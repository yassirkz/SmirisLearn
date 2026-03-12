// src/components/admin/videos/VideoForm.jsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Save, X, Sparkles, AlertCircle,
    CheckCircle, Clock, Film
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../ui/Toast';
import { untrusted, escapeText } from '../../../utils/security';
import SanitizedInput from '../../ui/SanitizedInput';

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
    const [touched, setTouched] = useState({});
    const [errors, setErrors] = useState({});

    // Charger les piliers
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
            }
        };
        fetchPillars();
    }, [user, propOrgId]);

    // Validation
    const validateForm = () => {
        const newErrors = {};
        
        if (!formData.title) newErrors.title = 'Titre requis';
        else if (formData.title.length < 3) newErrors.title = 'Minimum 3 caractères';
        else if (formData.title.length > 100) newErrors.title = 'Maximum 100 caractères';
        
        if (!formData.pillar_id) newErrors.pillar_id = 'Pilier requis';
        
        if (!formData.video_url && !video) newErrors.video = 'Vidéo requise';
        
        if (formData.description && formData.description.length > 500) {
            newErrors.description = 'Maximum 500 caractères';
        }
        
        if (formData.sequence_order < 0) {
            newErrors.sequence_order = 'L\'ordre doit être positif';
        }
        
        return newErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const validationErrors = validateForm();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            showError('Veuillez corriger les erreurs');
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
                video_url: uploadedVideo?.url || '',
                video_path: uploadedVideo?.path || null,
                duration: formData.duration,
                sequence_order: formData.sequence_order,
                thumbnail_url: formData.thumbnail_url || null
            };

            let result;
            if (video) {
                // Mise à jour
                result = await supabase
                    .from('videos')
                    .update(videoData)
                    .eq('id', video.id)
                    .select();
            } else {
                // Création
                result = await supabase
                    .from('videos')
                    .insert(videoData)
                    .select();
            }

            if (result.error) throw result.error;

            success(video ? 'Vidéo modifiée' : 'Vidéo créée');
            onSuccess?.();

        } catch (err) {
            console.error('Erreur sauvegarde:', err);
            showError(err.message);
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
            blue: 'border-blue-200 bg-blue-50',
            purple: 'border-purple-200 bg-purple-50',
            green: 'border-green-200 bg-green-50',
            red: 'border-red-200 bg-red-50',
            yellow: 'border-yellow-200 bg-yellow-50',
            indigo: 'border-indigo-200 bg-indigo-50',
            pink: 'border-pink-200 bg-pink-50',
            orange: 'border-orange-200 bg-orange-50'
        };
        return colors[pillar?.color] || 'border-gray-200 bg-gray-50';
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Message si vidéo uploadée */}
            {uploadedVideo && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3"
                >
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <p className="text-sm text-green-700 flex-1">
                        Vidéo uploadée avec succès : {escapeText(untrusted(uploadedVideo.name))}
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
                placeholder="ex: Introduction à React"
            />

            {/* Description */}
            <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                    Description
                    <span className="text-gray-400 text-xs ml-2">(optionnelle)</span>
                </label>
                <textarea
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    onBlur={() => setTouched({ ...touched, description: true })}
                    rows={4}
                    className={`
                        w-full px-4 py-3 bg-white border-2 rounded-xl 
                        focus:outline-none focus:ring-4 transition-all resize-none
                        ${errors.description && touched.description
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                            : 'border-gray-200 focus:border-indigo-400 focus:ring-indigo-100'
                        }
                    `}
                    placeholder="Décrivez le contenu de la vidéo..."
                />
                <div className="flex justify-end">
                    <span className={`text-xs ${
                        (formData.description?.length || 0) > 450 ? 'text-orange-500' : 'text-gray-400'
                    }`}>
                        {formData.description?.length || 0}/500
                    </span>
                </div>
            </div>

            {/* Pilier */}
            <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                    Pilier
                    <span className="text-red-500 ml-1">*</span>
                </label>
                <select
                    value={formData.pillar_id}
                    onChange={(e) => handleChange('pillar_id', e.target.value)}
                    onBlur={() => setTouched({ ...touched, pillar_id: true })}
                    className={`
                        w-full px-4 py-3 bg-white border-2 rounded-xl 
                        focus:outline-none focus:ring-4 transition-all
                        ${errors.pillar_id && touched.pillar_id
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                            : 'border-gray-200 focus:border-indigo-400 focus:ring-indigo-100'
                        }
                    `}
                >
                    <option value="">Sélectionnez un pilier</option>
                    {pillars.map(pillar => (
                        <option key={pillar.id} value={pillar.id}>
                            {escapeText(untrusted(pillar.name))}
                        </option>
                    ))}
                </select>
                {errors.pillar_id && touched.pillar_id && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.pillar_id}
                    </p>
                )}
            </div>

            {/* Ordre séquentiel */}
            <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                    Ordre de lecture
                </label>
                <div className="flex items-center gap-4">
                    <input
                        type="number"
                        min="0"
                        value={formData.sequence_order}
                        onChange={(e) => handleChange('sequence_order', parseInt(e.target.value) || 0)}
                        className="w-24 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                    />
                    <p className="text-sm text-gray-500">
                        Les vidéos sont triées par ordre croissant
                    </p>
                </div>
            </div>

            {/* Durée (optionnelle) */}
            <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                    Durée (en secondes)
                </label>
                <div className="flex items-center gap-4">
                    <input
                        type="number"
                        min="0"
                        value={formData.duration}
                        onChange={(e) => handleChange('duration', parseInt(e.target.value) || 0)}
                        className="w-32 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                    />
                    <p className="text-sm text-gray-500">
                        Optionnel, sera détecté automatiquement si non renseigné
                    </p>
                </div>
            </div>

            {/* Boutons */}
            <div className="flex gap-3 pt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 px-6 py-4 text-gray-600 font-semibold rounded-2xl hover:bg-gray-100 transition-all"
                >
                    Annuler
                </button>
                <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {loading ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Sauvegarde...</span>
                        </>
                    ) : (
                        <>
                            <Save className="w-5 h-5" />
                            <span>{video ? 'Modifier' : 'Créer'} la vidéo</span>
                        </>
                    )}
                </motion.button>
            </div>
        </form>
    );
}