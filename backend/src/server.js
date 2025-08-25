// backend/src/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8888;

app.use(cors());
app.use(express.json());

// API Routes
const moodRoutes = require('./api/moodRoutes');
app.use('/api/mood', moodRoutes);

app.listen(PORT, () => {
    console.log(`🚀 EchoMood server is listening on port ${PORT}`);
});