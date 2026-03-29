// src/pages/LandingPage.jsx
import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, BookOpen, Video, Award, Users, Moon, Sun, Globe,
  CheckCircle, Star, ChevronRight, Menu, X, Send,
  Building, Mail, User, MessageSquare, ArrowRight, Lock,
  Zap, Shield, TrendingUp, PlayCircle, ChevronDown, ChevronUp,
  Quote, MousePointer, BarChart3, Clock, Headphones, RefreshCw,
  LayoutDashboard, Grid3X3, Users2, ClipboardList, ChevronLeft
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { useToast } from '../hooks/useToast';
import { useUserRole } from '../hooks/useUserRole';
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
    <div className="fixed right-6 top-1/2 transform -translate-y-1/2 z-50 flex flex-col gap-4 p-3 bg-white/50 dark:bg-slate-900/40 backdrop-blur-xl rounded-full border border-slate-200 dark:border-white/5 shadow-2xl">
      {sections.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => scrollToSection(id)}
          className="group relative flex items-center justify-center w-4 h-4"
          aria-label={`Aller à ${label}`}
        >
          {activeSection === id && (
            <motion.div
              layoutId="active-dot-glow"
              className="absolute inset-[-4px] bg-primary-500/10 dark:bg-primary-400/20 rounded-full border border-primary-500/20 shadow-[0_0_15px_rgba(96,165,250,0.3)]"
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}
          <div
            className={`w-2 h-2 rounded-full transition-all duration-500 relative z-10 ${
              activeSection === id
                ? 'bg-primary-500 scale-[1.8] shadow-[0_0_10px_rgba(96,165,250,0.5)]'
                : 'bg-slate-300 dark:bg-white/20 hover:bg-slate-400 dark:hover:bg-white/40 scale-100'
            }`}
          />
          <div className="absolute right-10 px-3 py-1.5 bg-slate-900/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none border border-white/10 shadow-2xl translate-x-2 group-hover:translate-x-0 whitespace-nowrap">
            {label}
          </div>
        </button>
      ))}
    </div>
  );
};

// Carte de fonctionnalité
const FeatureCard = ({ icon: Icon, title, description, delay, className = "" }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay, type: 'spring', stiffness: 100 }}
    viewport={{ once: true, margin: "-50px" }}
    whileHover={{ y: -8, scale: 1.02 }}
    className={`group relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-primary-100 dark:border-gray-700 overflow-hidden ${className}`}
  >
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-gray-700/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
    <div className="relative z-10">
      <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all">
        <Icon className="w-8 h-8 text-white" />
      </div>
      <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-3 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{title}</h3>
      <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{description}</p>
    </div>
  </motion.div>
);

// Carte de témoignage
const TestimonialCard = ({ name, role, content, rating, avatar, delay }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9, y: 20 }}
    whileInView={{ opacity: 1, scale: 1, y: 0 }}
    transition={{ duration: 0.6, delay, type: 'spring', damping: 12 }}
    viewport={{ once: true }}
    whileHover={{ y: -10 }}
    className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-primary-100 dark:border-gray-700 relative overflow-hidden group"
  >
    <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
      <Quote className="w-16 h-16 text-primary-500 dark:text-primary-400" />
    </div>
    <div className="flex gap-1 text-yellow-400 mb-6">
      {[...Array(5)].map((_, i) => (
        <Star key={i} className="w-4 h-4 fill-current animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
      ))}
    </div>
    <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed italic">"{content}"</p>
    <div className="flex items-center gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
      <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:rotate-6 transition-transform">
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
const PricingCard = ({ name, price, subtext, features, isPopular, delay, onSelect, loading }) => (
  <motion.div
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.8, delay, type: 'spring', bounce: 0.4 }}
    viewport={{ once: true }}
    whileHover={{ y: -12, scale: 1.02 }}
    className={`relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border transition-all duration-300 ${
      isPopular
        ? 'border-primary-500 dark:border-primary-400 lg:scale-105 shadow-primary-500/10'
        : 'border-primary-100 dark:border-gray-700'
    } overflow-hidden group`}
  >
    {isPopular && (
      <motion.div 
        initial={{ x: 100 }}
        animate={{ x: 0 }}
        transition={{ delay: delay + 0.3, type: 'spring' }}
        className="absolute top-0 right-0 bg-gradient-to-r from-primary-600 to-primary-800 text-white px-4 py-1 rounded-bl-2xl text-sm font-bold z-20"
      >
        Populaire
      </motion.div>
    )}
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-gray-700/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
    <div className="relative z-10">
      <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{name}</h3>
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
          <motion.li 
            key={i} 
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ delay: delay + 0.1 * i }}
            viewport={{ once: true }}
            className="flex items-start gap-2 text-gray-600 dark:text-gray-300"
          >
            <CheckCircle className="w-5 h-5 text-green-500 dark:text-green-400 shrink-0 mt-0.5" />
            <span>{feature}</span>
          </motion.li>
        ))}
      </ul>
      <button
        onClick={onSelect}
        disabled={loading}
        className={`w-full py-4 rounded-2xl font-bold text-white transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 active:scale-95 ${
          isPopular
            ? 'bg-gradient-to-r from-primary-600 to-primary-800 hover:from-primary-700 hover:to-primary-900'
            : 'bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600'
        } ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
      >
        {loading && <RefreshCw className="w-5 h-5 animate-spin" />}
        {loading ? 'Redirection...' : 'Choisir ce plan'}
      </button>
    </div>
  </motion.div>
);

export default function LandingPage() {
  const { user } = useAuth();
  const { role } = useUserRole();
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

  // State pour la navigation de la démo (Galérie d'images)
  const [activeSlide, setActiveSlide] = useState(0);
  const demoImages = [
    { title: "Tableau de bord", url: "/demo/dashboard.png" },
    { title: "Gestion des Piliers", url: "/demo/piliers.png" },
    { title: "Bibliothèque Vidéo", url: "/demo/videos.png" },
    { title: "Quiz & Exercices", url: "/demo/quiz.png" },
    { title: "Groupes d'Étudiants", url: "/demo/groupes.png" },
    { title: "Gestion des Membres", url: "/demo/membres.png" },
  ];

  // État pour le modal d'inscription
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [signupData, setSignupData] = useState({ 
    companyName: '', 
    email: '', 
    password: '', 
    confirmPassword: '' 
  });
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState('');

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

  const sections = [
    { id: 'hero', label: 'Accueil' },
    { id: 'features', label: 'Fonctionnalités' },
    { id: 'how-it-works', label: 'Comment ça marche' },
    { id: 'pricing', label: 'Tarifs' },
    { id: 'testimonials', label: 'Témoignages' },
    { id: 'demo', label: 'Aperçu' },
    { id: 'faq', label: 'FAQ' },
    { id: 'contact', label: 'Contact' },
    { id: 'cta', label: 'Inscription' }
  ];

  // Détecter la section active lors du scroll
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

  // Animation parallaxe
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
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmitContact = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSending(true);
    try {
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

  // Soumission du formulaire d'inscription publique
  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    if (signupData.password !== signupData.confirmPassword) {
      setSignupError('Les mots de passe ne correspondent pas');
      return;
    }
    setSignupLoading(true);
    setSignupError('');
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-org-and-checkout`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY 
        },
        body: JSON.stringify({
          companyName: signupData.companyName,
          adminEmail: signupData.email,
          adminPassword: signupData.password,
          plan: selectedPlan,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Erreur lors de l\'inscription');
      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
      }
    } catch (err) {
      setSignupError(err.message);
    } finally {
      setSignupLoading(false);
    }
  };

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
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-primary-600 to-primary-800 rounded-xl flex items-center justify-center shadow-lg shrink-0">
                <span className="text-lg sm:text-xl font-bold text-white">S</span>
              </div>
              <span className="font-bold text-gray-800 dark:text-white text-lg sm:text-xl tracking-tight hidden min-[380px]:block">Smiris Learn</span>
            </div>

            <nav className="hidden lg:flex items-center gap-1 xl:gap-2 px-1.5 py-1.5 bg-gray-100 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/5">
              {sections.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => document.getElementById(id).scrollIntoView({ behavior: 'smooth' })}
                  className={`text-sm py-2 px-4 rounded-xl font-bold transition-all relative group ${
                    activeSection === id
                      ? 'text-primary-700 dark:text-primary-400'
                      : 'text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400'
                  }`}
                >
                  <span className="relative z-10">{label}</span>
                  {activeSection === id && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 bg-white dark:bg-gray-800 shadow-[0_4px_12px_-2px_rgba(0,0,0,0.1),0_0_0_1px_rgba(0,0,0,0.02)] dark:shadow-none dark:border dark:border-white/10 rounded-xl"
                      transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                    />
                  )}
                </button>
              ))}
            </nav>

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
                onClick={() => {
                  setSelectedPlan('free');
                  setShowSignupModal(true);
                }}
                className="hidden sm:inline-flex px-4 lg:px-6 py-2 lg:py-2.5 bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all whitespace-nowrap"
              >
                Essai gratuit
              </button>

              <button
                onClick={() => {
                  setSelectedPlan('free');
                  setShowSignupModal(true);
                }}
                className="sm:hidden px-3 py-1.5 bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-lg font-bold shadow-lg text-sm whitespace-nowrap"
              >
                Essai
              </button>
              
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="lg:hidden p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                {menuOpen ? <X className="w-6 h-6 text-gray-600 dark:text-gray-300" /> : <Menu className="w-6 h-6 text-gray-600 dark:text-gray-300" />}
              </button>
            </div>
          </div>
        </div>

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

      <SideNav sections={sections} activeSection={activeSection} />

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

      {/* Hero Section */}
      <Section id="hero" className="relative transition-all duration-700 overflow-hidden bg-slate-950 min-h-screen flex items-center justify-center pt-0">
        {/* Cinematic Background Layer */}
        <motion.div 
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.35 }}
          transition={{ duration: 2.5, ease: "easeOut" }}
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage: 'url("https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        
        {/* Layered Cinematic Overlays */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.1),transparent_50%)]" />
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-slate-950 via-slate-950/20 to-slate-950" />
        <div className="absolute inset-0 z-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />

        <motion.div
          style={{ opacity: heroOpacity, scale: heroScale }}
          className="max-w-6xl mx-auto relative z-10 w-full px-4 sm:px-6 mt-20"
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-full">

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
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-md rounded-full border border-white/10 mb-6 shadow-sm group hover:border-primary-300 transition-colors"
              >
                <div className="flex -space-x-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-6 h-6 rounded-full border-2 border-slate-950 bg-gradient-to-br from-indigo-400 to-purple-400" />
                  ))}
                </div>
                <span className="text-xs font-bold text-gray-300 tracking-tight">
                  <span className="text-primary-400">500+</span> entreprises nous font confiance
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.8 }}
                className="text-5xl sm:text-6xl md:text-8xl lg:text-9xl font-black text-white mb-8 tracking-tighter leading-[0.85] drop-shadow-2xl"
              >
                Formez vos équipes
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary-400 via-indigo-400 to-primary-300 animate-gradient-text py-6">
                  sans effort
                </span>
              </motion.h1>


              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.8 }}
                className="text-xl md:text-2xl text-gray-300 mb-14 max-w-3xl mx-auto leading-relaxed font-medium drop-shadow-md"
              >
                Simplifiez la création de vos parcours pédagogiques. Gérez vos vidéos, quiz, et suivez la progression de vos collaborateurs en temps réel.
              </motion.p>


              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="flex flex-col sm:flex-row gap-8 justify-center items-center"
              >

                <div className="flex flex-col items-center lg:items-start gap-3">
                  <button
                    onClick={() => {
                      setSelectedPlan('free');
                      setShowSignupModal(true);
                    }}
                    className="px-6 sm:px-10 py-4 sm:py-5 bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-2xl text-lg sm:text-xl font-bold shadow-[0_20px_50px_-15px_rgba(139,92,246,0.5)] hover:shadow-[0_25px_60px_-15px_rgba(139,92,246,0.6)] hover:scale-105 active:scale-95 transition-all flex items-center gap-3 group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    <span className="relative">Commencer gratuitement</span>
                    <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform relative" />
                  </button>
                  <span className="text-xs font-medium text-gray-500 ml-2">
                    ✓ Pas de carte bancaire  •  ✓ Essai 14 jours
                  </span>
                </div>
                
                <button
                  onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
                  className="px-8 py-5 bg-white/10 backdrop-blur-md border-2 border-white/5 text-white rounded-2xl text-lg font-bold hover:bg-white/20 transition-all flex items-center gap-2 group shadow-xl"
                >
                  <PlayCircle className="w-5 h-5 text-primary-400 group-hover:scale-110 transition-transform" />
                  Découvrir
                </button>
              </motion.div>
            </div>
          </div>


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
              <div key={i} className="text-center p-3 sm:p-4 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 shadow-lg">
                <div className="text-xl sm:text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-primary-600">{stat.value}</div>
                <div className="text-[10px] sm:text-xs md:text-sm text-gray-400 mt-1 font-medium">{stat.label}</div>
              </div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="mt-8 flex justify-center"
          >
            <button
              onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
              className="flex flex-col items-center gap-1 text-gray-500 hover:text-primary-400 transition-colors"
            >
              <span className="text-xs font-medium">Découvrir</span>
              <ChevronDown className="w-5 h-5 animate-scroll-bounce" />
            </button>
          </motion.div>
        </motion.div>
      </Section>

      {/* Fonctionnalités */}
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

          <div className="grid grid-cols-1 md:grid-cols-6 gap-6 relative">
            {/* Piliers de formation - Large Bento (Col 1-4) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="md:col-span-4 p-8 rounded-[2.5rem] bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none overflow-hidden group hover:border-primary-500/30 transition-all duration-500 flex flex-col md:flex-row gap-8 items-center"
            >
              <div className="flex-1 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-primary-500/10 dark:bg-primary-500/20 flex items-center justify-center text-primary-600 dark:text-primary-400">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white">Piliers de formation</h3>
                <p className="text-gray-600 dark:text-gray-300 font-medium leading-relaxed">
                  Organisez vos cours en piliers thématiques, gérez l'ordre séquentiel et créez des parcours d'apprentissage structurés.
                </p>
              </div>
              
              {/* Visual Mockup - Piliers Tree */}
              <div className="w-full md:w-64 space-y-3 relative group-hover:translate-y-[-5px] transition-transform duration-700">
                {[
                  { label: "Introduction au management", progress: 100, color: "bg-emerald-500" },
                  { label: "Gestion des conflits", progress: 65, color: "bg-primary-500" },
                  { label: "Leadership agile", progress: 0, color: "bg-gray-400 dark:bg-gray-700" }
                ].map((item, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-gray-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 backdrop-blur-lg flex items-center gap-4 shadow-sm">
                    <div className={`w-2 h-10 rounded-full ${item.color} opacity-80`} />
                    <div className="flex-1">
                      <div className="text-[10px] font-black text-gray-400 dark:text-white/40 uppercase mb-1">Module {i+1}</div>
                      <div className="text-xs font-bold text-gray-700 dark:text-white truncate">{item.label}</div>
                    </div>
                    {item.progress === 100 && <CheckCircle className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />}
                  </div>
                ))}
                {/* Floating Glow */}
                <div className="absolute -inset-4 bg-primary-500/10 dark:bg-primary-500/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </motion.div>

            {/* Vidéos Interactives - Bento (Col 5-6) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="md:col-span-2 p-8 rounded-[2.5rem] bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none overflow-hidden group hover:border-accent-500/30 transition-all duration-500"
            >
              <div className="w-12 h-12 rounded-2xl bg-accent-500/10 dark:bg-accent-500/20 flex items-center justify-center text-accent-600 dark:text-accent-400 mb-6">
                <Video className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white mb-3">Vidéos interactives</h3>
              
              {/* Visual Mockup - Mini Player */}
              <div className="mt-8 relative aspect-video rounded-2xl bg-slate-900 dark:bg-black/60 border border-slate-200 dark:border-white/10 overflow-hidden group-hover:scale-[1.02] transition-transform duration-500">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-accent-500/80 flex items-center justify-center backdrop-blur-sm animate-pulse">
                    <PlayCircle className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="absolute bottom-3 left-3 right-3 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="w-2/3 h-full bg-accent-500" />
                </div>
              </div>
              <p className="mt-6 text-sm text-gray-600 dark:text-gray-400 font-medium leading-relaxed">
                Upload simple, lecteur vidéo haute fidélité intégré.
              </p>
            </motion.div>

            {/* Quiz Personnalisés - Bento (Col 1-2) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="md:col-span-2 p-8 rounded-[2.5rem] bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none overflow-hidden group hover:border-emerald-500/30 transition-all duration-500"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-6">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white mb-3">Quiz personnalisés</h3>
              
              {/* Visual Mockup - Quiz Cards */}
              <div className="mt-8 flex flex-col items-center">
                <div className="relative w-full">
                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-black/30 border border-slate-200 dark:border-white/5 backdrop-blur-md transform -rotate-2 relative z-20 shadow-sm">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 dark:bg-emerald-500/30 flex items-center justify-center mb-2">
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">A</span>
                    </div>
                    <div className="h-2 w-3/4 bg-slate-200 dark:bg-white/20 rounded-full" />
                  </div>
                  <div className="p-4 rounded-xl bg-gray-100 dark:bg-black/20 border border-slate-200 dark:border-white/5 backdrop-blur-md absolute top-2 left-2 right-0 -z-10 transform rotate-2 opacity-50" />
                </div>
              </div>
              <p className="mt-12 text-sm text-gray-600 dark:text-gray-400 font-medium leading-relaxed">
                QCM, Timer, feedback en temps réel.
              </p>
            </motion.div>

            {/* Groupes & Accès - Large Bento (Col 3-6) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="md:col-span-4 p-8 rounded-[2.5rem] bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none overflow-hidden group hover:border-primary-500/30 transition-all duration-500 flex flex-col md:flex-row-reverse gap-8 items-center"
            >
              <div className="flex-1 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-primary-500/10 dark:bg-primary-500/20 flex items-center justify-center text-primary-600 dark:text-primary-400">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white">Groupes & accès</h3>
                <p className="text-gray-600 dark:text-gray-300 font-medium leading-relaxed">
                  Affectez des étudiants à des groupes spécifiques, contrôlez l'accès aux piliers et gérez les rôles avec précision via RLS.
                </p>
              </div>
              
              {/* Visual Mockup - Member Avatars */}
              <div className="grid grid-cols-4 gap-3 relative group-hover:scale-105 transition-transform duration-700">
                {[1,2,3,4,5,6,7,8].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gradient-to-br dark:from-white/10 dark:to-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center shadow-sm">
                    <div className={`w-6 h-6 rounded-full ${i % 2 === 0 ? 'bg-primary-500' : 'bg-slate-300 dark:bg-gray-700'} opacity-40`} />
                  </div>
                ))}
                {/* Control Badges */}
                <div className="absolute -bottom-2 -left-2 bg-emerald-500 text-[8px] font-black text-white px-2 py-0.5 rounded-full shadow-lg">ADMIN</div>
                <div className="absolute top-2 -right-2 bg-primary-500 text-[8px] font-black text-white px-2 py-0.5 rounded-full shadow-lg">MANAGER</div>
              </div>
            </motion.div>

            {/* Mini Highlight Cards (Footer of the grid) */}
            <div className="md:col-span-6 grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
              {[
                { icon: Moon, label: "Dark mode natif", color: "text-primary-500 dark:text-primary-400" },
                { icon: Globe, label: "Infrastructure Multilingue", color: "text-accent-500 dark:text-accent-400" },
                { icon: Shield, label: "Sécurité RLS renforcée", color: "text-emerald-500 dark:text-emerald-400" }
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + (i * 0.1) }}
                  viewport={{ once: true }}
                  className="flex items-center gap-4 px-6 py-4 rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 group hover:bg-slate-50 dark:hover:bg-white/10 transition-colors shadow-sm dark:shadow-none"
                >
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{item.label}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Comment ça marche */}
      <Section id="how-it-works" className="bg-secondary-50/50 dark:bg-secondary-950/50 relative overflow-hidden">
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

      {/* Tarifs */}
      <Section id="pricing" className="bg-white/30 dark:bg-gray-900/10">
        <div className="max-w-7xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-6">
              Une tarification transparente
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-10">
              Choisissez le plan qui correspond le mieux à la taille de votre organisation.
            </p>

            <div className="flex items-center justify-center gap-4 mb-12">
              <span className={`text-sm font-bold ${!isAnnual ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500'}`}>Mensuel</span>
              <button
                onClick={() => setIsAnnual(!isAnnual)}
                className="relative w-16 h-8 bg-gray-200 dark:bg-gray-700 rounded-full transition-colors p-1"
              >
                <motion.div
                  animate={{ x: isAnnual ? 32 : 0 }}
                  className="w-6 h-6 bg-white dark:bg-primary-500 rounded-full shadow-md"
                />
              </button>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${isAnnual ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500'}`}>Annuel</span>
                <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-[10px] font-black rounded-full uppercase tracking-wider">-20%</span>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
            <PricingCard
              name="Gratuit"
              price="0€"
              subtext="Pour tester la plateforme"
              features={[
                "Jusqu'à 5 étudiants",
                "2 piliers de formation",
                "Gestion des vidéos",
                "Quiz de base",
                "Support par email"
              ]}
              delay={0.1}
              onSelect={() => {
                setSelectedPlan('free');
                setShowSignupModal(true);
              }}
            />
            <PricingCard
              name="Starter"
              price={isAnnual ? '39€' : '49€'}
              subtext={isAnnual ? 'Facturé annuellement' : null}
              features={[
                "Jusqu'à 50 étudiants",
                "Piliers illimités",
                "Gestion des groupes & accès",
                "Dashboards & Statistiques",
                "Exports XLS/CSV",
                "Support prioritaire"
              ]}
              isPopular={true}
              delay={0.2}
              onSelect={() => {
                setSelectedPlan('starter');
                setShowSignupModal(true);
              }}
              loading={false}
            />
            <PricingCard
              name="Business"
              price="Sur devis"
              subtext="Pour les organisations"
              features={[
                "Étudiants illimités",
                "Multi-entreprises (SuperAdmin)",
                "Whitelabel (Logo/Branding)",
                "Intégrations sur mesure",
                "Onboarding & Support dédié"
              ]}
              delay={0.3}
              onSelect={() => document.getElementById('contact').scrollIntoView({ behavior: 'smooth' })}
            />
          </div>
        </div>
      </Section>

      {/* Témoignages - Marquee */}
      <Section id="testimonials" className="overflow-hidden">
        <div className="w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16 px-4"
          >
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-4">
              Ils nous font confiance
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Découvrez ce que nos clients pensent de Smiris Learn.
            </p>
          </motion.div>

          <div className="relative flex overflow-x-hidden group">
            <motion.div
              animate={{
                x: [0, -1920],
              }}
              transition={{
                x: {
                  repeat: Infinity,
                  repeatType: "loop",
                  duration: 40,
                  ease: "linear",
                },
              }}
              className="flex gap-8 py-4 whitespace-nowrap hover:[animation-play-state:paused]"
            >
              {[...Array(2)].map((_, i) => (
                <div key={i} className="flex gap-8">
                  {[
                    {
                      name: "Marie D.",
                      role: "Responsable RH, Groupe XYZ",
                      content: "Smiris Learn a transformé notre façon de former nos équipes. L'interface est intuitive et le suivi des progrès est un vrai plus.",
                      rating: 5,
                      avatar: "M",
                      tag: "ENTREPRISE"
                    },
                    {
                      name: "Thomas L.",
                      role: "Formateur indépendant",
                      content: "La gestion des groupes et des accès est incroyablement simple. Mes étudiants adorent la clarté des quiz.",
                      rating: 5,
                      avatar: "T",
                      tag: "FORMATION"
                    },
                    {
                      name: "Sophie M.",
                      role: "Directrice pédagogique",
                      content: "Le dark mode est un vrai plus pour nos équipes. Un outil moderne et efficace.",
                      rating: 5,
                      avatar: "S",
                      tag: "PÉDAGOGIE"
                    },
                    {
                      name: "Kevin R.",
                      role: "CTO, NextGen AI",
                      content: "La sécurité RLS est un atout majeur pour nos données sensibles. Une plateforme solide.",
                      rating: 5,
                      avatar: "K",
                      tag: "TECH"
                    },
                    {
                      name: "Elena V.",
                      role: "Creative Director",
                      content: "Design épuré et expérience utilisateur fluide. Exactement ce que nous cherchions.",
                      rating: 5,
                      avatar: "E",
                      tag: "DESIGN"
                    },
                    {
                      name: "Marc A.",
                      role: "Head of Learning",
                      content: "L'onboarding a été super rapide. Nos formateurs ont pris l'outil en main en moins d'une heure.",
                      rating: 5,
                      avatar: "M",
                      tag: "MANAGEMENT"
                    }
                  ].map((testimonial, index) => (
                    <div
                      key={index}
                      className="w-[350px] md:w-[450px] p-8 rounded-[2rem] bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none flex flex-col justify-between group/card hover:bg-slate-50 dark:hover:bg-white/10 hover:border-primary-500/30 transition-all duration-300"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-6">
                          <div className="flex gap-1">
                            {[...Array(testimonial.rating)].map((_, i) => (
                              <Star key={i} className="w-4 h-4 fill-primary-500 dark:fill-primary-400 text-primary-500 dark:text-primary-400" />
                            ))}
                          </div>
                          <Quote className="w-8 h-8 text-slate-200 dark:text-white/5 group-hover/card:text-primary-500/20 transition-colors" />
                        </div>
                        <p className="text-lg text-gray-700 dark:text-gray-300 font-medium leading-relaxed italic mb-8 line-clamp-3">
                          "{testimonial.content}"
                        </p>
                      </div>
                      <div className="flex items-center gap-4 pt-6 border-t border-slate-100 dark:border-white/5">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-black text-xl shadow-lg ring-2 ring-slate-100 dark:ring-white/10">
                          {testimonial.avatar}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-gray-900 dark:text-white uppercase tracking-tight">{testimonial.name}</h4>
                            <div className="w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center">
                              <CheckCircle className="w-2.5 h-2.5 text-blue-500 dark:text-blue-400" />
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest">{testimonial.role}</p>
                        </div>
                        <div className="px-3 py-1 bg-slate-100 dark:bg-white/5 rounded-full border border-slate-200 dark:border-white/10">
                          <span className="text-[8px] font-black text-gray-500 dark:text-gray-400">{testimonial.tag}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </Section>

      {/* Démo - Interface Gallery */}
      <Section id="demo">
        <div className="max-w-6xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-4">
              Un aperçu de l'interface
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Dashboard, lecteur vidéo, quiz... tout est pensé pour une expérience fluide.
            </p>
          </motion.div>

          <div className="relative group p-4">
            {/* Browser Mockup Frame */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.05)] border-t border-white/10"
            >
              {/* Browser Status Bar */}
              <div className="h-12 bg-white/5 border-b border-white/5 px-6 flex items-center justify-between">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <div className="flex-1 max-w-md mx-8">
                  <div className="bg-white/5 rounded-lg h-7 border border-white/5 flex items-center px-4 justify-center">
                    <div className="flex items-center gap-2 opacity-40">
                      <Lock className="w-3 h-3" />
                      <span className="text-[10px] font-medium tracking-wide">smrislearn.com/dashboard/{demoImages[activeSlide].title.toLowerCase().replace(/ /g, '-')}</span>
                    </div>
                  </div>
                </div>
                <div className="w-16 h-1 w-full" /> {/* Spacer */}
              </div>

              {/* Main Content Area */}
              <div className="relative aspect-video bg-black">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeSlide}
                    initial={{ opacity: 0, x: 100, scale: 1.1 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -100, scale: 0.9 }}
                    transition={{ type: "spring", damping: 20, stiffness: 100 }}
                    className="absolute inset-0"
                  >
                    <img
                      src={demoImages[activeSlide].url}
                      alt={demoImages[activeSlide].title}
                      className="w-full h-full object-cover object-top"
                    />
                    {/* Caption for current view */}
                    <div className="absolute top-6 right-6 z-40">
                      <span className="px-4 py-2 bg-black/60 backdrop-blur-md text-[10px] font-black text-white uppercase tracking-[0.2em] rounded-full border border-white/10">
                        {demoImages[activeSlide].title}
                      </span>
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Navigation Arrows */}
                <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-4 z-50 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setActiveSlide((prev) => (prev === 0 ? demoImages.length - 1 : prev - 1))}
                    className="w-12 h-12 bg-black/50 backdrop-blur-md rounded-full border border-white/10 flex items-center justify-center text-white hover:bg-primary-500/80 transition-all transform hover:scale-110"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => setActiveSlide((prev) => (prev === demoImages.length - 1 ? 0 : prev + 1))}
                    className="w-12 h-12 bg-black/50 backdrop-blur-md rounded-full border border-white/10 flex items-center justify-center text-white hover:bg-primary-500/80 transition-all transform hover:scale-110"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Pagination Dots */}
            <div className="mt-8 flex justify-center gap-3">
              {demoImages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveSlide(i)}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    activeSlide === i ? 'w-12 bg-primary-400 shadow-[0_0_10px_rgba(96,165,250,0.5)]' : 'w-2 bg-white/10 hover:bg-white/20'
                  }`}
                  aria-label={` slide ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* FAQ */}
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
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
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

      {/* Contact */}
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

      {/* CTA finale - Dynamic Mesh & Grid */}
      <Section id="cta" className="relative overflow-hidden bg-white dark:bg-slate-950">
        {/* Dynamic Mesh Background Layers */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              x: [0, 100, 0],
              y: [0, 50, 0],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute -top-1/4 -left-1/4 w-full h-full bg-primary-100 dark:bg-primary-600/30 rounded-full blur-[120px]"
          />
          <motion.div
            animate={{
              scale: [1.2, 1, 1.2],
              x: [0, -100, 0],
              y: [0, -50, 0],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute -bottom-1/4 -right-1/4 w-full h-full bg-indigo-100 dark:bg-indigo-900/40 rounded-full blur-[120px]"
          />
          <div className="absolute inset-0 bg-white/40 dark:bg-slate-950/40 backdrop-blur-[2px]" />
          
          {/* Animated Grid Overlay */}
          <div 
            className="absolute inset-0 opacity-[0.2] dark:opacity-[0.15]" 
            style={{ 
              backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.05) 1px, transparent 1px)`,
              backgroundSize: '40px 40px'
            }} 
            // className="dark:hidden"   
          />
          <div 
            className="absolute inset-0 opacity-[0.15] hidden dark:block" 
            style={{ 
              backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)`,
              backgroundSize: '40px 40px'
            }} 
          />
          <motion.div
            animate={{
              y: ["0%", "100%", "0%"],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute inset-0 w-full h-px bg-gradient-to-r from-transparent via-primary-500/20 dark:via-primary-500/50 to-transparent z-10"
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center relative z-20 px-4"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/20 text-primary-700 dark:text-primary-400 text-xs font-black uppercase tracking-[0.2em] mb-8">
            <Zap className="w-4 h-4" />
            <span>Propulsez votre académie</span>
          </div>

          <h2 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white mb-8 leading-[1.1] tracking-tight">
            Prêt à révolutionner
            <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-primary-700 via-primary-500 to-indigo-600 dark:from-primary-400 dark:via-primary-200 dark:to-indigo-300">
              vos formations ?
            </span>
          </h2>
          
          <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-300/80 mb-12 max-w-2xl mx-auto font-medium leading-relaxed">
            Rejoignez des milliers d'entreprises qui utilisent <span className="text-primary-700 dark:text-white font-bold">Smiris Learn</span> pour transformer leur savoir en réussite.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <button
              onClick={() => {
                setSelectedPlan('free');
                setShowSignupModal(true);
              }}
              className="group relative px-10 py-5 bg-primary-600 dark:bg-white text-white dark:text-slate-950 rounded-2xl text-xl font-black shadow-xl dark:shadow-[0_20px_50px_-15px_rgba(255,255,255,0.3)] hover:shadow-2xl dark:hover:shadow-[0_25px_60px_-15px_rgba(255,255,255,0.4)] transition-all flex items-center gap-3 active:scale-95 hover:bg-primary-700 dark:hover:bg-primary-50 active:bg-primary-600 dark:active:bg-white"
            >
              Créer mon compte
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              {/* Outer Glow */}
              <div className="absolute -inset-1 bg-primary-500/20 dark:bg-white/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
            </button>
            
            <button
              onClick={() => document.getElementById('pricing').scrollIntoView({ behavior: 'smooth' })}
              className="px-10 py-5 bg-white/50 dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white rounded-2xl text-xl font-bold hover:bg-white dark:hover:bg-white/10 transition-all active:scale-95 shadow-sm"
            >
              Voir les tarifs
            </button>
          </div>

          <div className="mt-12 flex items-center justify-center gap-8 opacity-40">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Sécure by Design</span>
            </div>
            <div className="w-1 h-1 bg-white/20 rounded-full" />
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Support Allemand</span>
            </div>
          </div>
        </motion.div>
      </Section>

      {/* Trusted By Marquee */}
      <motion.div 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1 }}
        viewport={{ once: true }}
        className="snap-start bg-white/70 dark:bg-secondary-950/50 backdrop-blur-sm border-y border-primary-100/50 dark:border-gray-800/50 py-8 overflow-hidden"
      >
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
      </motion.div>

      {/* Footer */}
      <motion.footer 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className="snap-start bg-gradient-to-b from-gray-50 to-white dark:from-secondary-950 dark:to-slate-950 border-t border-primary-100 dark:border-gray-800 py-16"
      >
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

          <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-400 dark:text-gray-500">
              © 2026 Smiris Learn. Tous droits réservés.
            </p>
            <p className="text-xs text-gray-300 dark:text-gray-600">
              Fait avec ❤️ par YASSIR KEZZI
            </p>
          </div>
        </div>
      </motion.footer>

      {/* Modal d'inscription */}
      <AnimatePresence>
        {showSignupModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowSignupModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-primary-100 dark:border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                Inscription - Plan {selectedPlan === 'free' ? 'Gratuit' : 'Starter'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                {selectedPlan === 'free' 
                  ? "Créez votre compte gratuitement et commencez à former vos équipes."
                  : "Créez votre compte et choisissez votre abonnement. Vous serez redirigé vers Stripe après validation."}
              </p>

              <form onSubmit={handleSignupSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nom de l'entreprise
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl focus:border-primary-400 dark:focus:border-primary-500 focus:ring-4 focus:ring-primary-100 dark:focus:ring-primary-900/30 outline-none transition-all dark:bg-gray-900 dark:text-white"
                    value={signupData.companyName}
                    onChange={(e) => setSignupData({ ...signupData, companyName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl focus:border-primary-400 dark:focus:border-primary-500 focus:ring-4 focus:ring-primary-100 dark:focus:ring-primary-900/30 outline-none transition-all dark:bg-gray-900 dark:text-white"
                    value={signupData.email}
                    onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Mot de passe
                  </label>
                  <input
                    type="password"
                    required
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl focus:border-primary-400 dark:focus:border-primary-500 focus:ring-4 focus:ring-primary-100 dark:focus:ring-primary-900/30 outline-none transition-all dark:bg-gray-900 dark:text-white"
                    value={signupData.password}
                    onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Confirmer le mot de passe
                  </label>
                  <input
                    type="password"
                    required
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl focus:border-primary-400 dark:focus:border-primary-500 focus:ring-4 focus:ring-primary-100 dark:focus:ring-primary-900/30 outline-none transition-all dark:bg-gray-900 dark:text-white"
                    value={signupData.confirmPassword}
                    onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                  />
                </div>

                {signupError && (
                  <p className="text-sm text-red-500 dark:text-red-400">{signupError}</p>
                )}

                <button
                  type="submit"
                  disabled={signupLoading}
                  className="w-full py-3 bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {signupLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Création en cours...</span>
                    </>
                  ) : (
                    <>
                      <span>{selectedPlan === 'free' ? 'Créer mon compte gratuit' : 'Continuer vers le paiement'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-4 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  En vous inscrivant, vous acceptez nos{' '}
                  <a href="#" className="text-primary-600 dark:text-primary-400 hover:underline">Conditions d'utilisation</a>
                  {' '}et notre{' '}
                  <a href="#" className="text-primary-600 dark:text-primary-400 hover:underline">Politique de confidentialité</a>.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}