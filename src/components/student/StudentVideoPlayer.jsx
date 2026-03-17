// src/components/student/StudentVideoPlayer.jsx
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, Volume2, VolumeX, Maximize, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';

export default function StudentVideoPlayer({ video, nextVideoId, onComplete }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error: showError, info } = useToast();

  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const maxTimeReached = useRef(0);
  const controlsTimeout = useRef(null);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handleSeeking = () => {
      if (videoElement.currentTime > maxTimeReached.current + 1) {
        videoElement.currentTime = maxTimeReached.current;
        info("Le visionnage est linéaire : vous ne pouvez pas avancer rapidement.");
      }
    };

    const handleTimeUpdate = () => {
      if (videoElement.currentTime > maxTimeReached.current) {
        maxTimeReached.current = videoElement.currentTime;
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    videoElement.addEventListener('seeking', handleSeeking);
    videoElement.addEventListener('timeupdate', handleTimeUpdate);
    videoElement.addEventListener('play', handlePlay);
    videoElement.addEventListener('pause', handlePause);

    const handleEnded = async () => {
      if (!user) return;
      try {
        const { error: upsertError } = await supabase
          .from('user_progress')
          .upsert({
            user_id: user.id,
            video_id: video.id,
            watched: true,
            completed_at: new Date().toISOString()
          }, { onConflict: 'user_id, video_id' });

        if (upsertError) throw upsertError;
        if (onComplete) onComplete();
        success('Vidéo validée ! Vous pouvez passer à la suite.');
      } catch (err) {
        console.error('Erreur progression:', err);
        showError('Impossible d\'enregistrer votre progression');
      }
    };

    videoElement.addEventListener('ended', handleEnded);

    return () => {
      videoElement.removeEventListener('seeking', handleSeeking);
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      videoElement.removeEventListener('play', handlePlay);
      videoElement.removeEventListener('pause', handlePause);
      videoElement.removeEventListener('ended', handleEnded);
    };
  }, [video.id, user, onComplete, success, showError, info]);

  const togglePlay = () => {
    if (videoRef.current.paused) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    videoRef.current.volume = newVolume;
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    videoRef.current.muted = newMuted;
  };

  const handleFullscreen = () => {
    if (containerRef.current.requestFullscreen) {
      containerRef.current.requestFullscreen();
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    controlsTimeout.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  return (
    <div
      ref={containerRef}
      className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 group select-none"
      onContextMenu={(e) => e.preventDefault()}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={video.video_url}
        className="w-full h-full object-contain cursor-pointer"
        onClick={togglePlay}
        playsInline
      />

      {/* Overlay des contrôles */}
      <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent transition-opacity duration-500 flex flex-col justify-end p-4 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex items-center justify-between gap-4">
          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className="w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full backdrop-blur-sm transition-all"
          >
            {isPlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white ml-0.5" />}
          </button>

          {/* Info linéaire */}
          <div className="flex-1 text-center">
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-white/20 rounded-full text-xs text-white backdrop-blur-sm">
              <Sparkles className="w-3 h-3" />
              Visionnage linéaire
            </span>
          </div>

          {/* Volume et plein écran */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 group/volume">
              <button onClick={toggleMute} className="text-white/70 hover:text-white transition-colors">
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={handleVolumeChange}
                className="w-0 group-hover/volume:w-20 transition-all duration-300 accent-indigo-500 h-1 bg-white/20 rounded-lg"
              />
            </div>
            <button onClick={handleFullscreen} className="text-white/70 hover:text-white transition-colors">
              <Maximize size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}