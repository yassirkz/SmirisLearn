import React, { createContext, useState, useEffect, useCallback, useRef } from "react";
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

// Rate limiting config (outside component — never recreated)
const RATE_LIMITS = {
  LOGIN: { limit: 5, window: 60000 },   // 5 tentatives par minute
  SIGNUP: { limit: 3, window: 3600000 }, // 3 inscriptions par heure
  RESET: { limit: 3, window: 3600000 },  // 3 reset par heure
};

export function AuthProvider({ children }) {
  const [realUser, setRealUser] = useState(null);
  const [impersonatedData, setImpersonatedData] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Use a ref for lastAttempt so reads/writes don't cause re-renders
  const lastAttemptRef = useRef({});

  // Computes the effective user (stays stable when neither changes)
  const user = React.useMemo(() => {
    if (impersonatedData) return impersonatedData;
    return realUser;
  }, [realUser, impersonatedData]);

  // ========== RATE LIMITING (stable — uses ref, no state) ==========
  const checkActionLimit = useCallback((action, identifier = "global") => {
    const key = `${action}_${identifier}`;
    const now = Date.now();
    const limit = RATE_LIMITS[action];

    if (!limit) return true;

    const attempts = lastAttemptRef.current[key] || [];
    const recentAttempts = attempts.filter((t) => t > now - limit.window);

    if (recentAttempts.length >= limit.limit) {
      setError(
        `Trop de tentatives. Réessayez dans ${Math.ceil((limit.window - (now - recentAttempts[0])) / 60000)} minutes.`,
      );
      return false;
    }

    lastAttemptRef.current[key] = [...recentAttempts, now];
    return true;
  }, []); // no deps — ref is always current

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
        const actualUser = session?.user ?? null;
        setRealUser(actualUser);

        // --- IMPERSONATION LOGIC ---
        const impId = localStorage.getItem("impersonatedUserId");
        const role = actualUser?.user_metadata?.role;
        if (impId && actualUser && ["super_admin", "org_admin"].includes(role)) {
          try {
            const { data } = await supabase
              .from("profiles")
              .select("id, email, role, full_name, organization_id")
              .eq("id", impId)
              .single();
            if (data) {
              setImpersonatedData({
                id: data.id,
                email: data.email,
                user_metadata: {
                  role: data.role,
                  full_name: data.full_name,
                  organization_id: data.organization_id,
                },
                isImpersonated: true,
                realUserRole: role,
                realUserEmail: actualUser.email,
              });
            } else {
              localStorage.removeItem("impersonatedUserId");
            }
          } catch (e) {
            console.error("Erreur chargement impersonation:", e);
            localStorage.removeItem("impersonatedUserId");
          }
        }
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
      setRealUser(session?.user ?? null);
      setError(null);
      // Mode impersonation se perd après reconnexion ou déconnexion forte
      if (!session) {
        setImpersonatedData(null);
        localStorage.removeItem("impersonatedUserId");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ========== FONCTIONS AUTH SÉCURISÉES (toutes mémoïsées) ==========

  const signUp = useCallback(async (email, password, metadata = {}) => {
    try {
      setError(null);

      if (!checkActionLimit("SIGNUP", email)) {
        return { error: { message: "Rate limit exceeded" } };
      }

      const emailStr = String(email).trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailStr)) throw new Error("Email invalide");

      if (!password || password.length < 8)
        throw new Error("Le mot de passe doit contenir au moins 8 caractères");
      if (!/[A-Z]/.test(password))
        throw new Error("Le mot de passe doit contenir au moins une majuscule");
      if (!/[0-9]/.test(password))
        throw new Error("Le mot de passe doit contenir au moins un chiffre");

      setLoading(true);

      const fullName = metadata.data?.full_name || metadata.full_name || "";

      const { data, error } = await supabase.auth.signUp({
        email: emailStr,
        password,
        options: {
          data: { full_name: fullName, role: "student" },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error("Erreur dans signUp:", error);
      setError(error.message);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  }, [checkActionLimit]);

  const signIn = useCallback(async (email, password) => {
    try {
      setError(null);

      if (!checkActionLimit("LOGIN", email)) {
        return { error: { message: "Trop de tentatives. Réessayez plus tard." } };
      }

      const validatedEmail = validateEmail(untrusted(email));
      if (!password) throw new Error("Mot de passe requis");

      setLoading(true);

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
  }, [checkActionLimit]);

  const signInWithGoogle = useCallback(async () => {
    try {
      setError(null);

      if (!checkActionLimit("LOGIN", "google")) {
        return { error: { message: "Trop de tentatives. Réessayez plus tard." } };
      }

      setLoading(true);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
          queryParams: { access_type: "offline", prompt: "consent" },
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
  }, [checkActionLimit]);

  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  // Mode Impersonation control
  const startImpersonation = useCallback(async (targetUserId) => {
    if (!realUser || !["super_admin", "org_admin"].includes(realUser.user_metadata?.role)) {
      throw new Error("Droit insuffisant pour impersonifier.");
    }
    setLoading(true);
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, email, role, full_name, organization_id")
        .eq("id", targetUserId)
        .single();
      if (data) {
        localStorage.setItem("impersonatedUserId", targetUserId);
        setImpersonatedData({
          id: data.id,
          email: data.email,
          user_metadata: {
            role: data.role,
            full_name: data.full_name,
            organization_id: data.organization_id,
          },
          isImpersonated: true,
          realUserRole: realUser.user_metadata?.role,
          realUserEmail: realUser.email,
        });
        window.location.href = data.role === "org_admin" ? "/admin" : "/student";
      }
    } catch (e) {
      console.error(e);
      alert("Erreur lors de l'impersonation");
    } finally {
      setLoading(false);
    }
  }, [realUser]);

  const stopImpersonation = useCallback(() => {
    localStorage.removeItem("impersonatedUserId");
    setImpersonatedData(null);
    const role = realUser?.user_metadata?.role;
    window.location.href = role === "super_admin" ? "/super-admin" : "/admin";
  }, [realUser]);

  // Context value — stable as long as stable deps don't change
  const value = React.useMemo(() => ({
    user,
    session,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    signInWithGoogle,
    clearError,
    startImpersonation,
    stopImpersonation,
  }), [user, session, loading, error, signUp, signIn, signOut, signInWithGoogle, clearError, startImpersonation, stopImpersonation]);

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