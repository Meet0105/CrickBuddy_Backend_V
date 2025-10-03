import { Request, Response } from 'express';
import axios from 'axios';
import Match from '../../models/Match';

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

export const getMatchCommentaries = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // First, try to get commentary from database
    const matchFromDB = await Match.findOne({ matchId: id });

    if (matchFromDB && matchFromDB.commentary && matchFromDB.commentary.commentaryList && matchFromDB.commentary.commentaryList.length > 0) {
      console.log('Returning commentary from database');
      return res.json(matchFromDB.commentary);
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

    // Try to fetch match commentaries from Cricbuzz API
    const url = `${RAPIDAPI_MATCHES_INFO_URL}/${id}/comm`;
    console.log('Fetching commentary from API:', url);
    const response = await axios.get(url, { headers, timeout: 15000 });

    // Store commentary data in database
    if (response.data && matchFromDB) {
      console.log('Storing commentary data in database');
      matchFromDB.commentary = {
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
      
      // Create new match entry with commentary data
      console.log('Creating new match entry with commentary data');
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
        commentary: {
          ...response.data,
          lastUpdated: new Date()
        },
        raw: response.data
      });
      await newMatch.save();
    }

    res.json(response.data);
  } catch (error) {
    console.error('getMatchCommentaries error:', error);

    // Handle rate limiting
    if ((error as any)?.response?.status === 429) {
      return res.status(429).json({
        message: 'API rate limit exceeded. Please try again later.',
        error: 'Too many requests'
      });
    }

    res.status(500).json({ message: 'Failed to fetch match commentaries', error: (error as Error).message });
  }
};

export const getMatchCommentariesV2 = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // First, try to get historical commentary from database
    const matchFromDB = await Match.findOne({ matchId: id });

    if (matchFromDB && matchFromDB.historicalCommentary && matchFromDB.historicalCommentary.commentaryList && matchFromDB.historicalCommentary.commentaryList.length > 0) {
      console.log('Returning historical commentary from database');
      return res.json(matchFromDB.historicalCommentary);
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

    // Try to fetch match commentaries v2 from Cricbuzz API
    const url = `${RAPIDAPI_MATCHES_INFO_URL}/${id}/hcomm`;
    console.log('Fetching historical commentary from API:', url);
    const response = await axios.get(url, { headers, timeout: 15000 });

    // Store historical commentary data in database
    if (response.data && matchFromDB) {
      console.log('Storing historical commentary data in database');
      matchFromDB.historicalCommentary = {
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
      
      // Create new match entry with historical commentary data
      console.log('Creating new match entry with historical commentary data');
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
        historicalCommentary: {
          ...response.data,
          lastUpdated: new Date()
        },
        raw: response.data
      });
      await newMatch.save();
    }

    res.json(response.data);
  } catch (error) {
    console.error('getMatchCommentariesV2 error:', error);

    // Handle rate limiting
    if ((error as any)?.response?.status === 429) {
      return res.status(429).json({
        message: 'API rate limit exceeded. Please try again later.',
        error: 'Too many requests'
      });
    }

    res.status(500).json({ message: 'Failed to fetch match commentaries v2', error: (error as Error).message });
  }
};