// src/components/student/QuizView.jsx
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, AlertCircle, CheckCircle, XCircle, Loader, ArrowRight, ArrowLeft, RefreshCw, HelpCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../ui/Toast';
import { untrusted, escapeText } from '../../utils/security';
import { sendNotification } from '../../utils/notifications';

export default function QuizView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { success, error: showError, info } = useToast();
    const showErrorRef = useRef(showError);
    useEffect(() => { showErrorRef.current = showError; }, [showError]);

    const [quiz, setQuiz] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState([]);
    const [timeLeft, setTimeLeft] = useState(null);
    const [submitted, setSubmitted] = useState(false);
    const [result, setResult] = useState(null);
    const [attempts, setAttempts] = useState(0);
    const [maxAttempts, setMaxAttempts] = useState(-1); // -1 = illimité

    const nextVideoId = location.state?.nextVideoId;

    useEffect(() => {
        const fetchQuizAndProgress = async () => {
            if (!user) return;
            try {
                const { data: quizData, error: quizError } = await supabase
                    .from('quizzes')
                    .select('*')
                    .eq('id', id)
                    .single();
                if (quizError) throw quizError;
                setQuiz(quizData);
                setAnswers(new Array(quizData.questions.length).fill(null));
                setMaxAttempts(quizData.max_attempts ?? -1);

                const { data: progressData } = await supabase
                    .from('user_progress')
                    .select('quiz_attempts')
                    .eq('user_id', user.id)
                    .eq('video_id', quizData.video_id)
                    .maybeSingle();
                setAttempts(progressData?.quiz_attempts || 0);

                if (quizData.timer_minutes) {
                    setTimeLeft(quizData.timer_minutes * 60);
                }
            } catch (err) {
                console.error('Erreur chargement quiz:', err);
                showErrorRef.current('Impossible de charger le quiz');
            } finally {
                setLoading(false);
            }
        };
        fetchQuizAndProgress();
    }, [id, user?.id]);

    useEffect(() => {
        if (timeLeft === null || timeLeft <= 0 || submitted) return;
        const timer = setInterval(() => {
            setTimeLeft(t => t - 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [timeLeft, submitted]);

    useEffect(() => {
        if (timeLeft === 0 && !submitted) {
            handleSubmit(true);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timeLeft]);

    const handleAnswer = (value) => {
        const newAnswers = [...answers];
        newAnswers[currentQuestionIndex] = value;
        setAnswers(newAnswers);
    };

    const handleMultipleAnswer = (optionIndex) => {
        const current = answers[currentQuestionIndex] || [];
        const newValue = current.includes(optionIndex)
            ? current.filter(i => i !== optionIndex)
            : [...current, optionIndex];
        handleAnswer(newValue);
    };

    const goToNext = () => {
        if (currentQuestionIndex < quiz.questions.length - 1) {
            setCurrentQuestionIndex(i => i + 1);
        }
    };

    const goToPrev = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(i => i - 1);
        }
    };

    const isQuestionCorrect = (question, userAnswer) => {
        if (userAnswer === null || userAnswer === undefined) return false;
        
        if (question.type === 'single') {
            return userAnswer === question.answer;
        } else if (question.type === 'multiple') {
            const correctAnswers = question.answer || [];
            const userAnswers = userAnswer || [];
            return correctAnswers.length === userAnswers.length && 
                   correctAnswers.every(val => userAnswers.includes(val));
        } else if (question.type === 'truefalse') {
            return userAnswer === question.answer;
        }
        return false;
    };

    const calculateScore = () => {
        let correct = 0;
        quiz.questions.forEach((q, idx) => {
            if (isQuestionCorrect(q, answers[idx])) {
                correct++;
            }
        });
        return Math.round((correct / quiz.questions.length) * 100);
    };

    const handleSubmit = async (timeout = false) => {
        if (submitted) return;

        if (!timeout && answers.some(a => a === null || (Array.isArray(a) && a.length === 0))) {
            info('Veuillez répondre à toutes les questions avant de soumettre.');
            return;
        }

        const score = calculateScore();
        const passed = score >= quiz.passing_score;

        setSubmitted(true);
        setResult({ score, passed });

        try {
            const { error } = await supabase
                .from('user_progress')
                .upsert({
                    user_id: user.id,
                    video_id: quiz.video_id,
                    quiz_attempts: attempts + 1,
                    quiz_score: score,
                    quiz_passed: passed,
                    watched: passed ? true : false,
                    completed_at: passed ? new Date().toISOString() : null
                }, { onConflict: 'user_id, video_id' });

            if (error) throw error;
            setAttempts(prev => prev + 1);

            if (passed) {
                success('Félicitations ! Quiz réussi.');
                await sendNotification(
                    user.id,
                    'Quiz réussi ! 🎓',
                    `Félicitations ! Vous avez validé le quiz "${quiz.title}" avec un score de ${score}%.`,
                    'success'
                );
            } else {
                info(`Quiz échoué. Score : ${score}% (minimum requis : ${quiz.passing_score}%)`);
            }
        } catch (err) {
            console.error('Erreur sauvegarde progression:', err);
            showError('Impossible de sauvegarder votre progression');
        }
    };

    const handleRetry = () => {
        if (maxAttempts !== -1 && attempts >= maxAttempts) {
            showError('Nombre maximum de tentatives atteint.');
            return;
        }
        setAnswers(new Array(quiz.questions.length).fill(null));
        setCurrentQuestionIndex(0);
        setSubmitted(false);
        setResult(null);
        if (quiz.timer_minutes) {
            setTimeLeft(quiz.timer_minutes * 60);
        }
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
                <Loader className="w-12 h-12 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (!quiz) {
        return (
            <div className="min-h-screen flex items-center justify-center text-gray-500 italic bg-indigo-50">
                Quiz introuvable.
            </div>
        );
    }

    if (maxAttempts !== -1 && attempts >= maxAttempts && !submitted && !result) {
        return (
            <div className="min-h-screen bg-indigo-50 flex items-center justify-center p-4">
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white rounded-3xl p-10 max-w-md text-center shadow-2xl border border-red-50"
                >
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="w-10 h-10 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-3">Tentatives épuisées</h2>
                    <p className="text-gray-600 mb-8 leading-relaxed">
                        Désolé, vous avez atteint le nombre maximum de {maxAttempts} tentatives autorisées pour ce quiz.
                    </p>
                    <button
                        onClick={() => navigate('/student/learning')}
                        className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-colors shadow-lg"
                    >
                        Retour aux formations
                    </button>
                </motion.div>
            </div>
        );
    }

    if (submitted && result) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-6 flex flex-col items-center">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-4xl w-full bg-white rounded-[2.5rem] p-10 shadow-2xl overflow-hidden relative mb-12"
                >
                    <div className={`absolute top-0 left-0 w-full h-2 ${result.passed ? 'bg-green-500' : 'bg-red-500'}`} />
                    
                    <div className="text-center mb-10">
                        <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ${result.passed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                            {result.passed ? <CheckCircle className="w-12 h-12" /> : <XCircle className="w-12 h-12" />}
                        </div>
                        <h2 className="text-4xl font-black mb-2 tracking-tight">
                            {result.passed ? 'Félicitations !' : 'Oups... Pas tout à fait.'}
                        </h2>
                        <p className="text-xl text-gray-600">
                            {result.passed ? 'Vous avez validé ce quiz avec succès.' : 'Vous n\'avez pas atteint le score minimum de ' + quiz.passing_score + '%.'}
                        </p>
                        
                        <div className="mt-8 flex justify-center items-end gap-2">
                            <span className={`text-6xl font-black ${result.passed ? 'text-green-600' : 'text-red-600'}`}>
                                {result.score}%
                            </span>
                            <span className="text-gray-400 font-bold mb-2">/ 100%</span>
                        </div>
                        {maxAttempts !== -1 && (
                            <p className="text-sm text-gray-400 mt-4 font-medium uppercase tracking-widest">
                                Tentative {attempts} sur {maxAttempts}
                            </p>
                        )}
                    </div>

                    <div className="space-y-6 mt-12 bg-gray-50/50 p-8 rounded-3xl border border-gray-100">
                        <h3 className="text-xl font-black text-gray-800 flex items-center gap-2 mb-6">
                            <HelpCircle className="w-6 h-6 text-indigo-600" />
                            Correction détaillée
                        </h3>
                        {quiz.questions.map((q, idx) => {
                            const correct = isQuestionCorrect(q, answers[idx]);
                            return (
                                <div key={idx} className={`p-6 rounded-2xl border-2 transition-all ${correct ? 'border-green-100 bg-green-50/30' : 'border-red-100 bg-red-50/30'}`}>
                                    <div className="flex items-start gap-4">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${correct ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-gray-800 leading-snug">
                                                {escapeText(untrusted(q.text))}
                                            </p>
                                            
                                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="p-3 bg-white/60 rounded-xl border border-white shadow-sm">
                                                    <p className="text-[10px] text-gray-400 font-black uppercase mb-1">Votre réponse</p>
                                                    <p className={`font-medium ${correct ? 'text-green-700' : 'text-red-700'}`}>
                                                        {q.type === 'single' || q.type === 'truefalse' 
                                                            ? (answers[idx] !== null ? (q.type === 'truefalse' ? (answers[idx] ? 'Vrai' : 'Faux') : escapeText(untrusted(q.options[answers[idx]]))) : 'Pas de réponse')
                                                            : (answers[idx]?.length > 0 ? answers[idx].map(i => escapeText(untrusted(q.options[i]))).join(', ') : 'Pas de réponse')
                                                        }
                                                    </p>
                                                </div>
                                                {!correct && (
                                                    <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 shadow-sm">
                                                        <p className="text-[10px] text-indigo-400 font-black uppercase mb-1">Bonne réponse</p>
                                                        <p className="font-bold text-indigo-700">
                                                            {q.type === 'single' || q.type === 'truefalse'
                                                                ? (q.type === 'truefalse' ? (q.answer ? 'Vrai' : 'Faux') : escapeText(untrusted(q.options[q.answer])))
                                                                : q.answer.map(i => escapeText(untrusted(q.options[i]))).join(', ')
                                                            }
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12 bg-white sticky bottom-0 py-6 border-t border-gray-100">
                        {!result.passed && (maxAttempts === -1 || attempts < maxAttempts) && (
                            <button
                                onClick={handleRetry}
                                className="flex items-center justify-center gap-2 py-5 px-6 bg-indigo-50 text-indigo-700 rounded-2xl font-black hover:bg-indigo-100 transition-all border-2 border-indigo-100 active:scale-95"
                            >
                                <RefreshCw className="w-5 h-5" />
                                Réessayer le quiz
                            </button>
                        )}
                        <button
                            onClick={() => result.passed && nextVideoId ? navigate(`/student/video/${nextVideoId}`) : navigate('/student/learning')}
                            className={`flex items-center justify-center gap-2 py-5 px-6 text-white rounded-2xl font-black shadow-2xl transition-all hover:scale-[1.02] active:scale-95 ${result.passed ? 'bg-indigo-600 hover:bg-indigo-700 col-span-full md:col-span-1 shadow-indigo-200' : 'bg-gray-900 hover:bg-black col-span-full md:col-span-1 shadow-gray-200'}`}
                        >
                            {result.passed && nextVideoId ? 'Visionner la vidéo suivante' : result.passed ? 'Retour aux formations' : 'Retour aux formations'}
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    const question = quiz.questions[currentQuestionIndex];
    const currentAnswer = answers[currentQuestionIndex];

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6 flex flex-col items-center justify-center font-sans">
            <div className="max-w-4xl w-full">
                {/* Header Profile/Timeline */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white rounded-2xl shadow-xl border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-xl">
                            {currentQuestionIndex + 1}
                        </div>
                        <div>
                            <h3 className="font-black text-gray-900 leading-none">Question {currentQuestionIndex + 1} sur {quiz.questions.length}</h3>
                            <div className="flex gap-1.5 mt-2">
                                {quiz.questions.map((_, i) => (
                                    <div 
                                        key={i} 
                                        className={`h-2 rounded-full transition-all duration-500 ${
                                            i === currentQuestionIndex ? 'w-10 bg-indigo-600' : i < currentQuestionIndex ? 'w-5 bg-green-400' : 'w-5 bg-gray-200'
                                        }`} 
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                    {timeLeft !== null && (
                        <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-mono text-xl font-black shadow-2xl border-2 transition-colors ${timeLeft < 30 ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-white text-indigo-600 border-indigo-50'}`}>
                            <Clock className="w-6 h-6" />
                            {formatTime(timeLeft)}
                        </div>
                    )}
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentQuestionIndex}
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -20, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="bg-white rounded-[2.5rem] p-10 md:p-14 shadow-2xl border border-indigo-100/50 relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <HelpCircle className="w-48 h-48 text-indigo-600" />
                        </div>

                        <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-12 leading-tight relative">
                            {escapeText(untrusted(question.text))}
                        </h2>

                        <div className="space-y-4 relative">
                            {question.type === 'single' && question.options.map((opt, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleAnswer(idx)}
                                    className={`w-full p-8 text-left rounded-3xl border-2 transition-all duration-300 flex items-center justify-between group ${
                                        currentAnswer === idx
                                            ? 'border-indigo-600 bg-indigo-50 shadow-inner'
                                            : 'border-gray-100 hover:border-indigo-200 hover:bg-gray-50'
                                    }`}
                                >
                                    <span className={`text-xl transition-colors ${currentAnswer === idx ? 'text-indigo-900 font-bold' : 'text-gray-700 font-medium'}`}>
                                        {escapeText(untrusted(opt))}
                                    </span>
                                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${currentAnswer === idx ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'}`}>
                                        {currentAnswer === idx && <div className="w-3.5 h-3.5 rounded-full bg-white shadow-sm" />}
                                    </div>
                                </button>
                            ))}

                            {question.type === 'multiple' && question.options.map((opt, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleMultipleAnswer(idx)}
                                    className={`w-full p-8 text-left rounded-3xl border-2 transition-all duration-300 flex items-center justify-between group ${
                                        (currentAnswer || []).includes(idx)
                                            ? 'border-indigo-600 bg-indigo-50 shadow-inner'
                                            : 'border-gray-100 hover:border-indigo-200 hover:bg-gray-50'
                                    }`}
                                >
                                    <span className={`text-xl transition-colors ${(currentAnswer || []).includes(idx) ? 'text-indigo-900 font-bold' : 'text-gray-700 font-medium'}`}>
                                        {escapeText(untrusted(opt))}
                                    </span>
                                    <div className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all ${ (currentAnswer || []).includes(idx) ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'}`}>
                                        {(currentAnswer || []).includes(idx) && <CheckCircle className="w-5 h-5 text-white" />}
                                    </div>
                                </button>
                            ))}

                            {question.type === 'truefalse' && (
                                <div className="grid grid-cols-2 gap-8">
                                    {[
                                        { value: true, label: 'Vrai' },
                                        { value: false, label: 'Faux' }
                                    ].map(opt => (
                                        <button
                                            key={opt.label}
                                            onClick={() => handleAnswer(opt.value)}
                                            className={`py-14 flex flex-col items-center justify-center gap-6 rounded-[2.5rem] border-2 transition-all duration-300 ${
                                                currentAnswer === opt.value
                                                    ? 'border-indigo-600 bg-indigo-50 shadow-inner'
                                                    : 'border-gray-100 hover:border-indigo-200 hover:bg-gray-50'
                                            }`}
                                        >
                                            <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${currentAnswer === opt.value ? 'border-indigo-600 bg-indigo-600 shadow-lg shadow-indigo-100' : 'border-gray-300'}`}>
                                                {currentAnswer === opt.value && <div className="w-4 h-4 rounded-full bg-white shadow-sm" />}
                                            </div>
                                            <span className={`text-2xl font-black ${currentAnswer === opt.value ? 'text-indigo-900' : 'text-gray-500'}`}>
                                                {opt.label}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="mt-20 flex items-center justify-between gap-6">
                            <button
                                onClick={goToPrev}
                                disabled={currentQuestionIndex === 0}
                                className="flex items-center gap-3 py-5 px-10 rounded-2xl font-black text-gray-400 hover:text-gray-900 disabled:opacity-30 disabled:hover:text-gray-400 transition-all active:scale-95"
                            >
                                <ArrowLeft className="w-6 h-6" />
                                Précédent
                            </button>
                            
                            {currentQuestionIndex === quiz.questions.length - 1 ? (
                                <button
                                    onClick={() => handleSubmit()}
                                    className="flex items-center gap-3 py-5 px-14 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 shadow-2xl shadow-indigo-100 transition-all hover:scale-105 active:scale-95"
                                >
                                    Terminer le quiz
                                    <ArrowRight className="w-6 h-6" />
                                </button>
                            ) : (
                                <button
                                    onClick={goToNext}
                                    className="flex items-center gap-3 py-5 px-14 bg-gray-900 text-white rounded-2xl font-black hover:bg-black transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-gray-200"
                                >
                                    Suivant
                                    <ArrowRight className="w-6 h-6" />
                                </button>
                            )}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}