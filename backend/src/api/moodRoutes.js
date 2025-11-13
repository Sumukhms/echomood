const express = require('express');
const router = express.Router();
const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');
const fs = require('fs');

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Accept audio and image files
    if (file.mimetype.startsWith('audio/') || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio and image files are allowed.'));
    }
  }
});

const AI_API_URL = 'http://127.0.0.1:5000/api';

/**
 * Centralized error handler
 */
function handleApiError(error, res) {
  console.error("❌ Error in API flow:", error.message);
      
  if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
    return res.status(503).json({ 
      error: "AI service unavailable. Is the Python server running on port 5000?"
    });
  }
  
  if (error.response) {
    console.error("AI Server Response:", error.response.data);
    return res.status(error.response.status).json({ 
      error: error.response.data.error || "AI service error",
      details: error.response.data.details
    });
  }
  
  if (error.code === 'ECONNABORTED') {
    return res.status(504).json({ 
      error: "Request timeout. The AI service took too long." 
    });
  }

  res.status(500).json({ 
    error: "An unexpected error occurred.",
    details: error.message 
  });
}

/**
 * Get recommendations after mood detection
 */
async function getRecommendationsForMood(mood, res) {
  try {
    console.log(`🎵 Fetching recommendations for mood: ${mood}`);
    const response = await axios.post(
      `${AI_API_URL}/recommendations`,
      { mood },
      { timeout: 15000 }
    );
    
    res.json({
      detectedMood: mood,
      recommendations: response.data.recommendations || []
    });

  } catch (error) {
    console.error("❌ Error in recommendation step:", error.message);
    res.status(200).json({
      detectedMood: mood,
      recommendations: [],
      error: `Successfully detected mood, but failed to get recommendations.`
    });
  }
}

/**
 * Cleanup uploaded file
 */
function cleanupFile(filePath) {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlink(filePath, (err) => {
      if (err) console.error('Error deleting file:', err);
    });
  }
}

/**
 * ROUTE: /api/mood/detect (Text)
 */
router.post('/detect', async (req, res) => {
  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Text is required.' });
  }

  console.log(`\n🔍 Processing text request: "${text.substring(0, 50)}..."`);

  try {
    console.log(`⚡ Calling AI API for mood analysis...`);
    const moodResponse = await axios.post(
      `${AI_API_URL}/analyze_text`, 
      { text },
      { timeout: 10000 }
    );
    
    const detectedMood = moodResponse.data.mood;
    console.log(`✅ Detected Mood: ${detectedMood}`);

    await getRecommendationsForMood(detectedMood, res);

  } catch (error) {
    handleApiError(error, res);
  }
});

/**
 * ROUTE: /api/mood/detect-voice (Voice)
 */
router.post('/detect-voice', upload.single('audio'), async (req, res) => {
  let filePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Audio file is required.' });
    }

    filePath = req.file.path;
    console.log(`\n🎤 Processing voice request: ${req.file.originalname}`);

    // Create form data to send to Python server
    const formData = new FormData();
    formData.append('audio', fs.createReadStream(filePath), {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });

    // Send to Python AI server
    console.log(`⚡ Calling AI API for voice analysis...`);
    const moodResponse = await axios.post(
      `${AI_API_URL}/analyze_voice`,
      formData,
      {
        headers: formData.getHeaders(),
        timeout: 30000
      }
    );

    const detectedMood = moodResponse.data.mood;
    console.log(`✅ Detected Mood: ${detectedMood} (confidence: ${moodResponse.data.confidence})`);

    await getRecommendationsForMood(detectedMood, res);

  } catch (error) {
    handleApiError(error, res);
  } finally {
    cleanupFile(filePath);
  }
});

/**
 * ROUTE: /api/mood/detect-face (Face)
 */
router.post('/detect-face', upload.single('image'), async (req, res) => {
  let filePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required.' });
    }

    filePath = req.file.path;
    console.log(`\n📸 Processing face detection request: ${req.file.originalname}`);

    // Create form data to send to Python server
    const formData = new FormData();
    formData.append('image', fs.createReadStream(filePath), {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });

    // Send to Python AI server
    console.log(`⚡ Calling AI API for face analysis...`);
    const moodResponse = await axios.post(
      `${AI_API_URL}/analyze_face`,
      formData,
      {
        headers: formData.getHeaders(),
        timeout: 30000
      }
    );

    const detectedMood = moodResponse.data.mood;
    console.log(`✅ Detected Mood: ${detectedMood} (confidence: ${moodResponse.data.confidence})`);

    await getRecommendationsForMood(detectedMood, res);

  } catch (error) {
    handleApiError(error, res);
  } finally {
    cleanupFile(filePath);
  }
});

module.exports = router;