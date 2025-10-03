import { Request, Response } from 'express';
import axios from 'axios';

// Function to get player career stats
export const getPlayerCareer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
    const RAPIDAPI_PLAYERS_CAREER_URL = process.env.RAPIDAPI_PLAYERS_CAREER_URL;

    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_PLAYERS_CAREER_URL) {
      return res.status(500).json({
        message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_PLAYERS_CAREER_URL in .env'
      });
    }

    const headers = {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST
    };

    // Try to fetch player career stats from Cricbuzz API
    // Construct the correct URL by replacing the player ID
    let url = RAPIDAPI_PLAYERS_CAREER_URL;
    // Replace the player ID in the URL with the requested ID
    url = url.replace(/\/\d+\/career$/, `/${id}/career`);
    
    const response = await axios.get(url, { headers, timeout: 15000 });

    // Ensure we return a proper structure
    const data = response.data || {};
    res.json(data);

  } catch (error) {
    console.error('getPlayerCareer error:', (error as any)?.response?.data || (error as Error).message || error);
    
    // Handle rate limiting
    if ((error as any)?.response?.status === 429) {
      return res.status(429).json({ 
        message: 'API rate limit exceeded. Please try again later.', 
        error: 'Too many requests' 
      });
    }
    
    res.status(500).json({ message: 'Failed to fetch player career stats', error: (error as any)?.response?.data || (error as Error).message });
  }
};

// Function to get player batting stats
export const getPlayerBatting = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
    const RAPIDAPI_PLAYERS_BATTING_URL = process.env.RAPIDAPI_PLAYERS_BATTING_URL;

    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_PLAYERS_BATTING_URL) {
      return res.status(500).json({
        message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_PLAYERS_BATTING_URL in .env'
      });
    }

    const headers = {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST
    };

    // Try to fetch player batting stats from Cricbuzz API
    // Construct the correct URL by replacing the player ID
    let url = RAPIDAPI_PLAYERS_BATTING_URL;
    // Replace the player ID in the URL with the requested ID
    url = url.replace(/\/\d+\/batting$/, `/${id}/batting`);
    
    const response = await axios.get(url, { headers, timeout: 15000 });

    // Ensure we return a proper structure
    const data = response.data || {};
    res.json(data);

  } catch (error) {
    console.error('getPlayerBatting error:', (error as any)?.response?.data || (error as Error).message || error);
    
    // Handle rate limiting
    if ((error as any)?.response?.status === 429) {
      return res.status(429).json({ 
        message: 'API rate limit exceeded. Please try again later.', 
        error: 'Too many requests' 
      });
    }
    
    res.status(500).json({ message: 'Failed to fetch player batting stats', error: (error as any)?.response?.data || (error as Error).message });
  }
};

// Function to get player bowling stats
export const getPlayerBowling = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
    const RAPIDAPI_PLAYERS_BOWLING_URL = process.env.RAPIDAPI_PLAYERS_BOWLING_URL;

    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_PLAYERS_BOWLING_URL) {
      return res.status(500).json({
        message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_PLAYERS_BOWLING_URL in .env'
      });
    }

    const headers = {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST
    };

    // Try to fetch player bowling stats from Cricbuzz API
    // Construct the correct URL by replacing the player ID
    let url = RAPIDAPI_PLAYERS_BOWLING_URL;
    // Replace the player ID in the URL with the requested ID
    url = url.replace(/\/\d+\/bowling$/, `/${id}/bowling`);
    
    const response = await axios.get(url, { headers, timeout: 15000 });

    // Ensure we return a proper structure
    const data = response.data || {};
    res.json(data);

  } catch (error) {
    console.error('getPlayerBowling error:', (error as any)?.response?.data || (error as Error).message || error);
    
    // Handle rate limiting
    if ((error as any)?.response?.status === 429) {
      return res.status(429).json({ 
        message: 'API rate limit exceeded. Please try again later.', 
        error: 'Too many requests' 
      });
    }
    
    res.status(500).json({ message: 'Failed to fetch player bowling stats', error: (error as any)?.response?.data || (error as Error).message });
  }
};