# Face Verification Backend Implementation Guide

## Overview
This document describes the backend implementation required for the face verification feature in the professional mobile app.

## Feature Requirements
- Professionals must upload a profile picture during onboarding
- Before starting a job, professionals must verify their identity by taking a selfie
- The selfie is compared against their stored profile picture using AI face recognition
- Only after successful verification can they enter the customer's start OTP

## Backend API Endpoint

### POST `/api/v1/professionals/verify-face`

**Authentication:** Required (JWT Bearer token)

**Request Body:**
```json
{
  "selfie": "base64_encoded_image_string",
  "bookingId": "booking_id_here"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "success": true,
    "similarity": 95.5,
    "confidence": 98.2,
    "message": "Face verification successful"
  }
}
```

**Response (Failure):**
```json
{
  "success": false,
  "data": {
    "success": false,
    "similarity": 45.2,
    "confidence": 52.1,
    "message": "Face verification failed. Faces do not match."
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Profile picture not found. Please upload a profile picture first."
}
```

## Implementation Options

### Option 1: AWS Rekognition (Recommended)
AWS Rekognition provides facial comparison with high accuracy.

```javascript
const AWS = require('aws-sdk');
const rekognition = new AWS.Rekognition({ region: 'us-east-1' });

async function verifyFace(sourceBase64, targetBase64) {
  const params = {
    SourceImage: {
      Bytes: Buffer.from(sourceBase64, 'base64'),
    },
    TargetImage: {
      Bytes: Buffer.from(targetBase64, 'base64'),
    },
    SimilarityThreshold: 80, // Minimum 80% similarity
  };

  try {
    const response = await rekognition.compareFaces(params).promise();

    if (response.FaceMatches && response.FaceMatches.length > 0) {
      const match = response.FaceMatches[0];
      return {
        success: true,
        similarity: match.Similarity,
        confidence: match.Face.Confidence,
        message: 'Face verification successful',
      };
    } else {
      return {
        success: false,
        similarity: 0,
        confidence: 0,
        message: 'Face verification failed. Faces do not match.',
      };
    }
  } catch (error) {
    throw new Error(`Face verification error: ${error.message}`);
  }
}
```

### Option 2: Microsoft Azure Face API
Azure Cognitive Services Face API provides face verification.

```javascript
const axios = require('axios');

async function verifyFace(sourceBase64, targetBase64) {
  const endpoint = process.env.AZURE_FACE_ENDPOINT;
  const subscriptionKey = process.env.AZURE_FACE_KEY;

  // Step 1: Detect face in source image
  const detectUrl = `${endpoint}/face/v1.0/detect`;
  const sourceDetect = await axios.post(
    detectUrl,
    Buffer.from(sourceBase64, 'base64'),
    {
      headers: {
        'Ocp-Apim-Subscription-Key': subscriptionKey,
        'Content-Type': 'application/octet-stream',
      },
    }
  );

  // Step 2: Detect face in target image
  const targetDetect = await axios.post(
    detectUrl,
    Buffer.from(targetBase64, 'base64'),
    {
      headers: {
        'Ocp-Apim-Subscription-Key': subscriptionKey,
        'Content-Type': 'application/octet-stream',
      },
    }
  );

  if (sourceDetect.data.length === 0 || targetDetect.data.length === 0) {
    return {
      success: false,
      similarity: 0,
      confidence: 0,
      message: 'No face detected in one or both images',
    };
  }

  // Step 3: Verify faces
  const verifyUrl = `${endpoint}/face/v1.0/verify`;
  const verifyResponse = await axios.post(
    verifyUrl,
    {
      faceId1: sourceDetect.data[0].faceId,
      faceId2: targetDetect.data[0].faceId,
    },
    {
      headers: {
        'Ocp-Apim-Subscription-Key': subscriptionKey,
        'Content-Type': 'application/json',
      },
    }
  );

  return {
    success: verifyResponse.data.isIdentical,
    similarity: verifyResponse.data.confidence * 100,
    confidence: verifyResponse.data.confidence * 100,
    message: verifyResponse.data.isIdentical
      ? 'Face verification successful'
      : 'Face verification failed. Faces do not match.',
  };
}
```

### Option 3: Face-API.js (Open Source, Lower Accuracy)
For a free alternative, you can use face-api.js (TensorFlow-based).

```javascript
const faceapi = require('face-api.js');
const canvas = require('canvas');
const { Canvas, Image, ImageData } = canvas;

// Patch nodejs environment
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

async function verifyFace(sourceBase64, targetBase64) {
  // Load models (do this once at startup)
  await faceapi.nets.ssdMobilenetv1.loadFromDisk('./models');
  await faceapi.nets.faceLandmark68Net.loadFromDisk('./models');
  await faceapi.nets.faceRecognitionNet.loadFromDisk('./models');

  // Convert base64 to images
  const sourceImg = await canvas.loadImage(
    Buffer.from(sourceBase64, 'base64')
  );
  const targetImg = await canvas.loadImage(
    Buffer.from(targetBase64, 'base64')
  );

  // Detect and extract face descriptors
  const sourceDetection = await faceapi
    .detectSingleFace(sourceImg)
    .withFaceLandmarks()
    .withFaceDescriptor();

  const targetDetection = await faceapi
    .detectSingleFace(targetImg)
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!sourceDetection || !targetDetection) {
    return {
      success: false,
      similarity: 0,
      confidence: 0,
      message: 'No face detected in one or both images',
    };
  }

  // Calculate distance between face descriptors
  const distance = faceapi.euclideanDistance(
    sourceDetection.descriptor,
    targetDetection.descriptor
  );

  // Distance < 0.6 is generally considered a match
  const threshold = 0.6;
  const similarity = Math.max(0, (1 - distance / threshold) * 100);

  return {
    success: distance < threshold,
    similarity: similarity,
    confidence: sourceDetection.detection.score * 100,
    message:
      distance < threshold
        ? 'Face verification successful'
        : 'Face verification failed. Faces do not match.',
  };
}
```

## Backend Controller Implementation

```javascript
// controllers/professional.controller.js
const professionalService = require('../services/professional.service');

exports.verifyFace = async (req, res) => {
  try {
    const professionalId = req.user.id; // From JWT token
    const { selfie, bookingId } = req.body;

    // Validate inputs
    if (!selfie || !bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Selfie and booking ID are required',
      });
    }

    // Get professional's profile picture
    const professional = await User.findById(professionalId);
    if (!professional || !professional.profilePicture) {
      return res.status(400).json({
        success: false,
        message: 'Profile picture not found. Please upload a profile picture first.',
      });
    }

    // Download profile picture from S3/CDN and convert to base64
    const profilePictureBase64 = await downloadImageAsBase64(
      professional.profilePicture
    );

    // Verify faces using chosen service (AWS Rekognition, Azure, etc.)
    const verificationResult = await verifyFace(selfie, profilePictureBase64);

    // Log verification attempt for audit trail
    await FaceVerificationLog.create({
      professional: professionalId,
      booking: bookingId,
      success: verificationResult.success,
      similarity: verificationResult.similarity,
      confidence: verificationResult.confidence,
      timestamp: new Date(),
    });

    // Return result
    return res.status(200).json({
      success: true,
      data: verificationResult,
    });
  } catch (error) {
    console.error('Face verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Face verification failed. Please try again.',
    });
  }
};
```

## Database Schema

Add a collection/table to log face verification attempts:

```javascript
// models/FaceVerificationLog.js
const mongoose = require('mongoose');

const faceVerificationLogSchema = new mongoose.Schema({
  professional: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
  },
  success: {
    type: Boolean,
    required: true,
  },
  similarity: {
    type: Number,
    required: true,
  },
  confidence: {
    type: Number,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('FaceVerificationLog', faceVerificationLogSchema);
```

## Security Considerations

1. **Rate Limiting**: Limit face verification attempts to prevent abuse (e.g., max 3 attempts per booking)
2. **Audit Trail**: Log all verification attempts with timestamps
3. **Data Privacy**: Don't store the selfie images, only log the verification result
4. **Minimum Similarity**: Set a minimum similarity threshold (recommended: 80-85%)
5. **Image Quality Check**: Validate that uploaded images meet minimum quality requirements

## Environment Variables

Add these to your `.env` file:

```bash
# AWS Rekognition
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1

# OR Azure Face API
AZURE_FACE_ENDPOINT=https://your-resource.cognitiveservices.azure.com
AZURE_FACE_KEY=your_subscription_key

# Face Verification Settings
FACE_SIMILARITY_THRESHOLD=80
MAX_VERIFICATION_ATTEMPTS=3
```

## Testing

Test the endpoint with curl:

```bash
curl -X POST http://localhost:5001/api/v1/professionals/verify-face \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "selfie": "base64_encoded_image_here",
    "bookingId": "booking_id_here"
  }'
```

## Cost Considerations

- **AWS Rekognition**: ~$0.001 per image analyzed (first 1M images/month free tier)
- **Azure Face API**: ~$0.40 per 1,000 transactions (first 30,000 free per month)
- **Face-API.js**: Free (self-hosted, but requires computational resources)

## Recommended: AWS Rekognition
For production use, AWS Rekognition is recommended due to:
- High accuracy
- Easy integration
- Reasonable cost
- Scalability
- Built-in fraud detection

## Next Steps

1. Choose a face verification service (recommended: AWS Rekognition)
2. Set up credentials and environment variables
3. Implement the backend endpoint
4. Add rate limiting middleware
5. Test with real images
6. Deploy and monitor verification success rates
