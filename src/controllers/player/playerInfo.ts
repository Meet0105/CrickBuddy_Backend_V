import { Request, Response } from 'express';
import axios from 'axios';

// Function to get player info
export const getPlayerInfo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
    const RAPIDAPI_PLAYERS_INFO_URL = process.env.RAPIDAPI_PLAYERS_INFO_URL;

    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_PLAYERS_INFO_URL) {
      return res.status(500).json({
        message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_PLAYERS_INFO_URL in .env'
      });
    }

    const headers = {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST
    };

    // Try to fetch player info from Cricbuzz API
    // Construct the correct URL by replacing the player ID
    let url = RAPIDAPI_PLAYERS_INFO_URL;
    // Replace the player ID in the URL with the requested ID
    url = url.replace(/\/\d+$/, `/${id}`);
    
    const response = await axios.get(url, { headers, timeout: 15000 });

    res.json(response.data);
  } catch (error) {
    console.error('getPlayerInfo error:', (error as any)?.response?.data || (error as Error).message || error);
    
    // Handle rate limiting
    if ((error as any)?.response?.status === 429) {
      return res.status(429).json({ 
        message: 'API rate limit exceeded. Please try again later.', 
        error: 'Too many requests' 
      });
    }
    
    res.status(500).json({ message: 'Failed to fetch player info', error: (error as any)?.response?.data || (error as Error).message });
  }
};

// Function to get player news
export const getPlayerNews = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
    const RAPIDAPI_PLAYERS_NEWS_URL = process.env.RAPIDAPI_PLAYERS_NEWS_URL;

    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_PLAYERS_NEWS_URL) {
      return res.status(500).json({
        message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_PLAYERS_NEWS_URL in .env'
      });
    }

    const headers = {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST
    };

    // Try to fetch player news from Cricbuzz API
    // Construct the correct URL by replacing the player ID
    let url = RAPIDAPI_PLAYERS_NEWS_URL;
    // Replace the player ID in the URL with the requested ID
    url = url.replace(/\/\d+$/, `/${id}`);
    
    const response = await axios.get(url, { headers, timeout: 15000 });

    res.json(response.data);
  } catch (error) {
    console.error('getPlayerNews error:', (error as any)?.response?.data || (error as Error).message || error);
    
    // Handle rate limiting
    if ((error as any)?.response?.status === 429) {
      return res.status(429).json({ 
        message: 'API rate limit exceeded. Please try again later.', 
        error: 'Too many requests' 
      });
    }
    
    res.status(500).json({ message: 'Failed to fetch player news', error: (error as any)?.response?.data || (error as Error).message });
  }
};