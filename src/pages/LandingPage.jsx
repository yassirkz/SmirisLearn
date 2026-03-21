// src/pages/LandingPage.jsx
import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, BookOpen, Video, Award, Users, Moon, Sun, Globe,
  CheckCircle, Star, ChevronRight, Menu, X, Send,
  Building, Mail, User, MessageSquare, ArrowRight, Lock,
  Zap, Shield, TrendingUp, PlayCircle, ChevronDown, ChevronUp,
  Quote, MousePointer, BarChart3, Clock, Headphones
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { useToast } from '../hooks/useToast';
import { supabase } from '../lib/supabase';
import { untrusted, escapeText, validateEmail } from '../utils/security';

// Composant pour chaque section avec scroll snap
const Section = ({ children, id, className = '', snap = true }) => (
  <section
    id={id}
    className={`min-h-screen ${snap ? 'snap-start snap-always' : ''} flex items-center justify-center py-20 px-4 md:px-8 relative ${className}`}
  >
    {children}
  </section>
);

// Particules flottantes en arrière-plan
const FloatingParticle = ({ color, size, duration, delay, top, left }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0 }}
    animate={{ 
      opacity: [0.2, 0.5, 0.2],
      scale: [1, 1.2, 1],
      y: [0, -40, 0],
      x: [0, 20, 0]
    }}
    transition={{ 
      duration, 
      delay, 
      repeat: Infinity,
      ease: "easeInOut"
    }}
    style={{ top, left }}
    className={`absolute ${size} ${color} rounded-full blur-xl pointer-events-none z-0`}
  />
);

// Petite carte UI flottante pour le Hero
const FloatingCard = ({ children, className, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 1, type: 'spring' }}
    className={`absolute z-20 hidden md:flex items-center gap-3 p-4 bg-white/70 dark:bg-gray-800/70 backdrop-blur-md rounded-2xl border border-white/40 dark:border-gray-700/40 shadow-2xl ${className}`}
  >
    {children}
  </motion.div>
);

// Navigation par points latéraux
const SideNav = ({ sections, activeSection }) => {
  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="fixed right-4 top-1/2 transform -translate-y-1/2 z-50 flex flex-col gap-3">
      {sections.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => scrollToSection(id)}
          className="group relative"
          aria-label={`Aller à ${label}`}
        >
          <div
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              activeSection === id
                ? 'bg-primary-500 dark:bg-primary-400 scale-125'
                : 'bg-gray-300 dark:bg-gray-600 hover:bg-primary-400 dark:hover:bg-primary-500'
            }`}
          />
          <span className="absolute right-6 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            {label}
          </span>
        </button>
      ))}
    </div>
  );
};

// Carte de fonctionnalité
const FeatureCard = ({ icon: Icon, title, description, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay }}
    viewport={{ once: true, margin: "-100px" }}
    whileHover={{ y: -5, scale: 1.02 }}
    className="group relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-primary-100 dark:border-gray-700 overflow-hidden"
  >
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-gray-700/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
    <div className="relative z-10">
      <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform">
        <Icon className="w-8 h-8 text-white" />
      </div>
      <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-3">{title}</h3>
      <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{description}</p>
    </div>
  </motion.div>
);

// Carte de témoignage
const TestimonialCard = ({ name, role, content, rating, avatar, delay }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    whileInView={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.5, delay }}
    viewport={{ once: true }}
    whileHover={{ y: -5 }}
    className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-primary-100 dark:border-gray-700 relative overflow-hidden group"
  >
    <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
      <Quote className="w-16 h-16 text-primary-500 dark:text-primary-400" />
    </div>
    <div className="flex gap-1 text-yellow-400 mb-6">
      {[...Array(5)].map((_, i) => (
        <Star key={i} className="w-4 h-4 fill-current" />
      ))}
    </div>
    <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed italic">"{content}"</p>
    <div className="flex items-center gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
      <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
        {avatar || name.charAt(0)}
      </div>
      <div>
        <h4 className="font-bold text-gray-800 dark:text-white">{name}</h4>
        <p className="text-sm text-gray-500 dark:text-gray-400">{role}</p>
      </div>
    </div>
  </motion.div>
);

// Composant FAQ
const FaqItem = ({ question, answer, isOpen, onClick }) => (
  <div className="border border-primary-100 dark:border-gray-700 rounded-2xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm overflow-hidden transition-all">
    <button
      onClick={onClick}
      className="w-full px-6 py-4 flex items-center justify-between text-left focus:outline-none"
    >
      <span className="font-bold text-gray-800 dark:text-white">{question}</span>
      {isOpen ? (
        <ChevronUp className="w-5 h-5 text-primary-600 dark:text-primary-400 shrink-0" />
      ) : (
        <ChevronDown className="w-5 h-5 text-gray-400 dark:text-gray-500 shrink-0" />
      )}
    </button>
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="px-6 pb-4 text-gray-600 dark:text-gray-300">
            {answer}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

// Carte de prix
const PricingCard = ({ name, price, subtext, features, isPopular, delay, onSelect }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay }}
    viewport={{ once: true }}
    whileHover={{ y: -8 }}
    className={`relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border ${
      isPopular
        ? 'border-primary-500 dark:border-primary-400 scale-105'
        : 'border-primary-100 dark:border-gray-700'
    } overflow-hidden group`}
  >
    {isPopular && (
      <div className="absolute top-0 right-0 bg-gradient-to-r from-primary-600 to-primary-800 text-white px-4 py-1 rounded-bl-2xl text-sm font-bold">
        Populaire
      </div>
    )}
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-gray-700/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
    <div className="relative z-10">
      <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">{name}</h3>
      <div className="mb-6 h-16">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-primary-600 dark:text-primary-400">{price}</span>
          {price !== '0€' && price !== 'Sur devis' && <span className="text-gray-500 dark:text-gray-400">/mois</span>}
        </div>
        {subtext ? (
          <div className="text-sm font-medium text-green-500 dark:text-green-400 mt-1">
            {subtext}
          </div>
        ) : (
          <div className="text-sm text-transparent mt-1 select-none">.</div>
        )}
      </div>
      <ul className="space-y-3 mb-8">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2 text-gray-600 dark:text-gray-300">
            <CheckCircle className="w-5 h-5 text-green-500 dark:text-green-400 shrink-0 mt-0.5" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={onSelect}
        className={`w-full py-4 rounded-2xl font-bold text-white transition-all shadow-lg hover:shadow-xl ${
          isPopular
            ? 'bg-gradient-to-r from-primary-600 to-primary-800 hover:from-primary-700 hover:to-primary-900'
            : 'bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600'
        }`}
      >
        Choisir ce plan
      </button>
    </div>
  </motion.div>
);

export default function LandingPage() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const containerRef = useRef(null);
  const [activeSection, setActiveSection] = useState('hero');
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAnnual, setIsAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    companyName: '',
    message: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [sending, setSending] = useState(false);

  const faqs = [
    {
      question: "Les vidéos sont-elles hébergées chez vous ?",
      answer: "Oui, nous hébergeons toutes vos vidéos sur des serveurs sécurisés et optimisés pour une lecture fluide partout dans le monde."
    },
    {
      question: "Puis-je personnaliser les quiz ?",
      answer: "Absolument ! Créez des QCM, vrai/faux, avec timer, nombre de tentatives limité, et feedback détaillé pour chaque réponse."
    },
    {
      question: "Combien de membres puis-je ajouter ?",
      answer: "Cela dépend de votre plan. Le plan Starter est gratuit jusqu’à 10 membres, Pro jusqu’à 100, et Enterprise est illimité."
    },
    {
      question: "Y a-t-il un support technique ?",
      answer: "Oui, nous offrons un support par email pour tous les plans, et un support prioritaire avec un account manager dédié pour le plan Enterprise."
    },
    {
      question: "Mes données sont-elles sécurisées ?",
      answer: "La sécurité est notre priorité. Nous utilisons le chiffrement SSL, des politiques RLS (Row Level Security) au niveau de la base de données, et des sauvegardes régulières."
    }
  ];

  // Sections pour la navigation
  const sections = [
    { id: 'hero', label: 'Accueil' },
    { id: 'features', label: 'Fonctionnalités' },
    { id: 'how-it-works', label: 'Comment ça marche' },
    { id: 'testimonials', label: 'Témoignages' },
    { id: 'demo', label: 'Aperçu' },
    { id: 'faq', label: 'FAQ' },
    { id: 'contact', label: 'Contact' },
    { id: 'cta', label: 'Inscription' }
  ];

  // Détecter la section active lors du scroll (optimisé)
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollPosition = window.scrollY + 100;
          for (const section of sections) {
            const element = document.getElementById(section.id);
            if (element) {
              const { offsetTop, offsetHeight } = element;
              if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
                setActiveSection(section.id);
                break;
              }
            }
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [sections]);

  // Rediriger si déjà connecté
  useEffect(() => {
    if (user) {
      if (user.role === 'super_admin') navigate('/super-admin');
      else if (user.role === 'org_admin') navigate('/admin');
      else navigate('/student');
    }
  }, [user, navigate]);

  // Animation parallaxe pour la section hero
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);
  const heroImageY = useTransform(scrollYProgress, [0, 0.3], [0, 60]);

  // Validation du formulaire de contact
  const validateForm = () => {
    const errors = {};
    if (!formData.fullName.trim()) errors.fullName = 'Nom requis';
    else if (formData.fullName.length < 2) errors.fullName = 'Minimum 2 caractères';
    
    try {
      validateEmail(untrusted(formData.email.trim()));
    } catch (e) {
      errors.email = e.message;
    }
    
    if (!formData.message.trim()) errors.message = 'Message requis';
    else if (formData.message.length < 10) errors.message = 'Minimum 10 caractères';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Effacer l'erreur du champ modifié
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmitContact = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSending(true);
    try {
      // Option 1 : stocker dans une table 'contacts' (à créer)
      const { error } = await supabase
        .from('contacts')
        .insert([{
          full_name: escapeText(untrusted(formData.fullName.trim())),
          email: validateEmail(untrusted(formData.email.trim())),
          company_name: escapeText(untrusted(formData.companyName.trim())) || null,
          message: escapeText(untrusted(formData.message.trim()))
        }]);

      if (error) throw error;

      success('Message envoyé avec succès ! Nous vous répondrons bientôt.');
      setFormData({ fullName: '', email: '', companyName: '', message: '' });
      setFormErrors({});
    } catch (err) {
      console.error('Erreur envoi message:', err);
      showError('Erreur lors de l\'envoi. Veuillez réessayer.');
    } finally {
      setSending(false);
    }
  };

  // Animation pour les particules (optionnel)
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 1,
    duration: Math.random() * 20 + 10
  }));

  return (
    <div 
      ref={containerRef}
      className="h-screen overflow-y-scroll snap-y snap-proximity scroll-smooth bg-gradient-to-br from-slate-50 via-primary-50 to-primary-100 dark:from-slate-950 dark:via-gray-900 dark:to-slate-950"
    >
      {/* Header fixe avec glassmorphisme */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 100 }}
        className="fixed top-0 left-0 right-0 z-50 bg-white/70 dark:bg-secondary-950/70 backdrop-blur-xl border-b border-primary-100 dark:border-gray-800"
      >
        <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-20">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-primary-600 to-primary-800 rounded-xl flex items-center justify-center shadow-lg shrink-0">
                <span className="text-lg sm:text-xl font-bold text-white">S</span>
              </div>
              <span className="font-bold text-gray-800 dark:text-white text-lg sm:text-xl tracking-tight hidden min-[380px]:block">Smiris Learn</span>
            </div>

            {/* Navigation desktop */}
            <nav className="hidden lg:flex items-center gap-8">
              {sections.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => document.getElementById(id).scrollIntoView({ behavior: 'smooth' })}
                  className={`text-sm font-medium transition-colors ${
                    activeSection === id
                      ? 'text-primary-600 dark:text-primary-400'
                      : 'text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </nav>

            {/* Boutons */}
            <div className="flex items-center gap-1.5 sm:gap-3">

              <button
                onClick={toggleTheme}
                className="p-1.5 sm:p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                aria-label="Changer le thème"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              <button
                onClick={() => navigate('/login')}
                className="hidden md:inline-flex items-center gap-2 px-3 lg:px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 font-medium transition-colors whitespace-nowrap"
              >
                Se connecter
              </button>
              
              <button
                onClick={() => navigate('/login?signup=true')}
                className="hidden sm:inline-flex px-4 lg:px-6 py-2 lg:py-2.5 bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all whitespace-nowrap"
              >
                Essai gratuit
              </button>

              <button
                onClick={() => navigate('/login?signup=true')}
                className="sm:hidden px-3 py-1.5 bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-lg font-bold shadow-lg text-sm whitespace-nowrap"
              >
                Essai
              </button>
              
              {/* Menu mobile */}
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="lg:hidden p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                {menuOpen ? <X className="w-6 h-6 text-gray-600 dark:text-gray-300" /> : <Menu className="w-6 h-6 text-gray-600 dark:text-gray-300" />}
              </button>
            </div>
          </div>
        </div>

        {/* Menu mobile déroulant */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white dark:bg-secondary-950 border-t border-primary-100 dark:border-gray-800 overflow-hidden"
            >
              <div className="px-4 py-6 space-y-4">
                {sections.map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => {
                      document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
                      setMenuOpen(false);
                    }}
                    className="block w-full text-left px-4 py-3 rounded-xl hover:bg-primary-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <span className="text-gray-800 dark:text-white font-medium">{label}</span>
                  </button>
                ))}
                <hr className="border-gray-200 dark:border-gray-700" />
                <button
                  onClick={() => {
                    navigate('/login');
                    setMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Se connecter
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Navigation latérale */}
      <SideNav sections={sections} activeSection={activeSection} />

      {/* Particules décoratives (optionnel) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {particles.map(p => (
          <motion.div
            key={p.id}
            className="absolute bg-primary-200 dark:bg-primary-900/30 rounded-full"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
            }}
            animate={{
              y: [0, -30, 0],
              x: [0, Math.sin(p.id) * 20, 0],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        ))}
      </div>

      {/* Section Hero */}
      <Section id="hero" className="relative overflow-hidden bg-secondary-50/30 dark:bg-secondary-950/30">
        {/* Background Particles */}
        <FloatingParticle top="10%" left="5%" size="w-64 h-64" color="bg-primary-300/20 dark:bg-primary-600/10" duration={8} delay={0} />
        <FloatingParticle top="60%" left="15%" size="w-48 h-48" color="bg-primary-400/20 dark:bg-primary-700/10" duration={10} delay={1} />
        <FloatingParticle top="20%" left="80%" size="w-72 h-72" color="bg-primary-500/20 dark:bg-primary-800/10" duration={12} delay={2} />
        <FloatingParticle top="70%" left="85%" size="w-40 h-40" color="bg-accent-400/20 dark:bg-accent-600/10" duration={9} delay={1.5} />

        <motion.div
          style={{ opacity: heroOpacity, scale: heroScale }}
          className="max-w-7xl mx-auto relative z-10 w-full"
        >
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            {/* Left: Text */}
            <div className="flex-1 text-center lg:text-left">
              <motion.div
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.8, type: 'spring' }}
                className="w-16 h-16 mb-8 bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl flex items-center justify-center shadow-[0_10px_40px_-10px_rgba(139,92,246,0.5)] mx-auto lg:mx-0 group hover:rotate-12 transition-transform duration-500"
              >
                <Sparkles className="w-8 h-8 text-white animate-pulse" />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-md rounded-full border border-primary-100/50 dark:border-gray-700/50 mb-6 shadow-sm group hover:border-primary-300 transition-colors"
              >
                <div className="flex -space-x-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-800 bg-gradient-to-br from-indigo-400 to-purple-400" />
                  ))}
                </div>
                <span className="text-xs font-bold text-gray-600 dark:text-gray-300 tracking-tight">
                  <span className="text-primary-600 dark:text-primary-400">500+</span> entreprises nous font confiance
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-black text-gray-900 dark:text-white mb-6 tracking-tight leading-[1.1]"
              >
                Formez vos équipes
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary-600 via-primary-700 to-primary-500 animate-gradient-text py-2">
                  sans effort
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed"
              >
                Simplifiez la création de vos parcours pédagogiques. Gérez vos vidéos, quiz, et suivez la progression de vos collaborateurs en temps réel.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex flex-col sm:flex-row gap-6 justify-center lg:justify-start items-center"
              >
                <div className="flex flex-col items-center lg:items-start gap-3">
                  <button
                    onClick={() => navigate('/login?signup=true')}
                    className="px-10 py-5 bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-2xl text-xl font-bold shadow-[0_20px_50px_-15px_rgba(139,92,246,0.5)] hover:shadow-[0_25px_60px_-15px_rgba(139,92,246,0.6)] hover:scale-105 active:scale-95 transition-all flex items-center gap-3 group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    <span className="relative">Commencer gratuitement</span>
                    <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform relative" />
                  </button>
                  <span className="text-xs font-medium text-gray-400 dark:text-gray-500 ml-2">
                    ✓ Pas de carte bancaire  •  ✓ Essai 14 jours
                  </span>
                </div>
                
                <button
                  onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
                  className="px-8 py-5 bg-white/30 dark:bg-gray-800/30 backdrop-blur-md border-2 border-primary-100 dark:border-primary-900/50 text-gray-800 dark:text-white rounded-2xl text-lg font-bold hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all flex items-center gap-2 group shadow-xl"
                >
                  <PlayCircle className="w-5 h-5 text-primary-600 dark:text-primary-400 group-hover:scale-110 transition-transform" />
                  Découvrir
                </button>
              </motion.div>
            </div>

            {/* Right: Hero Illustration */}
            <motion.div
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              style={{ y: heroImageY }}
              className="flex-1 relative"
            >
              {/* Floating UI cards */}
              <FloatingCard className="-top-12 -left-8" delay={1.2}>
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Activité</span>
                  <span className="text-sm font-black text-gray-900 dark:text-white">+24% ce mois</span>
                </div>
              </FloatingCard>

              <FloatingCard className="top-1/2 -right-12 translate-y-[-50%]" delay={1.4}>
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-800 bg-gradient-to-br from-indigo-500 to-purple-500" />
                  ))}
                </div>
                <div className="flex flex-col ml-1">
                  <span className="text-sm font-black text-gray-900 dark:text-white">12.4k</span>
                  <span className="text-[10px] font-bold text-gray-400">Étudiants actifs</span>
                </div>
              </FloatingCard>

              <FloatingCard className="-bottom-8 left-12" delay={1.6}>
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                  <Award className="w-5 h-5 text-primary-600" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-black text-gray-900 dark:text-white">Certifié ROI</span>
                  <span className="text-[10px] font-bold text-gray-400">Garantie Qualiopi</span>
                </div>
              </FloatingCard>

              {/* Decorative blobs */}
              <div className="absolute -top-10 -right-10 w-72 h-72 bg-gradient-to-br from-primary-400 to-primary-700 rounded-full opacity-20 blur-3xl animate-pulse" />
              <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-gradient-to-br from-primary-700 to-primary-500 rounded-full opacity-15 blur-3xl" />
              
              {/* Glow ring */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-[90%] h-[90%] rounded-3xl bg-gradient-to-br from-primary-500/10 to-primary-700/10 dark:from-primary-500/20 dark:to-primary-700/20 blur-xl" />
              </div>

              <img
                src="/images/hero.png"
                alt="Smiris Learn - Plateforme de formation en ligne"
                loading="lazy"
                className="relative z-10 w-full max-w-lg lg:max-w-xl mx-auto drop-shadow-2xl hover:scale-[1.02] transition-transform duration-700"
              />
            </motion.div>
          </div>

          {/* Floating Stats Counters */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.6 }}
            className="mt-12 lg:mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto"
          >
            {[
              { value: '500+', label: 'Entreprises' },
              { value: '50K+', label: 'Apprenants' },
              { value: '10K+', label: 'Vidéos' },
              { value: '99.9%', label: 'Uptime' },
            ].map((stat, i) => (
              <div key={i} className="text-center p-4 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl border border-primary-100/50 dark:border-gray-700/50 shadow-lg">
                <div className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-primary-800">{stat.value}</div>
                <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">{stat.label}</div>
              </div>
            ))}
          </motion.div>

          {/* Scroll down indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="mt-8 flex justify-center"
          >
            <button
              onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
              className="flex flex-col items-center gap-1 text-gray-400 dark:text-gray-500 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
            >
              <span className="text-xs font-medium">Découvrir</span>
              <ChevronDown className="w-5 h-5 animate-scroll-bounce" />
            </button>
          </motion.div>
        </motion.div>
      </Section>

      {/* Section Fonctionnalités */}
      <Section id="features">
        <div className="max-w-7xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-black text-center text-gray-900 dark:text-white mb-4"
          >
            Tout ce dont vous avez besoin
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-center text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto"
          >
            Une suite complète pour créer, gérer et analyser vos formations.
          </motion.p>

          {/* Features illustration */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15, duration: 0.7 }}
            className="relative flex justify-center mb-16"
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-80 h-80 bg-gradient-to-br from-primary-300 to-primary-800 dark:from-primary-800 dark:to-primary-950 rounded-full opacity-20 blur-3xl" />
            </div>
            <img
              src="/images/features.png"
              alt="Collaboration et apprentissage en équipe"
              loading="lazy"
              className="relative z-10 w-full max-w-md md:max-w-lg drop-shadow-xl"
            />
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon={BookOpen}
              title="Piliers de formation"
              description="Organisez vos cours en piliers thématiques, gérez l'ordre séquentiel."
              delay={0.2}
            />
            <FeatureCard
              icon={Video}
              title="Vidéos interactives"
              description="Upload simple, lecteur intégré, progression automatique."
              delay={0.3}
            />
            <FeatureCard
              icon={Award}
              title="Quiz personnalisés"
              description="QCM, vrai/faux, timer, tentatives, feedback détaillé."
              delay={0.4}
            />
            <FeatureCard
              icon={Users}
              title="Groupes & accès"
              description="Affectez des étudiants à des groupes, contrôlez l'accès."
              delay={0.5}
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6 }}
            className="mt-16 flex flex-wrap justify-center gap-8"
          >
            <div className="flex items-center gap-2 px-4 py-2 bg-primary-50 dark:bg-primary-900/30 rounded-full">
              <Moon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Dark mode inclus</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-accent-400/10 dark:bg-accent-600/20 rounded-full">
              <Globe className="w-5 h-5 text-accent-500 dark:text-accent-400" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Multilingue</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/30 rounded-full">
              <Lock className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Sécurité renforcée (RLS)</span>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* Section Comment ça marche */}
      <Section id="how-it-works" className="bg-secondary-50/50 dark:bg-secondary-950/50 relative overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary-200/20 dark:bg-primary-900/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-primary-300/20 dark:bg-primary-800/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto w-full relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-6">
              Comment ça marche ?
            </h2>
            <div className="w-24 h-1.5 bg-gradient-to-r from-primary-600 to-primary-800 mx-auto rounded-full mb-8" />
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              En 3 étapes simples, déployez votre plateforme de formation et commencez à enseigner dès aujourd'hui.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            {/* Connecting line (desktop) */}
            <div className="hidden md:block absolute top-[72px] left-[15%] right-[15%] h-1 bg-gradient-to-r from-primary-200 via-primary-300 to-primary-400 dark:from-primary-900 dark:via-primary-800 dark:to-primary-700 rounded-full opacity-50" />

            {[
              {
                step: '01',
                icon: Building,
                title: 'Créez votre espace',
                desc: 'Inscrivez votre organisation et configurez votre tableau de bord en quelques secondes.',
                color: 'from-primary-500 to-primary-700',
                glow: 'shadow-primary-500/20'
              },
              {
                step: '02',
                icon: Video,
                title: 'Ajoutez votre contenu',
                desc: 'Importez vos vidéos et créez des parcours pédagogiques interactifs et engageants.',
                color: 'from-primary-600 to-primary-800',
                glow: 'shadow-primary-600/20'
              },
              {
                step: '03',
                icon: BarChart3,
                title: 'Suivez la réussite',
                desc: 'Analysez les progrès de vos collaborateurs et validez leurs compétences en temps réel.',
                color: 'from-primary-700 to-primary-900',
                glow: 'shadow-primary-700/20'
              }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.2, duration: 0.8 }}
                viewport={{ once: true }}
                whileHover={{ y: -10 }}
                className="relative p-10 bg-white/40 dark:bg-gray-800/40 backdrop-blur-md rounded-[40px] border border-white/50 dark:border-gray-700/50 shadow-2xl transition-all duration-300 group"
              >
                {/* Large Background Number */}
                <div className="absolute -top-6 -right-2 text-8xl font-black text-gray-900/[0.03] dark:text-white/[0.03] select-none pointer-events-none group-hover:text-primary-500/10 dark:group-hover:text-primary-400/10 transition-colors duration-500">
                  {item.step}
                </div>

                <div className={`w-20 h-20 mx-auto mb-8 bg-gradient-to-br ${item.color} rounded-3xl flex items-center justify-center shadow-2xl ${item.glow} relative z-10 group-hover:scale-110 transition-transform duration-500`}>
                  <item.icon className="w-10 h-10 text-white" />
                  <div className="absolute inset-0 bg-white/20 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                
                <div className="absolute top-10 left-1/2 -translate-x-1/2 -translate-y-16 bg-gradient-to-r from-gray-900 to-gray-800 dark:from-white dark:to-gray-100 text-white dark:text-gray-900 px-5 py-2 rounded-2xl text-xs font-black shadow-lg">
                  ÉTAPE {item.step}
                </div>

                <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-4 mt-2">
                  {item.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                  {item.desc}
                </p>
                
                <div className="mt-8 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className={`h-1.5 w-12 mx-auto bg-gradient-to-r ${item.color} rounded-full`} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* Section Témoignages */}
      <Section id="testimonials">
        <div className="max-w-7xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-black text-center text-gray-900 dark:text-white mb-4"
          >
            Ils nous font confiance
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-xl text-center text-gray-600 dark:text-gray-300 mb-16"
          >
            Découvrez ce que nos clients pensent de Smiris Learn.
          </motion.p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <TestimonialCard
              name="Marie D."
              role="Responsable RH, Groupe XYZ"
              content="Smiris Learn a transformé notre façon de former nos équipes. L'interface est intuitive et le suivi des progrès est un vrai plus."
              rating={5}
              avatar="M"
              delay={0.2}
            />
            <TestimonialCard
              name="Thomas L."
              role="Formateur indépendant"
              content="La gestion des groupes et des accès est incroyablement simple. Mes étudiants adorent la clarté des quiz."
              rating={5}
              avatar="T"
              delay={0.3}
            />
            <TestimonialCard
              name="Sophie M."
              role="Directrice pédagogique"
              content="Le dark mode est un vrai plus pour nos équipes. Un outil moderne et efficace."
              rating={5}
              avatar="S"
              delay={0.4}
            />
          </div>
        </div>
      </Section>

      {/* Section Démonstration */}
      <Section id="demo">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-4">
              Un aperçu de l'interface
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Dashboard, lecteur vidéo, quiz... tout est pensé pour une expérience fluide.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="relative"
          >
            {/* Decorative blobs */}
            <div className="absolute -top-10 -left-10 w-48 h-48 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full opacity-20 blur-3xl" />
            <div className="absolute -bottom-10 -right-10 w-56 h-56 bg-gradient-to-br from-primary-800 to-primary-950 rounded-full opacity-15 blur-3xl" />

            {/* Browser Chrome Frame */}
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-[0_20px_80px_-10px_rgba(139,92,246,0.3)] dark:shadow-[0_20px_80px_-10px_rgba(139,92,246,0.15)] border border-gray-200/60 dark:border-gray-700/60 overflow-hidden hover:shadow-[0_25px_100px_-10px_rgba(139,92,246,0.4)] dark:hover:shadow-[0_25px_100px_-10px_rgba(139,92,246,0.2)] transition-shadow duration-500">
              {/* Toolbar */}
              <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-850 border-b border-gray-200 dark:border-gray-700">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400 shadow-sm" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-sm" />
                  <div className="w-3 h-3 rounded-full bg-green-400 shadow-sm" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-white dark:bg-gray-800 rounded-lg px-4 py-1.5 text-xs text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700 max-w-sm mx-auto text-center flex items-center justify-center gap-2">
                    <Lock className="w-3 h-3 text-green-500" />
                    <span>smirislearn.com/admin</span>
                  </div>
                </div>
              </div>
              {/* Screenshot */}
              <img
                src="/images/dashboard-mockup.png"
                alt="Dashboard Smiris Learn - Panneau d'administration"
                loading="lazy"
                className="w-full"
              />
            </div>
          </motion.div>
        </div>
      </Section>


      {/* Section FAQ */}
      <Section id="faq" className="bg-white/50 dark:bg-gray-800/20">
        <div className="max-w-4xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-4">
              Questions fréquentes
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Tout ce que vous devez savoir sur Smiris Learn.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            {faqs.map((faq, index) => (
              <FaqItem
                key={index}
                question={faq.question}
                answer={faq.answer}
                isOpen={openFaq === index}
                onClick={() => setOpenFaq(openFaq === index ? -1 : index)}
              />
            ))}
          </motion.div>
        </div>
      </Section>

      {/* Section Contact */}
      <Section id="contact">
        <div className="max-w-4xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-8 md:p-12 shadow-2xl border border-primary-100 dark:border-gray-700"
          >
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-4 text-center">
              Contactez-nous
            </h2>
            <p className="text-xl text-center text-gray-600 dark:text-gray-300 mb-10">
              Une question ? Notre équipe vous répondra dans les plus brefs délais.
            </p>

            <form onSubmit={handleSubmitContact} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nom complet */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nom complet <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className={`w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-900 border-2 rounded-xl focus:ring-4 outline-none transition-all dark:text-white ${
                        formErrors.fullName
                          ? 'border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-100 dark:focus:ring-red-900/30'
                          : 'border-gray-200 dark:border-gray-700 focus:border-primary-400 dark:focus:border-primary-500 focus:ring-primary-100 dark:focus:ring-primary-900/30'
                      }`}
                      placeholder="Jean Dupont"
                    />
                  </div>
                  {formErrors.fullName && (
                    <p className="mt-1 text-sm text-red-500 dark:text-red-400">{formErrors.fullName}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-900 border-2 rounded-xl focus:ring-4 outline-none transition-all dark:text-white ${
                        formErrors.email
                          ? 'border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-100 dark:focus:ring-red-900/30'
                          : 'border-gray-200 dark:border-gray-700 focus:border-primary-400 dark:focus:border-primary-500 focus:ring-primary-100 dark:focus:ring-primary-900/30'
                      }`}
                      placeholder="contact@exemple.com"
                    />
                  </div>
                  {formErrors.email && (
                    <p className="mt-1 text-sm text-red-500 dark:text-red-400">{formErrors.email}</p>
                  )}
                </div>
              </div>

              {/* Nom de l'entreprise (optionnel) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nom de l'entreprise <span className="text-gray-400 dark:text-gray-500 text-xs">(optionnel)</span>
                </label>
                <div className="relative">
                  <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-primary-400 dark:focus:border-primary-500 focus:ring-4 focus:ring-primary-100 dark:focus:ring-primary-900/30 outline-none transition-all dark:text-white"
                    placeholder="Smiris Learn"
                  />
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Message <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MessageSquare className="absolute left-4 top-5 w-5 h-5 text-gray-400 dark:text-gray-500" />
                  <textarea
                    name="message"
                    rows="5"
                    value={formData.message}
                    onChange={handleInputChange}
                    className={`w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-900 border-2 rounded-xl focus:ring-4 outline-none transition-all dark:text-white ${
                      formErrors.message
                        ? 'border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-100 dark:focus:ring-red-900/30'
                        : 'border-gray-200 dark:border-gray-700 focus:border-primary-400 dark:focus:border-primary-500 focus:ring-primary-100 dark:focus:ring-primary-900/30'
                    }`}
                    placeholder="Bonjour, j'aimerais en savoir plus sur..."
                  />
                </div>
                {formErrors.message && (
                  <p className="mt-1 text-sm text-red-500 dark:text-red-400">{formErrors.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={sending}
                className="w-full py-4 bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {sending ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Envoi en cours...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Envoyer le message</span>
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      </Section>

      {/* Section CTA finale */}
      <Section id="cta" className="relative overflow-hidden">
        {/* Background image + overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src="/images/cta-bg.png"
            alt=""
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary-900/80 via-primary-800/70 to-secondary-950/80 backdrop-blur-sm" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center relative z-10"
        >
          <h2 className="text-5xl md:text-6xl font-black text-white mb-6">
            Prêt à révolutionner
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary-300 to-primary-100">
              vos formations ?
            </span>
          </h2>
          <p className="text-xl text-primary-100/80 mb-10">
            Rejoignez des milliers d'entreprises qui forment leurs équipes avec Smiris Learn.
          </p>
          <button
            onClick={() => navigate('/login?signup=true')}
            className="px-12 py-6 bg-white text-primary-700 rounded-2xl text-xl font-bold shadow-2xl hover:shadow-3xl hover:scale-105 transition-all inline-flex items-center gap-3 group"
          >
            Créer mon compte
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>
      </Section>

      {/* Trusted By Marquee */}
      <div className="snap-start bg-white/70 dark:bg-secondary-950/50 backdrop-blur-sm border-y border-primary-100/50 dark:border-gray-800/50 py-8 overflow-hidden">
        <p className="text-center text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-6">Ils utilisent Smiris Learn</p>
        <div className="relative">
          <div className="flex animate-marquee whitespace-nowrap gap-16">
            {['TechCorp', 'EduPlus', 'FormaPro', 'LearnHub', 'SkillForge', 'NextGen Academy', 'DataSchool', 'CloudLearn', 'TechCorp', 'EduPlus', 'FormaPro', 'LearnHub', 'SkillForge', 'NextGen Academy', 'DataSchool', 'CloudLearn'].map((brand, i) => (
              <span key={i} className="text-2xl font-black text-gray-200 dark:text-gray-700 tracking-tight">
                {brand}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="snap-start bg-gradient-to-b from-gray-50 to-white dark:from-secondary-950 dark:to-slate-950 border-t border-primary-100 dark:border-gray-800 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-800 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-lg font-bold text-white">S</span>
                </div>
                <span className="font-bold text-gray-800 dark:text-white text-lg">Smiris Learn</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                La plateforme de formation SaaS pour les entreprises modernes. Simplifiez l’apprentissage.
              </p>
              <div className="flex gap-3">
                {['X', 'in', 'f'].map((s, i) => (
                  <a key={i} href="#" className="w-9 h-9 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-primary-100 dark:hover:bg-primary-900/30 hover:text-primary-600 dark:hover:text-primary-400 transition-colors text-sm font-bold">
                    {s}
                  </a>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-bold text-gray-800 dark:text-white mb-4">Liens rapides</h4>
              <ul className="space-y-3">
                {sections.map(({ id, label }) => (
                  <li key={id}>
                    <button
                      onClick={() => document.getElementById(id).scrollIntoView({ behavior: 'smooth' })}
                      className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                    >
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-gray-800 dark:text-white mb-4">Légal</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">CGU</a></li>
                <li><a href="#" className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Politique de confidentialité</a></li>
                <li><a href="#" className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Conditions d'utilisation</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-gray-800 dark:text-white mb-4">Contact</h4>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Mail className="w-4 h-4 text-primary-500" />
                  you.faqir@gmail.com
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Building className="w-4 h-4 text-primary-500" />
                  Dortmund, Germany
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Headphones className="w-4 h-4 text-primary-500" />
                  Support 24/7
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-400 dark:text-gray-500">
              © 2026 Smiris Learn. Tous droits réservés.
            </p>
            <p className="text-xs text-gray-300 dark:text-gray-600">
              Fait avec ❤️ par YASSIR KEZZI
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}