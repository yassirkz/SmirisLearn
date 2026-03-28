import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Award, Sparkles, Shield, Plus, X } from 'lucide-react';
import AdminLayout from '../../components/layout/AdminLayout';
import QuizList from '../../components/admin/quizzes/QuizList';
import QuizCreator from '../../components/admin/quizzes/QuizCreator';
import { useUserRole } from '../../hooks/useUserRole';
import { useAuth } from '../../hooks/useAuth';
import { useSearchParams, Navigate } from 'react-router-dom';
import { untrusted, escapeText } from '../../utils/security';
import { useToast } from '../../components/ui/Toast';
import { supabase } from '../../lib/supabase';

export default function QuizPage() {
    const { user } = useAuth();
    const { role, isAdminAccess, loading: roleLoading } = useUserRole();
    const [searchParams] = useSearchParams();
    const orgIdFromUrl = searchParams.get('orgId');
    const isImpersonating = role === 'super_admin' && orgIdFromUrl;
    const { success, error: showError } = useToast();

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingQuiz, setEditingQuiz] = useState(null);
    const [selectedVideoId, setSelectedVideoId] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const handleRefreshList = useCallback(() => {
        setRefreshKey(k => k + 1);
    }, []);

    if (!roleLoading && !isAdminAccess && !isImpersonating) {
        return <Navigate to="/unauthorized" replace />;
    }

    const handleEdit = (quiz) => {
        setEditingQuiz(quiz);
        setShowCreateModal(true);
    };

    const handleCreate = (videoId) => {
        setSelectedVideoId(videoId || null);
        setEditingQuiz(null);
        setShowCreateModal(true);
    };

    const handleDelete = async (quiz) => {
        if (!window.confirm(`Voulez-vous vraiment supprimer le quiz pour : ${quiz.video?.title} ?`)) return;
        try {
            const { error } = await supabase
                .from('quizzes')
                .delete()
                .eq('id', quiz.id);
            if (error) throw error;
            success("Quiz supprimé avec succès");
            handleRefreshList();
        } catch (err) {
            console.error(err);
            showError("Erreur lors de la suppression du quiz");
        }
    };

    const handleDuplicate = async (quiz) => {
        setEditingQuiz({ ...quiz, id: undefined, video_id: '' });
        setShowCreateModal(true);
    };

    return (
        <AdminLayout>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-8"
            >
                {/* En-tête avec Glassmorphism */}
                <div className="relative bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl p-8 sm:p-10 shadow-xl border border-white/50 dark:border-white/5 overflow-hidden">
                    {/* Background Glows */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 dark:bg-primary-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-title-500/10 dark:bg-title-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />
                    
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-4">
                                <motion.div
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
                                    className="p-3 bg-gradient-to-br from-primary-500 to-accent-600 rounded-2xl shadow-lg shadow-primary-500/30"
                                >
                                    <Award className="w-8 h-8 text-white" />
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="px-4 py-1.5 bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800/50 rounded-full text-sm font-bold text-primary-700 dark:text-primary-300 shadow-sm flex items-center gap-2 w-fit"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    Gestion des Évaluations
                                </motion.div>
                            </div>
                            
                            <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 tracking-tight mb-4">
                                Quiz & Exercices
                            </h1>
                            
                            <p className="text-lg text-gray-500 dark:text-gray-400 font-medium max-w-2xl flex flex-wrap items-center gap-2">
                                <Shield className="w-5 h-5 text-gray-400" />
                                Créez et gérez des évaluations pour vos étudiants
                                {isImpersonating && (
                                    <span className="ml-2 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded-xl border border-amber-200/50 dark:border-amber-800/50 font-bold shadow-sm inline-flex items-center">
                                        Mode lecture seule - Orga: {escapeText(untrusted(orgIdFromUrl))}
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Liste des quiz */}
                <QuizList
                    isReadOnly={!!isImpersonating}
                    orgId={orgIdFromUrl}
                    refreshTrigger={refreshKey}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onDuplicate={handleDuplicate}
                    onCreate={handleCreate}
                    onViewStats={(quiz) => {
                        alert("Les statistiques seront bientôt disponibles.");
                    }}
                />

                {/* Modal de création/édition */}
                {showCreateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-gray-900/60 dark:bg-gray-900/80 backdrop-blur-md">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl p-6 sm:p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/50 dark:border-white/10 ring-1 ring-black/5 relative"
                        >
                            <div className="sticky top-0 -mt-6 sm:-mt-8 -mx-6 sm:-mx-8 px-6 sm:px-8 py-5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 z-20 flex justify-between items-center mb-6">
                                <h2 className="text-xl sm:text-2xl font-extrabold text-gray-800 dark:text-white flex items-center gap-3">
                                    <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
                                        {editingQuiz ? <Edit className="w-5 h-5 text-primary-600 dark:text-primary-400" /> : <Plus className="w-5 h-5 text-primary-600 dark:text-primary-400" />}
                                    </div>
                                    {editingQuiz ? "Modifier le Quiz" : "Créer un nouveau Quiz"}
                                </h2>
                                <motion.button
                                    whileHover={{ scale: 1.1, rotate: 90 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        setEditingQuiz(null);
                                        setSelectedVideoId(null);
                                    }}
                                    className="p-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors shadow-inner"
                                    title="Fermer"
                                >
                                    <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                </motion.button>
                            </div>
                            <QuizCreator
                                quiz={editingQuiz}
                                videoId={selectedVideoId}
                                onSuccess={() => {
                                    setShowCreateModal(false);
                                    setEditingQuiz(null);
                                    setSelectedVideoId(null);
                                    handleRefreshList();
                                }}
                                onCancel={() => {
                                    setShowCreateModal(false);
                                    setEditingQuiz(null);
                                    setSelectedVideoId(null);
                                }}
                            />
                        </motion.div>
                    </div>
                )}
            </motion.div>
        </AdminLayout>
    );
}