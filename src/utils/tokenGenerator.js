export function generateInvitationToken() {
    // Timestamp en base36 (plus court)
    const timestamp = Date.now().toString(36).toUpperCase();
    
    // Random sur 8 caractères
    const random = Math.random().toString(36).substring(2, 10).toUpperCase();
        
    // Format: INV_timestamp_random
    return `INV_${timestamp}_${random}`;
}
/**
 * Valide le format du token
 * @param {string} token - Token à valider
 * @returns {boolean}
 */
export function isValidToken(token) {
    const pattern = /^INV_[A-Z0-9]+_[A-Z0-9]+$/;
    return pattern.test(token);
}
/**
 * Calcule la date d'expiration (24h)
 * @returns {string} Date ISO
 */
export function getExpirationDate() {
    const date = new Date();
    date.setHours(date.getHours() + 24);
    return date.toISOString();
}
/**
 * Vérifie si un token est expiré
 * @param {string} expiresAt - Date d'expiration ISO
 * @returns {boolean}
 */
export function isTokenExpired(expiresAt) {
    return new Date(expiresAt) < new Date();
}