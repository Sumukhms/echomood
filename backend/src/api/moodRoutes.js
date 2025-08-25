// backend/src/api/moodRoutes.js
const express = require('express');
const router = express.Router();

router.post('/detect', (req, res) => {
    const { text, activity } = req.body;

    console.log(`Received text: "${text}" | Activity: "${activity}"`);

    // Mock AI Logic: Returns a fixed mood for now
    const mockMood = 'happy';

    res.json({
        detectedMood: mockMood,
        activity: activity,
        message: "Mood detection is currently mocked."
    });
});

module.exports = router;