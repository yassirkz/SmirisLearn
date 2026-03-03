import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { untrusted, escapeText, validateEmail } from "../../utils/security";

/**
 * Composant d'input avec sanitization automatique
 * Suit les guidelines OWASP pour la validation des entrées
 */
export default function SanitizedInput({
    type = "text",
    value = "",
    onChange,
    onBlur,
    placeholder,
    label,
    required = false,
    minLength,
    maxLength,
    pattern,
    validate = "none", // 'none', 'email', 'text', 'html'
    error: externalError,
    className = "",
    ...props
    }) {
    const [internalError, setInternalError] = useState("");
    const [touched, setTouched] = useState(false);

    const error = externalError || (touched ? internalError : "");

    const handleChange = (e) => {
        const rawValue = e.target.value;
        const untrustedValue = untrusted(rawValue);

        // Validation en temps réel
        let errorMsg = "";
        let safeValue = rawValue;

        switch (validate) {
        case "email":
            try {
            safeValue = validateEmail(untrustedValue);
            } catch (err) {
            errorMsg = err.message;
            }
            break;
        case "text":
            safeValue = escapeText(untrustedValue);
            break;
        case "html":
            // Attention: le HTML nécessite sanitization spécifique
            safeValue = rawValue; // Ne pas échapper pour l'édition
            break;
        default:
            // Validation basique contre XSS
            safeValue = rawValue.replace(/[<>]/g, "");
        }

        // Validation longueur
        if (minLength && rawValue.length < minLength) {
        errorMsg = `Minimum ${minLength} caractères`;
        }

        if (maxLength && rawValue.length > maxLength) {
        errorMsg = `Maximum ${maxLength} caractères`;
        }

        // Validation pattern
        if (pattern && rawValue && !new RegExp(pattern).test(rawValue)) {
        errorMsg = "Format invalide";
        }

        setInternalError(errorMsg);

        // Modifier le target.value avant de passer l'event au parent
        e.target.value = safeValue;
        onChange?.(e);
    };

    const handleBlur = (e) => {
        setTouched(true);
        onBlur?.(e);
    };

    return (
        <div className="space-y-1">
        {label && (
            <label className="block text-sm font-medium text-secondary-700">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
            </label>
        )}

        <div className="relative">
            <input
            type={type}
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder={placeholder}
            required={required}
            minLength={minLength}
            maxLength={maxLength}
            pattern={pattern}
            className={`
                        w-full px-4 py-2.5 bg-white/80 backdrop-blur-sm
                        border-2 rounded-xl outline-none transition-all
                        ${
                        error
                            ? "border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                            : "border-secondary-200 focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
                        }
                        ${className}
                    `}
            {...props}
            />

            {/* Indicateur de validation */}
            <AnimatePresence>
            {error && (
                <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                <AlertCircle className="w-5 h-5 text-red-500" />
                </motion.div>
            )}
            </AnimatePresence>
        </div>

        {/* Message d'erreur animé */}
        <AnimatePresence>
            {error && (
            <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-sm text-red-500 flex items-center gap-1"
            >
                <AlertCircle className="w-4 h-4" />
                {error}
            </motion.p>
            )}
        </AnimatePresence>
        </div>
    );
}
