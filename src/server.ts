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
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
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
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});