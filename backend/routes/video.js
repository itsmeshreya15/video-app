const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const {
    uploadVideo,
    getVideos,
    getVideo,
    streamVideo,
    deleteVideo,
    updateVideo,
    getVideoStats,
    assignVideo
} = require('../controllers/videoController');
const { protect } = require('../middleware/auth');
const { authorize, hasMinRole } = require('../middleware/rbac');

// Configure multer for video uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

// File filter for video files only
const fileFilter = (req, file, cb) => {
    const allowedMimes = [
        'video/mp4',
        'video/webm',
        'video/ogg',
        'video/quicktime',
        'video/x-msvideo',
        'video/x-matroska'
    ];

    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only video files are allowed.'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 500 * 1024 * 1024 // 500MB limit
    }
});

// Multer error handler middleware
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File too large. Maximum size is 500MB.'
            });
        }
        return res.status(400).json({
            success: false,
            message: err.message
        });
    } else if (err) {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }
    next();
};

// Protected routes - all require authentication
router.use(protect);

// Video statistics (Admin only) - must be before :id routes
router.get('/stats', authorize('admin'), getVideoStats);

// Get all videos (filtered by user for non-admins)
router.get('/', getVideos);

// Upload video (Editor and Admin only)
router.post(
    '/upload',
    hasMinRole('editor'),
    upload.single('video'),
    handleMulterError,
    uploadVideo
);

// Get single video
router.get('/:id', getVideo);

// Stream video
router.get('/:id/stream', streamVideo);

// Assign video to users (Editor and Admin only)
router.put('/:id/assign', hasMinRole('editor'), assignVideo);

// Update video (Editor and Admin only)
router.put('/:id', hasMinRole('editor'), updateVideo);

// Delete video (Editor and Admin only)
router.delete('/:id', hasMinRole('editor'), deleteVideo);

module.exports = router;
