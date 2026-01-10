import { FiPlay, FiTrash2, FiEdit2, FiClock, FiHardDrive, FiEye } from 'react-icons/fi';

const VideoCard = ({ video, onPlay, onDelete, onEdit, showActions = true }) => {
    const getStatusBadge = (status) => {
        const badges = {
            safe: { class: 'badge-safe', text: 'Safe' },
            flagged: { class: 'badge-flagged', text: 'Flagged' },
            processing: { class: 'badge-processing', text: 'Processing' },
            pending: { class: 'badge-pending', text: 'Pending' },
            error: { class: 'badge-flagged', text: 'Error' }
        };
        return badges[status] || badges.pending;
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDuration = (seconds) => {
        if (!seconds) return '--:--';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const badge = getStatusBadge(video.status);
    const isPlayable = video.status === 'safe' || video.status === 'flagged';

    return (
        <div className="card group hover:scale-[1.02] relative overflow-hidden bg-white shadow-sm border border-slate-100">
            {/* Thumbnail / Preview */}
            <div className="relative aspect-video bg-slate-100 rounded-xl mb-4 overflow-hidden border border-slate-200">
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />

                {/* Play Button Overlay */}
                {isPlayable && (
                    <button
                        onClick={() => onPlay?.(video)}
                        className="absolute inset-0 flex items-center justify-center z-20 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <div className="w-16 h-16 rounded-full bg-cyan-500/90 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                            <FiPlay className="w-7 h-7 text-white ml-1" />
                        </div>
                    </button>
                )}

                {/* Processing Overlay */}
                {video.status === 'processing' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-white/80 backdrop-blur-sm">
                        <div className="spinner mb-3"></div>
                        <p className="text-sm text-cyan-600 font-medium">{video.processingProgress || 0}%</p>
                    </div>
                )}

                {/* Status Badge */}
                <div className="absolute top-3 right-3 z-20">
                    <span className={badge.class}>{badge.text}</span>
                </div>

                {/* Duration */}
                {video.duration > 0 && (
                    <div className="absolute bottom-3 right-3 z-20 px-2 py-1 rounded bg-black/70 text-xs font-medium text-white">
                        {formatDuration(video.duration)}
                    </div>
                )}

                {/* Placeholder */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <FiPlay className="w-12 h-12 text-slate-300" />
                </div>
            </div>

            {/* Video Info */}
            <div className="space-y-3">
                <h3 className="font-semibold text-lg truncate text-slate-800" title={video.title}>
                    {video.title}
                </h3>

                {video.description && (
                    <p className="text-slate-500 text-sm line-clamp-2">
                        {video.description}
                    </p>
                )}

                {/* Meta Info */}
                <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                        <FiClock className="w-3 h-3" />
                        {formatDate(video.createdAt)}
                    </span>
                    <span className="flex items-center gap-1">
                        <FiHardDrive className="w-3 h-3" />
                        {formatFileSize(video.size)}
                    </span>
                </div>

                {/* Sensitivity Score (if processed) */}
                {video.sensitivityScore !== undefined && video.status !== 'pending' && video.status !== 'processing' && (
                    <div className="pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-slate-500">Sensitivity Score</span>
                            <span className={video.sensitivityScore > 70 ? 'text-red-500' : 'text-green-500'}>
                                {video.sensitivityScore}%
                            </span>
                        </div>
                        <div className="progress-bar h-1">
                            <div
                                className={`h-full rounded-full transition-all ${video.sensitivityScore > 70
                                    ? 'bg-gradient-to-r from-red-500 to-red-600'
                                    : 'bg-gradient-to-r from-green-500 to-green-600'
                                    }`}
                                style={{ width: `${video.sensitivityScore}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Actions */}
                {showActions && (
                    <div className="flex items-center gap-2 pt-3">
                        {isPlayable && (
                            <button
                                onClick={() => onPlay?.(video)}
                                className="flex-1 btn-primary py-2 text-sm flex items-center justify-center gap-2"
                            >
                                <FiEye className="w-4 h-4" />
                                Watch
                            </button>
                        )}
                        {onEdit && (
                            <button
                                onClick={() => onEdit?.(video)}
                                className="p-2 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 transition-all"
                                title="Edit"
                            >
                                <FiEdit2 className="w-4 h-4" />
                            </button>
                        )}
                        {onDelete && (
                            <button
                                onClick={() => onDelete?.(video)}
                                className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                                title="Delete"
                            >
                                <FiTrash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default VideoCard;
