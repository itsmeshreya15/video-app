const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs = require('fs');
const path = require('path');

class StorageService {
    constructor() {
        this.bucket = process.env.AWS_S3_BUCKET_NAME;

        this.isConfigured = !!(
            process.env.AWS_ACCESS_KEY_ID &&
            process.env.AWS_SECRET_ACCESS_KEY &&
            process.env.AWS_REGION &&
            this.bucket
        );

        if (this.isConfigured) {
            this.client = new S3Client({
                region: process.env.AWS_REGION,
                credentials: {
                    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                },
            });
        }
    }

    async uploadFile(filePath, key, mimeType) {
        if (!this.isConfigured) {
            return key;
        }

        try {
            const fileStream = fs.createReadStream(filePath);
            const upload = new Upload({
                client: this.client,
                params: {
                    Bucket: this.bucket,
                    Key: key,
                    Body: fileStream,
                    ContentType: mimeType,
                },
            });

            await upload.done();
            return key;
        } catch (error) {
            throw error;
        }
    }

    async getFileUrl(key) {
        if (!this.isConfigured) return null;

        try {
            const command = new GetObjectCommand({
                Bucket: this.bucket,
                Key: key,
            });
            const url = await getSignedUrl(this.client, command, { expiresIn: 3600 });
            return url;
        } catch (error) {
            return null;
        }
    }

    async deleteFile(key) {
        if (!this.isConfigured) return;

        try {
            const command = new DeleteObjectCommand({
                Bucket: this.bucket,
                Key: key,
            });
            await this.client.send(command);
        } catch (error) {

        }
    }
}

module.exports = new StorageService();
