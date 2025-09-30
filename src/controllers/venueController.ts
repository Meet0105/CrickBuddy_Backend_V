import Venue from '../models/Venue';
import { Request, Response } from 'express';
import axios from 'axios';

export const getAllVenues = async (req: Request, res: Response) => {
  try {
    const venues = await Venue.find().lean();
    res.json(venues);
  } catch (error) {
    console.error('getAllVenues error:', error);
    res.status(500).json({ message: (error as Error).message });
  }
};

export const getVenueById = async (req: Request, res: Response) => {
  try {
    const venue = await Venue.findOne({ venueId: req.params.id });
    if (!venue) return res.status(404).json({ message: 'Venue not found' });
    res.json(venue);
  } catch (error) {
    console.error('getVenueById error:', error);
    res.status(500).json({ message: (error as Error).message });
  }
};

// Function to get venue info
export const getVenueInfo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
    const RAPIDAPI_VENUES_INFO_URL = process.env.RAPIDAPI_VENUES_INFO_URL;

    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_VENUES_INFO_URL) {
      return res.status(500).json({
        message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_VENUES_INFO_URL in .env'
      });
    }

    const headers = {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST
    };

    // Try to fetch venue info from Cricbuzz API
    const url = `${RAPIDAPI_VENUES_INFO_URL}/${id}`;
    const response = await axios.get(url, { headers, timeout: 15000 });

    res.json(response.data);
  } catch (error) {
    console.error('getVenueInfo error:', (error as any)?.response?.data || (error as Error).message || error);
    
    // Handle rate limiting
    if ((error as any)?.response?.status === 429) {
      return res.status(429).json({ 
        message: 'API rate limit exceeded. Please try again later.', 
        error: 'Too many requests' 
      });
    }
    
    res.status(500).json({ message: 'Failed to fetch venue info', error: (error as any)?.response?.data || (error as Error).message });
  }
};

// Function to get venue stats
export const getVenueStats = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
    const RAPIDAPI_VENUES_STATS_URL = process.env.RAPIDAPI_VENUES_STATS_URL;

    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_VENUES_STATS_URL) {
      return res.status(500).json({
        message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_VENUES_STATS_URL in .env'
      });
    }

    const headers = {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST
    };

    // Try to fetch venue stats from Cricbuzz API
    const url = `${RAPIDAPI_VENUES_STATS_URL}/${id}`;
    const response = await axios.get(url, { headers, timeout: 15000 });

    res.json(response.data);
  } catch (error) {
    console.error('getVenueStats error:', (error as any)?.response?.data || (error as Error).message || error);
    
    // Handle rate limiting
    if ((error as any)?.response?.status === 429) {
      return res.status(429).json({ 
        message: 'API rate limit exceeded. Please try again later.', 
        error: 'Too many requests' 
      });
    }
    
    res.status(500).json({ message: 'Failed to fetch venue stats', error: (error as any)?.response?.data || (error as Error).message });
  }
};

// Function to get venue matches
export const getVenueMatches = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
    const RAPIDAPI_VENUES_MATCHES_URL = process.env.RAPIDAPI_VENUES_MATCHES_URL;

    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_VENUES_MATCHES_URL) {
      return res.status(500).json({
        message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_VENUES_MATCHES_URL in .env'
      });
    }

    const headers = {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST
    };

    // Try to fetch venue matches from Cricbuzz API
    const url = `${RAPIDAPI_VENUES_MATCHES_URL}/${id}/matches`;
    const response = await axios.get(url, { headers, timeout: 15000 });

    res.json(response.data);
  } catch (error) {
    console.error('getVenueMatches error:', (error as any)?.response?.data || (error as Error).message || error);
    
    // Handle rate limiting
    if ((error as any)?.response?.status === 429) {
      return res.status(429).json({ 
        message: 'API rate limit exceeded. Please try again later.', 
        error: 'Too many requests' 
      });
    }
    
    res.status(500).json({ message: 'Failed to fetch venue matches', error: (error as any)?.response?.data || (error as Error).message });
  }
};

// New function to sync venues from RapidAPI
export const syncVenuesFromRapidAPI = async (req: Request, res: Response) => {
  try {
    // For venues, we don't have a direct list endpoint, so we'll create a placeholder
    // In a real implementation, you would either have a list of venue IDs or fetch them from another endpoint
    res.json({ message: 'Venue sync endpoint ready. Add venue IDs manually or implement list endpoint.' });
  } catch (error) {
    console.error('syncVenuesFromRapidAPI error:', (error as any)?.response?.data || (error as Error).message || error);
    
    // Handle rate limiting
    if ((error as any)?.response?.status === 429) {
      return res.status(429).json({ 
        message: 'API rate limit exceeded. Please try again later.', 
        error: 'Too many requests' 
      });
    }
    
    res.status(500).json({ message: 'Venues sync failed', error: (error as any)?.response?.data || (error as Error).message });
  }
};