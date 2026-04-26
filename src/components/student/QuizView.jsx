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
    const [maxAttempts, setMaxAttempts] = useState(-1);

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
                showErrorRef.current('Erreur lors du chargement du quiz');
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
            info('Veuillez répondre à toutes les questions');
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
                success('Félicitations, vous avez réussi le quiz !');
                await sendNotification(
                    user.id,
                    'Quiz réussi !',
                    `Vous avez réussi le quiz "${quiz.title}" avec ${score}%`,
                    'success'
                );
            } else {
                info(`Vous avez obtenu ${score}%. Il faut ${quiz.passing_score}% pour réussir.`);
            }
        } catch (err) {
            console.error('Erreur sauvegarde progression:', err);
            showError('Erreur lors de la sauvegarde');
        }
    };

    const handleRetry = () => {
        if (maxAttempts !== -1 && attempts >= maxAttempts) {
            showError('Nombre maximum de tentatives atteint');
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
            <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary-50 via-white to-accent-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col items-center justify-center">
                <motion.div
                   animate={{ scale: [1, 1.1, 1], rotate: [0, 180, 360] }}
                   transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                   className="relative"
                >
                  <div className="w-20 h-20 border-4 border-primary-100/50 dark:border-gray-700 rounded-full shadow-2xl"></div>
                  <div className="absolute top-0 left-0 w-20 h-20 border-4 border-primary-600 dark:border-primary-400 border-t-transparent rounded-full"></div>
                </motion.div>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mt-6 text-primary-900 dark:text-primary-300 font-medium tracking-wide animate-pulse"
                >
                  Préparation du quiz...
                </motion.p>
            </div>
        );
    }

    if (!quiz) {
        return (
            <div className="min-h-screen flex items-center justify-center text-gray-500 dark:text-gray-400 italic bg-primary-50 dark:bg-gray-900">
                Quiz introuvable
            </div>
        );
    }

    if (maxAttempts !== -1 && attempts >= maxAttempts && !submitted && !result) {
        return (
            <div className="min-h-screen bg-primary-50 dark:bg-gray-900 flex items-center justify-center p-4">
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white dark:bg-gray-800 rounded-3xl p-10 max-w-md text-center shadow-2xl border border-red-50 dark:border-red-900/30"
                >
                    <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-3">Tentatives épuisées</h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                        Vous avez utilisé vos {maxAttempts} tentatives pour ce quiz.
                    </p>
                    <button
                        onClick={() => navigate('/student/learning')}
                        className="w-full py-4 bg-gray-900 dark:bg-gray-700 text-white rounded-2xl font-bold hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors shadow-lg"
                    >
                        Retour aux modules
                    </button>
                </motion.div>
            </div>
        );
    }

    if (submitted && result) {
        return (
            <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary-50 via-white to-accent-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6 flex flex-col items-center pt-12 md:pt-24">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                    className="max-w-4xl w-full bg-white/60 dark:bg-gray-800/60 backdrop-blur-3xl rounded-[3rem] p-10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-white/60 dark:border-gray-700/50 overflow-hidden relative mb-12 z-10"
                >
                    <div className={`absolute top-0 left-0 w-full h-3 ${result.passed ? 'bg-gradient-to-r from-emerald-400 to-green-500' : 'bg-gradient-to-r from-rose-400 to-red-500'}`} />
                    <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 ${result.passed ? 'bg-green-400/20' : 'bg-red-400/20'} rounded-full blur-3xl -z-10`} />
                    
                    <div className="text-center mb-10 mt-6 relative z-10">
                        <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1, rotate: result.passed ? 360 : 0 }}
                            transition={{ type: "spring", bounce: 0.5, duration: 1, delay: 0.2 }}
                            className={`w-32 h-32 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl ${result.passed ? 'bg-gradient-to-br from-emerald-400 to-green-500 text-white shadow-emerald-500/40' : 'bg-gradient-to-br from-rose-400 to-red-500 text-white shadow-red-500/40'} rotate-12`}
                        >
                            <div className="-rotate-12">
                                {result.passed ? <CheckCircle className="w-16 h-16" /> : <XCircle className="w-16 h-16" />}
                            </div>
                        </motion.div>
                        <h2 className="text-5xl font-black mb-4 tracking-tight text-gray-900 dark:text-white">
                            {result.passed ? 'Félicitations !' : 'Dommage !'}
                        </h2>
                        <p className="text-xl font-medium text-gray-500 dark:text-gray-400">
                            {result.passed ? 'Quiz validé avec succès' : `Score minimum requis : ${quiz.passing_score}%`}
                        </p>
                        
                        <div className="mt-10 mb-4 inline-flex items-center justify-center bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm px-10 py-6 rounded-3xl border border-white/60 dark:border-gray-700/50 shadow-inner">
                            <div className="flex items-baseline gap-2">
                                <span className={`text-7xl font-black bg-clip-text text-transparent ${result.passed ? 'bg-gradient-to-tr from-emerald-500 to-green-400' : 'bg-gradient-to-tr from-rose-500 to-red-400'}`}>
                                    {result.score}
                                </span>
                                <span className="text-3xl text-gray-300 dark:text-gray-600 font-black">%</span>
                            </div>
                        </div>

                        {maxAttempts !== -1 && (
                            <div className="mt-4 inline-block px-4 py-2 bg-gray-100/80 dark:bg-gray-900/80 rounded-full">
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest">
                                    Tentative {attempts}/{maxAttempts}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="space-y-6 mt-16 bg-white/40 dark:bg-gray-900/40 p-8 sm:p-10 rounded-[2.5rem] border border-white/60 dark:border-gray-700/50 shadow-sm relative z-10">
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3 mb-8 tracking-tight">
                            <div className="p-2.5 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800 rounded-xl shadow-inner text-primary-600 dark:text-primary-300">
                                <HelpCircle className="w-6 h-6" />
                            </div>
                            Correction détaillée
                        </h3>
                        {quiz.questions.map((q, idx) => {
                            const correct = isQuestionCorrect(q, answers[idx]);
                            return (
                                <div key={idx} className={`p-6 rounded-2xl border-2 transition-all ${correct ? 'border-green-100 dark:border-green-800 bg-green-50/30 dark:bg-green-900/20' : 'border-red-100 dark:border-red-800 bg-red-50/30 dark:bg-red-900/20'}`}>
                                    <div className="flex items-start gap-4">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${correct ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-gray-800 dark:text-white leading-snug">
                                                {escapeText(untrusted(q.text))}
                                            </p>
                                            
                                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="p-3 bg-white/60 dark:bg-gray-800/60 rounded-xl border border-white dark:border-gray-700 shadow-sm">
                                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase mb-1">Votre réponse</p>
                                                    <p className={`font-medium ${correct ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                                                        {q.type === 'single' || q.type === 'truefalse' 
                                                            ? (answers[idx] !== null ? (q.type === 'truefalse' ? (answers[idx] ? 'Vrai' : 'Faux') : escapeText(untrusted(q.options[answers[idx]]))) : 'Aucune réponse')
                                                            : (answers[idx]?.length > 0 ? answers[idx].map(i => escapeText(untrusted(q.options[i]))).join(', ') : 'Aucune réponse')
                                                        }
                                                    </p>
                                                </div>
                                                {!correct && (
                                                    <div className="p-3 bg-primary-50/50 dark:bg-primary-900/30 rounded-xl border border-primary-100 dark:border-primary-800 shadow-sm">
                                                        <p className="text-[10px] text-primary-400 dark:text-primary-400 font-black uppercase mb-1">Bonne réponse</p>
                                                        <p className="font-bold text-primary-700 dark:text-primary-300">
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12 bg-white dark:bg-gray-800 sticky bottom-0 py-6 border-t border-gray-100 dark:border-gray-700">
                        {!result.passed && (maxAttempts === -1 || attempts < maxAttempts) && (
                            <button
                                onClick={handleRetry}
                                className="flex items-center justify-center gap-2 py-5 px-6 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-2xl font-black hover:bg-primary-100 dark:hover:bg-primary-800/50 transition-all border-2 border-primary-100 dark:border-primary-800 active:scale-95"
                            >
                                <RefreshCw className="w-5 h-5" />
                                Réessayer
                            </button>
                        )}
                        <button
                            onClick={() => result.passed && nextVideoId ? navigate(`/student/video/${nextVideoId}`) : navigate('/student/learning')}
                            className={`flex items-center justify-center gap-2 py-5 px-6 text-white rounded-2xl font-black shadow-2xl transition-all hover:scale-[1.02] active:scale-95 ${result.passed ? 'bg-primary-600 hover:bg-primary-700 col-span-full md:col-span-1 shadow-primary-200 dark:shadow-primary-900/30' : 'bg-gray-900 dark:bg-gray-700 hover:bg-black dark:hover:bg-gray-600 col-span-full md:col-span-1 shadow-gray-200 dark:shadow-gray-900/30'}`}
                        >
                            {result.passed && nextVideoId ? 'Vidéo suivante' : 'Retour aux modules'}
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
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary-50 via-white to-accent-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6 flex flex-col items-center justify-center font-sans">
            <div className="max-w-4xl w-full mt-4 md:mt-0">
                {/* Header Timeline/Timer */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-[1.5rem] shadow-xl shadow-primary-500/30 flex items-center justify-center text-white font-black text-2xl rotate-3">
                            <div className="-rotate-3">{currentQuestionIndex + 1}</div>
                        </div>
                        <div>
                            <h3 className="font-black text-2xl text-gray-900 dark:text-white tracking-tight mb-2">Question {currentQuestionIndex + 1} <span className="text-gray-400 text-lg">/ {quiz.questions.length}</span></h3>
                            <div className="flex gap-1.5 items-center">
                                {quiz.questions.map((_, i) => (
                                    <div 
                                        key={i} 
                                        className={`h-2 rounded-full transition-all duration-500 ${
                                            i === currentQuestionIndex ? 'w-10 bg-primary-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : i < currentQuestionIndex ? 'w-4 bg-emerald-400' : 'w-4 bg-gray-200 dark:bg-gray-700/50'
                                        }`} 
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                    {timeLeft !== null && (
                        <div className={`flex items-center justify-center gap-3 px-6 py-4 rounded-[1.5rem] font-mono text-2xl font-black shadow-lg border backdrop-blur-md transition-all ${timeLeft <= 30 ? 'bg-red-50/80 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 animate-pulse' : 'bg-white/60 dark:bg-gray-800/60 text-gray-800 dark:text-white border-white/60 dark:border-gray-700/50'}`}>
                            <Clock className={`w-6 h-6 ${timeLeft <= 30 ? 'text-red-500' : 'text-primary-500'}`} />
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
                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                        className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-2xl rounded-[3rem] p-8 md:p-14 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-white/60 dark:border-gray-700/50 relative overflow-hidden z-10"
                    >
                        <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary-200/40 dark:bg-primary-900/20 rounded-full blur-3xl pointer-events-none -z-10"></div>
                        <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                            <HelpCircle className="w-64 h-64 text-primary-600 dark:text-primary-400" />
                        </div>

                        <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-12 leading-tight relative z-10 tracking-tight">
                            {escapeText(untrusted(question.text))}
                        </h2>

                        <div className="space-y-5 relative z-10">
                            {question.type === 'single' && question.options.map((opt, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleAnswer(idx)}
                                    className={`w-full p-8 text-left rounded-3xl border-2 transition-all duration-300 flex items-center justify-between group ${
                                        currentAnswer === idx
                                            ? 'border-primary-600 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/30 shadow-inner'
                                            : 'border-gray-100 dark:border-gray-700 hover:border-primary-200 dark:hover:border-primary-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    <span className={`text-xl transition-colors ${currentAnswer === idx ? 'text-primary-900 dark:text-primary-300 font-bold' : 'text-gray-700 dark:text-gray-300 font-medium'}`}>
                                        {escapeText(untrusted(opt))}
                                    </span>
                                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${currentAnswer === idx ? 'border-primary-600 dark:border-primary-400 bg-primary-600 dark:bg-primary-400' : 'border-gray-300 dark:border-gray-600'}`}>
                                        {currentAnswer === idx && <div className="w-3.5 h-3.5 rounded-full bg-white dark:bg-gray-900 shadow-sm" />}
                                    </div>
                                </button>
                            ))}

                            {question.type === 'multiple' && question.options.map((opt, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleMultipleAnswer(idx)}
                                    className={`w-full p-8 text-left rounded-3xl border-2 transition-all duration-300 flex items-center justify-between group ${
                                        (currentAnswer || []).includes(idx)
                                            ? 'border-primary-600 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/30 shadow-inner'
                                            : 'border-gray-100 dark:border-gray-700 hover:border-primary-200 dark:hover:border-primary-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    <span className={`text-xl transition-colors ${(currentAnswer || []).includes(idx) ? 'text-primary-900 dark:text-primary-300 font-bold' : 'text-gray-700 dark:text-gray-300 font-medium'}`}>
                                        {escapeText(untrusted(opt))}
                                    </span>
                                    <div className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all ${ (currentAnswer || []).includes(idx) ? 'border-primary-600 dark:border-primary-400 bg-primary-600 dark:bg-primary-400' : 'border-gray-300 dark:border-gray-600'}`}>
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
                                                    ? 'border-primary-600 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/30 shadow-inner'
                                                    : 'border-gray-100 dark:border-gray-700 hover:border-primary-200 dark:hover:border-primary-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                                            }`}
                                        >
                                            <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${currentAnswer === opt.value ? 'border-primary-600 dark:border-primary-400 bg-primary-600 dark:bg-primary-400 shadow-lg shadow-primary-100 dark:shadow-primary-900/30' : 'border-gray-300 dark:border-gray-600'}`}>
                                                {currentAnswer === opt.value && <div className="w-4 h-4 rounded-full bg-white dark:bg-gray-900 shadow-sm" />}
                                            </div>
                                            <span className={`text-2xl font-black ${currentAnswer === opt.value ? 'text-primary-900 dark:text-primary-300' : 'text-gray-500 dark:text-gray-400'}`}>
                                                {opt.label}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="mt-20 flex flex-col-reverse sm:flex-row items-center justify-between gap-6">
                            <button
                                onClick={goToPrev}
                                disabled={currentQuestionIndex === 0}
                                className="w-full sm:w-auto flex items-center justify-center gap-3 py-4 sm:py-5 px-8 sm:px-10 rounded-[1.5rem] font-black text-gray-500 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-500 transition-all active:scale-95 border border-transparent shadow-sm hover:shadow-md hover:border-white/50 dark:hover:border-gray-600/50"
                            >
                                <ArrowLeft className="w-6 h-6" />
                                Précédent
                            </button>
                            
                            {currentQuestionIndex === quiz.questions.length - 1 ? (
                                <button
                                    onClick={() => handleSubmit()}
                                    className="w-full sm:w-auto flex items-center justify-center gap-3 py-4 sm:py-5 px-10 sm:px-14 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-[1.5rem] font-black shadow-[0_10px_25px_-5px_rgba(79,70,229,0.4)] hover:shadow-[0_20px_35px_-5px_rgba(79,70,229,0.5)] transition-all hover:-translate-y-1 active:scale-95 active:translate-y-0 group border border-primary-500/50"
                                >
                                    Terminer le quiz
                                    <CheckCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
                                </button>
                            ) : (
                                <button
                                    onClick={goToNext}
                                    className="w-full sm:w-auto flex items-center justify-center gap-3 py-4 sm:py-5 px-10 sm:px-14 bg-gray-900 dark:bg-gray-700 text-white rounded-[1.5rem] font-black shadow-[0_10px_25px_-5px_rgba(0,0,0,0.3)] hover:shadow-[0_20px_35px_-5px_rgba(0,0,0,0.4)] transition-all hover:-translate-y-1 active:scale-95 active:translate-y-0 group border border-gray-700 dark:border-gray-600"
                                >
                                    Suivant
                                    <ArrowRight className="w-6 h-6 group-hover:translate-x-1.5 transition-transform" />
                                </button>
                            )}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}