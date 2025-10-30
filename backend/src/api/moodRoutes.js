const express = require('express');
const router = express.Router();
const axios = require('axios');

const AI_API_URL = 'http://127.0.0.1:5000';

router.post('/detect', async (req, res) => {
    const { text, activity } = req.body;

    if (!text) {
        return res.status(400).json({ error: 'Text is required for mood detection.' });
    }

    try {
        // --- STEP 1: Get the mood from the text ---
        const moodResponse = await axios.post(`${AI_API_URL}/analyze_text`, { text });
        const detectedMood = moodResponse.data.mood;
        console.log(`Detected Mood: ${detectedMood}`);

        // --- STEP 2: Get song recommendations for that mood ---
        const recommendationsResponse = await axios.post(`${AI_API_URL}/recommendations`, {
            mood: detectedMood
        });
        const songs = recommendationsResponse.data.recommendations;
        console.log(`Received ${songs.length} song recommendations.`);

        // --- STEP 3: Send the combined result back ---
        res.json({
            detectedMood: detectedMood,
            recommendations: songs,
            activity: activity
        });

    } catch (error) {
        console.error("Error in the full detection/recommendation flow:", error);
        res.status(500).json({ error: "Failed to get recommendations." });
    }
});

module.exports = router;