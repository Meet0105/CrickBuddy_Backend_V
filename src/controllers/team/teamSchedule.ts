import { Request, Response } from 'express';
import axios from 'axios';

// Test function to debug team API response
export const testTeamAPI = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { endpoint } = req.query; // schedule, results, news, players

    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;

    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST) {
      return res.status(500).json({ message: 'API config missing' });
    }

    const headers = {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST
    };

    let url = '';
    switch (endpoint) {
      case 'schedule':
        url = `https://${RAPIDAPI_HOST}/teams/v1/${id}/schedule`;
        break;
      case 'results':
        url = `https://${RAPIDAPI_HOST}/teams/v1/${id}/results`;
        break;
      case 'news':
        url = `https://${RAPIDAPI_HOST}/news/v1/team/${id}`;
        break;
      case 'players':
        url = `https://${RAPIDAPI_HOST}/teams/v1/${id}/players`;
        break;
      default:
        url = `https://${RAPIDAPI_HOST}/teams/v1/${id}`;
    }

    console.log('🧪 TESTING TEAM API CALL:', url);
    const response = await axios.get(url, { headers, timeout: 15000 });

    // Return raw API response for inspection
    res.json({
      url: url,
      status: response.status,
      headers: response.headers,
      data: response.data
    });
  } catch (error) {
    console.error('Test Team API error:', error);
    res.status(500).json({
      message: 'Test API failed',
      error: (error as Error).message,
      response: (error as any)?.response?.data
    });
  }
};

// Function to get team schedules
export const getTeamSchedules = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
    const RAPIDAPI_TEAMS_SCHEDULE_URL = process.env.RAPIDAPI_TEAMS_SCHEDULE_URL;

    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_TEAMS_SCHEDULE_URL) {
      return res.status(500).json({
        message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_TEAMS_SCHEDULE_URL in .env'
      });
    }

    const headers = {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST
    };

    // Build the URL directly using the working format
    const url = `https://${RAPIDAPI_HOST}/teams/v1/${id}/schedule`;
    
    console.log(`Fetching team schedules for team ID ${id} from URL: ${url}`);
    
    // Try to fetch team schedules from Cricbuzz API
    const response = await axios.get(url, { headers, timeout: 15000 });

    res.json(response.data);
  } catch (error) {
    console.error('getTeamSchedules error:', (error as any)?.response?.data || (error as Error).message || error);
    
    // Handle rate limiting
    if ((error as any)?.response?.status === 429) {
      return res.status(429).json({ 
        message: 'API rate limit exceeded. Please try again later.', 
        error: 'Too many requests' 
      });
    }
    
    res.status(500).json({ message: 'Failed to fetch team schedules', error: (error as any)?.response?.data || (error as Error).message });
  }
};

// Function to get team results
export const getTeamResults = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
    const RAPIDAPI_TEAMS_RESULTS_URL = process.env.RAPIDAPI_TEAMS_RESULTS_URL;

    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_TEAMS_RESULTS_URL) {
      return res.status(500).json({
        message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_TEAMS_RESULTS_URL in .env'
      });
    }

    const headers = {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST
    };

    // Build the URL directly using the working format
    const url = `https://${RAPIDAPI_HOST}/teams/v1/${id}/results`;
    
    console.log(`Fetching team results for team ID ${id} from URL: ${url}`);
    
    // Try to fetch team results from Cricbuzz API
    const response = await axios.get(url, { headers, timeout: 15000 });

    res.json(response.data);
  } catch (error) {
    console.error('getTeamResults error:', (error as any)?.response?.data || (error as Error).message || error);
    
    // Handle rate limiting
    if ((error as any)?.response?.status === 429) {
      return res.status(429).json({ 
        message: 'API rate limit exceeded. Please try again later.', 
        error: 'Too many requests' 
      });
    }
    
    res.status(500).json({ message: 'Failed to fetch team results', error: (error as any)?.response?.data || (error as Error).message });
  }
};