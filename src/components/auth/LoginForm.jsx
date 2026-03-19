import React, { useState } from "react";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import {
  LogIn,
  UserPlus,
  Sparkles,
  Shield,
  Zap,
  CheckCircle,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

export default function LoginForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState({
    email: false,
    password: false,
    fullName: false,
  });

  const { signIn, signUp, signInWithGoogle } = useAuth();

  // Validation
  const validateEmail = (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value) return "Champ requis";
    if (!emailRegex.test(value)) return "Email invalide";
    return "";
  };

  const validatePassword = (value) => {
    if (!value) return "Champ requis";
    if (value.length < 8) return "Le mot de passe doit contenir au moins 8 caractères";
    if (!/[A-Z]/.test(value)) return "Le mot de passe doit contenir au moins une majuscule";
    if (!/[0-9]/.test(value)) return "Le mot de passe doit contenir au moins un chiffre";
    return "";
  };

  const validateFullName = (value) => {
    if (!isLogin && !value) return "Le nom est requis";
    return "";
  };

  const emailError = touched.email ? validateEmail(email) : "";
  const passwordError = touched.password ? validatePassword(password) : "";
  const fullNameError =
    !isLogin && touched.fullName ? validateFullName(fullName) : "";

  const isValid =
    !emailError &&
    !passwordError &&
    !fullNameError &&
    email &&
    password &&
    (isLogin || fullName);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;

    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) throw error;
      } else {
        const { error } = await signUp(email, password, {
          data: { full_name: fullName },
        });
        if (error) throw error;
        alert("Veuillez vérifier vos e-mails pour confirmer votre compte.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl border border-blue-100 dark:border-gray-700 relative overflow-hidden transition-colors duration-300">
      {/* Badge premium - uiverse.io style */}
      <div className="absolute -top-1 -right-1">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-bl-2xl rounded-tr-2xl text-xs font-bold shadow-lg flex items-center gap-1 animate-pulse">
          <Sparkles className="w-3 h-3" />
            By Yassir.kz
        </div>
      </div>

      {/* Logo */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-blue-200 dark:shadow-blue-900/30 animate-bounce-slow">
          <span className="text-3xl font-bold text-white">S</span>
        </div>

        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Smiris Learn</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          {isLogin ? "Heureux de vous revoir !" : "Rejoignez l'aventure"}
        </p>
      </div>

      {/* Toggle - uiverse.io style */}
      <div className="flex p-1 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-700 rounded-xl mb-6 border border-blue-100 dark:border-gray-600">
        <button
          onClick={() => setIsLogin(true)}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 transform hover:scale-105 ${
            isLogin
              ? "bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-md border border-blue-200 dark:border-gray-500"
              : "text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
          }`}
        >
          Connexion
        </button>
        <button
          onClick={() => setIsLogin(false)}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 transform hover:scale-105 ${
            !isLogin
              ? "bg-white dark:bg-gray-600 text-purple-600 dark:text-purple-400 shadow-md border border-purple-200 dark:border-gray-500"
              : "text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400"
          }`}
        >
          Inscription
        </button>
      </div>

      {/* Message d'erreur */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 rounded-lg text-red-600 dark:text-red-400 text-sm flex items-center gap-2"
          >
            <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Nom complet - uiverse.io style */}
        {!isLogin && (
          <div className="relative group">
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              onBlur={() => setTouched({ ...touched, fullName: true })}
              className="w-full px-4 py-3.5 bg-white dark:bg-gray-700 border-2 rounded-xl text-gray-800 dark:text-white outline-none transition-all duration-300 peer
                border-gray-200 dark:border-gray-600 focus:border-purple-400 dark:focus:border-purple-500 focus:ring-4 focus:ring-purple-100 dark:focus:ring-purple-900/30
                hover:border-purple-300 dark:hover:border-purple-500"
              placeholder=" "
            />
            <label
              className={`absolute left-4 transition-all duration-300 pointer-events-none
              ${
                fullName
                  ? "-top-2 text-xs bg-white dark:bg-gray-700 px-2 text-purple-600 dark:text-purple-400"
                  : "top-3.5 text-gray-400 dark:text-gray-500 text-base peer-focus:-top-2 peer-focus:text-xs peer-focus:bg-white dark:peer-focus:bg-gray-700 peer-focus:px-2 peer-focus:text-purple-600 dark:peer-focus:text-purple-400"
              }`}
            >
              <span className="flex items-center gap-1">
                Nom complet
                <span className="text-red-400">*</span>
              </span>
            </label>
            {fullNameError && touched.fullName && (
              <p className="text-red-500 dark:text-red-400 text-xs mt-1 ml-1">{fullNameError}</p>
            )}
          </div>
        )}

        {/* Email - uiverse.io style */}
        <div className="relative group">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched({ ...touched, email: true })}
            className="w-full px-4 py-3.5 bg-white dark:bg-gray-700 border-2 rounded-xl text-gray-800 dark:text-white outline-none transition-all duration-300 peer
              border-gray-200 dark:border-gray-600 focus:border-blue-400 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30
              hover:border-blue-300 dark:hover:border-blue-500"
            placeholder=" "
          />
          <label
            className={`absolute left-4 transition-all duration-300 pointer-events-none
            ${
              email
                ? "-top-2 text-xs bg-white dark:bg-gray-700 px-2 text-blue-600 dark:text-blue-400"
                : "top-3.5 text-gray-400 dark:text-gray-500 text-base peer-focus:-top-2 peer-focus:text-xs peer-focus:bg-white dark:peer-focus:bg-gray-700 peer-focus:px-2 peer-focus:text-blue-600 dark:peer-focus:text-blue-400"
            }`}
          >
            <span className="flex items-center gap-1">
              Adresse email
              <span className="text-red-400">*</span>
            </span>
          </label>
          {emailError && touched.email && (
            <p className="text-red-500 dark:text-red-400 text-xs mt-1 ml-1">{emailError}</p>
          )}
        </div>

        {/* Mot de passe - uiverse.io style */}
        <div className="relative group">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => setTouched({ ...touched, password: true })}
            className="w-full px-4 py-3.5 bg-white dark:bg-gray-700 border-2 rounded-xl text-gray-800 dark:text-white outline-none transition-all duration-300 peer
              border-gray-200 dark:border-gray-600 focus:border-blue-400 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30
              hover:border-blue-300 dark:hover:border-blue-500"
            placeholder=" "
          />
          <label
            className={`absolute left-4 transition-all duration-300 pointer-events-none
            ${
              password
                ? "-top-2 text-xs bg-white dark:bg-gray-700 px-2 text-blue-600 dark:text-blue-400"
                : "top-3.5 text-gray-400 dark:text-gray-500 text-base peer-focus:-top-2 peer-focus:text-xs peer-focus:bg-white dark:peer-focus:bg-gray-700 peer-focus:px-2 peer-focus:text-blue-600 dark:peer-focus:text-blue-400"
            }`}
          >
            <span className="flex items-center gap-1">
              Mot de passe
              <span className="text-red-400">*</span>
            </span>
          </label>
          {passwordError && touched.password && (
            <p className="text-red-500 dark:text-red-400 text-xs mt-1 ml-1">{passwordError}</p>
          )}
        </div>

        {/* Bouton principal - uiverse.io style */}
        <motion.button
          type="submit"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          disabled={!isValid || loading}
          className={`
            w-full py-4 rounded-xl font-semibold text-white
            transition-all duration-300 relative overflow-hidden group
            ${
              isValid
                ? isLogin
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg shadow-blue-200 dark:shadow-blue-900/30 hover:shadow-xl hover:shadow-blue-300 dark:hover:shadow-blue-900/50"
                  : "bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg shadow-purple-200 dark:shadow-purple-900/30 hover:shadow-xl hover:shadow-purple-300 dark:hover:shadow-purple-900/50"
                : "bg-gray-300 dark:bg-gray-600 cursor-not-allowed"
            }
          `}
        >
          <span className="absolute inset-0 bg-white/20 transform -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Chargement...</span>
            </div>
          ) : (
            <span className="flex items-center justify-center gap-2">
              {isLogin ? (
                <LogIn className="w-5 h-5" />
              ) : (
                <UserPlus className="w-5 h-5" />
              )}
              {isLogin ? "Se connecter" : "S'inscrire"}
            </span>
          )}
        </motion.button>
      </form>

      {/* Lien bascule */}
      <p className="text-center mt-6">
        <button
          onClick={() => setIsLogin(!isLogin)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors relative group"
        >
          <span className="relative">
            {isLogin
              ? "Pas encore de compte ? S'inscrire"
              : "Déjà un compte ? Se connecter"}
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 dark:bg-blue-400 group-hover:w-full transition-all duration-300" />
          </span>
        </button>
      </p>

      {/* Séparateur */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200 dark:border-gray-600"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500">ou</span>
        </div>
      </div>

      {/* Bouton Google - uiverse.io style */}
      <button
        onClick={signInWithGoogle}
        disabled={loading}
        className="group relative w-full overflow-hidden rounded-xl bg-white dark:bg-gray-700 px-6 py-3.5 border-2 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative flex items-center justify-center gap-3">
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-blue-200/50 dark:via-blue-800/30 to-transparent" />
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span className="text-gray-700 dark:text-gray-200 font-medium group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
            {loading ? "Connexion..." : "Continuer avec Google"}
          </span>
        </div>
      </button>

      {/* Badges sécurité - uiverse.io style */}
      <div className="flex justify-center gap-6 mt-6">
        <div className="flex items-center gap-1 text-gray-400 dark:text-gray-500 text-xs group cursor-default">
          <Shield className="w-3 h-3 text-blue-400 dark:text-blue-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" />
          <span className="group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
            Données chiffrées
          </span>
        </div>
        <div className="flex items-center gap-1 text-gray-400 dark:text-gray-500 text-xs group cursor-default">
          <Zap className="w-3 h-3 text-purple-400 dark:text-purple-500 group-hover:text-purple-500 dark:group-hover:text-purple-400 transition-colors" />
          <span className="group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
            Connexion rapide
          </span>
        </div>
        <div className="flex items-center gap-1 text-gray-400 dark:text-gray-500 text-xs group cursor-default">
          <CheckCircle className="w-3 h-3 text-green-400 dark:text-green-500 group-hover:text-green-500 dark:group-hover:text-green-400 transition-colors" />
          <span className="group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
            100% sécurisé
          </span>
        </div>
      </div>
    </div>
  );
}
