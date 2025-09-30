import Series from '../../models/Series';
import { Request, Response } from 'express';
import axios from 'axios';

interface ISquadPlayer {
  playerId: string;
  playerName: string;
  role: string;
  battingStyle: string;
  bowlingStyle: string;
  isPlaying11: boolean;
  isCaptain: boolean;
  isWicketKeeper: boolean;
}

interface ISquad {
  teamId: string;
  teamName: string;
  players: ISquadPlayer[];
  lastUpdated: Date;
}

// Enhanced function to get series squads with database storage
// Test function to debug API response
export const testSeriesSquadsAPI = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
    const RAPIDAPI_SERIES_SQUADS_URL = process.env.RAPIDAPI_SERIES_SQUADS_URL;

    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_SERIES_SQUADS_URL) {
      return res.status(500).json({ message: 'API config missing' });
    }

    const headers = {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST
    };

    const baseUrl = RAPIDAPI_SERIES_SQUADS_URL.replace(/\/\d+\/squads$/, '');
    const url = `${baseUrl}/${id}/squads`;

    console.log('🧪 TESTING API CALL:', url);
    const response = await axios.get(url, { headers, timeout: 15000 });

    // Return raw API response for inspection
    res.json({
      url: url,
      status: response.status,
      headers: response.headers,
      data: response.data
    });
  } catch (error) {
    console.error('Test API error:', error);
    res.status(500).json({
      message: 'Test API failed',
      error: (error as Error).message,
      response: (error as any)?.response?.data
    });
  }
};

export const getSeriesSquads = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // First, try to get squads from database
    const seriesFromDB = await Series.findOne({ seriesId: id });

    if (seriesFromDB && seriesFromDB.squads && seriesFromDB.squads.length > 0) {
      console.log('Returning squads from database');
      return res.json({
        squads: seriesFromDB.squads,
        seriesName: seriesFromDB.name,
        lastUpdated: seriesFromDB.updatedAt
      });
    }

    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
    const RAPIDAPI_SERIES_SQUADS_URL = process.env.RAPIDAPI_SERIES_SQUADS_URL;

    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_SERIES_SQUADS_URL) {
      console.log('⚠️ RapidAPI config missing - cannot fetch real squad data');
      return res.status(500).json({
        message: 'API configuration missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_SERIES_SQUADS_URL in .env',
        squads: [],
        seriesName: seriesFromDB?.name || 'Series',
        lastUpdated: seriesFromDB?.updatedAt || new Date()
      });
    }

    const headers = {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST
    };

    // Replace the hardcoded series ID in the URL with the requested series ID
    const baseUrl = RAPIDAPI_SERIES_SQUADS_URL.replace(/\/\d+\/squads$/, '');
    const url = `${baseUrl}/${id}/squads`;

    console.log('🌐 API URL Construction:');
    console.log('  Original URL:', RAPIDAPI_SERIES_SQUADS_URL);
    console.log('  Base URL:', baseUrl);
    console.log('  Series ID:', id);
    console.log('  Final URL:', url);

    console.log('Fetching squads from API:', url);
    const response = await axios.get(url, { headers, timeout: 15000 });

    // Debug: Log the actual API response structure
    console.log('🔍 SQUADS API RESPONSE STRUCTURE:', JSON.stringify(response.data, null, 2));

    // Validate that we received actual data from the API
    if (!response.data || (typeof response.data === 'object' && Object.keys(response.data).length === 0)) {
      console.log('⚠️ API returned empty or invalid response');
      return res.json({
        squads: [],
        seriesName: seriesFromDB?.name || 'Series',
        lastUpdated: new Date(),
        message: 'No squad data available from API'
      });
    }

    // Process and store squads data with enhanced extraction
    let squads: ISquad[] = [];

    // Handle the actual API response structure
    let squadData = null;
    if (response.data && response.data.squads) {
      squadData = response.data.squads;
    }

    if (squadData && Array.isArray(squadData)) {
      console.log(`📋 Found ${squadData.length} squad entries`);

      // Filter out header entries and process actual squads
      const actualSquads = squadData.filter((squad: any) =>
        !squad.isHeader && squad.squadId && squad.squadType
      );

      console.log(`🏏 Processing ${actualSquads.length} actual squads`);

      // For now, create squad entries with team info (players will need separate API calls)
      squads = actualSquads.map((squad: any) => {
        const teamName = squad.squadType || 'Unknown Team';

        console.log(`📝 Creating squad entry for: ${teamName} (ID: ${squad.squadId})`);

        return {
          teamId: squad.teamId?.toString() || squad.squadId?.toString(),
          teamName: teamName.trim(),
          players: [], // Players will be fetched separately if needed
          lastUpdated: new Date()
        };
      });

      console.log(`✅ Created ${squads.length} squad entries`);
    } else {
      console.log('⚠️ No squad data found in API response');
    }

    console.log(`Processed ${squads.length} squads with player counts:`,
      squads.map(s => `${s.teamName}: ${s.players.length} players`));

    // Store squads data in database
    if (squads.length > 0 && seriesFromDB) {
      console.log('Storing squads data in database');
      seriesFromDB.squads = squads;
      await seriesFromDB.save();
    }

    res.json({
      squads,
      seriesName: seriesFromDB?.name || 'Series',
      lastUpdated: new Date()
    });
  } catch (error) {
    console.error('getSeriesSquads error:', error);

    // Handle rate limiting
    if ((error as any)?.response?.status === 429) {
      return res.status(429).json({
        message: 'API rate limit exceeded. Please try again later.',
        error: 'Too many requests'
      });
    }

    res.status(500).json({ message: 'Failed to fetch series squads', error: (error as Error).message });
  }
};

// Function to clear fake/demo squad data from database
export const clearSeriesSquads = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const seriesFromDB = await Series.findOne({ seriesId: id });

    if (!seriesFromDB) {
      return res.status(404).json({ message: 'Series not found' });
    }

    // Clear existing squad data
    seriesFromDB.squads = [];
    await seriesFromDB.save();

    console.log(`✅ Cleared squad data for series ${id}`);

    res.json({
      message: 'Squad data cleared successfully',
      seriesId: id,
      seriesName: seriesFromDB.name
    });
  } catch (error) {
    console.error('clearSeriesSquads error:', error);
    res.status(500).json({ message: 'Failed to clear series squads', error: (error as Error).message });
  }
};

// Helper function to fetch players for a specific squad
const fetchSquadPlayers = async (seriesId: string, squadId: string, headers: any): Promise<ISquadPlayer[]> => {
  try {
    const RAPIDAPI_SERIES_SQUADS_URL = process.env.RAPIDAPI_SERIES_SQUADS_URL;
    const baseUrl = RAPIDAPI_SERIES_SQUADS_URL!.replace(/\/\d+\/squads$/, '');
    const url = `${baseUrl}/${seriesId}/squads/${squadId}`;

    console.log(`  🔍 Fetching players from: ${url}`);
    const response = await axios.get(url, { headers, timeout: 15000 });

    const players: ISquadPlayer[] = [];
    const playerData = response.data?.player || [];

    if (Array.isArray(playerData)) {
      const actualPlayers = playerData.filter((player: any) => !player.isHeader && player.name && player.id);

      console.log(`    👥 Found ${actualPlayers.length} players`);

      for (const player of actualPlayers) {
        const playerName = player.name?.trim();
        if (playerName) {
          players.push({
            playerId: player.id?.toString() || `player_${players.length}`,
            playerName: playerName,
            role: player.role || 'All-rounder',
            battingStyle: player.battingStyle || '',
            bowlingStyle: player.bowlingStyle || '',
            isPlaying11: false, // This info might not be available in squad data
            isCaptain: Boolean(player.captain),
            isWicketKeeper: Boolean(player.keeper)
          });
        }
      }
    }

    return players;
  } catch (error) {
    console.error(`    ❌ Failed to fetch players for squad ${squadId}:`, (error as Error).message);
    return [];
  }
};

// Function to force refresh squad data from API (bypassing database cache)
export const refreshSeriesSquads = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const seriesFromDB = await Series.findOne({ seriesId: id });

    if (!seriesFromDB) {
      return res.status(404).json({ message: 'Series not found' });
    }

    // Clear existing squad data first
    seriesFromDB.squads = [];
    await seriesFromDB.save();
    console.log(`🗑️ Cleared existing squad data for series ${id}`);

    // Now fetch fresh data from API
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
    const RAPIDAPI_SERIES_SQUADS_URL = process.env.RAPIDAPI_SERIES_SQUADS_URL;

    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_SERIES_SQUADS_URL) {
      return res.status(500).json({
        message: 'API configuration missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_SERIES_SQUADS_URL in .env'
      });
    }

    const headers = {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST
    };

    const baseUrl = RAPIDAPI_SERIES_SQUADS_URL.replace(/\/\d+\/squads$/, '');
    const url = `${baseUrl}/${id}/squads`;

    console.log('🔄 Fetching fresh squad data from API:', url);
    const response = await axios.get(url, { headers, timeout: 15000 });

    // Process the API response (same logic as getSeriesSquads)
    let squads: ISquad[] = [];
    let squadData = null;

    if (response.data && response.data.squads) {
      squadData = response.data.squads;
    } else if (response.data && Array.isArray(response.data)) {
      squadData = response.data;
    } else if (response.data && response.data.squad) {
      squadData = response.data.squad;
    } else if (response.data) {
      const keys = Object.keys(response.data);
      for (const key of keys) {
        if (Array.isArray(response.data[key]) && response.data[key].length > 0) {
          squadData = response.data[key];
          break;
        }
      }
    }

    if (squadData && Array.isArray(squadData)) {
      console.log(`📋 Found ${squadData.length} squad entries`);

      // Filter out header entries and process actual squads
      const actualSquads = squadData.filter((squad: any) =>
        !squad.isHeader && squad.squadId && squad.squadType
      );

      console.log(`🏏 Processing ${actualSquads.length} actual squads`);

      // Fetch player data for each squad
      squads = [];
      for (const squad of actualSquads) {
        const teamName = squad.squadType || 'Unknown Team';
        const squadId = squad.squadId?.toString();

        console.log(`📝 Processing squad: ${teamName} (ID: ${squadId})`);

        // Fetch players for this squad
        const players = await fetchSquadPlayers(id, squadId, headers);

        squads.push({
          teamId: squad.teamId?.toString() || squadId,
          teamName: teamName.trim(),
          players: players,
          lastUpdated: new Date()
        });

        console.log(`  ✅ Added ${players.length} players for ${teamName}`);

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log(`✅ Created ${squads.length} squad entries with players`);
    } else {
      console.log('⚠️ No squad data found in API response');
    }

    // Store fresh data in database
    if (squads.length > 0) {
      seriesFromDB.squads = squads;
      await seriesFromDB.save();
      console.log(`✅ Stored ${squads.length} fresh squads in database`);
    }

    res.json({
      message: 'Squad data refreshed successfully',
      squads,
      seriesName: seriesFromDB.name,
      lastUpdated: new Date()
    });

  } catch (error) {
    console.error('refreshSeriesSquads error:', error);

    if ((error as any)?.response?.status === 429) {
      return res.status(429).json({
        message: 'API rate limit exceeded. Please try again later.',
        error: 'Too many requests'
      });
    }

    res.status(500).json({ message: 'Failed to refresh series squads', error: (error as Error).message });
  }
};

// Function to get series squads with full player data
export const getSeriesSquadsWithPlayers = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
    const RAPIDAPI_SERIES_SQUADS_URL = process.env.RAPIDAPI_SERIES_SQUADS_URL;

    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_SERIES_SQUADS_URL) {
      return res.status(500).json({
        message: 'API configuration missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_SERIES_SQUADS_URL in .env'
      });
    }

    const headers = {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST
    };

    const baseUrl = RAPIDAPI_SERIES_SQUADS_URL.replace(/\/\d+\/squads$/, '');
    const url = `${baseUrl}/${id}/squads`;

    console.log('🔄 Fetching squads with players from API:', url);
    const response = await axios.get(url, { headers, timeout: 15000 });

    let squads: ISquad[] = [];
    let squadData = null;

    if (response.data && response.data.squads) {
      squadData = response.data.squads;
    }

    if (squadData && Array.isArray(squadData)) {
      console.log(`📋 Found ${squadData.length} squad entries`);

      const actualSquads = squadData.filter((squad: any) =>
        !squad.isHeader && squad.squadId && squad.squadType
      );

      console.log(`🏏 Processing ${actualSquads.length} actual squads with players`);

      // Fetch player data for each squad
      for (const squad of actualSquads) {
        const teamName = squad.squadType || 'Unknown Team';
        const squadId = squad.squadId?.toString();

        console.log(`📝 Processing squad: ${teamName} (ID: ${squadId})`);

        // Fetch players for this squad
        const players = await fetchSquadPlayers(id, squadId, headers);

        squads.push({
          teamId: squad.teamId?.toString() || squadId,
          teamName: teamName.trim(),
          players: players,
          lastUpdated: new Date()
        });

        console.log(`  ✅ Added ${players.length} players for ${teamName}`);

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log(`✅ Fetched ${squads.length} squads with full player data`);
    }

    // Get series info
    const seriesFromDB = await Series.findOne({ seriesId: id });

    res.json({
      squads,
      seriesName: seriesFromDB?.name || response.data?.seriesName || 'Series',
      lastUpdated: new Date()
    });

  } catch (error) {
    console.error('getSeriesSquadsWithPlayers error:', error);

    if ((error as any)?.response?.status === 429) {
      return res.status(429).json({
        message: 'API rate limit exceeded. Please try again later.',
        error: 'Too many requests'
      });
    }

    res.status(500).json({ message: 'Failed to fetch series squads with players', error: (error as Error).message });
  }
};

// New function to get series players
export const getSeriesPlayers = async (req: Request, res: Response) => {
  try {
    const { id, squadId } = req.params;
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
    const RAPIDAPI_SERIES_SQUADS_URL = process.env.RAPIDAPI_SERIES_SQUADS_URL;

    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_SERIES_SQUADS_URL) {
      return res.status(500).json({
        message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_SERIES_SQUADS_URL in .env'
      });
    }

    const headers = {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST
    };

    // Replace the hardcoded series ID in the URL with the requested series ID
    // Example: if RAPIDAPI_SERIES_SQUADS_URL is "https://cricbuzz-cricket.p.rapidapi.com/series/v1/3718/squads"
    // and id is "1234", we want "https://cricbuzz-cricket.p.rapidapi.com/series/v1/1234/squads/{squadId}"
    const baseUrl = RAPIDAPI_SERIES_SQUADS_URL.replace(/\/\d+\/squads$/, '');
    const url = `${baseUrl}/${id}/squads/${squadId}`;

    // Try to fetch series players from Cricbuzz API
    const response = await axios.get(url, { headers, timeout: 15000 });

    res.json(response.data);
  } catch (error) {
    console.error('getSeriesPlayers error:', error);

    // Handle rate limiting
    if ((error as any)?.response?.status === 429) {
      return res.status(429).json({
        message: 'API rate limit exceeded. Please try again later.',
        error: 'Too many requests'
      });
    }

    res.status(500).json({ message: 'Failed to fetch series players', error: (error as Error).message });
  }
};
