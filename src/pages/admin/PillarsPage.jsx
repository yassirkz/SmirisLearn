import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Sparkles, Shield } from 'lucide-react';
import AdminLayout from '../../components/layout/AdminLayout';
import PillarsList from '../../components/admin/pillars/PillarsList';
import { useUserRole } from '../../hooks/useUserRole';
import { useAuth } from '../../hooks/useAuth';
import { useSearchParams, Navigate } from 'react-router-dom';
import { untrusted, escapeText } from '../../utils/security';

export default function PillarsPage() {
    const { user } = useAuth();
    const { role, isAdminAccess, loading: roleLoading } = useUserRole();
    const [searchParams] = useSearchParams();
    const orgIdFromUrl = searchParams.get('orgId');
    const isImpersonating = role === 'super_admin' && orgIdFromUrl;

    if (!roleLoading && !isAdminAccess && !isImpersonating) {
        return <Navigate to="/unauthorized" replace />;
    }

    return (
        <AdminLayout>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-8"
            >
                {/* En-tête premium */}
                <div className="relative">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-4 -right-4"
                    >
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-bl-2xl rounded-tr-2xl text-xs font-bold shadow-lg flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            Gestion des piliers
                        </div>
                    </motion.div>

                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <BookOpen className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                            Piliers de formation
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            Gérez les piliers de votre académie
                            {isImpersonating && (
                                <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-full">
                                    Mode lecture seule - Entreprise #{escapeText(untrusted(orgIdFromUrl))}
                                </span>
                            )}
                        </p>
                    </div>
                </div>

                {/* Composant principal */}
                <PillarsList 
                    isReadOnly={isImpersonating}
                    orgId={orgIdFromUrl}
                />
            </motion.div>
        </AdminLayout>
    );
}