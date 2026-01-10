# VideoStream App 🎬

A comprehensive full-stack video upload, sensitivity processing, and streaming application.
This application uses **AWS S3** for secure cloud storage and **AWS Rekognition** for AI-powered content moderation.

## Features

- **Video Upload**: Drag-and-drop support for major video formats (MP4, MKV, AVI, etc.)
- **Cloud Storage**: Secure, scalable video storage using AWS S3.
- **AI Content Analysis**: Automatic sensitivity analysis using AWS Rekognition to detect:
    - Explicit/Adult Content
    - Violence
    - Drugs & Gambling
    - Hate Symbols
- **Real-Time Processing**: Live progress tracking via Socket.io.
- **Smart Streaming**: Bandwidth-efficient streaming with Range requests and Signed URLs.
- **Role-Based Access**:
    - **Viewer**: Can watch assigned videos.
    - **Editor**: Can upload, manage, and delete their own videos.
    - **Admin**: Full system access, user management, and analytics.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Node.js, Express.js, MongoDB, Socket.io |
| **Frontend** | React, Vite, Tailwind CSS |
| **Cloud** | AWS S3 (Storage), AWS Rekognition (AI) |
| **Auth** | JWT (JSON Web Tokens) |

## Prerequisites

- Node.js (v18+)
- MongoDB (Running locally or Atlas)
- AWS Account (S3 Bucket & Rekognition Access)

## Environment Setup

Create `backend/.env` with the following variables:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/videoapp
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=7d
NODE_ENV=development

# AWS Configuration
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=your_aws_region (e.g., ap-south-1)
AWS_S3_BUCKET_NAME=your_s3_bucket_name
```

## Quick Start

### 1. Install Dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd frontend
npm install
```

### 2. Start Services

**Backend Terminal:**
```bash
cd backend
npm run dev
```

**Frontend Terminal:**
```bash
cd frontend
npm run dev
```

### 3. Create Admin User

To create a new admin or promote an existing user:
```bash
cd backend
npm run create-admin <username> <email> <password>
```

### 4. Usage

1.  **Register** an account (Default role: Viewer).
2.  **Upload** a video from the Dashboard (Requires Editor/Admin role).
3.  **Monitor** the "Processing" status as AI analyzes the content.
4.  **Watch** the video once "Safe" or "Flagged".
5.  **Verify S3**: Check your AWS Console to see the uploaded file.
