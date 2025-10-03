// Vercel serverless function entry point
const express = require('express');
const cors = require('cors');

// Import the compiled app
const app = express();

// Basic CORS setup
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://crick-buddy-frontend-v.vercel.app'
  ],
  credentials: true
}));

app.use(express.json());

// Basic test route
app.get('/', (req, res) => {
  res.json({ message: 'Cricket backend API is running on Vercel' });
});

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from Vercel API' });
});

// For now, let's add a simple test endpoint
app.get('/api/matches/live', (req, res) => {
  res.json([]);
});

app.get('/api/matches/recent', (req, res) => {
  res.json([]);
});

app.get('/api/matches/upcoming', (req, res) => {
  res.json([
    {
      matchId: '135173',
      title: 'Australia vs New Zealand, 1st ODI',
      teams: [
        { teamName: 'Australia', teamShortName: 'AUS' },
        { teamName: 'New Zealand', teamShortName: 'NZ' }
      ],
      status: 'UPCOMING',
      format: 'ODI'
    }
  ]);
});

module.exports = app;