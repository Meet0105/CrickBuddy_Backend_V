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

// Function to sync recent matches from RapidAPI
export const syncRecentMatchesFromRapidAPI = async (req: Request, res: Response) => {
  try {
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
    const RAPIDAPI_MATCHES_RECENT_URL = process.env.RAPIDAPI_MATCHES_RECENT_URL;

    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_MATCHES_RECENT_URL) {
      return res.status(500).json({
        message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_MATCHES_RECENT_URL in .env'
      });
    }

    const headers = {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST
    };

    // Try to fetch recent matches from Cricbuzz API
    const response = await axios.get(RAPIDAPI_MATCHES_RECENT_URL, { headers, timeout: 15000 });

    let matchesList: any[] = [];
    
    // Handle different response structures from RapidAPI
    if (response.data && response.data.typeMatches) {
      // Extract matches from typeMatches structure
      for (const typeMatch of response.data.typeMatches) {
        if (typeMatch.seriesMatches) {
          for (const seriesMatch of typeMatch.seriesMatches) {
            if (seriesMatch.seriesAdWrapper && seriesMatch.seriesAdWrapper.matches) {
              matchesList = matchesList.concat(seriesMatch.seriesAdWrapper.matches);
            }
          }
        }
      }
    } else if (Array.isArray(response.data)) {
      matchesList = response.data;
    } else {
      const values = Object.values(response.data || {});
      const arr = values.find((v: any) => Array.isArray(v) && v.length && typeof v[0] === 'object') as any[];
      if (arr) matchesList = arr;
    }

    if (!matchesList || !matchesList.length) {
      return res.status(500).json({
        message: 'No matches array found in RapidAPI response. Inspect provider response.',
        providerResponseSample: response.data
      });
    }

    const upsertPromises = matchesList.map(async (m) => {
      const matchId = m.matchInfo?.matchId || m.id || m.matchId || JSON.stringify(m).slice(0, 40);

      // Parse teams data
      const teams = [];
      if (m.matchInfo?.team1) {
        teams.push({
          teamId: m.matchInfo.team1.teamId?.toString(),
          teamName: m.matchInfo.team1.teamName,
          teamShortName: m.matchInfo.team1.teamSName,
          score: {
            runs: 0,
            wickets: 0,
            overs: 0
          }
        });
      }
      
      if (m.matchInfo?.team2) {
        teams.push({
          teamId: m.matchInfo.team2.teamId?.toString(),
          teamName: m.matchInfo.team2.teamName,
          teamShortName: m.matchInfo.team2.teamSName,
          score: {
            runs: 0,
            wickets: 0,
            overs: 0
          }
        });
      }

      const doc: any = {
        matchId: matchId?.toString(),
        title: m.matchInfo?.matchDesc || m.name || m.title || 'Match',
        shortTitle: m.matchInfo?.matchDesc || m.shortName || m.title || 'Match',
        subTitle: m.matchInfo?.seriesName || m.subtitle || '',
        format: m.matchInfo?.matchFormat || 'OTHER',
        status: mapStatusToEnum(m.matchInfo?.state || m.status || 'UPCOMING'),
        venue: {
          name: m.matchInfo?.venueInfo?.ground || m.venue || 'Unknown Venue',
          city: m.matchInfo?.venueInfo?.city || m.city || '',
          country: m.matchInfo?.venueInfo?.country || m.country || ''
        },
        startDate: m.matchInfo?.startDate ? new Date(parseInt(m.matchInfo.startDate)) : new Date(),
        endDate: m.matchInfo?.endDate ? new Date(parseInt(m.matchInfo.endDate)) : undefined,
        series: {
          id: m.matchInfo?.seriesId?.toString() || '0',
          name: m.matchInfo?.seriesName || 'Unknown Series',
          seriesType: 'INTERNATIONAL'
        },
        teams: teams,
        isLive: m.matchInfo?.state === 'In Progress' || m.matchInfo?.state === 'Complete' || false,
        priority: 0,
        raw: m
      };

      Object.keys(doc).forEach((k) => doc[k] === undefined && delete doc[k]);

      return Match.findOneAndUpdate(
        { matchId: doc.matchId },
        { $set: doc },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    });

    const results = await Promise.all(upsertPromises);
    res.json({ message: `Synced ${results.length} recent matches.`, count: results.length });
  } catch (error) {
    console.error('syncRecentMatchesFromRapidAPI error:', (error as any)?.response?.data || (error as Error).message || error);
    
    // Handle rate limiting
    if ((error as any)?.response?.status === 429) {
      return res.status(429).json({ 
        message: 'API rate limit exceeded. Please try again later.', 
        error: 'Too many requests' 
      });
    }
    
    res.status(500).json({ message: 'Recent matches sync failed', error: (error as any)?.response?.data || (error as Error).message });
  }
};

// Function to sync upcoming matches from RapidAPI
export const syncUpcomingMatchesFromRapidAPI = async (req: Request, res: Response) => {
  try {
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
    const RAPIDAPI_MATCHES_UPCOMING_URL = process.env.RAPIDAPI_MATCHES_UPCOMING_URL;

    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_MATCHES_UPCOMING_URL) {
      return res.status(500).json({
        message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_MATCHES_UPCOMING_URL in .env'
      });
    }

    const headers = {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST
    };

    // Try to fetch upcoming matches from Cricbuzz API
    const response = await axios.get(RAPIDAPI_MATCHES_UPCOMING_URL, { headers, timeout: 15000 });

    let matchesList: any[] = [];
    
    // Handle different response structures from RapidAPI
    if (response.data && response.data.typeMatches) {
      // Extract matches from typeMatches structure
      for (const typeMatch of response.data.typeMatches) {
        if (typeMatch.seriesMatches) {
          for (const seriesMatch of typeMatch.seriesMatches) {
            if (seriesMatch.seriesAdWrapper && seriesMatch.seriesAdWrapper.matches) {
              matchesList = matchesList.concat(seriesMatch.seriesAdWrapper.matches);
            }
          }
        }
      }
    } else if (Array.isArray(response.data)) {
      matchesList = response.data;
    } else {
      const values = Object.values(response.data || {});
      const arr = values.find((v: any) => Array.isArray(v) && v.length && typeof v[0] === 'object') as any[];
      if (arr) matchesList = arr;
    }

    if (!matchesList || !matchesList.length) {
      return res.status(500).json({
        message: 'No matches array found in RapidAPI response. Inspect provider response.',
        providerResponseSample: response.data
      });
    }

    const upsertPromises = matchesList.map(async (m) => {
      const matchId = m.matchInfo?.matchId || m.id || m.matchId || JSON.stringify(m).slice(0, 40);

      // Parse teams data
      const teams = [];
      if (m.matchInfo?.team1) {
        teams.push({
          teamId: m.matchInfo.team1.teamId?.toString(),
          teamName: m.matchInfo.team1.teamName,
          teamShortName: m.matchInfo.team1.teamSName,
          score: {
            runs: 0,
            wickets: 0,
            overs: 0
          }
        });
      }
      
      if (m.matchInfo?.team2) {
        teams.push({
          teamId: m.matchInfo.team2.teamId?.toString(),
          teamName: m.matchInfo.team2.teamName,
          teamShortName: m.matchInfo.team2.teamSName,
          score: {
            runs: 0,
            wickets: 0,
            overs: 0
          }
        });
      }

      const doc: any = {
        matchId: matchId?.toString(),
        title: m.matchInfo?.matchDesc || m.name || m.title || 'Match',
        shortTitle: m.matchInfo?.matchDesc || m.shortName || m.title || 'Match',
        subTitle: m.matchInfo?.seriesName || m.subtitle || '',
        format: m.matchInfo?.matchFormat || 'OTHER',
        status: mapStatusToEnum(m.matchInfo?.state || m.status || 'UPCOMING'),
        venue: {
          name: m.matchInfo?.venueInfo?.ground || m.venue || 'Unknown Venue',
          city: m.matchInfo?.venueInfo?.city || m.city || '',
          country: m.matchInfo?.venueInfo?.country || m.country || ''
        },
        startDate: m.matchInfo?.startDate ? new Date(parseInt(m.matchInfo.startDate)) : new Date(),
        endDate: m.matchInfo?.endDate ? new Date(parseInt(m.matchInfo.endDate)) : undefined,
        series: {
          id: m.matchInfo?.seriesId?.toString() || '0',
          name: m.matchInfo?.seriesName || 'Unknown Series',
          seriesType: 'INTERNATIONAL'
        },
        teams: teams,
        isLive: m.matchInfo?.state === 'In Progress' || m.matchInfo?.state === 'Complete' || false,
        priority: 0,
        raw: m
      };

      Object.keys(doc).forEach((k) => doc[k] === undefined && delete doc[k]);

      return Match.findOneAndUpdate(
        { matchId: doc.matchId },
        { $set: doc },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    });

    const results = await Promise.all(upsertPromises);
    res.json({ message: `Synced ${results.length} upcoming matches.`, count: results.length });
  } catch (error) {
    console.error('syncUpcomingMatchesFromRapidAPI error:', (error as any)?.response?.data || (error as Error).message || error);
    
    // Handle rate limiting
    if ((error as any)?.response?.status === 429) {
      return res.status(429).json({ 
        message: 'API rate limit exceeded. Please try again later.', 
        error: 'Too many requests' 
      });
    }
    
    res.status(500).json({ message: 'Upcoming matches sync failed', error: (error as any)?.response?.data || (error as Error).message });
  }
};