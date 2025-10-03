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

export const getMatchInfo = async (req: Request, res: Response) => {
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

    // Try to fetch match info from Cricbuzz API
    const url = `${RAPIDAPI_MATCHES_INFO_URL}/${id}`;
    const response = await axios.get(url, { headers, timeout: 15000 });

    // Save to database
    const m = response.data;
    const matchId = m.matchInfo?.matchId || m.matchId || m.id || m.match_id || id;

    const format = m.matchInfo?.matchFormat || m.matchInfo?.matchType || m.format || m.type || m.matchType || 'Other';
    const team1 = m.matchInfo?.team1?.teamName || m.matchInfo?.team1?.teamSName || m.teamA || m.team1 || '';
    const team2 = m.matchInfo?.team2?.teamName || m.matchInfo?.team2?.teamSName || m.teamB || m.team2 || '';
    const status = mapStatusToEnum(m.matchInfo?.status || m.matchInfo?.state || m.status || m.matchStatus || 'UPCOMING');
    const series = m.matchInfo?.seriesName || m.series?.name || m.tournament || '';
    const venue = m.matchInfo?.venueInfo?.ground || m.matchInfo?.venue || m.venue || '';
    const result = m.matchInfo?.status || m.status || '';
    const title = m.matchInfo?.matchDesc || `${team1} vs ${team2}` || '';

    let startDate = null;
    let endDate = null;
    if (m.matchInfo?.startDate) startDate = new Date(parseInt(m.matchInfo.startDate));
    else if (m.startDate) startDate = new Date(m.startDate);
    else if (m.date) startDate = new Date(m.date);
    
    if (m.matchInfo?.endDate) endDate = new Date(parseInt(m.matchInfo.endDate));
    else if (m.endDate) endDate = new Date(m.endDate);

    const innings = m.matchScore?.scoreData || m.innings || [];

    const doc: any = {
      matchId: matchId?.toString(),
      format: format || 'Other',
      title,
      series,
      team1: typeof team1 === 'object' ? team1.name || team1.teamName || '' : team1,
      team2: typeof team2 === 'object' ? team2.name || team2.teamName || '' : team2,
      status,
      venue,
      innings,
      startDate: startDate && !isNaN(startDate.getTime()) ? startDate : undefined,
      endDate: endDate && !isNaN(endDate.getTime()) ? endDate : undefined,
      result,
      isLive: status === 'LIVE',
      raw: m
    };

    Object.keys(doc).forEach((k) => doc[k] === undefined && delete doc[k]);

    const updatedMatch = await Match.findOneAndUpdate(
      { matchId: doc.matchId },
      { $set: doc },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json(updatedMatch);
  } catch (error) {
    console.error('getMatchInfo error:', error);
    
    // Handle rate limiting
    if ((error as any)?.response?.status === 429) {
      return res.status(429).json({ 
        message: 'API rate limit exceeded. Please try again later.', 
        error: 'Too many requests' 
      });
    }
    
    res.status(500).json({ message: 'Failed to fetch match info', error: (error as Error).message });
  }
};

export const getMatchTeamInfo = async (req: Request, res: Response) => {
  try {
    const { id, teamId } = req.params;
    
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

    // Try to fetch match team info from Cricbuzz API
    const url = `${RAPIDAPI_MATCHES_INFO_URL}/${id}/team/${teamId}`;
    const response = await axios.get(url, { headers, timeout: 15000 });

    res.json(response.data);
  } catch (error) {
    console.error('getMatchTeamInfo error:', error);
    
    // Handle rate limiting
    if ((error as any)?.response?.status === 429) {
      return res.status(429).json({ 
        message: 'API rate limit exceeded. Please try again later.', 
        error: 'Too many requests' 
      });
    }
    
    res.status(500).json({ message: 'Failed to fetch match team info', error: (error as Error).message });
  }
};