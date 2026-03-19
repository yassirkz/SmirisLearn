// src/components/admin/quizzes/QuizCreator.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Save, X, AlertCircle, Loader } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../ui/Toast';
import { untrusted, escapeText } from '../../../utils/security';
import QuestionItem from './QuestionItem';

const DEFAULT_QUESTION = () => ({
    id: crypto.randomUUID(),
    type: 'single',
    text: '',
    options: ['', ''],
    answer: null
});

export default function QuizCreator({ quiz, videoId, onSuccess, onCancel }) {
    const { user } = useAuth();
    const { success, error: showError } = useToast();

    const [videos, setVideos] = useState([]);
    const [loadingVideos, setLoadingVideos] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

    const [form, setForm] = useState({
        video_id: videoId || quiz?.video_id || '',
        passing_score: quiz?.passing_score ?? 70,
        max_attempts: quiz?.max_attempts ?? 2,
        timer_minutes: quiz?.timer_minutes ?? '',
        questions: quiz?.questions?.length
            ? quiz.questions.map(q => ({ ...q, id: q.id || crypto.randomUUID() }))
            : [DEFAULT_QUESTION()]
    });

    useEffect(() => {
        const fetchVideos = async () => {
            try {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('organization_id')
                    .eq('id', user.id)
                    .single();

                if (!profile?.organization_id) return;

                const { data } = await supabase
                    .from('videos')
                    .select('id, title, pillar:pillars!inner(name, organization_id)')
                    .eq('pillar.organization_id', profile.organization_id)
                    .order('title');

                setVideos(data || []);
            } catch (err) {
                console.error('Erreur chargement vidéos:', err);
            } finally {
                setLoadingVideos(false);
            }
        };
        fetchVideos();
    }, [user]);

    const validate = () => {
        const newErrors = {};

        if (!form.video_id) {
            newErrors.video_id = "Veuillez sélectionner une vidéo";
        }

        if (form.passing_score < 0 || form.passing_score > 100) {
            newErrors.passing_score = "Le score doit être entre 0 et 100";
        }

        const attempts = parseInt(form.max_attempts);
        if (isNaN(attempts) || (attempts !== -1 && attempts < 1)) {
            newErrors.max_attempts = "Le nombre de tentatives doit être au moins 1 (ou -1 pour illimité)";
        }

        if (form.questions.length === 0) {
            newErrors.questions = "Vous devez ajouter au moins une question";
        }

        form.questions.forEach((q, i) => {
            if (!q.text?.trim()) {
                newErrors[`question_${i}`] = `La question ${i + 1} est vide`;
            }
            if ((q.type === 'single' || q.type === 'multiple') && q.options.some(o => !o.trim())) {
                newErrors[`question_${i}_options`] = `Toutes les options de la question ${i + 1} doivent être remplies`;
            }
            if (q.type === 'single' && q.answer === null) {
                newErrors[`question_${i}_answer`] = `Veuillez sélectionner la bonne réponse pour la question ${i + 1}`;
            }
            if (q.type === 'multiple' && (!q.answer || q.answer.length === 0)) {
                newErrors[`question_${i}_answer`] = `Veuillez sélectionner au moins une bonne réponse pour la question ${i + 1}`;
            }
            if (q.type === 'truefalse' && q.answer === null) {
                newErrors[`question_${i}_answer`] = `Veuillez sélectionner Vrai ou Faux pour la question ${i + 1}`;
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        setSaving(true);
        try {
            const cleanQuestions = form.questions.map(({ id, ...q }) => q);

            const payload = {
                video_id: form.video_id,
                passing_score: Number(form.passing_score),
                max_attempts: parseInt(form.max_attempts) || 2,
                timer_minutes: form.timer_minutes ? Number(form.timer_minutes) : null,
                questions: cleanQuestions
            };

            let error;
            if (quiz?.id) {
                ({ error } = await supabase
                    .from('quizzes')
                    .update(payload)
                    .eq('id', quiz.id));
            } else {
                ({ error } = await supabase
                    .from('quizzes')
                    .insert(payload));
            }

            if (error) throw error;

            success(quiz?.id ? "Quiz modifié avec succès" : "Quiz créé avec succès");
            onSuccess?.();
            onSuccess?.();
        } catch (err) {
            console.error('Erreur sauvegarde quiz:', err);
            showError("Erreur lors de la sauvegarde du quiz");
        } finally {
            setSaving(false);
        }
    };

    const addQuestion = () => {
        setForm(f => ({ ...f, questions: [...f.questions, DEFAULT_QUESTION()] }));
    };

    const updateQuestion = (index, updated) => {
        setForm(f => {
            const questions = [...f.questions];
            questions[index] = updated;
            return { ...f, questions };
        });
    };

    const removeQuestion = (index) => {
        if (form.questions.length <= 1) return;
        setForm(f => ({
            ...f,
            questions: f.questions.filter((_, i) => i !== index)
        }));
    };

    const duplicateQuestion = (index) => {
        const copy = { ...form.questions[index], id: crypto.randomUUID() };
        setForm(f => {
            const questions = [...f.questions];
            questions.splice(index + 1, 0, copy);
            return { ...f, questions };
        });
    };

    const errorList = Object.values(errors);

    return (
        <div className="space-y-6">
            {/* Erreurs globales */}
            {errorList.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                        <span className="text-sm font-medium text-red-700 dark:text-red-300">Veuillez corriger les erreurs suivantes :</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1">
                        {errorList.map((e, i) => (
                            <li key={i} className="text-sm text-red-600 dark:text-red-400">{e}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Sélection vidéo */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Vidéo associée <span className="text-red-500">*</span>
                </label>
                {loadingVideos ? (
                    <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 text-sm">
                        <Loader className="w-4 h-4 animate-spin" />
                        Chargement des vidéos...
                    </div>
                ) : (
                    <select
                        value={form.video_id}
                        onChange={(e) => setForm(f => ({ ...f, video_id: e.target.value }))}
                        className={`w-full p-2 border rounded-lg focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 outline-none dark:bg-gray-900 dark:text-white ${
                            errors.video_id ? 'border-red-400 dark:border-red-600' : 'border-gray-200 dark:border-gray-700'
                        }`}
                    >
                        <option value="">Sélectionner une vidéo</option>
                        {videos.map(v => (
                            <option key={v.id} value={v.id}>
                                {escapeText(untrusted(v.title))}
                                {v.pillar?.name ? ` (${escapeText(untrusted(v.pillar.name))})` : ''}
                            </option>
                        ))}
                    </select>
                )}
                {errors.video_id && (
                    <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.video_id}</p>
                )}
            </div>

            {/* Paramètres */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Score de réussite (%)
                    </label>
                    <input
                        type="number"
                        min="0"
                        max="100"
                        value={form.passing_score}
                        onChange={(e) => setForm(f => ({ ...f, passing_score: e.target.value }))}
                        className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 outline-none dark:bg-gray-900 dark:text-white"
                    />
                    {errors.passing_score && (
                        <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.passing_score}</p>
                    )}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Temps limite (minutes)
                    </label>
                    <input
                        type="number"
                        min="1"
                        value={form.timer_minutes}
                        onChange={(e) => setForm(f => ({ ...f, timer_minutes: e.target.value }))}
                        placeholder="Saisir une durée en minutes"
                        className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 outline-none dark:bg-gray-900 dark:text-white"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Nombre de tentatives <span className="text-xs text-gray-400 dark:text-gray-500">(-1 = illimité)</span>
                    </label>
                    <input
                        type="number"
                        min="-1"
                        step="1"
                        value={form.max_attempts}
                        onChange={(e) => setForm(f => ({ ...f, max_attempts: e.target.value }))}
                        className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 outline-none dark:bg-gray-900 dark:text-white"
                    />
                    {errors.max_attempts && (
                        <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.max_attempts}</p>
                    )}
                </div>
            </div>

            {/* Questions */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {form.questions.length} questions
                    </h3>
                    <button
                        type="button"
                        onClick={addQuestion}
                        className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1"
                    >
                        <Plus className="w-4 h-4" />
                        Ajouter une question
                    </button>
                </div>

                {errors.questions && (
                    <p className="text-xs text-red-500 dark:text-red-400 mb-2">{errors.questions}</p>
                )}

                <AnimatePresence>
                    <div className="space-y-4">
                        {form.questions.map((question, index) => (
                            <QuestionItem
                                key={question.id}
                                question={question}
                                index={index}
                                onChange={(updated) => updateQuestion(index, updated)}
                                onRemove={() => removeQuestion(index)}
                                onDuplicate={() => duplicateQuestion(index)}
                            />
                        ))}
                    </div>
                </AnimatePresence>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300"
                >
                    Annuler
                </button>
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={saving}
                    className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 disabled:opacity-60"
                >
                    {saving ? (
                        <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                        <Save className="w-4 h-4" />
                    )}
                    {quiz?.id ? "Enregistrer" : "Créer le quiz"}
                </button>
            </div>
        </div>
    );
}