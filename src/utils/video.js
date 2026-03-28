// src/utils/video.js

/**
 * Extrait la durée d'une vidéo (Fichier ou URL)
 * @param {File|string} source - Le fichier Blob ou l'URL de la vidéo
 * @returns {Promise<number>} - Durée en secondes (arrondie)
 */
export const getVideoDuration = (source) => {
    return new Promise((resolve) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        
        const url = source instanceof File ? URL.createObjectURL(source) : source;
        video.src = url;
        
        video.onloadedmetadata = () => {
            if (source instanceof File) URL.revokeObjectURL(url);
            resolve(Math.round(video.duration));
        };
        
        video.onerror = () => {
            if (source instanceof File) URL.revokeObjectURL(url);
            console.error('❌ Erreur détection durée vidéo');
            resolve(0);
        };
        
        // Timeout de sécurité
        setTimeout(() => {
            if (video.duration) return;
            resolve(0);
        }, 5000);
    });
};

/**
 * Formate une durée en secondes en format MM:SS
 * @param {number} seconds 
 * @returns {string}
 */
export const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};
