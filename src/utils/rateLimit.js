/**
 * Simple in-memory rate limiter.
 * Tracks attempt counts per (action, identifier) pair within a sliding time window.
 *
 * NOTE: This is a client-side guard only. It resets on page refresh.
 * For production, enforce rate limits server-side (e.g. via a Supabase Edge Function).
 */

// Map structure: `${action}:${identifier}` -> { count: number, windowStart: number }
const rateLimitMap = new Map();

/**
 * Check whether a given action is within the allowed rate limit.
 *
 * @param {string} action     - A label for the action being rate-limited (e.g. 'invitation').
 * @param {string} identifier - A unique key for the requester (e.g. email address).
 * @param {number} maxAttempts - Maximum number of attempts allowed in the time window.
 * @param {number} windowMs   - Duration of the sliding window in milliseconds.
 * @returns {boolean} `true` if the action is allowed, `false` if the limit has been exceeded.
 */
export function checkRateLimit(action, identifier, maxAttempts, windowMs) {
    const key = `${action}:${identifier}`;
    const now = Date.now();

    const entry = rateLimitMap.get(key);

    if (!entry || now - entry.windowStart >= windowMs) {
        // No entry yet, or the window has expired — start a fresh window.
        rateLimitMap.set(key, { count: 1, windowStart: now });
        return true;
    }

    if (entry.count >= maxAttempts) {
        // Limit exceeded within the current window.
        return false;
    }

    // Increment count within the existing window.
    entry.count += 1;
    return true;
}

/**
 * Reset the rate limit for a specific action/identifier pair.
 * Useful after a successful action to give the user a clean slate.
 *
 * @param {string} action
 * @param {string} identifier
 */
export function resetRateLimit(action, identifier) {
    rateLimitMap.delete(`${action}:${identifier}`);
}
