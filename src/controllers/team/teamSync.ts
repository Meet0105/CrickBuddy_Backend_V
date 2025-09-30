import Team from '../../models/Team';
import { Request, Response } from 'express';
import axios from 'axios';

// Update the syncTeamsFromRapidAPI function to include image information
export const syncTeamsFromRapidAPI = async (req: Request, res: Response) => {
  try {
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
    const RAPIDAPI_TEAMS_URL = process.env.RAPIDAPI_TEAMS_LIST_URL;

    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_TEAMS_URL) {
      return res.status(500).json({
        message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_TEAMS_LIST_URL in .env'
      });
    }

    const headers = {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST
    };

    // Try to fetch teams from Cricbuzz API
    const response = await axios.get(RAPIDAPI_TEAMS_URL, { headers, timeout: 15000 });

    let teamsList: any[] = [];
    
    // Handle different response structures from RapidAPI
    if (Array.isArray(response.data)) {
      teamsList = response.data;
    } else if (Array.isArray(response.data.teams)) {
      teamsList = response.data.teams;
    } else {
      const values = Object.values(response.data || {});
      const arr = values.find((v: any) => Array.isArray(v) && v.length && typeof v[0] === 'object') as any[];
      if (arr) teamsList = arr;
    }

    if (!teamsList || !teamsList.length) {
      return res.status(500).json({
        message: 'No teams array found in RapidAPI response. Inspect provider response.',
        providerResponseSample: response.data
      });
    }

    const upsertPromises = teamsList.map(async (t) => {
      const teamId = t.id || t.teamId || t.tid || JSON.stringify(t).slice(0, 40);

      // Construct the flag image URL if imageId is available
      let flagImageUrl = '';
      if (t.imageId) {
        // Construct the proper image URL path
        flagImageUrl = `/api/photos/image/${t.imageId}`;
      }

      const doc: any = {
        teamId: teamId?.toString(),
        name: t.name || t.teamName || t.fullName || 'Unknown Team',
        country: t.country || t.nationality || '',
        flagImage: {
          url: flagImageUrl,
          alt: `${t.name || t.teamName || 'Team'} flag`
        },
        players: [], // We'll populate this separately
        raw: t
      };

      Object.keys(doc).forEach((k) => doc[k] === undefined && delete doc[k]);

      return Team.findOneAndUpdate(
        { teamId: doc.teamId },
        { $set: doc },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    });

    const results = await Promise.all(upsertPromises);
    res.json({ message: `Synced ${results.length} teams.`, count: results.length });
  } catch (error) {
    console.error('syncTeamsFromRapidAPI error:', (error as any)?.response?.data || (error as Error).message || error);
    
    // Handle rate limiting
    if ((error as any)?.response?.status === 429) {
      return res.status(429).json({ 
        message: 'API rate limit exceeded. Please try again later.', 
        error: 'Too many requests' 
      });
    }
    
    res.status(500).json({ message: 'Teams sync failed', error: (error as any)?.response?.data || (error as Error).message });
  }
};