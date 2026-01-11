import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { videoAPI } from '../services/api';
import VideoUpload from '../components/VideoUpload';
import VideoCard from '../components/VideoCard';
import VideoPlayer from '../components/VideoPlayer';
import {
    FiFilm,
    FiUploadCloud,
    FiClock,
    FiCheckCircle,
    FiAlertTriangle,
    FiActivity,
    FiArrowRight
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const Dashboard = () => {
    const { user, isEditor } = useAuth();
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingVideos, setProcessingVideos] = useState({});
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [stats, setStats] = useState({
        total: 0,
        safe: 0,
        flagged: 0,
        processing: 0
    });

    // Fetch videos
    const fetchVideos = async () => {
        try {
            const response = await videoAPI.getVideos({ sort: '-createdAt' });
            const fetchedVideos = response.data.data;
            setVideos(fetchedVideos);

            // Calculate stats
            const newStats = {
                total: fetchedVideos.length,
                safe: fetchedVideos.filter(v => v.status === 'safe').length,
                flagged: fetchedVideos.filter(v => v.status === 'flagged').length,
                processing: fetchedVideos.filter(v => v.status === 'processing' || v.status === 'pending').length
            };
            setStats(newStats);
        } catch (error) {
            console.error('Error fetching videos:', error);
            toast.error('Failed to load videos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVideos();
    }, []);

    // Socket.io for real-time updates
    useEffect(() => {
        const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const socket = io(BASE_URL);

        socket.on('connect', () => {
            console.log('Socket connected for dashboard');
        });

        // Subscribe to all processing videos
        videos.forEach(video => {
            if (video.status === 'processing' || video.status === 'pending') {
                socket.emit('subscribe:video', video._id);
            }
        });

        // Listen for progress updates
        videos.forEach(video => {
            socket.on(`video:${video._id}:progress`, (data) => {
                setProcessingVideos(prev => ({
                    ...prev,
                    [video._id]: data
                }));

                // Update video in list
                setVideos(prev => prev.map(v =>
                    v._id === video._id
                        ? { ...v, status: data.status, processingProgress: data.progress }
                        : v
                ));
            });

            socket.on(`video:${video._id}:complete`, (data) => {
                setVideos(prev => prev.map(v =>
                    v._id === video._id
                        ? { ...v, status: data.status, processingProgress: 100, sensitivityScore: data.sensitivityScore }
                        : v
                ));

                toast.success(`Video "${videos.find(v => v._id === video._id)?.title}" processing complete!`);

                // Refresh to get updated stats
                setTimeout(fetchVideos, 500);
            });
        });

        return () => {
            socket.disconnect();
        };
    }, [videos.length]);

    const handleUploadComplete = (newVideo) => {
        setVideos(prev => [newVideo, ...prev]);
        setStats(prev => ({
            ...prev,
            total: prev.total + 1,
            processing: prev.processing + 1
        }));
    };

    const handleDeleteVideo = async (video) => {
        if (!window.confirm(`Are you sure you want to delete "${video.title}"?`)) return;

        try {
            await videoAPI.deleteVideo(video._id);
            setVideos(prev => prev.filter(v => v._id !== video._id));
            toast.success('Video deleted successfully');
            fetchVideos(); // Refresh stats
        } catch (error) {
            toast.error('Failed to delete video');
        }
    };

    const recentVideos = videos.slice(0, 4);
    const processingList = videos.filter(v => v.status === 'processing' || v.status === 'pending');

    return (
        <div className="space-y-8">
            {/* Welcome Section */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">
                        Welcome back, <span className="text-cyan-600">{user?.username}</span>
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Manage your videos and track processing status
                    </p>
                </div>
                <Link to="/library" className="btn-secondary flex items-center gap-2 w-fit">
                    View All Videos
                    <FiArrowRight className="w-4 h-4" />
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card text-center bg-white border-slate-200 shadow-sm">
                    <div className="w-12 h-12 rounded-xl bg-cyan-50 flex items-center justify-center mx-auto mb-3">
                        <FiFilm className="w-6 h-6 text-cyan-600" />
                    </div>
                    <p className="text-3xl font-bold text-slate-800">{stats.total}</p>
                    <p className="text-slate-500 text-sm">Total Videos</p>
                </div>

                <div className="card text-center bg-white border-slate-200 shadow-sm">
                    <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center mx-auto mb-3">
                        <FiCheckCircle className="w-6 h-6 text-green-500" />
                    </div>
                    <p className="text-3xl font-bold text-green-600">{stats.safe}</p>
                    <p className="text-slate-500 text-sm">Safe</p>
                </div>

                <div className="card text-center bg-white border-slate-200 shadow-sm">
                    <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mx-auto mb-3">
                        <FiAlertTriangle className="w-6 h-6 text-red-500" />
                    </div>
                    <p className="text-3xl font-bold text-red-600">{stats.flagged}</p>
                    <p className="text-slate-500 text-sm">Flagged</p>
                </div>

                <div className="card text-center bg-white border-slate-200 shadow-sm">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mx-auto mb-3">
                        <FiClock className="w-6 h-6 text-amber-500" />
                    </div>
                    <p className="text-3xl font-bold text-amber-500">{stats.processing}</p>
                    <p className="text-slate-500 text-sm">Processing</p>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid lg:grid-cols-2 gap-8">
                {/* Upload Section (Editor/Admin only) */}
                {isEditor() && (
                    <VideoUpload onUploadComplete={handleUploadComplete} />
                )}

                {/* Processing Queue */}
                <div className="card bg-white border-slate-200 shadow-sm">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-800">
                        <FiActivity className="text-amber-500" />
                        Processing Queue
                    </h2>

                    {processingList.length === 0 ? (
                        <div className="text-center py-8">
                            <FiCheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                            <p className="text-slate-500">No videos currently processing</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {processingList.map(video => {
                                const progress = processingVideos[video._id]?.progress || video.processingProgress || 0;
                                const message = processingVideos[video._id]?.message || 'Waiting to process...';

                                return (
                                    <div key={video._id} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="font-medium truncate flex-1 text-slate-700">{video.title}</p>
                                            <span className="badge-processing ml-2">{progress}%</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mb-3">{message}</p>
                                        <div className="progress-bar bg-slate-200">
                                            <div
                                                className="progress-fill bg-cyan-500"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Videos */}
            <div>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                        <FiFilm className="text-cyan-600" />
                        Recent Videos
                    </h2>
                    <Link to="/library" className="text-cyan-600 hover:text-cyan-700 text-sm font-medium flex items-center gap-1">
                        View all
                        <FiArrowRight className="w-4 h-4" />
                    </Link>
                </div>

                {loading ? (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="card shimmer aspect-video rounded-2xl bg-slate-100" />
                        ))}
                    </div>
                ) : recentVideos.length === 0 ? (
                    <div className="card text-center py-12 bg-white border-slate-200">
                        <FiUploadCloud className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold mb-2 text-slate-800">No videos yet</h3>
                        <p className="text-slate-500">Upload your first video to get started</p>
                    </div>
                ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {recentVideos.map(video => (
                            <VideoCard
                                key={video._id}
                                video={video}
                                onPlay={setSelectedVideo}
                                onDelete={isEditor() ? handleDeleteVideo : null}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Video Player Modal */}
            {selectedVideo && (
                <VideoPlayer
                    video={selectedVideo}
                    onClose={() => setSelectedVideo(null)}
                />
            )}
        </div>
    );
};

export default Dashboard;
