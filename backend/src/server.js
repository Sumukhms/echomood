// backend/src/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8888;

// CORS configuration - allow requests from our Vite frontend
const allowedOrigins = [
    'http://localhost:5173', // Vite dev server
    'http://127.0.0.1:5173'  // Alternate Vite address
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    optionsSuccessStatus: 200
}));

// Middleware to parse JSON bodies
app.use(express.json({ limit: '10mb' })); // Increase limit for potential image data
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'EchoMood backend is running' });
});

// API Routes
const moodRoutes = require('./api/moodRoutes');
app.use('/api/mood', moodRoutes);

// Centralized error handling middleware
app.use((err, req, res, next) => {
    console.error('An unhandled error occurred:', err);
    res.status(5.00).json({ 
        error: 'Internal server error',
        message: err.message 
    });
});

app.listen(PORT, () => {
    console.log(`🚀 EchoMood backend server is listening on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/health`);
    console.log(`🎵 API endpoint: http://localhost:${PORT}/api/mood`);
});