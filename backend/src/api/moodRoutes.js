const express = require('express');
const router = express.Router();
const axios = require('axios');

const AI_API_URL = 'http://127.0.0.1:5000';

router.post('/detect', async (req, res) => {
    const { text, activity } = req.body;

    if (!text) {
        return res.status(400).json({ error: 'Text is required for mood detection.' });
    }

    console.log(`\n🔍 Processing mood detection request...`);
    console.log(`📝 Text: "${text.substring(0, 50)}..."`);

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

        // STEP 2: Get song recommendations for that mood
        console.log(`🎵 Fetching song recommendations...`);
        const recommendationsResponse = await axios.post(
            `${AI_API_URL}/recommendations`,
            { mood: detectedMood },
            { timeout: 15000 } // 15 second timeout
        );
        
        const songs = recommendationsResponse.data.recommendations;
        console.log(`✅ Received ${songs.length} song recommendations.`);

        // STEP 3: Send the combined result back
        res.json({
            detectedMood: detectedMood,
            recommendations: songs,
            activity: activity || 'text-input'
        });

    } catch (error) {
        console.error("❌ Error in detection/recommendation flow:", error.message);
        
        // Provide specific error messages
        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({ 
                error: "AI service unavailable. Make sure the Python server is running on port 5000.",
                details: "Run: python ai_server.py"
            });
        }
        
        if (error.response) {
            // The AI API responded with an error
            return res.status(error.response.status).json({ 
                error: "AI service error",
                details: error.response.data 
            });
        }
        
        if (error.code === 'ECONNABORTED') {
            return res.status(504).json({ 
                error: "Request timeout. The AI service took too long to respond." 
            });
        }

        // Generic error
        res.status(500).json({ 
            error: "Failed to get recommendations.",
            details: error.message 
        });
    }
});

module.exports = router;