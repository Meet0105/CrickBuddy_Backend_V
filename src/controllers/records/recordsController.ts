import { Request, Response } from 'express';
import axios from 'axios';

// Function to get records filters
export const getRecordsFilters = async (req: Request, res: Response) => {
  try {
    // Use specific ranking API key if available, otherwise fallback to general key
    const RAPIDAPI_KEY = process.env.RAPIDAPI_RANKING_KEY || process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
    const RAPIDAPI_STATS_RECORDS_FILTERS_URL = process.env.RAPIDAPI_STATS_RECORDS_FILTERS_URL;

    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_STATS_RECORDS_FILTERS_URL) {
      return res.status(500).json({
        message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_STATS_RECORDS_FILTERS_URL in .env'
      });
    }

    const headers = {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST
    };

    // Try to fetch records filters from Cricbuzz API
    const response = await axios.get(RAPIDAPI_STATS_RECORDS_FILTERS_URL, { headers, timeout: 15000 });

    res.json(response.data);
  } catch (error) {
    console.error('getRecordsFilters error:', (error as any)?.response?.data || (error as Error).message || error);
    
    // Handle rate limiting
    if ((error as any)?.response?.status === 429) {
      return res.status(429).json({ 
        message: 'API rate limit exceeded. Please try again later.', 
        error: 'Too many requests' 
      });
    }
    
    // Handle subscription errors
    if ((error as any)?.response?.status === 403 || (error as any)?.response?.data?.message?.includes('subscribe')) {
      return res.status(403).json({ 
        message: 'API subscription required for records filters. Please check your API key.', 
        error: 'Subscription required' 
      });
    }
    
    res.status(500).json({ message: 'Failed to fetch records filters', error: (error as any)?.response?.data || (error as Error).message });
  }
};

// Function to get records
export const getRecords = async (req: Request, res: Response) => {
  try {
    const { statsType = 'mostRuns', categoryId = '0' } = req.query;
    // Use specific ranking API key if available, otherwise fallback to general key
    const RAPIDAPI_KEY = process.env.RAPIDAPI_RANKING_KEY || process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
    const RAPIDAPI_STATS_RECORDS_URL = process.env.RAPIDAPI_STATS_RECORDS_URL;

    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_STATS_RECORDS_URL) {
      return res.status(500).json({
        message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_STATS_RECORDS_URL in .env'
      });
    }

    const headers = {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST
    };

    // Try to fetch records from Cricbuzz API
    const url = `${RAPIDAPI_STATS_RECORDS_URL}/${categoryId}?statsType=${statsType}`;
    const response = await axios.get(url, { headers, timeout: 15000 });

    res.json(response.data);
  } catch (error) {
    console.error('getRecords error:', (error as any)?.response?.data || (error as Error).message || error);
    
    // Handle rate limiting
    if ((error as any)?.response?.status === 429) {
      return res.status(429).json({ 
        message: 'API rate limit exceeded. Please try again later.', 
        error: 'Too many requests' 
      });
    }
    
    // Handle subscription errors
    if ((error as any)?.response?.status === 403 || (error as any)?.response?.data?.message?.includes('subscribe')) {
      return res.status(403).json({ 
        message: 'API subscription required for records. Please check your API key.', 
        error: 'Subscription required' 
      });
    }
    
    res.status(500).json({ message: 'Failed to fetch records', error: (error as any)?.response?.data || (error as Error).message });
  }
};