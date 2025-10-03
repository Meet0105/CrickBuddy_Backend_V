import { Request, Response } from 'express';
import axios from 'axios';
import { IMatch } from '../../models/Match';

// New function to get series matches
export const getSeriesMatches = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
    const RAPIDAPI_SERIES_MATCHES_URL = process.env.RAPIDAPI_SERIES_MATCHES_URL;

    // If API keys are missing, serve from database
    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_SERIES_MATCHES_URL) {
      console.log('RapidAPI config missing, serving series matches from database');
      
      // Import Match model
      const Match = require('../../models/Match').default;
      
      // Find matches for this series
      const matches: IMatch[] = await Match.find({ 'series.id': id })
        .sort({ startDate: -1 })
        .limit(50);
      
      return res.json({
        matchDetails: matches.map((match: IMatch) => ({
          matchDetailsMap: {
            key: match.matchId,
            match: {
              matchInfo: {
                matchId: match.matchId,
                seriesId: match.series.id,
                seriesName: match.series.name,
                matchDesc: match.title,
                matchFormat: match.format,
                startDate: match.startDate,
                endDate: match.endDate,
                state: match.status,
                status: match.result?.resultText || match.status,
                venue: {
                  id: match.venue.name,
                  name: match.venue.name,
                  city: match.venue.city,
                  country: match.venue.country
                },
                team1: {
                  teamId: match.teams[0]?.teamId,
                  teamName: match.teams[0]?.teamName,
                  teamSName: match.teams[0]?.teamShortName
                },
                team2: {
                  teamId: match.teams[1]?.teamId,
                  teamName: match.teams[1]?.teamName,
                  teamSName: match.teams[1]?.teamShortName
                }
              }
            }
          }
        }))
      });
    }

    const headers = {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST
    };

    // Replace the hardcoded series ID in the URL with the requested series ID
    // Example: if RAPIDAPI_SERIES_MATCHES_URL is "https://cricbuzz-cricket.p.rapidapi.com/series/v1/3641"
    // and id is "1234", we want "https://cricbuzz-cricket.p.rapidapi.com/series/v1/1234"
    const baseUrl = RAPIDAPI_SERIES_MATCHES_URL.replace(/\/\d+$/, '');
    const url = `${baseUrl}/${id}`;
    
    // Try to fetch series matches from Cricbuzz API
    const response = await axios.get(url, { headers, timeout: 15000 });

    res.json(response.data);
  } catch (error) {
    console.error('getSeriesMatches error:', error);
    
    // Handle rate limiting
    if ((error as any)?.response?.status === 429) {
      return res.status(429).json({ 
        message: 'API rate limit exceeded. Please try again later.', 
        error: 'Too many requests' 
      });
    }
    
    res.status(500).json({ message: 'Failed to fetch series matches', error: (error as Error).message });
  }
};

// New function to get series news
export const getSeriesNews = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
    const RAPIDAPI_SERIES_NEWS_URL = process.env.RAPIDAPI_SERIES_NEWS_URL;

    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_SERIES_NEWS_URL) {
      return res.status(500).json({
        message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_SERIES_NEWS_URL in .env'
      });
    }

    const headers = {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST
    };

    // Replace the hardcoded series ID in the URL with the requested series ID
    // Example: if RAPIDAPI_SERIES_NEWS_URL is "https://cricbuzz-cricket.p.rapidapi.com/news/v1/series/3636"
    // and id is "1234", we want "https://cricbuzz-cricket.p.rapidapi.com/news/v1/series/1234"
    const baseUrl = RAPIDAPI_SERIES_NEWS_URL.replace(/\/\d+$/, '');
    const url = `${baseUrl}/${id}`;
    
    // Try to fetch series news from Cricbuzz API
    const response = await axios.get(url, { headers, timeout: 15000 });

    res.json(response.data);
  } catch (error) {
    console.error('getSeriesNews error:', error);
    
    // Handle rate limiting
    if ((error as any)?.response?.status === 429) {
      return res.status(429).json({ 
        message: 'API rate limit exceeded. Please try again later.', 
        error: 'Too many requests' 
      });
    }
    
    res.status(500).json({ message: 'Failed to fetch series news', error: (error as Error).message });
  }
};