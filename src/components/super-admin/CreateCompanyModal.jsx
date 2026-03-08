import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Building, Mail, User, CheckCircle, AlertCircle, Sparkles, ArrowRight } from 'lucide-react';
import { useInvitation } from '../../hooks/useInvitation';

export default function CreateCompanyModal({ isOpen, onClose, onSuccess }) {
    const [formData, setFormData] = useState({
        name: '',
        adminEmail: '',
        adminName: ''
    });
    const [touched, setTouched] = useState({
        name: false,
        adminEmail: false,
        adminName: false
    });
    const { createInvitation, loading, error } = useInvitation();

    // Validation
    const validateName = (value) => {
        if (!value) return "Nom de l'entreprise requis";
        if (value.length < 3) return "Minimum 3 caractères";
        if (value.length > 100) return "Maximum 100 caractères";
        return "";
    };

    const validateEmail = (value) => {
        if (!value) return "Email requis";
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return "Email invalide";
        return "";
    };

    const validateAdminName = (value) => {
        if (!value) return "Nom de l'admin requis";
        if (value.length < 3) return "Minimum 3 caractères";
        return "";
    };

    const nameError = touched.name ? validateName(formData.name) : "";
    const emailError = touched.adminEmail ? validateEmail(formData.adminEmail) : "";
    const adminNameError = touched.adminName ? validateAdminName(formData.adminName) : "";

    const isValid = !nameError && !emailError && !adminNameError && 
                    formData.name && formData.adminEmail && formData.adminName;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleBlur = (field) => {
        setTouched(prev => ({ ...prev, [field]: true }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isValid) return;

        const { data, error } = await createInvitation(formData);
        
        if (!error) {
            onSuccess?.(data);
            resetForm();
            onClose();
        }
    };

    const resetForm = () => {
        setFormData({ name: '', adminEmail: '', adminName: '' });
        setTouched({ name: false, adminEmail: false, adminName: false });
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    {/* Overlay avec flou */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-md"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <div className="min-h-screen px-4 text-center">
                        <span className="inline-block h-screen align-middle">&#8203;</span>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 40 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 40 }}
                            transition={{ type: "spring", duration: 0.6, bounce: 0.3 }}
                            className="relative inline-block w-full max-w-md my-8 text-left align-middle"
                        >
                            {/* Carte principale avec effet glassmorphisme */}
                            <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20">
                                
                                {/* Éléments décoratifs */}
                                <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full opacity-20 blur-3xl pointer-events-none" />
                                <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-br from-pink-400 to-orange-400 rounded-full opacity-20 blur-3xl pointer-events-none" />
                                
                                {/* Badge premium */}
                                <div className="absolute top-4 right-4 z-10">
                                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 shadow-lg">
                                        <Sparkles className="w-3 h-3" />
                                        Nouvelle invitation
                                    </div>
                                </div>

                                {/* En-tête avec dégradé */}
                                <div className="relative px-8 pt-8 pb-6 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-t-3xl overflow-hidden">
                                    <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\&quot;60\&quot; height=\&quot;60\&quot; viewBox=\&quot;0 0 60 60\&quot; xmlns=\&quot;http://www.w3.org/2000/svg\&quot;%3E%3Cg fill=\&quot;none\&quot; fill-rule=\&quot;evenodd\&quot;%3E%3Cg fill=\&quot;%23ffffff\&quot; fill-opacity=\&quot;0.1\&quot;%3E%3Cpath d=\&quot;M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\&quot;/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20" />
                                    
                                    <div className="relative flex items-center justify-between">
                                        <div>
                                            <motion.h2 
                                                initial={{ x: -20, opacity: 0 }}
                                                animate={{ x: 0, opacity: 1 }}
                                                transition={{ delay: 0.1 }}
                                                className="text-2xl font-bold text-white"
                                            >
                                                Créer une invitation
                                            </motion.h2>
                                            <motion.p 
                                                initial={{ x: -20, opacity: 0 }}
                                                animate={{ x: 0, opacity: 1 }}
                                                transition={{ delay: 0.2 }}
                                                className="text-blue-100 text-sm mt-1"
                                            >
                                                L'entreprise sera créée après validation
                                            </motion.p>
                                        </div>
                                        <motion.button
                                            whileHover={{ rotate: 90, scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={onClose}
                                            className="p-2 hover:bg-white/20 rounded-xl transition-all duration-300"
                                        >
                                            <X className="w-5 h-5 text-white" />
                                        </motion.button>
                                    </div>

                                    {/* Indicateur de progression stylisé */}
                                    <div className="relative mt-6 h-1.5 bg-white/20 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: '100%' }}
                                            transition={{ duration: 0.8, delay: 0.3 }}
                                            className="absolute h-full bg-white rounded-full"
                                        />
                                    </div>
                                </div>

                                {/* Formulaire */}
                                <form onSubmit={handleSubmit} className="p-8 space-y-6 bg-white/40 rounded-b-3xl">
                                    
                                    {/* Nom entreprise */}
                                    <motion.div 
                                        initial={{ y: 20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.1 }}
                                        className="space-y-2"
                                    >
                                        <label className="block text-sm font-semibold text-gray-700">
                                            Nom de l'entreprise
                                            <span className="text-red-500 ml-1">*</span>
                                        </label>
                                        <div className="relative group">
                                            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                                                <Building className="w-5 h-5" />
                                            </div>
                                            <input
                                                type="text"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleChange}
                                                onBlur={() => handleBlur('name')}
                                                className={`
                                                    w-full pl-12 pr-12 py-5 bg-white border-2 border-gray-100 rounded-2xl 
                                                    outline-none transition-all duration-300
                                                    ${nameError && touched.name
                                                        ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                                                        : formData.name && !nameError
                                                            ? 'border-green-300 focus:border-green-500 focus:ring-4 focus:ring-green-100'
                                                            : 'border-gray-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100'
                                                    }
                                                `}
                                                placeholder="ex: smiris academy"
                                            />
                                            <AnimatePresence>
                                                {formData.name && !nameError && touched.name && (
                                                    <motion.div
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        exit={{ scale: 0 }}
                                                        className="absolute right-4 top-1/2 transform -translate-y-1/2"
                                                    >
                                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                                    </motion.div>
                                                )}
                                                {nameError && touched.name && (
                                                    <motion.div
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        exit={{ scale: 0 }}
                                                        className="absolute right-4 top-1/2 transform -translate-y-1/2"
                                                    >
                                                        <AlertCircle className="w-5 h-5 text-red-500" />
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                        <AnimatePresence>
                                            {nameError && touched.name && (
                                                <motion.p
                                                    initial={{ opacity: 0, y: -10, height: 0 }}
                                                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                                                    exit={{ opacity: 0, y: -10, height: 0 }}
                                                    className="text-sm text-red-500 flex items-center gap-1 overflow-hidden"
                                                >
                                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                                    {nameError}
                                                </motion.p>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>

                                    {/* Email admin */}
                                    <motion.div 
                                        initial={{ y: 20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.2 }}
                                        className="space-y-2"
                                    >
                                        <label className="block text-sm font-semibold text-gray-700">
                                            Email de l'administrateur
                                            <span className="text-red-500 ml-1">*</span>
                                        </label>
                                        <div className="relative group">
                                            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                                                <Mail className="w-5 h-5" />
                                            </div>
                                            <input
                                                type="email"
                                                name="adminEmail"
                                                value={formData.adminEmail}
                                                onChange={handleChange}
                                                onBlur={() => handleBlur('adminEmail')}
                                                className={`
                                                    w-full pl-12 pr-12 py-5 bg-white border-2 border-gray-100 rounded-2xl 
                                                    outline-none transition-all duration-300
                                                    ${emailError && touched.adminEmail
                                                        ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                                                        : formData.adminEmail && !emailError
                                                            ? 'border-green-300 focus:border-green-500 focus:ring-4 focus:ring-green-100'
                                                            : 'border-gray-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100'
                                                    }
                                                `}
                                                placeholder="admin@entreprise.com"
                                            />
                                            <AnimatePresence>
                                                {formData.adminEmail && !emailError && touched.adminEmail && (
                                                    <motion.div
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        exit={{ scale: 0 }}
                                                        className="absolute right-4 top-1/2 transform -translate-y-1/2"
                                                    >
                                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                                    </motion.div>
                                                )}
                                                {emailError && touched.adminEmail && (
                                                    <motion.div
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        exit={{ scale: 0 }}
                                                        className="absolute right-4 top-1/2 transform -translate-y-1/2"
                                                    >
                                                        <AlertCircle className="w-5 h-5 text-red-500" />
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                        <AnimatePresence>
                                            {emailError && touched.adminEmail && (
                                                <motion.p
                                                    initial={{ opacity: 0, y: -10, height: 0 }}
                                                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                                                    exit={{ opacity: 0, y: -10, height: 0 }}
                                                    className="text-sm text-red-500 flex items-center gap-1 overflow-hidden"
                                                >
                                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                                    {emailError}
                                                </motion.p>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>

                                    {/* Nom admin */}
                                    <motion.div 
                                        initial={{ y: 20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.3 }}
                                        className="space-y-2"
                                    >
                                        <label className="block text-sm font-semibold text-gray-700">
                                            Nom de l'administrateur
                                            <span className="text-red-500 ml-1">*</span>
                                        </label>
                                        <div className="relative group">
                                            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                                                <User className="w-5 h-5" />
                                            </div>
                                            <input
                                                type="text"
                                                name="adminName"
                                                value={formData.adminName}
                                                onChange={handleChange}
                                                onBlur={() => handleBlur('adminName')}
                                                className={`
                                                    w-full pl-12 pr-12 py-5 bg-white border-2 border-gray-100 rounded-2xl 
                                                    outline-none transition-all duration-300
                                                    ${adminNameError && touched.adminName
                                                        ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                                                        : formData.adminName && !adminNameError
                                                            ? 'border-green-300 focus:border-green-500 focus:ring-4 focus:ring-green-100'
                                                            : 'border-gray-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100'
                                                    }
                                                `}
                                                placeholder="youssef fakir"
                                            />
                                            <AnimatePresence>
                                                {formData.adminName && !adminNameError && touched.adminName && (
                                                    <motion.div
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        exit={{ scale: 0 }}
                                                        className="absolute right-4 top-1/2 transform -translate-y-1/2"
                                                    >
                                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                                    </motion.div>
                                                )}
                                                {adminNameError && touched.adminName && (
                                                    <motion.div
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        exit={{ scale: 0 }}
                                                        className="absolute right-4 top-1/2 transform -translate-y-1/2"
                                                    >
                                                        <AlertCircle className="w-5 h-5 text-red-500" />
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                        <AnimatePresence>
                                            {adminNameError && touched.adminName && (
                                                <motion.p
                                                    initial={{ opacity: 0, y: -10, height: 0 }}
                                                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                                                    exit={{ opacity: 0, y: -10, height: 0 }}
                                                    className="text-sm text-red-500 flex items-center gap-1 overflow-hidden"
                                                >
                                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                                    {adminNameError}
                                                </motion.p>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>

                                    {/* Message d'erreur global */}
                                    <AnimatePresence>
                                        {error && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10, height: 0 }}
                                                animate={{ opacity: 1, y: 0, height: 'auto' }}
                                                exit={{ opacity: 0, y: -10, height: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="p-4 bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500 rounded-2xl">
                                                    <p className="text-sm text-red-600 flex items-center gap-2">
                                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                                        {error}
                                                    </p>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Boutons */}
                                    <motion.div 
                                        initial={{ y: 20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.4 }}
                                        className="flex items-center gap-3 pt-4"
                                    >
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="flex-1 px-6 py-4 text-gray-600 font-semibold rounded-2xl hover:bg-gray-100 transition-all duration-300"
                                        >
                                            Annuler
                                        </button>
                                        
                                        <motion.button
                                            type="submit"
                                            disabled={!isValid || loading}
                                            whileHover={isValid ? { scale: 1.02, y: -2 } : {}}
                                            whileTap={isValid ? { scale: 0.98 } : {}}
                                            className={`
                                                flex-1 px-6 py-4 rounded-2xl font-semibold text-white
                                                transition-all duration-300 relative overflow-hidden group
                                                ${isValid && !loading
                                                    ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-lg shadow-blue-200'
                                                    : 'bg-gray-300 cursor-not-allowed'
                                                }
                                            `}
                                        >
                                            {/* Effet de shine */}
                                            <div className="absolute inset-0 bg-white/20 transform -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                            
                                            {loading ? (
                                                <div className="flex items-center justify-center gap-2">
                                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                    <span>Création...</span>
                                                </div>
                                            ) : (
                                                <span className="flex items-center justify-center gap-2">
                                                    Créer l'invitation
                                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                                </span>
                                            )}
                                        </motion.button>
                                    </motion.div>

                                    {/* Note de sécurité */}
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.5 }}
                                        className="text-center"
                                    >
                                        <p className="text-xs text-gray-400">
                                            🔒 Un email sera envoyé à l'administrateur avec un lien unique valable 24h
                                        </p>
                                    </motion.div>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                </div>
            )}
        </AnimatePresence>
    );
}