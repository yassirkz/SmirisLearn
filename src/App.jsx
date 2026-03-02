import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "./lib/supabase";

function App() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    // Test Supabase dans la console
    const testSupabase = async () => {
      console.log("🔍 Test de connexion Supabase...");

      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("❌ Erreur Supabase:", error.message);
      } else {
        console.log("✅ Supabase connecté !");
        console.log("Session:", data);
      }
    };

    testSupabase();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Éléments de fond animés */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-float animate-delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-secondary-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse-soft"></div>
      </div>

      {/* Carte principale avec glassmorphism */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={isVisible ? { opacity: 1, scale: 1, y: 0 } : {}}
        transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}
        className="relative glass-card rounded-3xl p-10 max-w-2xl w-full text-center border border-white/30 shadow-2xl"
      >
        {/* Logo avec animation */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", bounce: 0.5 }}
          className="w-24 h-24 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl mx-auto mb-8 flex items-center justify-center shadow-2xl shadow-primary-200"
        >
          <span className="text-4xl font-bold text-white">S</span>
        </motion.div>

        {/* Titre avec effet de gradient */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-5xl font-bold title-gradient mb-4"
        >
          Smiris Learn
        </motion.h1>

        {/* Sous-titre avec animation */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-xl text-secondary-600 mb-8"
        >
          La formation flexible pour les entreprises
        </motion.p>

        {/* Message de succès avec animation */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, type: "spring" }}
          className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 mb-8 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-shimmer"></div>
          <span className="text-5xl mb-2 block">🚀</span>
          <p className="text-emerald-700 font-semibold text-lg">
            Setup réussi !
          </p>
          <p className="text-emerald-600">
            Jour 1 - Structure de projet avec animations premium
          </p>
        </motion.div>

        {/* Stats animées */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Animations", value: "24+", icon: "✨" },
            { label: "Composants", value: "50+", icon: "🧩" },
            { label: "Couleurs", value: "100+", icon: "🎨" },
          ].map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + index * 0.1 }}
              whileHover={{ scale: 1.05, y: -5 }}
              className="glass rounded-xl p-4 text-center hover:shadow-xl transition-all duration-300"
            >
              <span className="text-2xl mb-1 block">{stat.icon}</span>
              <div className="font-bold text-primary-600 text-xl">
                {stat.value}
              </div>
              <div className="text-xs text-secondary-500">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Boutons avec animations */}
        <div className="flex gap-4 justify-center">
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn-primary"
          >
            Commencer
          </motion.button>

          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
            whileHover={{ scale: 1.05, backgroundColor: "#f8fafc" }}
            whileTap={{ scale: 0.95 }}
            className="btn-secondary"
          >
            En savoir plus
          </motion.button>
        </div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-sm text-secondary-400 mt-8"
        >
          Configuration premium avec Tailwind CSS + Framer Motion
        </motion.p>
      </motion.div>
    </div>
  );
}

export default App;
