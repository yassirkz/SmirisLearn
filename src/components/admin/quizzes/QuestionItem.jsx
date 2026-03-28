import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Copy, Trash2, Plus, X,
    AlertCircle, CheckCircle
} from 'lucide-react';
import { untrusted, escapeText } from '../../../utils/security';
import SanitizedInput from '../../ui/SanitizedInput';

const QUESTION_TYPES = [
    { value: 'single', label: 'Choix unique' },
    { value: 'multiple', label: 'Choix multiple' },
    { value: 'truefalse', label: 'Vrai/Faux' }
];

export default function QuestionItem({ question, index, onChange, onRemove, onDuplicate }) {
    const [showAnswerHelp, setShowAnswerHelp] = useState(false);

    const handleTypeChange = (type) => {
        let newQuestion = { ...question, type };
        if (type === 'single' || type === 'multiple') {
            newQuestion.options = question.options && question.options.length >= 2 ? question.options : ['', ''];
            newQuestion.answer = type === 'single' ? null : [];
        } else if (type === 'truefalse') {
            newQuestion.options = undefined;
            newQuestion.answer = null;
        }
        onChange(newQuestion);
    };

    const handleTextChange = (text) => {
        onChange({ ...question, text });
    };

    const handleOptionChange = (idx, value) => {
        const newOptions = [...question.options];
        newOptions[idx] = value;
        onChange({ ...question, options: newOptions });
    };

    const addOption = () => {
        onChange({ ...question, options: [...question.options, ''] });
    };

    const removeOption = (idx) => {
        if (question.options.length <= 2) return;
        const newOptions = question.options.filter((_, i) => i !== idx);
        let newAnswer = question.answer;
        if (question.type === 'single' && newAnswer === idx) {
            newAnswer = null;
        } else if (question.type === 'multiple' && Array.isArray(newAnswer)) {
            newAnswer = newAnswer.filter(a => a !== idx).map(a => a > idx ? a-1 : a);
        }
        onChange({ ...question, options: newOptions, answer: newAnswer });
    };

    const handleAnswerChange = (value) => {
        onChange({ ...question, answer: value });
    };

    const handleMultipleAnswerChange = (idx) => {
        let newAnswer = question.answer ? [...question.answer] : [];
        if (newAnswer.includes(idx)) {
            newAnswer = newAnswer.filter(i => i !== idx);
        } else {
            newAnswer.push(idx);
        }
        onChange({ ...question, answer: newAnswer });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-gray-50/50 dark:bg-slate-800/30 hover:bg-white dark:hover:bg-slate-800 rounded-2xl p-6 border border-gray-200/60 dark:border-gray-700/50 relative group transition-all duration-300 shadow-sm hover:shadow-lg"
        >
            {/* En-tête avec numéro et actions */}
            <div className="flex items-center justify-between mb-6">
                <span className="text-sm font-black text-primary-600 dark:text-primary-400 bg-primary-100 dark:bg-primary-900/30 px-3.5 py-1.5 rounded-xl uppercase tracking-wider shadow-sm border border-primary-200/50 dark:border-primary-800/50">
                    Question {index + 1}
                </span>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={onDuplicate}
                        className="p-2 bg-white dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-xl transition-all shadow-sm border border-gray-200 dark:border-gray-600"
                        title="Dupliquer"
                    >
                        <Copy className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </button>
                    <button
                        type="button"
                        onClick={onRemove}
                        className="p-2 bg-white dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all shadow-sm border border-gray-200 dark:border-gray-600 hover:border-red-200 dark:hover:border-red-800/50 group/del"
                        title="Supprimer"
                    >
                        <Trash2 className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover/del:text-red-500 dark:group-hover/del:text-red-400 transition-colors" />
                    </button>
                </div>
            </div>

            {/* Type de question */}
            <div className="mb-5">
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">Type de question</label>
                <div className="relative">
                    <select
                        value={question.type}
                        onChange={(e) => handleTypeChange(e.target.value)}
                        className="w-full sm:w-64 px-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:border-primary-500 focus:ring-4 focus:ring-primary-100 dark:focus:ring-primary-900/30 outline-none transition-all font-medium appearance-none cursor-pointer"
                    >
                        {QUESTION_TYPES.map(t_opt => (
                            <option key={t_opt.value} value={t_opt.value}>{t_opt.label}</option>
                        ))}
                    </select>
                    <div className="absolute inset-y-0 left-56 flex items-center pointer-events-none">
                        <span className="text-gray-400 text-xs">▼</span>
                    </div>
                </div>
            </div>

            {/* Texte de la question */}
            <div className="mb-6">
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">Texte de la question</label>
                <SanitizedInput
                    value={question.text}
                    onChange={(e) => handleTextChange(e.target.value)}
                    validate="text"
                    required
                    placeholder="Saisir la question de manière claire et concise..."
                    className='px-4 py-3 bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-primary-100 dark:focus:ring-primary-900/30 font-medium'
                />
            </div>

            {/* Options pour QCM */}
            {(question.type === 'single' || question.type === 'multiple') && (
                <div className="space-y-4 mb-6 bg-white/50 dark:bg-slate-900/50 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/50">
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Options de réponse</label>
                    <div className="space-y-3">
                        {question.options?.map((opt, optIdx) => (
                            <div key={optIdx} className="flex items-center gap-3">
                                <div className="flex bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 cursor-pointer hover:border-primary-300 dark:hover:border-primary-700 transition-colors">
                                    <input
                                        type={question.type === 'single' ? 'radio' : 'checkbox'}
                                        name={`answer-${index}`}
                                        checked={question.type === 'single'
                                            ? question.answer === optIdx
                                            : (question.answer || []).includes(optIdx)
                                        }
                                        onChange={() => question.type === 'single'
                                            ? handleAnswerChange(optIdx)
                                            : handleMultipleAnswerChange(optIdx)
                                        }
                                        className="w-5 h-5 text-primary-600 dark:text-primary-400 rounded focus:ring-primary-500 cursor-pointer"
                                    />
                                </div>
                                <input
                                    type="text"
                                    value={opt}
                                    onChange={(e) => handleOptionChange(optIdx, e.target.value)}
                                    placeholder={`Saisir l'option ${optIdx + 1}`}
                                    className="flex-1 px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:border-primary-500 focus:ring-4 focus:ring-primary-100 dark:focus:ring-primary-900/30 outline-none transition-all font-medium"
                                />
                                <button
                                    type="button"
                                    onClick={() => removeOption(optIdx)}
                                    disabled={question.options.length <= 2}
                                    className="p-3 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 disabled:opacity-30 transition-all group/opt"
                                >
                                    <X className="w-4 h-4 text-gray-400 group-hover/opt:text-red-500 transition-colors" />
                                </button>
                            </div>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={addOption}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-bold text-sm rounded-xl hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors border border-primary-200/50 dark:border-primary-800/50"
                    >
                        <Plus className="w-4 h-4" /> Ajouter une option
                    </button>
                </div>
            )}

            {/* Vrai/Faux */}
            {question.type === 'truefalse' && (
                <div className="flex gap-4 mb-6 bg-white/50 dark:bg-slate-900/50 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/50">
                    <label className="flex-1 flex items-center justify-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 cursor-pointer hover:border-primary-300 dark:hover:border-primary-700 transition-all font-medium">
                        <input
                            type="radio"
                            name={`truefalse-${index}`}
                            value="true"
                            checked={question.answer === true}
                            onChange={() => handleAnswerChange(true)}
                            className="w-5 h-5 text-primary-600 dark:text-primary-400 focus:ring-primary-500 cursor-pointer"
                        />
                        <span className="text-gray-800 dark:text-gray-200 text-lg">Vrai</span>
                    </label>
                    <label className="flex-1 flex items-center justify-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 cursor-pointer hover:border-primary-300 dark:hover:border-primary-700 transition-all font-medium">
                        <input
                            type="radio"
                            name={`truefalse-${index}`}
                            value="false"
                            checked={question.answer === false}
                            onChange={() => handleAnswerChange(false)}
                            className="w-5 h-5 text-primary-600 dark:text-primary-400 focus:ring-primary-500 cursor-pointer"
                        />
                        <span className="text-gray-800 dark:text-gray-200 text-lg">Faux</span>
                    </label>
                </div>
            )}

            {/* Aide pour la réponse */}
            <div className="mt-4 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                <button
                    type="button"
                    onClick={() => setShowAnswerHelp(!showAnswerHelp)}
                    className="text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-primary-500 dark:hover:text-primary-400 flex items-center gap-1.5 transition-colors"
                >
                    <AlertCircle className="w-4 h-4" />
                    {showAnswerHelp ? "Masquer l'aide" : "Afficher l'aide"}
                </button>
                {showAnswerHelp && (
                    <motion.p 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2 p-3 bg-gray-100/50 dark:bg-slate-900/50 rounded-xl"
                    >
                        {question.type === 'single' && "Cochez la case à gauche de l'option correcte."}
                        {question.type === 'multiple' && "Cochez toutes les cases correspondant aux bonnes réponses."}
                        {question.type === 'truefalse' && "Sélectionnez si l'affirmation est Vraie ou Fausse."}
                    </motion.p>
                )}
            </div>
        </motion.div>
    );
}