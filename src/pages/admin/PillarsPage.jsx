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
                <div className="relative mb-6">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-bold uppercase tracking-widest mb-4"
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                Structure
                            </motion.div>
                            
                            <h1 className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 tracking-tight leading-tight">
                                Gestion des Piliers
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-2 font-medium">
                                <Shield className="w-4 h-4 text-primary-500" />
                                Organisez votre contenu en piliers d'apprentissage
                                {isImpersonating && (
                                    <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-full ml-2">
                                        Mode lecture seule - Organisation : {escapeText(untrusted(orgIdFromUrl))}
                                    </span>
                                )}
                            </p>
                        </div>
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