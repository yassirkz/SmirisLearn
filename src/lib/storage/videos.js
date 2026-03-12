// src/lib/storage/videos.js
import { supabase } from '../supabase';
import { STORAGE_CONFIG } from './config';
import { v4 as uuidv4 } from 'uuid';

// Générer un chemin unique pour la vidéo
export const generateVideoPath = (orgId, fileName) => {
    const extension = fileName.split('.').pop();
    const uniqueName = `${uuidv4()}.${extension}`;
    return `${orgId}/${uniqueName}`;
};

// Upload une vidéo
export const uploadVideo = async (file, orgId, onProgress) => {
    try {
        // Validation
        if (!file) throw new Error('Aucun fichier');
        if (!STORAGE_CONFIG.ALLOWED_TYPES.includes(file.type)) {
            throw new Error('Type de fichier non supporté');
        }
        if (file.size > STORAGE_CONFIG.MAX_FILE_SIZE) {
            throw new Error(`Fichier trop volumineux (max ${STORAGE_CONFIG.MAX_FILE_SIZE / 1024 / 1024} Mo)`);
        }

        const filePath = generateVideoPath(orgId, file.name);

        const { data, error } = await supabase.storage
            .from(STORAGE_CONFIG.BUCKET_NAME)
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) throw error;

        // Simuler la progression (car Supabase ne fournit pas onUploadProgress)
        if (onProgress) {
            let progress = 0;
            const interval = setInterval(() => {
                progress += 10;
                onProgress(progress);
                if (progress >= 100) {
                    clearInterval(interval);
                }
            }, 200);
        }

        // Récupérer l'URL publique
        const { data: urlData } = supabase.storage
            .from(STORAGE_CONFIG.BUCKET_NAME)
            .getPublicUrl(filePath);

        return {
            success: true,
            url: urlData.publicUrl,      // Pour lecture
            path: filePath,               // Pour suppression
            size: file.size,
            type: file.type,
            name: file.name
        };

    } catch (error) {
        console.error('❌ Erreur upload:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Supprimer une vidéo
export const deleteVideo = async (filePath) => {
    try {
        if (!filePath) throw new Error('Chemin du fichier manquant');

        const { error } = await supabase.storage
            .from(STORAGE_CONFIG.BUCKET_NAME)
            .remove([filePath]);

        if (error) throw error;

        return { success: true };
    } catch (error) {
        console.error('❌ Erreur suppression:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Obtenir l'URL d'une vidéo (utile si on a seulement le path)
export const getVideoUrl = (filePath) => {
    if (!filePath) return null;
    
    const { data } = supabase.storage
        .from(STORAGE_CONFIG.BUCKET_NAME)
        .getPublicUrl(filePath);
    
    return data.publicUrl;
};

// Lister les vidéos d'une organisation
export const listOrgVideos = async (orgId) => {
    try {
        if (!orgId) throw new Error('ID organisation manquant');

        const { data, error } = await supabase.storage
            .from(STORAGE_CONFIG.BUCKET_NAME)
            .list(`${orgId}/`, {
                limit: 100,
                sortBy: { column: 'created_at', order: 'desc' }
            });

        if (error) throw error;

        return {
            success: true,
            videos: data.map(file => ({
                ...file,
                url: getVideoUrl(`${orgId}/${file.name}`),
                path: `${orgId}/${file.name}`
            }))
        };
    } catch (error) {
        console.error('❌ Erreur liste:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Obtenir les informations d'une vidéo
export const getVideoInfo = async (filePath) => {
    try {
        if (!filePath) throw new Error('Chemin du fichier manquant');

        const { data, error } = await supabase.storage
            .from(STORAGE_CONFIG.BUCKET_NAME)
            .info(filePath);

        if (error) throw error;

        return {
            success: true,
            info: {
                ...data,
                url: getVideoUrl(filePath),
                path: filePath
            }
        };
    } catch (error) {
        console.error('❌ Erreur récupération infos:', error);
        return {
            success: false,
            error: error.message
        };
    }
};