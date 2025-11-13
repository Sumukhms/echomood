const express = require('express');
const router = express.Router();
const axios = require('axios');

// Updated to match our new Flask/Python server's routes
// Note: Using 127.0.0.1 is often more reliable than 'localhost' for server-to-server
const AI_API_URL = 'http://127.0.0.1:5000/api';

/**
 * Centralized error handler for all API calls
 */
function handleApiError(error, res) {
    console.error("❌ Error in API flow:", error.message);
        
    if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
        return res.status(503).json({ 
            error: "AI service unavailable. Is the Python server running on port 5000?"
        });
    }
    
    if (error.response) {
        // Forward the error from the Python server
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
 * Helper function to get recommendations AFTER a mood has been detected
 */
async function getRecommendationsForMood(mood, res) {
    try {
        console.log(`🎵 Fetching song recommendations for mood: ${mood}`);
        const response = await axios.post(
            `${AI_API_URL}/recommendations`,
            { mood },
            { timeout: 15000 } // 15 second timeout
        );
        
        // Send the final combined response to the frontend
        res.json({
            detectedMood: mood,
            recommendations: response.data.recommendations || []
        });

    } catch (error) {
        // If recommendation fails, still send the detected mood
        console.error("❌ Error in recommendation step:", error.message);
        res.status(200).json({
            detectedMood: mood,
            recommendations: [],
            error: `Successfully detected mood, but failed to get recommendations.`
        });
    }
}

/**
 * ROUTE: /api/mood/detect
 * Handles text-based mood detection
 */
router.post('/detect', async (req, res) => {
    const { text } = req.body;

    if (!text || !text.trim()) {
        return res.status(400).json({ error: 'Text is required.' });
    }

    console.log(`\n🔍 Processing text request: "${text.substring(0, 50)}..."`);

    try {
        // STEP 1: Get the mood from the text
        console.log(`⚡ Calling AI API for mood analysis...`);
        const moodResponse = await axios.post(
            `${AI_API_URL}/analyze_text`, 
            { text },
            { timeout: 10000 } // 10 second timeout
        );
        
        const detectedMood = moodResponse.data.mood;
        console.log(`✅ Detected Mood: ${detectedMood}`);

        // STEP 2: Pass the mood to the recommendation helper
        await getRecommendationsForMood(detectedMood, res);

    } catch (error) {
        handleApiError(error, res);
    }
});

/**
 * ROUTE: /api/mood/detect-voice
 * Placeholder for voice-based detection
 */
router.post('/detect-voice', async (req, res) => {
    console.log(`\nProcessing voice request... (NOT IMPLEMENTED)`);
    // TODO:
    // 1. Add 'multer' middleware to this route to handle file uploads
    // 2. Get the audio file from req.file
    // 3. Send it as FormData to `${AI_API_URL}/analyze_voice`
    
    // For now, return a 501 Not Implemented error
    res.status(501).json({
        error: "Voice detection is not implemented on the server yet."
    });
    
    // --- To test the frontend flow, you can fake a response: ---
    // console.log("⚠️ Voice analysis not implemented. Simulating 'calm'.");
    // await getRecommendationsForMood("calm", res);
});

/**
 * ROUTE: /api/mood/detect-face
 * Placeholder for face-based detection
 */
router.post('/detect-face', async (req, res) => {
    console.log(`\nProcessing face detection request... (NOT IMPLEMENTED)`);
    // TODO:
    // 1. Get the image (e.g., base64 string) from req.body.image
    // 2. Send it to `${AI_API_URL}/analyze_face`
    
    // For now, return a 501 Not Implemented error
    res.status(501).json({
        error: "Face detection is not implemented on the server yet."
    });
    
    // --- To test the frontend flow, you can fake a response: ---
    // console.log("⚠️ Face analysis not implemented. Simulating 'energetic'.");
    // await getRecommendationsForMood("energetic", res);
});

module.exports = router;