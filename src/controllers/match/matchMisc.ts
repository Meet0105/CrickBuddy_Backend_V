import Match from '../../models/Match';
import { Request, Response } from 'express';
import axios from 'axios';

// Helper function to map API status to our enum values
const mapStatusToEnum = (status: string): 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'ABANDONED' | 'CANCELLED' => {
  if (!status) return 'UPCOMING';
  
  // Convert to lowercase for case-insensitive comparison
  const lowerStatus = status.toLowerCase();
  
  // Map common status values
  if (lowerStatus.includes('live') || lowerStatus.includes('in progress')) return 'LIVE';
  if (lowerStatus.includes('complete') || lowerStatus.includes('finished')) return 'COMPLETED';
  if (lowerStatus.includes('abandon')) return 'ABANDONED';
  if (lowerStatus.includes('cancel')) return 'CANCELLED';
  
  // For upcoming matches with date information
  if (lowerStatus.includes('match starts')) return 'UPCOMING';
  
  // Default fallback
  return 'UPCOMING';
};

export const getMatchOvers = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // First, try to get overs from database
    const matchFromDB = await Match.findOne({ matchId: id });
    
    if (matchFromDB && matchFromDB.overs && matchFromDB.overs.overs && matchFromDB.overs.overs.length > 0) {
      console.log('Returning overs from database');
      return res.json(matchFromDB.overs);
    }
    
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
    const RAPIDAPI_MATCHES_INFO_URL = process.env.RAPIDAPI_MATCHES_INFO_URL;

    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_MATCHES_INFO_URL) {
      return res.status(500).json({
        message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_MATCHES_INFO_URL in .env'
      });
    }

    const headers = {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST
    };

    // Try to fetch match overs from Cricbuzz API
    const url = `${RAPIDAPI_MATCHES_INFO_URL}/${id}/overs`;
    console.log('Fetching overs from API:', url);
    const response = await axios.get(url, { headers, timeout: 15000 });

    // Store overs data in database
    if (response.data && matchFromDB) {
      console.log('Storing overs data in database');
      matchFromDB.overs = {
        ...response.data,
        lastUpdated: new Date()
      };
      await matchFromDB.save();
    } else if (response.data && !matchFromDB) {
      // Extract status from the API response
      let status = 'UPCOMING';
      if (response.data.matchHeader && response.data.matchHeader.state) {
        status = mapStatusToEnum(response.data.matchHeader.state);
      } else if (response.data.matchHeader && response.data.matchHeader.status) {
        status = mapStatusToEnum(response.data.matchHeader.status);
      }
      
      // Create new match entry with overs data
      console.log('Creating new match entry with overs data');
      const newMatch = new Match({
        matchId: id,
        title: response.data.matchHeader?.matchDescription || `Match ${id}`,
        format: response.data.matchHeader?.matchFormat || 'OTHER',
        status: status,
        venue: { 
          name: response.data.matchHeader?.venueName || 'Unknown Venue',
          city: response.data.matchHeader?.venueCity || '',
          country: response.data.matchHeader?.venueCountry || ''
        },
        startDate: response.data.matchHeader?.startDate ? new Date(response.data.matchHeader.startDate) : new Date(),
        series: { 
          id: response.data.matchHeader?.seriesId?.toString() || '0', 
          name: response.data.matchHeader?.seriesName || 'Unknown Series' 
        },
        teams: [],
        overs: {
          ...response.data,
          lastUpdated: new Date()
        },
        raw: response.data
      });
      await newMatch.save();
    }

    res.json(response.data);
  } catch (error) {
    console.error('getMatchOvers error:', error);
    
    // Handle rate limiting
    if ((error as any)?.response?.status === 429) {
      return res.status(429).json({ 
        message: 'API rate limit exceeded. Please try again later.', 
        error: 'Too many requests' 
      });
    }
    
    res.status(500).json({ message: 'Failed to fetch match overs', error: (error as Error).message });
  }
};

export const getMatchLeanback = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
    const RAPIDAPI_MATCHES_INFO_URL = process.env.RAPIDAPI_MATCHES_INFO_URL;

    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_MATCHES_INFO_URL) {
      return res.status(500).json({
        message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_MATCHES_INFO_URL in .env'
      });
    }

    const headers = {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST
    };

    // Try to fetch match leanback from Cricbuzz API
    const url = `${RAPIDAPI_MATCHES_INFO_URL}/${id}/leanback`;
    const response = await axios.get(url, { headers, timeout: 15000 });

    res.json(response.data);
  } catch (error) {
    console.error('getMatchLeanback error:', error);
    
    // Handle rate limiting
    if ((error as any)?.response?.status === 429) {
      return res.status(429).json({ 
        message: 'API rate limit exceeded. Please try again later.', 
        error: 'Too many requests' 
      });
    }
    
    res.status(500).json({ message: 'Failed to fetch match leanback', error: (error as Error).message });
  }
};

export const updateMatchDemo = async (req: Request, res: Response) => {
  try {
    const { matchId, isLive, status } = req.body;
    
    const match = await Match.findOne({ matchId });
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }
    
    if (isLive !== undefined) match.isLive = isLive;
    if (status) match.status = status;
    
    await match.save();
    
    res.json({ message: 'Match updated successfully', match });
  } catch (error) {
    console.error('updateMatchDemo error:', error);
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};

export const clearDemoData = async (req: Request, res: Response) => {
  try {
    // Clear existing demo data
    const result = await Match.deleteMany({ matchId: { $regex: 'demo-', $options: 'i' } });
    
    res.json({ 
      message: `Demo data cleared successfully`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('clearDemoData error:', error);
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};

// New function to sync all data from RapidAPI
export const syncAllDataFromRapidAPI = async (req: Request, res: Response) => {
  try {
    // We'll implement this function to sync all data types
    res.json({ 
      message: 'Full sync endpoint ready. Please sync each data type separately using their respective endpoints.',
      endpoints: {
        matches: 'POST /api/matches/sync',
        news: 'POST /api/news/sync',
        players: 'POST /api/players/sync',
        series: 'POST /api/series/sync',
        teams: 'POST /api/teams/sync'
      }
    });
  } catch (error) {
    console.error('syncAllDataFromRapidAPI error:', error);
    res.status(500).json({ message: 'Full sync failed', error: (error as Error).message });
  }
};