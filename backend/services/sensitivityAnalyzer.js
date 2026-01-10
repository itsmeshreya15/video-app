const Video = require('../models/Video');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');
const { RekognitionClient, DetectModerationLabelsCommand } = require('@aws-sdk/client-rekognition');
const storageService = require('./storage');

const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path;

const execAsync = promisify(exec);

const rekognition = new RekognitionClient({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const extractFrames = async (videoPath, outputDir, numFrames = 5) => {
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const durationCmd = `"${ffprobePath}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`;

    let duration = 10;
    try {
        const { stdout } = await execAsync(durationCmd);
        duration = parseFloat(stdout.trim()) || 10;
    } catch (e) {

    }

    const interval = Math.max(duration / (numFrames + 1), 1);

    const framePromises = [];
    for (let i = 1; i <= numFrames; i++) {
        const timestamp = interval * i;
        const outputPath = path.join(outputDir, `frame_${i}.jpg`);
        const cmd = `"${ffmpegPath}" -y -ss ${timestamp} -i "${videoPath}" -vframes 1 -q:v 2 "${outputPath}"`;

        framePromises.push(
            execAsync(cmd, { maxBuffer: 1024 * 1024 * 10 })
                .then(() => outputPath)
                .catch(err => {
                    return null;
                })
        );
    }

    const frames = await Promise.all(framePromises);
    return frames.filter(f => f && fs.existsSync(f));
};

const analyzeImageWithRekognition = async (imagePath) => {
    try {
        const imageBytes = fs.readFileSync(imagePath);

        const command = new DetectModerationLabelsCommand({
            Image: {
                Bytes: imageBytes
            },
            MinConfidence: 50
        });

        const response = await rekognition.send(command);
        return response.ModerationLabels || [];
    } catch (error) {
        return [];
    }
};

const calculateSensitivity = (allLabels) => {
    const categories = {
        'Explicit Nudity': 0,
        'Suggestive': 0,
        'Violence': 0,
        'Visually Disturbing': 0,
        'Drugs': 0,
        'Hate Symbols': 0,
        'Gambling': 0
    };

    let maxConfidence = 0;
    const detectedLabels = [];

    for (const frameLabels of allLabels) {
        for (const label of frameLabels) {
            const parentName = label.ParentName || label.Name;
            if (categories.hasOwnProperty(parentName)) {
                categories[parentName] = Math.max(categories[parentName], label.Confidence);
            }
            if (categories.hasOwnProperty(label.Name)) {
                categories[label.Name] = Math.max(categories[label.Name], label.Confidence);
            }

            maxConfidence = Math.max(maxConfidence, label.Confidence);

            if (!detectedLabels.find(l => l.name === label.Name)) {
                detectedLabels.push({
                    name: label.Name,
                    parent: label.ParentName,
                    confidence: Math.round(label.Confidence)
                });
            }
        }
    }

    const score = Math.min(100,
        categories['Explicit Nudity'] * 1.0 +
        categories['Violence'] * 0.8 +
        categories['Visually Disturbing'] * 0.7 +
        categories['Suggestive'] * 0.4 +
        categories['Drugs'] * 0.6 +
        categories['Hate Symbols'] * 0.9 +
        categories['Gambling'] * 0.3
    );

    const isFlagged =
        categories['Explicit Nudity'] > 50 ||
        categories['Violence'] > 60 ||
        categories['Visually Disturbing'] > 60 ||
        categories['Suggestive'] > 80 ||
        categories['Drugs'] > 70 ||
        categories['Hate Symbols'] > 50 ||
        score > 50;

    return {
        score: Math.round(score),
        categories: Object.fromEntries(
            Object.entries(categories).map(([k, v]) => [k, Math.round(v)])
        ),
        detectedLabels,
        isFlagged
    };
};

const cleanupFrames = (frameDir) => {
    try {
        if (fs.existsSync(frameDir)) {
            fs.rmSync(frameDir, { recursive: true, force: true });
        }
    } catch (e) { }
};

const analyzeVideo = async (videoId, io) => {
    const framesDir = path.join(__dirname, '../temp', videoId.toString());

    try {
        await Video.findByIdAndUpdate(videoId, { status: 'processing', processingProgress: 0 });

        io.emit(`video:${videoId}:progress`, {
            videoId, status: 'processing', progress: 0, message: 'Starting analysis...'
        });

        const video = await Video.findById(videoId);
        if (!video) throw new Error('Video not found');

        io.emit(`video:${videoId}:progress`, {
            videoId, status: 'processing', progress: 15, message: 'Extracting frames...'
        });
        await Video.findByIdAndUpdate(videoId, { processingProgress: 15 });

        const frames = await extractFrames(video.filepath, framesDir, 10);

        if (frames.length === 0) {
            throw new Error('Could not extract frames');
        }

        io.emit(`video:${videoId}:progress`, {
            videoId, status: 'processing', progress: 30, message: 'Sending to analysis...'
        });
        await Video.findByIdAndUpdate(videoId, { processingProgress: 30 });

        const allLabels = [];
        for (let i = 0; i < frames.length; i++) {
            const labels = await analyzeImageWithRekognition(frames[i]);
            allLabels.push(labels);

            const progress = 30 + Math.round((i + 1) / frames.length * 50);
            io.emit(`video:${videoId}:progress`, {
                videoId, status: 'processing', progress,
                message: `Analyzing frame ${i + 1}/${frames.length}...`
            });
            await Video.findByIdAndUpdate(videoId, { processingProgress: progress });
        }

        io.emit(`video:${videoId}:progress`, {
            videoId, status: 'processing', progress: 85, message: 'Calculating score...'
        });

        const { score, categories, detectedLabels, isFlagged } = calculateSensitivity(allLabels);

        const sensitivityDetails = {
            overallScore: score,
            categories,
            detectedLabels,
            framesAnalyzed: frames.length,
            analysisMethod: 'AWS Rekognition',
            confidence: detectedLabels.length > 0
                ? Math.round(detectedLabels.reduce((sum, l) => sum + l.confidence, 0) / detectedLabels.length)
                : 100,
            analyzedAt: new Date()
        };

        cleanupFrames(framesDir);

        let storageUpdate = {};
        if (storageService.isConfigured) {
            io.emit(`video:${videoId}:progress`, {
                videoId, status: 'processing', progress: 90, message: 'Uploading to cloud storage...'
            });
            await Video.findByIdAndUpdate(videoId, { processingProgress: 90 });

            try {
                const key = video.filename;
                await storageService.uploadFile(video.filepath, key, video.mimetype);

                if (fs.existsSync(video.filepath)) {
                    fs.unlinkSync(video.filepath);
                }

                storageUpdate = {
                    storageType: 's3',
                    storageKey: key,
                    filepath: key
                };
            } catch (err) {

            }
        }

        const updatedVideo = await Video.findByIdAndUpdate(
            videoId,
            {
                status: isFlagged ? 'flagged' : 'safe',
                processingProgress: 100,
                sensitivityScore: score,
                sensitivityDetails,
                processedAt: new Date(),
                ...storageUpdate
            },
            { new: true }
        );

        io.emit(`video:${videoId}:progress`, {
            videoId,
            status: updatedVideo.status,
            progress: 100,
            message: isFlagged
                ? `🚩 FLAGGED: ${detectedLabels.map(l => l.name).join(', ')}`
                : '✅ Safe',
            sensitivityScore: score,
            sensitivityDetails
        });

        io.emit(`video:${videoId}:complete`, {
            videoId,
            status: updatedVideo.status,
            sensitivityScore: score
        });

        return updatedVideo;

    } catch (error) {
        cleanupFrames(framesDir);

        await Video.findByIdAndUpdate(videoId, { status: 'error', processingProgress: 0 });

        io.emit(`video:${videoId}:error`, {
            videoId, status: 'error', message: 'Analysis failed'
        });

        throw error;
    }
};

module.exports = { analyzeVideo };
