import DOMPurify from 'dompurify';

// ============================================
// BRANDED TYPES - Prevention XSS par conception
// ============================================

/**
 * @typedef {string & { readonly __brand: 'UntrustedString' }} UntrustedString
 * @typedef {string & { readonly __brand: 'TrustedHtml' }} TrustedHtml
 * @typedef {string & { readonly __brand: 'TrustedText' }} TrustedText
 * @typedef {string & { readonly __brand: 'Email' }} Email
 */

/**
 * Marque une chaîne comme non fiable (provenant de l'utilisateur)
 * @param {string} value - Entrée utilisateur
 * @returns {UntrustedString}
 */
export function untrusted(value) {
    return value;
}

/**
 * Échappe du texte pour affichage sécurisé (prévention XSS)
 * @param {UntrustedString} content - Contenu non fiable
 * @returns {TrustedText}
 */
export function escapeText(content) {
    if (!content) return '';
    
    const escaped = String(content)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
        
    return escaped;
}

/**
 * Sanitize du HTML (pour contenu riche - utilisation prudente)
 * @param {UntrustedString} content - Contenu HTML non fiable
 * @returns {TrustedHtml}
 */
export function sanitizeHtml(content) {
    if (!content) return '';
    
    const clean = DOMPurify.sanitize(content, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
        ALLOWED_ATTR: [],
        FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
        FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
    });
    
    return clean;
}

/**
 * Valide et nettoie un email
 * @param {UntrustedString} email - Email non fiable
 * @returns {Email}
 * @throws {Error} Si email invalide
 */
export function validateEmail(email) {
    const emailStr = String(email).trim().toLowerCase();
    
    // Regex OWASP recommandée pour emails
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!emailRegex.test(emailStr)) {
        throw new Error('Format d\'email invalide');
    }
    
    // Retourner l'email nettoyé (pas d'échappement HTML pour stocker en DB)
    return emailStr;
}

/**
 * Nettoie une chaîne pour usage dans URLs (prévention path traversal)
 * @param {UntrustedString} input - Entrée utilisateur
 * @returns {string}
 */
export function sanitizeUrlInput(input) {
    if (!input) return '';
    
    // Supprime les caractères dangereux pour les chemins
    return String(input)
        .replace(/\.\./g, '')
        .replace(/[\\/]/g, '')
        .replace(/[^a-zA-Z0-9-_]/g, '');
}

/**
 * Rate limiting client-side (complémentaire au serveur)
 * NOTE: Ce rate limiting est réinitialisé au rechargement de page.
 * Le vrai rate limiting doit être fait côté serveur.
 * @param {string} action - Type d'action (ex: 'login', 'signup')
 * @param {string} identifier - Identifiant unique (ex: email)
 * @param {number} limit - Nombre max de tentatives
 * @param {number} windowMs - Fenêtre en ms
 * @returns {boolean}
 */
const rateLimitStore = new Map();

export function checkRateLimit(action, identifier = 'global', limit = 5, windowMs = 60000) {
    const key = `${action}:${identifier}`;
    const now = Date.now();
    
    const entry = rateLimitStore.get(key);
    
    if (!entry || now - entry.windowStart >= windowMs) {
        // Nouvelle fenêtre
        rateLimitStore.set(key, { count: 1, windowStart: now });
        return true;
    }
    
    if (entry.count >= limit) {
        return false;
    }
    
    entry.count += 1;
    return true;
}

/**
 * Middleware de validation pour les formulaires
 * @param {Object} schema - Schéma de validation
 * @param {Object} data - Données à valider
 * @returns {Object} Résultat validation
 */
export function validateInput(schema, data) {
    const errors = {};
    const sanitized = {};
    
    for (const [field, rules] of Object.entries(schema)) {
        const value = data[field];
        
        // Validation requise
        if (rules.required && !value) {
            errors[field] = `${field} est requis`;
            continue;
        }
        
        if (!value) continue;
        
        const untrustedValue = untrusted(value);
        
        // Validation type
        if (rules.type === 'email') {
            try {
                sanitized[field] = validateEmail(untrustedValue);
            } catch (e) {
                errors[field] = e.message;
            }
        } else if (rules.type === 'text') {
            sanitized[field] = escapeText(untrustedValue);
        } else if (rules.type === 'html') {
            sanitized[field] = sanitizeHtml(untrustedValue);
        }
        
        // Validation longueur min
        if (rules.minLength && value.length < rules.minLength) {
            errors[field] = `Minimum ${rules.minLength} caractères`;
        }
        
        // Validation longueur max
        if (rules.maxLength && value.length > rules.maxLength) {
            errors[field] = `Maximum ${rules.maxLength} caractères`;
        }
    }
    
    return {
        isValid: Object.keys(errors).length === 0,
        errors,
        sanitized
    };
}