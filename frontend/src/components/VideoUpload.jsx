import { useState, useRef, useCallback } from 'react';
import { FiUploadCloud, FiFile, FiX, FiCheck, FiAlertCircle } from 'react-icons/fi';
import { videoAPI } from '../services/api';
import toast from 'react-hot-toast';

const VideoUpload = ({ onUploadComplete }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState('');

    const fileInputRef = useRef(null);

    const allowedTypes = [
        'video/mp4',
        'video/webm',
        'video/ogg',
        'video/quicktime',
        'video/x-msvideo',
        'video/x-matroska'
    ];

    const validateFile = (file) => {
        if (!allowedTypes.includes(file.type)) {
            setError('Invalid file type. Please upload a video file (MP4, WebM, OGG, MOV, AVI, MKV)');
            return false;
        }
        if (file.size > 500 * 1024 * 1024) {
            setError('File too large. Maximum size is 500MB');
            return false;
        }
        setError('');
        return true;
    };

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file && validateFile(file)) {
            setSelectedFile(file);
            if (!title) {
                setTitle(file.name.replace(/\.[^/.]+$/, ''));
            }
        }
    }, [title]);

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file && validateFile(file)) {
            setSelectedFile(file);
            if (!title) {
                setTitle(file.name.replace(/\.[^/.]+$/, ''));
            }
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handleUpload = async () => {
        if (!selectedFile || !title.trim()) {
            setError('Please select a file and provide a title');
            return;
        }

        setUploading(true);
        setUploadProgress(0);
        setError('');

        const formData = new FormData();
        formData.append('video', selectedFile);
        formData.append('title', title.trim());
        formData.append('description', description.trim());

        try {
            const response = await videoAPI.uploadVideo(formData, (progressEvent) => {
                const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                setUploadProgress(progress);
            });

            toast.success('Video uploaded successfully! Processing will begin shortly.');

            // Reset form
            setSelectedFile(null);
            setTitle('');
            setDescription('');
            setUploadProgress(0);

            // Notify parent component
            if (onUploadComplete) {
                onUploadComplete(response.data.data);
            }
        } catch (err) {
            console.error('Upload error:', err);
            setError(err.response?.data?.message || 'Upload failed. Please try again.');
            toast.error('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const removeFile = () => {
        setSelectedFile(null);
        setUploadProgress(0);
        setError('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="card">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <FiUploadCloud className="text-primary-400" />
                Upload Video
            </h2>

            {/* Dropzone */}
            {!selectedFile ? (
                <div
                    className={`dropzone ${isDragging ? 'active' : ''} ${error ? 'error' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="video/*,.mkv,.avi,.mov,.mp4,.webm,.ogg,video/x-matroska,video/x-msvideo,video/quicktime"
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                    <div className="text-center">
                        <FiUploadCloud className="w-12 h-12 mx-auto mb-4 text-cyan-600" />
                        <p className="text-lg font-semibold mb-2 text-slate-700">
                            Drag & drop your video here
                        </p>
                        <p className="text-slate-500 text-sm">
                            or click to browse files
                        </p>
                        <p className="text-slate-400 text-xs mt-4">
                            Supported: MP4, WebM, OGG, MOV, AVI, MKV (max 500MB)
                        </p>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Selected File */}
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-cyan-50 border border-cyan-100">
                        <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                            <FiFile className="w-6 h-6 text-cyan-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium truncate text-slate-800">{selectedFile.name}</p>
                            <p className="text-sm text-slate-500">{formatFileSize(selectedFile.size)}</p>
                        </div>
                        {!uploading && (
                            <button
                                onClick={removeFile}
                                className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                            >
                                <FiX className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    {/* Title Input */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Title *
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter video title"
                            className="input-field"
                            disabled={uploading}
                        />
                    </div>

                    {/* Description Input */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Enter video description (optional)"
                            rows={3}
                            className="input-field resize-none"
                            disabled={uploading}
                        />
                    </div>

                    {/* Upload Progress */}
                    {uploading && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Uploading...</span>
                                <span className="text-cyan-600 font-medium">{uploadProgress}%</span>
                            </div>
                            <div className="progress-bar bg-slate-200">
                                <div
                                    className="progress-fill bg-cyan-500"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Upload Button */}
                    <button
                        onClick={handleUpload}
                        disabled={uploading || !title.trim()}
                        className={`w-full btn-primary flex items-center justify-center gap-2 ${uploading || !title.trim() ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                    >
                        {uploading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Uploading...</span>
                            </>
                        ) : (
                            <>
                                <FiCheck className="w-5 h-5" />
                                <span>Upload Video</span>
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-100 flex items-center gap-3">
                    <FiAlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <p className="text-red-700 text-sm">{error}</p>
                </div>
            )}
        </div>
    );
};

export default VideoUpload;
