// src/pages/LandingPage.jsx
import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, BookOpen, Video, Award, Users, Moon, Sun, Globe,
  CheckCircle, Star, ChevronRight, Menu, X, Send,
  Building, Mail, User, MessageSquare, ArrowRight, Lock,
  Zap, Shield, TrendingUp, PlayCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { useToast } from '../hooks/useToast';
import { supabase } from '../lib/supabase';
import { untrusted, escapeText, validateEmail } from '../utils/security';

// Composant pour chaque section avec scroll snap
const Section = ({ children, id, className = '' }) => (
  <section
    id={id}
    className={`min-h-screen snap-start flex items-center justify-center py-16 px-4 md:px-8 ${className}`}
  >
    {children}
  </section>
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
                ? 'bg-indigo-600 dark:bg-indigo-400 scale-125'
                : 'bg-gray-300 dark:bg-gray-600 hover:bg-indigo-400 dark:hover:bg-indigo-500'
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
    className="group relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-indigo-100 dark:border-gray-700 overflow-hidden"
  >
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-gray-700/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
    <div className="relative z-10">
      <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform">
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
    className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-indigo-100 dark:border-gray-700"
  >
    <div className="flex items-center gap-4 mb-6">
      <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
        {avatar || name.charAt(0)}
      </div>
      <div>
        <h4 className="font-bold text-gray-800 dark:text-white">{name}</h4>
        <p className="text-sm text-gray-500 dark:text-gray-400">{role}</p>
      </div>
    </div>
    <p className="text-gray-600 dark:text-gray-300 mb-6 italic">"{content}"</p>
    <div className="flex gap-1 text-yellow-400">
      {[...Array(5)].map((_, i) => (
        <Star key={i} className="w-5 h-5 fill-current" />
      ))}
    </div>
  </motion.div>
);

// Composant FAQ
const FaqItem = ({ question, answer, isOpen, onClick }) => (
  <div className="border border-indigo-100 dark:border-gray-700 rounded-2xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm overflow-hidden transition-all">
    <button
      onClick={onClick}
      className="w-full px-6 py-4 flex items-center justify-between text-left focus:outline-none"
    >
      <span className="font-bold text-gray-800 dark:text-white">{question}</span>
      {isOpen ? (
        <ChevronUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
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
        ? 'border-indigo-500 dark:border-indigo-400 scale-105'
        : 'border-indigo-100 dark:border-gray-700'
    } overflow-hidden group`}
  >
    {isPopular && (
      <div className="absolute top-0 right-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-1 rounded-bl-2xl text-sm font-bold">
        Populaire
      </div>
    )}
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-gray-700/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
    <div className="relative z-10">
      <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">{name}</h3>
      <div className="mb-6 h-16">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">{price}</span>
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
            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
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
      question: "Puis-je changer de plan en cours de route ?",
      answer: "Absolument. Vous pouvez upgrader ou downgrader votre forfait à tout moment depuis les paramètres de votre compte. Le montant sera proratisé."
    },
    {
      question: "Les vidéos sont-elles hébergées chez vous ?",
      answer: "Oui, nous hébergeons toutes vos vidéos sur des serveurs sécurisés et optimisés pour une lecture fluide partout dans le monde."
    },
    {
      question: "Comment fonctionne l'essai gratuit ?",
      answer: "L'essai gratuit dure 14 jours et vous donne accès à toutes les fonctionnalités du plan Starter. Aucune carte bancaire n'est requise pour l'inscription."
    },
    {
      question: "Puis-je personnaliser la plateforme ?",
      answer: "Oui, le plan Business vous permet d'ajouter votre logo, vos couleurs (marque blanche) et d'utiliser un domaine personnalisé."
    }
  ];

  // Sections pour la navigation
  const sections = [
    { id: 'hero', label: 'Accueil' },
    { id: 'features', label: 'Fonctionnalités' },
    { id: 'testimonials', label: 'Témoignages' },
    { id: 'demo', label: 'Aperçu' },
    { id: 'pricing', label: 'Tarifs' },
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
      className="h-screen overflow-y-scroll snap-y snap-mandatory scroll-smooth bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900"
    >
      {/* Header fixe avec glassmorphisme */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 100 }}
        className="fixed top-0 left-0 right-0 z-50 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-b border-indigo-100 dark:border-gray-800"
      >
        <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-20">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shrink-0">
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
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400'
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
                className="hidden md:inline-flex items-center gap-2 px-3 lg:px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors whitespace-nowrap"
              >
                Se connecter
              </button>
              
              <button
                onClick={() => navigate('/login?signup=true')}
                className="hidden sm:inline-flex px-4 lg:px-6 py-2 lg:py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all whitespace-nowrap"
              >
                Essai gratuit
              </button>

              <button
                onClick={() => navigate('/login?signup=true')}
                className="sm:hidden px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-bold shadow-lg text-sm whitespace-nowrap"
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
              className="md:hidden bg-white dark:bg-gray-900 border-t border-indigo-100 dark:border-gray-800 overflow-hidden"
            >
              <div className="px-4 py-6 space-y-4">
                {sections.map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => {
                      document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
                      setMenuOpen(false);
                    }}
                    className="block w-full text-left px-4 py-3 rounded-xl hover:bg-indigo-50 dark:hover:bg-gray-800 transition-colors"
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
            className="absolute bg-indigo-200 dark:bg-indigo-900/30 rounded-full"
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
      <Section id="hero" className="relative">
        <motion.div
          style={{ opacity: heroOpacity, scale: heroScale }}
          className="max-w-6xl mx-auto text-center relative z-10"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.8, type: 'spring' }}
            className="w-28 h-28 mx-auto mb-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl"
          >
            <Sparkles className="w-14 h-14 text-white" />
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-5xl md:text-7xl font-black text-gray-900 dark:text-white mb-6 tracking-tight"
          >
            Formez vos équipes
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
              sans effort
            </span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-xl text-gray-600 dark:text-gray-300 mb-12 max-w-3xl mx-auto"
          >
            Smiris Learn, la plateforme SaaS qui simplifie la création de parcours pédagogiques. 
            Gérez vidéos, quiz, et suivez la progression en temps réel.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <button
              onClick={() => navigate('/login?signup=true')}
              className="px-10 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl text-lg font-bold shadow-2xl hover:shadow-3xl hover:scale-105 transition-all flex items-center gap-2 group"
            >
              Commencer gratuitement
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
              className="px-10 py-5 bg-white/20 dark:bg-gray-800/20 backdrop-blur-sm border-2 border-indigo-200 dark:border-indigo-800 text-gray-800 dark:text-white rounded-2xl text-lg font-bold hover:bg-white/30 dark:hover:bg-gray-800/30 transition-all"
            >
              Découvrir
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-16 text-sm text-gray-400 dark:text-gray-500 flex items-center justify-center gap-2"
          >
            <Shield className="w-4 h-4" />
            <span>Plus de 500 entreprises nous font confiance</span>
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
            className="text-xl text-center text-gray-600 dark:text-gray-300 mb-16 max-w-3xl mx-auto"
          >
            Une suite complète pour créer, gérer et analyser vos formations.
          </motion.p>

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
            <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-full">
              <Moon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Dark mode inclus</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 dark:bg-purple-900/30 rounded-full">
              <Globe className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Multilingue (FR/EN/DE/AR)</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/30 rounded-full">
              <Lock className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Sécurité renforcée (RLS)</span>
            </div>
          </motion.div>
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
              content="Le dark mode et le support multilingue sont un vrai plus pour nos équipes internationales. Un outil moderne et efficace."
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
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 rounded-3xl p-4 shadow-2xl"
          >
            <div className="aspect-video bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <PlayCircle className="w-20 h-20 text-indigo-600 dark:text-indigo-400 animate-pulse" />
            </div>
            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full opacity-20 blur-3xl" />
          </motion.div>
        </div>
      </Section>

      {/* Section Tarifs */}
      <Section id="pricing">
        <div className="max-w-7xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-black text-center text-gray-900 dark:text-white mb-4"
          >
            Des formules adaptées
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-xl text-center text-gray-600 dark:text-gray-300 mb-8"
          >
            Choisissez le plan qui correspond à la taille de votre équipe.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex justify-center items-center gap-4 mb-16"
          >
            <span className={`text-sm font-medium ${!isAnnual ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>Mensuel</span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className="relative inline-flex h-7 w-14 items-center rounded-full bg-indigo-100 dark:bg-gray-700 transition-colors focus:outline-none"
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-indigo-600 transition-transform ${isAnnual ? 'translate-x-8' : 'translate-x-1'}`}
              />
            </button>
            <span className={`text-sm font-medium flex items-center gap-2 ${isAnnual ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
              Annuel <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-bold">-20%</span>
            </span>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            <PricingCard
              name="Gratuit"
              price="0€"
              features={[
                "5 utilisateurs max",
                "5 vidéos",
                "1 Go stockage",
                "Support email"
              ]}
              isPopular={false}
              delay={0.2}
              onSelect={() => navigate('/login?signup=true')}
            />
            <PricingCard
              name="Starter"
              price={isAnnual ? "39€" : "49€"}
              subtext={isAnnual ? "Facturé 468€ / an" : null}
              features={[
                "20 utilisateurs",
                "50 vidéos",
                "10 Go stockage",
                "Support prioritaire"
              ]}
              isPopular={true}
              delay={0.3}
              onSelect={() => navigate('/login?signup=true&plan=starter')}
            />
            <PricingCard
              name="Business"
              price={isAnnual ? "79€" : "99€"}
              subtext={isAnnual ? "Facturé 948€ / an" : null}
              features={[
                "Utilisateurs illimités",
                "Vidéos illimitées",
                "100 Go stockage",
                "API publique"
              ]}
              isPopular={false}
              delay={0.4}
              onSelect={() => navigate('/contact')}
            />
          </div>
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
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-8 md:p-12 shadow-2xl border border-indigo-100 dark:border-gray-700"
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
                          : 'border-gray-200 dark:border-gray-700 focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-indigo-100 dark:focus:ring-indigo-900/30'
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
                          : 'border-gray-200 dark:border-gray-700 focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-indigo-100 dark:focus:ring-indigo-900/30'
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
                    className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 outline-none transition-all dark:text-white"
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
                        : 'border-gray-200 dark:border-gray-700 focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-indigo-100 dark:focus:ring-indigo-900/30'
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
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
      <Section id="cta">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center"
        >
          <h2 className="text-5xl md:text-6xl font-black text-gray-900 dark:text-white mb-6">
            Prêt à révolutionner
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
              vos formations ?
            </span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-10">
            Rejoignez des milliers d'entreprises qui forment leurs équipes avec Smiris Learn.
          </p>
          <button
            onClick={() => navigate('/login?signup=true')}
            className="px-12 py-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl text-xl font-bold shadow-2xl hover:shadow-3xl hover:scale-105 transition-all inline-flex items-center gap-3 group"
          >
            Créer mon compte gratuit
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>
      </Section>

      {/* Footer */}
      <footer className="snap-start bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-t border-indigo-100 dark:border-gray-800 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-lg font-bold text-white">S</span>
                </div>
                <span className="font-bold text-gray-800 dark:text-white">Smiris Learn</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                La plateforme de formation SaaS pour les entreprises modernes.
              </p>
            </div>
            
            <div>
              <h4 className="font-bold text-gray-800 dark:text-white mb-4">Liens rapides</h4>
              <ul className="space-y-2">
                {sections.map(({ id, label }) => (
                  <li key={id}>
                    <button
                      onClick={() => document.getElementById(id).scrollIntoView({ behavior: 'smooth' })}
                      className="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    >
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-gray-800 dark:text-white mb-4">Légal</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400">CGU</a></li>
                <li><a href="#" className="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400">Politique de confidentialité</a></li>
                <li><a href="#" className="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400">Mentions légales</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-gray-800 dark:text-white mb-4">Contact</h4>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Mail className="w-4 h-4" />
                  [you.faqir@gmail.com]
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Building className="w-4 h-4" />
                  dortmund, Germany
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-indigo-100 dark:border-gray-800 text-center text-sm text-gray-400 dark:text-gray-500">
            © 2026 Smiris Learn. Tous droits réservés.
          </div>
        </div>
      </footer>
    </div>
  );
}