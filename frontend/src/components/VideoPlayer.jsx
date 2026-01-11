import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    FiX,
    FiPlay,
    FiPause,
    FiVolume2,
    FiVolumeX,
    FiMaximize,
    FiMinimize,
    FiAlertTriangle
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const VideoPlayer = ({ video, onClose }) => {
    const videoRef = useRef(null);
    const containerRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [showControls, setShowControls] = useState(true);

    const { token } = useAuth();

    // Stream URL with auth token as query parameter (browsers don't send auth headers for video src)
    const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const streamUrl = `${BASE_URL}/api/videos/${video._id}/stream?token=${token}`;

    useEffect(() => {
        let timeout;
        const hideControls = () => {
            if (isPlaying) {
                timeout = setTimeout(() => setShowControls(false), 3000);
            }
        };
        hideControls();
        return () => clearTimeout(timeout);
    }, [isPlaying, showControls]);

    const handleMouseMove = () => {
        setShowControls(true);
    };

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const handleVolumeChange = (e) => {
        const value = parseFloat(e.target.value);
        setVolume(value);
        if (videoRef.current) {
            videoRef.current.volume = value;
            setIsMuted(value === 0);
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
        }
    };

    const handleSeek = (e) => {
        const value = parseFloat(e.target.value);
        if (videoRef.current) {
            videoRef.current.currentTime = value;
            setCurrentTime(value);
        }
    };

    const toggleFullscreen = async () => {
        if (!document.fullscreenElement) {
            await containerRef.current?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            await document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleKeyPress = (e) => {
        if (e.key === ' ' || e.key === 'k') {
            e.preventDefault();
            togglePlay();
        } else if (e.key === 'm') {
            toggleMute();
        } else if (e.key === 'f') {
            toggleFullscreen();
        } else if (e.key === 'Escape') {
            onClose?.();
        }
    };

    useEffect(() => {
        document.addEventListener('keydown', handleKeyPress);
        return () => document.removeEventListener('keydown', handleKeyPress);
    }, [isPlaying, isMuted]);

    const playerContent = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black">
            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-6 right-6 z-[10000] p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
                <FiX className="w-6 h-6 text-white" />
            </button>

            {/* Video Container */}
            <div
                ref={containerRef}
                className="relative w-full max-w-5xl mx-4 aspect-video bg-black rounded-2xl overflow-hidden"
                onMouseMove={handleMouseMove}
                onMouseLeave={() => isPlaying && setShowControls(false)}
            >
                {/* Flagged Warning */}
                {video.status === 'flagged' && (
                    <div className="absolute top-4 left-4 z-30 flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/80 text-white text-sm">
                        <FiAlertTriangle className="w-4 h-4" />
                        <span>This content has been flagged</span>
                    </div>
                )}

                {/* Video Element */}
                <video
                    ref={videoRef}
                    src={streamUrl}
                    className="w-full h-full object-contain"
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => setIsPlaying(false)}
                    onClick={togglePlay}
                    playsInline
                >
                    Your browser does not support the video tag.
                </video>

                {/* Play/Pause Overlay */}
                {!isPlaying && showControls && (
                    <button
                        onClick={togglePlay}
                        className="absolute inset-0 flex items-center justify-center"
                    >
                        <div className="w-20 h-20 rounded-full bg-primary-500/80 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                            <FiPlay className="w-10 h-10 text-white ml-1" />
                        </div>
                    </button>
                )}

                {/* Controls */}
                <div
                    className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity ${showControls ? 'opacity-100' : 'opacity-0'
                        }`}
                >
                    {/* Progress Bar */}
                    <div className="mb-4">
                        <input
                            type="range"
                            min="0"
                            max={duration || 0}
                            value={currentTime}
                            onChange={handleSeek}
                            className="w-full h-1 rounded-full appearance-none cursor-pointer"
                            style={{
                                background: `linear-gradient(to right, #0ea5e9 0%, #0ea5e9 ${(currentTime / duration) * 100}%, rgba(255,255,255,0.2) ${(currentTime / duration) * 100}%, rgba(255,255,255,0.2) 100%)`
                            }}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            {/* Play/Pause */}
                            <button
                                onClick={togglePlay}
                                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                            >
                                {isPlaying ? (
                                    <FiPause className="w-6 h-6 text-white" />
                                ) : (
                                    <FiPlay className="w-6 h-6 text-white" />
                                )}
                            </button>

                            {/* Volume */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={toggleMute}
                                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                                >
                                    {isMuted || volume === 0 ? (
                                        <FiVolumeX className="w-5 h-5 text-white" />
                                    ) : (
                                        <FiVolume2 className="w-5 h-5 text-white" />
                                    )}
                                </button>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={isMuted ? 0 : volume}
                                    onChange={handleVolumeChange}
                                    className="w-20 h-1 rounded-full appearance-none cursor-pointer"
                                    style={{
                                        background: `linear-gradient(to right, #0ea5e9 0%, #0ea5e9 ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.2) ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.2) 100%)`
                                    }}
                                />
                            </div>

                            {/* Time */}
                            <span className="text-white text-sm">
                                {formatTime(currentTime)} / {formatTime(duration)}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Fullscreen */}
                            <button
                                onClick={toggleFullscreen}
                                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                            >
                                {isFullscreen ? (
                                    <FiMinimize className="w-5 h-5 text-white" />
                                ) : (
                                    <FiMaximize className="w-5 h-5 text-white" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Video Info */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center max-w-2xl mx-auto px-4">
                <h2 className="text-xl font-bold text-white mb-2">{video.title}</h2>
                {video.description && (
                    <p className="text-gray-400 text-sm">{video.description}</p>
                )}
            </div>
        </div>
    );

    // Use portal to render at document.body level (above everything)
    return createPortal(playerContent, document.body);
};

export default VideoPlayer;
