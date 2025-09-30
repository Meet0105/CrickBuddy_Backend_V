import Series from '../../models/Series';
import { Request, Response } from 'express';
import axios from 'axios';

interface IScheduleMatch {
  matchId: string;
  matchDesc: string;
  team1: string;
  team2: string;
  startDate: Date;
  venue: string;
  status: string;
  format: string;
  rawStatus?: string;
  result?: string;
}

// Helper function to map API status to our enum values
const mapStatusToEnum = (status: string): 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'ABANDONED' | 'CANCELLED' => {
  if (!status) return 'UPCOMING';

  const lowerStatus = status.toLowerCase();

  // Map LIVE status patterns
  if (lowerStatus.includes('live') || lowerStatus.includes('in progress') ||
    lowerStatus.includes('innings break') || lowerStatus.includes('rain delay') ||
    lowerStatus.includes('tea break') || lowerStatus.includes('lunch break') ||
    lowerStatus.includes('drinks break')) {
    return 'LIVE';
  }

  // Map COMPLETED status patterns
  if (lowerStatus.includes('complete') || lowerStatus.includes('finished') ||
    lowerStatus.includes('won by') || lowerStatus.includes('match tied') ||
    lowerStatus.includes('no result') || lowerStatus.includes('result')) {
    return 'COMPLETED';
  }

  // Map ABANDONED status patterns
  if (lowerStatus.includes('abandon') || lowerStatus.includes('washed out')) {
    return 'ABANDONED';
  }

  // Map CANCELLED status patterns
  if (lowerStatus.includes('cancel') || lowerStatus.includes('postponed')) {
    return 'CANCELLED';
  }

  // Map UPCOMING status patterns
  if (lowerStatus.includes('match starts') || lowerStatus.includes('starts at') ||
    lowerStatus.includes('upcoming') || lowerStatus.includes('scheduled') ||
    lowerStatus.includes('preview')) {
    return 'UPCOMING';
  }

  // Check if it contains time information (likely upcoming)
  if (lowerStatus.match(/\d{1,2}:\d{2}/) || lowerStatus.includes('gmt') || lowerStatus.includes('ist')) {
    return 'UPCOMING';
  }

  return 'UPCOMING';
};

export const getSeriesSchedule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Always fetch fresh data to ensure match statuses are up to date
    // Check if we have cached data that's less than 1 hour old
    const seriesFromDB = await Series.findOne({ seriesId: id });
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    if (seriesFromDB && seriesFromDB.schedule && seriesFromDB.schedule.length > 0 &&
      seriesFromDB.updatedAt && seriesFromDB.updatedAt > oneHourAgo) {
      console.log('Returning recent schedule from database');
      return res.json({
        schedule: seriesFromDB.schedule,
        seriesName: seriesFromDB.name,
        totalMatches: seriesFromDB.totalMatches,
        lastUpdated: seriesFromDB.updatedAt
      });
    }

    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
    const RAPIDAPI_SERIES_MATCHES_URL = process.env.RAPIDAPI_SERIES_MATCHES_URL;

    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_SERIES_MATCHES_URL) {
      return res.status(500).json({
        message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_SERIES_MATCHES_URL in .env'
      });
    }

    const headers = {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST
    };

    // Try to fetch series matches/schedule from Cricbuzz API
    const url = RAPIDAPI_SERIES_MATCHES_URL.replace('3641', id);
    console.log('Fetching series schedule from API:', url);
    const response = await axios.get(url, { headers, timeout: 15000 });

    // Process and store schedule data
    let schedule: IScheduleMatch[] = [];

    if (response.data && response.data.matchDetails) {
      // Handle different response structures
      response.data.matchDetails.forEach((matchDetail: any) => {
        if (matchDetail.matchDetailsMap && matchDetail.matchDetailsMap.match) {
          matchDetail.matchDetailsMap.match.forEach((match: any) => {
            if (match.matchInfo) {
              const matchInfo = match.matchInfo;
              const rawStatus = matchInfo.state || matchInfo.status || 'UPCOMING';
              const mappedStatus = mapStatusToEnum(rawStatus);

              schedule.push({
                matchId: matchInfo.matchId?.toString(),
                matchDesc: matchInfo.matchDesc || matchInfo.matchFormat,
                team1: matchInfo.team1?.teamName || matchInfo.team1?.teamSName || 'Team 1',
                team2: matchInfo.team2?.teamName || matchInfo.team2?.teamSName || 'Team 2',
                startDate: matchInfo.startDate ? new Date(parseInt(matchInfo.startDate)) : new Date(),
                venue: matchInfo.venueInfo?.ground || matchInfo.venue || 'TBA',
                status: mappedStatus,
                rawStatus: rawStatus, // Keep original for debugging
                format: matchInfo.matchFormat || 'T20',
                result: matchInfo.result || null
              });
            }
          });
        }
      });
    }

    // Store schedule data in database
    if (schedule.length > 0 && seriesFromDB) {
      console.log('Storing schedule data in database');
      seriesFromDB.schedule = schedule;
      seriesFromDB.totalMatches = schedule.length;
      await seriesFromDB.save();
    }

    res.json({
      schedule,
      seriesName: seriesFromDB?.name || 'Series',
      totalMatches: schedule.length,
      lastUpdated: new Date()
    });
  } catch (error) {
    console.error('getSeriesSchedule error:', error);

    // Handle rate limiting
    if ((error as any)?.response?.status === 429) {
      return res.status(429).json({
        message: 'API rate limit exceeded. Please try again later.',
        error: 'Too many requests'
      });
    }

    res.status(500).json({ message: 'Failed to fetch series schedule', error: (error as Error).message });
  }
};