const fs = require('fs');
const { spawn } = require('child_process');
const Video = require('../models/Video');
const { analyzeVideo } = require('../services/sensitivityAnalyzer');
const storageService = require('../services/storage');

const getVideoDuration = (filePath) => {
    return new Promise((resolve) => {
        const ffprobe = spawn('ffprobe', [
            '-v', 'error',
            '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1',
            filePath
        ]);

        let duration = '';
        ffprobe.stdout.on('data', (data) => {
            duration += data.toString();
        });

        ffprobe.on('close', () => {
            const parsed = parseFloat(duration.trim());
            resolve(isNaN(parsed) ? 0 : parsed);
        });

        ffprobe.on('error', () => {
            resolve(0);
        });
    });
};

exports.uploadVideo = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Please upload a video file'
            });
        }

        const { title, description } = req.body;

        if (!title) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({
                success: false,
                message: 'Please provide a video title'
            });
        }

        const duration = await getVideoDuration(req.file.path);

        const video = await Video.create({
            title,
            description: description || '',
            filename: req.file.filename,
            originalName: req.file.originalname,
            filepath: req.file.path,
            mimetype: req.file.mimetype,
            size: req.file.size,
            duration: duration,
            owner: req.user._id,
            status: 'pending'
        });

        const io = req.app.get('io');
        analyzeVideo(video._id, io);

        res.status(201).json({
            success: true,
            data: video
        });
    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({
            success: false,
            message: error.message || 'Server error during upload'
        });
    }
};

exports.getVideos = async (req, res) => {
    try {
        const { status, search, sort = '-createdAt' } = req.query;

        let query = {};

        if (req.user.role === 'admin') {

        } else if (req.user.role === 'viewer') {
            query.assignedTo = req.user._id;
        } else {
            query.owner = req.user._id;
        }

        if (status && status !== 'all') {
            query.status = status;
        }

        if (search) {
            query.title = { $regex: search, $options: 'i' };
        }

        const videos = await Video.find(query)
            .populate('owner', 'username email')
            .populate('assignedTo', 'username email')
            .sort(sort);

        res.status(200).json({
            success: true,
            count: videos.length,
            data: videos
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error fetching videos'
        });
    }
};

exports.getVideo = async (req, res) => {
    try {
        const video = await Video.findById(req.params.id)
            .populate('owner', 'username email')
            .populate('assignedTo', 'username email');

        if (!video) {
            return res.status(404).json({
                success: false,
                message: 'Video not found'
            });
        }

        const isOwner = video.owner._id.toString() === req.user._id.toString();
        const isAssigned = video.assignedTo?.some(u => u._id.toString() === req.user._id.toString());

        if (req.user.role !== 'admin' && !isOwner && !isAssigned) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this video'
            });
        }

        res.status(200).json({
            success: true,
            data: video
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error fetching video'
        });
    }
};

exports.streamVideo = async (req, res) => {
    try {
        const video = await Video.findById(req.params.id);

        if (!video) {
            return res.status(404).json({
                success: false,
                message: 'Video not found'
            });
        }

        if (req.user) {
            const isOwner = video.owner.toString() === req.user._id.toString();
            const isAssigned = video.assignedTo?.some(u => u.toString() === req.user._id.toString());

            if (req.user.role !== 'admin' && !isOwner && !isAssigned) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to stream this video'
                });
            }
        }

        if (video.storageType === 's3') {
            const url = await storageService.getFileUrl(video.storageKey || video.filepath);
            if (url) {
                return res.redirect(url);
            }
            return res.status(500).json({
                success: false,
                message: 'Error generating stream URL'
            });
        }

        const videoPath = video.filepath;

        if (!fs.existsSync(videoPath)) {
            return res.status(404).json({
                success: false,
                message: 'Video file not found on server'
            });
        }

        const stat = fs.statSync(videoPath);
        const fileSize = stat.size;
        const range = req.headers.range;

        if (range) {
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunkSize = (end - start) + 1;

            const file = fs.createReadStream(videoPath, { start, end });
            const headers = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunkSize,
                'Content-Type': video.mimetype
            };

            res.writeHead(206, headers);
            file.pipe(res);
        } else {
            const headers = {
                'Content-Length': fileSize,
                'Content-Type': video.mimetype
            };

            res.writeHead(200, headers);
            fs.createReadStream(videoPath).pipe(res);
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error streaming video'
        });
    }
};

exports.deleteVideo = async (req, res) => {
    try {
        const video = await Video.findById(req.params.id);

        if (!video) {
            return res.status(404).json({
                success: false,
                message: 'Video not found'
            });
        }

        if (req.user.role !== 'admin' &&
            video.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this video'
            });
        }

        if (req.user.role === 'viewer') {
            return res.status(403).json({
                success: false,
                message: 'Viewers cannot delete videos'
            });
        }

        if (video.storageType === 's3') {
            await storageService.deleteFile(video.storageKey || video.filepath);
        } else if (fs.existsSync(video.filepath)) {
            fs.unlinkSync(video.filepath);
        }

        if (video.thumbnail && fs.existsSync(video.thumbnail)) {
            fs.unlinkSync(video.thumbnail);
        }

        await video.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Video deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error deleting video'
        });
    }
};

exports.updateVideo = async (req, res) => {
    try {
        const { title, description } = req.body;
        const video = await Video.findById(req.params.id);

        if (!video) {
            return res.status(404).json({
                success: false,
                message: 'Video not found'
            });
        }

        if (req.user.role !== 'admin' &&
            video.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this video'
            });
        }

        if (req.user.role === 'viewer') {
            return res.status(403).json({
                success: false,
                message: 'Viewers cannot update videos'
            });
        }

        video.title = title || video.title;
        video.description = description !== undefined ? description : video.description;

        await video.save();

        res.status(200).json({
            success: true,
            data: video
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error updating video'
        });
    }
};

exports.getVideoStats = async (req, res) => {
    try {
        const stats = await Video.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalSize: { $sum: '$size' }
                }
            }
        ]);

        const totalVideos = await Video.countDocuments();
        const totalUsers = await require('../models/User').countDocuments();

        res.status(200).json({
            success: true,
            data: {
                statusBreakdown: stats,
                totalVideos,
                totalUsers
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error fetching stats'
        });
    }
};

exports.assignVideo = async (req, res) => {
    try {
        const { userIds } = req.body;
        const video = await Video.findById(req.params.id);

        if (!video) {
            return res.status(404).json({
                success: false,
                message: 'Video not found'
            });
        }

        if (req.user.role !== 'admin' &&
            video.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to assign this video'
            });
        }

        video.assignedTo = userIds || [];
        await video.save();

        await video.populate('assignedTo', 'username email role');

        res.status(200).json({
            success: true,
            message: 'Video assigned successfully',
            data: video
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error assigning video'
        });
    }
};
