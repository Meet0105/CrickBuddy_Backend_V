import { Request, Response } from 'express';
import axios from 'axios';

// Function to get ICC rankings (batsmen, bowlers, all-rounders)
export const getIccRankings = async (req: Request, res: Response) => {
  try {
    const { formatType = 'test', category = 'batsmen' } = req.query;
    // Use specific ranking API key if available, otherwise fallback to general key
    const RAPIDAPI_KEY = process.env.RAPIDAPI_RANKING_KEY || process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
    const RAPIDAPI_STATS_ICC_RANKINGS_URL = process.env.RAPIDAPI_STATS_ICC_RANKINGS_URL;

    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_STATS_ICC_RANKINGS_URL) {
      return res.status(500).json({
        message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_STATS_ICC_RANKINGS_URL in .env'
      });
    }

    const headers = {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST
    };

    // Try to fetch ICC rankings from Cricbuzz API
    const url = `${RAPIDAPI_STATS_ICC_RANKINGS_URL}?formatType=${formatType}&category=${category}`;
    const response = await axios.get(url, { headers, timeout: 15000 });

    res.json(response.data);
  } catch (error) {
    console.error('getIccRankings error:', (error as any)?.response?.data || (error as Error).message || error);
    
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
        message: 'API subscription required for rankings. Please check your API key.', 
        error: 'Subscription required' 
      });
    }
    
    res.status(500).json({ message: 'Failed to fetch ICC rankings', error: (error as any)?.response?.data || (error as Error).message });
  }
};

// Function to get ICC standings
export const getIccStandings = async (req: Request, res: Response) => {
  try {
    const { matchType = '1' } = req.params; // 1 = Test, 2 = ODI, 3 = T20
    // Use specific ranking API key if available, otherwise fallback to general key
    const RAPIDAPI_KEY = process.env.RAPIDAPI_RANKING_KEY || process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
    const RAPIDAPI_STATS_ICC_STANDINGS_URL = process.env.RAPIDAPI_STATS_ICC_STANDINGS_URL;

    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_STATS_ICC_STANDINGS_URL) {
      return res.status(500).json({
        message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_STATS_ICC_STANDINGS_URL in .env'
      });
    }

    const headers = {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST
    };

    // Try to fetch ICC standings from Cricbuzz API
    // The URL in .env ends with /1 (Test), so we need to replace it with the actual matchType
    const url = RAPIDAPI_STATS_ICC_STANDINGS_URL.replace(/\/\d+$/, `/${matchType}`);
    
    // Log the URL for debugging
    console.log(`Fetching standings from URL: ${url}`);
    
    // For T20 (matchType 3), try with retry logic since it's known to be unstable
    if (matchType === '3') {
      let lastError;
      for (let i = 0; i < 3; i++) { // Try up to 3 times
        try {
          const response = await axios.get(url, { headers, timeout: 15000 });
          return res.json(response.data);
        } catch (error) {
          lastError = error;
          if (i < 2) { // Don't wait after the last attempt
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Wait 1s, then 2s
          }
        }
      }
      // If all retries failed, return the specific error for T20
      return res.status(500).json({ 
        message: 'T20 standings data is temporarily unavailable due to an issue with the external API. Please try Test (1) or ODI (2) match types instead.', 
        error: 'API returned 500 Internal Server Error for T20 standings after multiple attempts'
      });
    }
    
    // For Test and ODI, use direct approach
    const response = await axios.get(url, { headers, timeout: 15000 });
    res.json(response.data);
  } catch (error) {
    console.error('getIccStandings error:', (error as any)?.response?.data || (error as Error).message || error);
    
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
        message: 'API subscription required for standings. Please check your API key.', 
        error: 'Subscription required' 
      });
    }
    
    // Check if this is a specific API error for matchType 3 (T20)
    // T20 standings (matchType 3) returns 500 error from API - this is a known issue with the external API
    // Test (matchType 1) and ODI (matchType 2) standings are working correctly
    if (req.params?.matchType === '3') {
      return res.status(500).json({ 
        message: 'T20 standings data is temporarily unavailable due to an issue with the external API. Please try Test (1) or ODI (2) match types instead.', 
        error: 'API returned 500 Internal Server Error for T20 standings'
      });
    }
    
    res.status(500).json({ message: 'Failed to fetch ICC standings', error: (error as any)?.response?.data || (error as Error).message });
  }
};



export const getRankings = async (req: Request, res: Response) => {
  try {
    // For backward compatibility, we'll return a simple structure
    // In a real implementation, you might want to fetch actual data
    res.json({
      teams: {
        test: [],
        odi: [],
        t20: []
      },
      players: {
        batsmen: {
          test: [],
          odi: [],
          t20: []
        },
        bowlers: {
          test: [],
          odi: [],
          t20: []
        },
        allrounders: {
          test: [],
          odi: [],
          t20: []
        }
      }
    });
  } catch (error) {
    console.error('getRankings error:', error);
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};

export const syncRankingsFromRapidAPI = async (req: Request, res: Response) => {
  try {
    // This endpoint can be used to sync rankings data if needed
    res.json({ message: 'Rankings sync endpoint ready' });
  } catch (error) {
    console.error('syncRankingsFromRapidAPI error:', error);
    res.status(500).json({ message: 'Rankings sync failed', error: (error as Error).message });
  }
};