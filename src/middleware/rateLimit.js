/**
 * Rate limiting middleware pour les appels API
 * Implémente exponential backoff
 */

const rateLimitStore = new Map();

/**
 * Calcule le délai d'attente avec exponential backoff
 * @param {string} key - Clé unique (ex: email, IP)
 * @param {number} baseDelay - Délai de base en ms
 * @returns {number} Délai à attendre
 */
export function getBackoffDelay(key, baseDelay = 1000) {
    const attempts = rateLimitStore.get(key) || 0;
    const delay = Math.min(baseDelay * Math.pow(2, attempts), 30000); // Max 30s
    
    rateLimitStore.set(key, attempts + 1);
    
    // Reset après 5 minutes
    setTimeout(() => {
        const current = rateLimitStore.get(key) || 0;
        if (current > 0) {
        rateLimitStore.set(key, current - 1);
        }
    }, 300000);
    
    return delay;
    }

    /**
     * Vérifie si une action est rate-limitée
     * @param {string} key - Clé unique
     * @param {number} limit - Nombre max de tentatives
     * @param {number} windowMs - Fenêtre en ms
     * @returns {boolean}
     */
    export function isRateLimited(key, limit = 5, windowMs = 60000) {
    const now = Date.now();
    const attempts = rateLimitStore.get(`${key}_timestamps`) || [];
    
    const recentAttempts = attempts.filter(t => t > now - windowMs);
    
    if (recentAttempts.length >= limit) {
        return true;
    }
    
    rateLimitStore.set(`${key}_timestamps`, [...recentAttempts, now]);
    return false;
    }