import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db';
import matchRoutes from './routes/matches';
import playerRoutes from './routes/players';
import teamRoutes from './routes/teams';
import newsRoutes from './routes/news';
import seriesRoutes from './routes/series';
import rankingsRoutes from './routes/rankings';
import venueRoutes from './routes/venues';
import photoRoutes from './routes/photos';

// Load environment variables from the correct path
dotenv.config({ path: __dirname + '/../.env' });

const app = express();

// CORS configuration - allow frontend URLs
const allowedOrigins: string[] = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://crick-buddy-frontend-v.vercel.app',
  process.env.FRONTEND_URL || ''
].filter(origin => origin !== '');

// CORS middleware - must be before routes
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json({ limit: '2mb' }));

// Log environment variables for debugging
console.log('RAPIDAPI_KEY:', process.env.RAPIDAPI_KEY ? 'SET' : 'NOT SET');
console.log('RAPIDAPI_HOST:', process.env.RAPIDAPI_HOST ? 'SET' : 'NOT SET');

connectDB();

app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Cricket backend (TypeScript) is running' });
});

app.use('/api/matches', matchRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/series', seriesRoutes);
app.use('/api/rankings', rankingsRoutes);
app.use('/api/venues', venueRoutes);
app.use('/api/photos', photoRoutes);

app.use((req: Request, res: Response) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error', error: err?.message });
});

const PORT = process.env.PORT || 5000;

// Only start server if not in Vercel serverless environment
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`🚀 Server listening on port ${PORT}`);
  });
}

// Export for Vercel serverless
export default app;