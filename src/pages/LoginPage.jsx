import { useMemo } from "react";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
import LoginForm from "../components/auth/LoginForm";

// Generate particles outside component to avoid impure function during render
const generateParticles = () => {
  return [...Array(15)].map((_, i) => ({
    id: i,
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    color: i % 3 === 0 ? "#3B82F6" : i % 3 === 1 ? "#8B5CF6" : "#EC4899",
    duration: Math.random() * 10 + 8,
    offsetX: Math.random() * 80 - 40,
  }));
};

export default function LoginPage() {
  // Memoize particles to calculate only once on mount
  const particles = useMemo(() => generateParticles(), []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Particules animées */}
      <div className="absolute inset-0 overflow-hidden">
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute w-2 h-2 rounded-full"
            style={{
              background: particle.color,
              opacity: 0.1,
            }}
            initial={{
              x: particle.x,
              y: particle.y,
            }}
            animate={{
              y: [null, -80, null],
              x: [null, particle.offsetX, null],
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
      </div>

      {/* Éléments flous */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float" />
        <div
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float"
          style={{ animationDelay: "2s" }}
        />
      </div>

      {/* Formulaire */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, type: "spring" }}
        className="relative w-full max-w-md z-10"
      >
        <LoginForm />
      </motion.div>
    </div>
  );
}
