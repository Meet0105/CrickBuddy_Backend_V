import { Request, Response } from 'express';
import axios from 'axios';

// Function to get trending players
export const getTrendingPlayers = async (req: Request, res: Response) => {
  try {
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
    const RAPIDAPI_PLAYERS_TRENDING_URL = process.env.RAPIDAPI_PLAYERS_TRENDING_URL;

    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_PLAYERS_TRENDING_URL) {
      return res.status(500).json({
        message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_PLAYERS_TRENDING_URL in .env'
      });
    }

    const headers = {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST
    };

    // Try to fetch trending players from Cricbuzz API
    const response = await axios.get(RAPIDAPI_PLAYERS_TRENDING_URL, { headers, timeout: 15000 });

    res.json(response.data);
  } catch (error) {
    console.error('getTrendingPlayers error:', (error as any)?.response?.data || (error as Error).message || error);
    
    // Handle rate limiting
    if ((error as any)?.response?.status === 429) {
      return res.status(429).json({ 
        message: 'API rate limit exceeded. Please try again later.', 
        error: 'Too many requests' 
      });
    }
    
    res.status(500).json({ message: 'Failed to fetch trending players', error: (error as any)?.response?.data || (error as Error).message });
  }
};