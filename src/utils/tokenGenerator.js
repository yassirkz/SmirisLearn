/**
 * Génère un token d'invitation cryptographiquement sécurisé
 * @returns {string}
 */
export function generateInvitationToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const hex = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
    return `INV_${hex}`;
}

/**
 * Valide le format du token
 * @param {string} token - Token à valider
 * @returns {boolean}
 */
export function isValidToken(token) {
    // Support ancien format (base36) et nouveau format (hex 64 chars)
    const pattern = /^INV_[A-Za-z0-9]+$/;
    return pattern.test(token) && token.length >= 20;
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