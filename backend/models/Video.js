const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please provide a video title'],
        trim: true,
        maxlength: [100, 'Title cannot exceed 100 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters'],
        default: ''
    },
    filename: {
        type: String,
        required: true
    },
    originalName: {
        type: String,
        required: true
    },
    filepath: {
        type: String,
        required: true
    },
    mimetype: {
        type: String,
        required: true
    },
    size: {
        type: Number,
        required: true
    },
    duration: {
        type: Number,
        default: 0
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    status: {
        type: String,
        enum: ['pending', 'processing', 'safe', 'flagged', 'error'],
        default: 'pending'
    },
    processingProgress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    sensitivityScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    sensitivityDetails: {
        type: Object,
        default: {}
    },
    thumbnail: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    processedAt: {
        type: Date
    },
    storageType: {
        type: String,
        enum: ['local', 's3'],
        default: 'local'
    },
    storageKey: {
        type: String
    },
    assignedTo: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
});

// Index for efficient queries
videoSchema.index({ owner: 1, createdAt: -1 });
videoSchema.index({ status: 1 });
videoSchema.index({ assignedTo: 1 });


module.exports = mongoose.model('Video', videoSchema);
