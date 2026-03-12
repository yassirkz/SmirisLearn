// src/components/admin/videos/VideoUploader.jsx
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Upload, X, CheckCircle, AlertCircle,
    FileVideo, Loader2
} from 'lucide-react';
import { uploadVideo } from '../../../lib/storage/videos';
import { STORAGE_CONFIG } from '../../../lib/storage/config';
import { useToast } from '../../ui/Toast';
import { untrusted, escapeText } from '../../../utils/security';

export default function VideoUploader({ onUploadSuccess, onClose, orgId }) {
    const [dragActive, setDragActive] = useState(false);
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);
    const { success, error: showError } = useToast();

    const validateFile = (file) => {
        if (!file) return 'Aucun fichier sélectionné';
        
        if (!STORAGE_CONFIG.ALLOWED_TYPES.includes(file.type)) {
            return 'Format non supporté. Utilisez MP4, WebM ou MOV';
        }
        
        if (file.size > STORAGE_CONFIG.MAX_FILE_SIZE) {
            return `Fichier trop volumineux (max ${STORAGE_CONFIG.MAX_FILE_SIZE / 1024 / 1024} Mo)`;
        }
        
        return null;
    };

    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        
        const droppedFile = e.dataTransfer.files[0];
        const validationError = validateFile(droppedFile);
        
        if (validationError) {
            setError(validationError);
            showError(validationError);
        } else {
            setFile(droppedFile);
            setError(null);
        }
    }, [showError]);

    const handleFileSelect = (e) => {
        const selectedFile = e.target.files[0];
        const validationError = validateFile(selectedFile);
        
        if (validationError) {
            setError(validationError);
            showError(validationError);
        } else {
            setFile(selectedFile);
            setError(null);
        }
    };

    const handleUpload = async () => {
        if (!file || !orgId) {
            if (!orgId) showError('Organisation non identifiée');
            return;
        }

        setUploading(true);
        setProgress(0);
        setError(null);

        const result = await uploadVideo(file, orgId, setProgress);
            if (result.success) {
                onUploadSuccess({
                    url: result.url,
                    path: result.path,
                    name: result.name
                });
            }

        if (result.success) {
            success('Vidéo uploadée avec succès !');
            onUploadSuccess?.(result);
            setTimeout(() => {
                onClose?.();
            }, 1500);
        } else {
            setError(result.error);
            showError(result.error);
            setUploading(false);
        }
    };

    const handleCancel = () => {
        setFile(null);
        setError(null);
        setProgress(0);
        onClose?.();
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' o';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' Ko';
        return (bytes / (1024 * 1024)).toFixed(1) + ' Mo';
    };

    return (
        <div className="space-y-6">
            {/* Zone de drag & drop */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`
                    relative border-2 border-dashed rounded-2xl p-8
                    transition-all duration-300
                    ${dragActive 
                        ? 'border-indigo-500 bg-indigo-50' 
                        : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
                    }
                    ${error ? 'border-red-300 bg-red-50' : ''}
                `}
            >
                <input
                    type="file"
                    id="video-upload"
                    accept="video/mp4,video/webm,video/quicktime"
                    onChange={handleFileSelect}
                    className="hidden"
                />

                <div className="text-center">
                    {!file ? (
                        <>
                            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                            <p className="text-lg font-medium text-gray-700 mb-2">
                                Glissez votre vidéo ici
                            </p>
                            <p className="text-sm text-gray-500 mb-4">
                                ou
                            </p>
                            <label
                                htmlFor="video-upload"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all cursor-pointer"
                            >
                                <FileVideo className="w-4 h-4" />
                                Sélectionner un fichier
                            </label>
                            <p className="text-xs text-gray-400 mt-4">
                                Formats supportés: MP4, WebM, MOV (max 500 Mo)
                            </p>
                        </>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center gap-4 p-4 bg-white rounded-xl">
                                <FileVideo className="w-8 h-8 text-indigo-600" />
                                <div className="flex-1 text-left">
                                    <p className="font-medium text-gray-800 truncate">
                                        {escapeText(untrusted(file.name))}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {formatFileSize(file.size)}
                                    </p>
                                </div>
                                {!uploading && (
                                    <button
                                        onClick={handleCancel}
                                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        <X className="w-4 h-4 text-gray-500" />
                                    </button>
                                )}
                            </div>

                            {uploading && (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Upload en cours...</span>
                                        <span className="font-medium text-indigo-600">{progress}%</span>
                                    </div>
                                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progress}%` }}
                                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-600"
                                        />
                                    </div>
                                </div>
                            )}

                            {!uploading && (
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleUpload}
                                        className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all"
                                    >
                                        Uploader la vidéo
                                    </button>
                                    <button
                                        onClick={handleCancel}
                                        className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all"
                                    >
                                        Annuler
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
            </motion.div>

            {/* Message d'erreur */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3"
                    >
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <p className="text-sm text-red-600 flex-1">{error}</p>
                        <button onClick={() => setError(null)}>
                            <X className="w-4 h-4 text-red-400 hover:text-red-600" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}