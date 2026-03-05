import React, { createContext, useState, useEffect, useCallback } from "react";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
// eslint-disable-next-line no-unused-vars
import { checkRateLimit, untrusted, validateEmail } from "../utils/security";
import LoadingSpinner from "../components/ui/LoadingSpinner";

export const AuthContext = createContext();

// Variants pour animations
const pageVariants = {
  initial: { opacity: 0, x: -100 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { type: "spring", stiffness: 100, damping: 20 },
  },
  exit: {
    opacity: 0,
    x: 100,
    transition: { duration: 0.3 },
  },
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastAttempt, setLastAttempt] = useState({});

  // Rate limiting config
  const RATE_LIMITS = {
    LOGIN: { limit: 5, window: 60000 }, // 5 tentatives par minute
    SIGNUP: { limit: 3, window: 3600000 }, // 3 inscriptions par heure
    RESET: { limit: 3, window: 3600000 }, // 3 reset par heure
  };

  // Vérification rate limit
  const checkActionLimit = useCallback(
    (action, identifier = "global") => {
      const key = `${action}_${identifier}`;
      const now = Date.now();
      const limit = RATE_LIMITS[action];

      if (!limit) return true;

      const attempts = lastAttempt[key] || [];
      const recentAttempts = attempts.filter((t) => t > now - limit.window);

      if (recentAttempts.length >= limit.limit) {
        setError(
          `Trop de tentatives. Réessayez dans ${Math.ceil((limit.window - (now - recentAttempts[0])) / 60000)} minutes.`,
        );
        return false;
      }

      setLastAttempt((prev) => ({
        ...prev,
        [key]: [...recentAttempts, now],
      }));

      return true;
    },
    [lastAttempt],
  );

  useEffect(() => {
    // Récupérer session initiale
    const getInitialSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        if (error) throw error;

        setSession(session);
        setUser(session?.user ?? null);
      } catch (error) {
        console.error("Erreur session:", error);
        setError("Erreur de connexion au serveur");
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Écouter changements d'auth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setError(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ========== FONCTIONS AUTH SÉCURISÉES ==========

  const signUp = async (email, password, metadata = {}) => {
    try {
      setError(null);

      // 1. Rate limiting
      if (!checkActionLimit("SIGNUP", email)) {
        return { error: { message: "Rate limit exceeded" } };
      }

      // 2. Validation email
      const validatedEmail = validateEmail(untrusted(email));

      // 3. Validation password (OWASP)
      if (!password || password.length < 8) {
        throw new Error("Le mot de passe doit contenir au moins 8 caractères");
      }

      if (!/[A-Z]/.test(password)) {
        throw new Error("Le mot de passe doit contenir au moins une majuscule");
      }

      if (!/[0-9]/.test(password)) {
        throw new Error("Le mot de passe doit contenir au moins un chiffre");
      }

      setLoading(true);

      // 4. Tentative d'inscription
      const { data, error } = await supabase.auth.signUp({
        email: validatedEmail,
        password,
        options: {
          data: metadata,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      setError(error.message);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email, password) => {
    try {
      setError(null);

      // 1. Rate limiting
      if (!checkActionLimit("LOGIN", email)) {
        return {
          error: { message: "Trop de tentatives. Réessayez plus tard." },
        };
      }

      // 2. Validation basique
      const validatedEmail = validateEmail(untrusted(email));

      if (!password) {
        throw new Error("Mot de passe requis");
      }

      setLoading(true);

      // 3. Tentative de connexion
      const { data, error } = await supabase.auth.signInWithPassword({
        email: validatedEmail,
        password,
      });

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      setError(error.message);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  // ✅ NOUVELLE FONCTION : Connexion avec Google
  const signInWithGoogle = async () => {
    try {
      setError(null);

      // Rate limiting
      if (!checkActionLimit("LOGIN", "google")) {
        return {
          error: { message: "Trop de tentatives. Réessayez plus tard." },
        };
      }

      setLoading(true);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      setError(error.message);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    session,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    signInWithGoogle, 
    clearError: () => setError(null),
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50"
      >
        <div className="text-center space-y-4">
          <LoadingSpinner size="xl" color="primary" />
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-secondary-600 font-medium"
          >
            Chargement sécurisé...
          </motion.p>
        </div>
      </motion.div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      <AnimatePresence mode="wait">
        <motion.div
          key={user ? "authenticated" : "unauthenticated"}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="min-h-screen"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </AuthContext.Provider>
  );
}