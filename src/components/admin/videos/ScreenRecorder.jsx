// src/components/admin/videos/ScreenRecorder.jsx
import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Monitor, Mic, Square, Circle, AlertCircle, Loader2 } from 'lucide-react';
import { uploadVideo } from '../../../lib/storage/videos';
import { useToast } from '../../ui/Toast';

export default function ScreenRecorder({ orgId, onRecordSuccess, onClose }) {
    const { error: showError, success } = useToast();
    const [recording, setRecording] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const streamRef = useRef(null);

    const stopStream = () => {
        if (streamRef.current) {
            if (streamRef.current.customStop) {
                streamRef.current.customStop();
            } else if (streamRef.current.getTracks) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }
            streamRef.current = null;
        }
    };

    const handleStart = async () => {
        try {
            setError(null);

            if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
                throw new Error("Votre navigateur ne supporte pas l'enregistrement d'écran");
            }

            const displayStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true
            });

            let voiceStream = null;
            try {
                voiceStream = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: false
                });
            } catch (err) {
                console.warn("L'accès au micro a été refusé. L'enregistrement se fera sans votre voix.", err);
            }

            let combinedStream;
            let audioContext = null;

            if (voiceStream) {
                audioContext = new AudioContext();
                const dest = audioContext.createMediaStreamDestination();

                if (displayStream.getAudioTracks().length > 0) {
                    const displaySource = audioContext.createMediaStreamSource(displayStream);
                    displaySource.connect(dest);
                }

                if (voiceStream.getAudioTracks().length > 0) {
                    const voiceSource = audioContext.createMediaStreamSource(voiceStream);
                    voiceSource.connect(dest);
                }

                combinedStream = new MediaStream([
                    ...displayStream.getVideoTracks(),
                    ...dest.stream.getAudioTracks()
                ]);
            } else {
                combinedStream = displayStream;
            }

            streamRef.current = {
                customStop: () => {
                    displayStream.getTracks().forEach(t => t.stop());
                    if (voiceStream) voiceStream.getTracks().forEach(t => t.stop());
                    if (audioContext && audioContext.state !== 'closed') audioContext.close();
                }
            };

            chunksRef.current = [];

            const mediaRecorder = new MediaRecorder(combinedStream, {
                mimeType: 'video/webm'
            });

            mediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = async () => {
                try {
                    const blob = new Blob(chunksRef.current, { type: 'video/webm' });
                    const file = new File(
                        [blob],
                        `screen-recording-${Date.now()}.webm`,
                        { type: 'video/webm' }
                    );

                    setUploading(true);
                    setProgress(0);

                    const result = await uploadVideo(file, orgId, setProgress);
                    setUploading(false);

                    if (!result.success) {
                        throw new Error(result.error || "Erreur lors de l'importation de l'enregistrement");
                    }

                    success("Enregistrement terminé et importé avec succès");
                    onRecordSuccess?.({
                        url: result.url,
                        path: result.path,
                        name: result.name
                    });
                } catch (err) {
                    console.error('❌ Erreur traitement enregistrement:', err);
                    setError(err.message);
                    showError(err.message);
                } finally {
                    stopStream();
                    setRecording(false);
                }
            };

            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.start();
            setRecording(true);

        } catch (err) {
            console.error('❌ Erreur démarrage enregistrement:', err);
            setError(err.message);
            showError(err.message);
            stopStream();
            setRecording(false);
        }
    };

    const handleStop = () => {
        if (mediaRecorderRef.current && recording) {
            mediaRecorderRef.current.stop();
        }
    };

    const handleClose = () => {
        if (!uploading && !recording) {
            stopStream();
            onClose?.();
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
                    <Monitor className="w-5 h-5" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                        Enregistreur d'écran
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Capturez votre écran et votre voix pour créer une vidéo
                    </p>
                </div>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                    <Mic className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    Sélectionnez l'onglet ou la fenêtre à enregistrer. Votre micro sera également capturé si autorisé.
                </p>

                <div className="flex items-center gap-3">
                    {!recording ? (
                        <button
                            onClick={handleStart}
                            disabled={uploading}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl font-medium shadow-lg hover:bg-red-700 transition-colors disabled:opacity-60"
                        >
                            <Circle className="w-4 h-4" />
                            Démarrer l'enregistrement
                        </button>
                    ) : (
                        <button
                            onClick={handleStop}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-medium shadow-lg hover:bg-gray-800 transition-colors"
                        >
                            <Square className="w-4 h-4" />
                            Arrêter l'enregistrement
                        </button>
                    )}

                    <button
                        onClick={handleClose}
                        disabled={uploading || recording}
                        className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                    >
                        Fermer
                    </button>
                </div>

                {uploading && (
                    <div className="mt-3 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-300">Importation en cours...</span>
                            <span className="font-medium text-primary-600 dark:text-primary-400">{progress}%</span>
                        </div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                className="h-full bg-gradient-to-r from-primary-500 to-accent-600"
                            />
                        </div>
                    </div>
                )}

                {error && (
                    <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
                        <AlertCircle className="w-4 h-4" />
                        <span>{error}</span>
                    </div>
                )}

                {recording && !uploading && (
                    <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 dark:bg-red-900/30 text-xs text-red-700 dark:text-red-300">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Enregistrement en cours...</span>
                    </div>
                )}
            </div>
        </div>
    );
}