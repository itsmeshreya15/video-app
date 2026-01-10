import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { videoAPI } from '../services/api';
import VideoCard from '../components/VideoCard';
import VideoPlayer from '../components/VideoPlayer';
import CustomDropdown from '../components/CustomDropdown';
import {
    FiSearch,
    FiFilter,
    FiFilm,
    FiGrid,
    FiList,
    FiRefreshCw
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const VideoLibrary = () => {
    const { isEditor } = useAuth();
    const [videos, setVideos] = useState([]);
    const [filteredVideos, setFilteredVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [viewMode, setViewMode] = useState('grid');
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [editingVideo, setEditingVideo] = useState(null);
    const [editForm, setEditForm] = useState({ title: '', description: '' });

    // Fetch videos
    const fetchVideos = async () => {
        setLoading(true);
        try {
            const response = await videoAPI.getVideos({ sort: '-createdAt' });
            setVideos(response.data.data);
            setFilteredVideos(response.data.data);
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
        const socket = io('http://localhost:5000');

        videos.forEach(video => {
            if (video.status === 'processing' || video.status === 'pending') {
                socket.on(`video:${video._id}:progress`, (data) => {
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
                    toast.success(`Video processing complete!`);
                });
            }
        });

        return () => socket.disconnect();
    }, [videos.length]);

    // Filter videos
    useEffect(() => {
        let filtered = [...videos];

        // Apply status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(v => v.status === statusFilter);
        }

        // Apply search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(v =>
                v.title.toLowerCase().includes(query) ||
                v.description?.toLowerCase().includes(query)
            );
        }

        setFilteredVideos(filtered);
    }, [videos, statusFilter, searchQuery]);

    const handleDeleteVideo = async (video) => {
        if (!window.confirm(`Are you sure you want to delete "${video.title}"?`)) return;

        try {
            await videoAPI.deleteVideo(video._id);
            setVideos(prev => prev.filter(v => v._id !== video._id));
            toast.success('Video deleted successfully');
        } catch (error) {
            toast.error('Failed to delete video');
        }
    };

    const handleEditVideo = (video) => {
        setEditingVideo(video);
        setEditForm({ title: video.title, description: video.description || '' });
    };

    const handleUpdateVideo = async () => {
        if (!editForm.title.trim()) {
            toast.error('Title is required');
            return;
        }

        try {
            const response = await videoAPI.updateVideo(editingVideo._id, editForm);
            setVideos(prev => prev.map(v =>
                v._id === editingVideo._id ? response.data.data : v
            ));
            setEditingVideo(null);
            toast.success('Video updated successfully');
        } catch (error) {
            toast.error('Failed to update video');
        }
    };

    const statusOptions = [
        { value: 'all', label: 'All Videos' },
        { value: 'safe', label: 'Safe' },
        { value: 'flagged', label: 'Flagged' },
        { value: 'processing', label: 'Processing' },
        { value: 'pending', label: 'Pending' }
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3 text-slate-800">
                        <FiFilm className="text-cyan-600" />
                        Video Library
                    </h1>
                    <p className="text-slate-500 mt-1">
                        {filteredVideos.length} video{filteredVideos.length !== 1 ? 's' : ''}
                        {statusFilter !== 'all' && ` (${statusFilter})`}
                    </p>
                </div>

                <button
                    onClick={fetchVideos}
                    className="btn-secondary flex items-center gap-2 w-fit"
                >
                    <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Filters Bar */}
            <div className="card p-4 relative" style={{ zIndex: 100 }}>
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search videos..."
                            className="input-field pl-11"
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center gap-2 min-w-[160px]">
                        <FiFilter className="text-slate-400 flex-shrink-0" />
                        <div className="flex-1">
                            <CustomDropdown
                                options={statusOptions}
                                value={statusFilter}
                                onChange={setStatusFilter}
                                placeholder="Filter by status"
                            />
                        </div>
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition-colors ${viewMode === 'grid'
                                ? 'bg-white text-cyan-600 shadow-sm'
                                : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            <FiGrid className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-colors ${viewMode === 'list'
                                ? 'bg-white text-cyan-600 shadow-sm'
                                : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            <FiList className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Video Grid/List */}
            {loading ? (
                <div className={`grid ${viewMode === 'grid' ? 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'} gap-6`}>
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="card shimmer aspect-video" />
                    ))}
                </div>
            ) : filteredVideos.length === 0 ? (
                <div className="card text-center py-16">
                    <FiFilm className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2 text-slate-700">No videos found</h3>
                    <p className="text-slate-500">
                        {searchQuery || statusFilter !== 'all'
                            ? 'Try adjusting your filters'
                            : 'Upload your first video to get started'}
                    </p>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredVideos.map(video => (
                        <VideoCard
                            key={video._id}
                            video={video}
                            onPlay={setSelectedVideo}
                            onEdit={isEditor() ? handleEditVideo : null}
                            onDelete={isEditor() ? handleDeleteVideo : null}
                        />
                    ))}
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredVideos.map(video => (
                        <div key={video._id} className="card flex items-center gap-6">
                            {/* Thumbnail */}
                            <div className="w-48 aspect-video bg-slate-100 rounded-xl flex-shrink-0 flex items-center justify-center border border-slate-200">
                                <FiFilm className="w-8 h-8 text-slate-400" />
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-lg truncate text-slate-800">{video.title}</h3>
                                {video.description && (
                                    <p className="text-slate-500 text-sm mt-1 line-clamp-2">{video.description}</p>
                                )}
                                <div className="flex items-center gap-4 mt-3">
                                    <span className={`badge-${video.status}`}>
                                        {video.status}
                                    </span>
                                    {video.sensitivityScore !== undefined && (
                                        <span className="text-sm text-slate-400">
                                            Score: {video.sensitivityScore}%
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2">
                                {(video.status === 'safe' || video.status === 'flagged') && (
                                    <button
                                        onClick={() => setSelectedVideo(video)}
                                        className="btn-primary py-2"
                                    >
                                        Watch
                                    </button>
                                )}
                                {isEditor() && (
                                    <>
                                        <button
                                            onClick={() => handleEditVideo(video)}
                                            className="btn-secondary py-2"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDeleteVideo(video)}
                                            className="btn-danger py-2"
                                        >
                                            Delete
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Video Player Modal */}
            {selectedVideo && (
                <VideoPlayer
                    video={selectedVideo}
                    onClose={() => setSelectedVideo(null)}
                />
            )}

            {/* Edit Modal - rendered via portal to cover entire screen */}
            {editingVideo && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="max-w-md w-full rounded-2xl p-6 bg-white shadow-2xl border border-slate-100">
                        <h3 className="text-xl font-bold mb-6 text-slate-800">Edit Video</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Title
                                </label>
                                <input
                                    type="text"
                                    value={editForm.title}
                                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                    className="input-field"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={editForm.description}
                                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                    rows={3}
                                    className="input-field resize-none"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setEditingVideo(null)}
                                className="btn-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateVideo}
                                className="btn-primary"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default VideoLibrary;
