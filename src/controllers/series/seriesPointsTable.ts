import Series from '../../models/Series';
import { Request, Response } from 'express';
import axios from 'axios';

interface IPointsTableTeam {
  teamId: string;
  teamName: string;
  teamShortName: string;
  played: number;
  won: number;
  lost: number;
  tied: number;
  noResult: number;
  points: number;
  netRunRate: number;
  position: number;
  form: string[];
}

// Test function to debug API response
export const testSeriesPointsTableAPI = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
    const RAPIDAPI_SERIES_POINTS_TABLE_URL = process.env.RAPIDAPI_SERIES_POINTS_TABLE_URL;

    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_SERIES_POINTS_TABLE_URL) {
      return res.status(500).json({ message: 'API config missing' });
    }

    const headers = {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST
    };

    const url = RAPIDAPI_SERIES_POINTS_TABLE_URL.replace('3718', id);
    console.log('🧪 TESTING POINTS TABLE API CALL:', url);
    const response = await axios.get(url, { headers, timeout: 15000 });

    // Return raw API response for inspection
    res.json({
      url: url,
      status: response.status,
      headers: response.headers,
      data: response.data
    });
  } catch (error) {
    console.error('Test Points Table API error:', error);
    res.status(500).json({
      message: 'Test API failed',
      error: (error as Error).message,
      response: (error as any)?.response?.data
    });
  }
};

// Function to force refresh points table data from API
export const refreshSeriesPointsTable = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const seriesFromDB = await Series.findOne({ seriesId: id });
    if (!seriesFromDB) {
      return res.status(404).json({ message: 'Series not found' });
    }

    // Clear existing points table data first
    seriesFromDB.pointsTable = [];
    await seriesFromDB.save();
    console.log(`🗑️ Cleared existing points table data for series ${id}`);

    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
    const RAPIDAPI_SERIES_POINTS_TABLE_URL = process.env.RAPIDAPI_SERIES_POINTS_TABLE_URL;

    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_SERIES_POINTS_TABLE_URL) {
      return res.status(500).json({
        message: 'API configuration missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_SERIES_POINTS_TABLE_URL in .env'
      });
    }

    const headers = {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST
    };

    const url = RAPIDAPI_SERIES_POINTS_TABLE_URL.replace('3718', id);
    console.log('🔄 Fetching fresh points table from API:', url);
    const response = await axios.get(url, { headers, timeout: 15000 });

    // Process the API response (same logic as getSeriesPointsTable)
    let pointsTable: IPointsTableTeam[] = [];

    if (response.data && response.data.pointsTable && Array.isArray(response.data.pointsTable)) {
      const superFours = response.data.pointsTable.find((group: any) =>
        group.groupName && group.groupName.toLowerCase().includes('super')
      );

      if (superFours && superFours.pointsTableInfo) {
        console.log('🏆 Processing Super Fours points table');
        pointsTable = superFours.pointsTableInfo.map((team: any, index: number) => {
          const parseIntSafe = (value: any): number => {
            const parsed = parseInt(value);
            return isNaN(parsed) ? 0 : parsed;
          };

          const parseFloatSafe = (value: any): number => {
            if (typeof value === 'string') {
              const cleanValue = value.replace(/[+]/g, '');
              const parsed = parseFloat(cleanValue);
              return isNaN(parsed) ? 0 : parsed;
            }
            const parsed = parseFloat(value);
            return isNaN(parsed) ? 0 : parsed;
          };

          return {
            teamId: team.teamId?.toString() || `team_${index}`,
            teamName: team.teamFullName || team.teamName || 'Unknown Team',
            teamShortName: team.teamName || team.teamSName || 'UNK',
            played: parseIntSafe(team.matchesPlayed),
            won: parseIntSafe(team.matchesWon),
            lost: parseIntSafe(team.matchesLost),
            tied: parseIntSafe(team.matchesTied || 0),
            noResult: parseIntSafe(team.matchesNoRes || 0),
            points: parseIntSafe(team.points),
            netRunRate: parseFloatSafe(team.nrr),
            position: index + 1,
            form: Array.isArray(team.form) ? team.form : []
          };
        });
      }
    }

    // Store fresh data in database
    if (pointsTable.length > 0) {
      seriesFromDB.pointsTable = pointsTable;
      await seriesFromDB.save();
      console.log(`✅ Stored ${pointsTable.length} fresh teams in points table`);
    }

    res.json({
      message: 'Points table refreshed successfully',
      pointsTable,
      seriesName: seriesFromDB.name,
      lastUpdated: new Date()
    });

  } catch (error) {
    console.error('refreshSeriesPointsTable error:', error);

    if ((error as any)?.response?.status === 429) {
      return res.status(429).json({
        message: 'API rate limit exceeded. Please try again later.',
        error: 'Too many requests'
      });
    }

    res.status(500).json({ message: 'Failed to refresh points table', error: (error as Error).message });
  }
};

export const getSeriesPointsTable = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if we have cached data that's less than 2 hours old for points table
    const seriesFromDB = await Series.findOne({ seriesId: id });
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    if (seriesFromDB && seriesFromDB.pointsTable && seriesFromDB.pointsTable.length > 0 &&
      seriesFromDB.updatedAt && seriesFromDB.updatedAt > twoHoursAgo) {
      console.log('Returning recent points table from database');
      return res.json({
        pointsTable: seriesFromDB.pointsTable,
        seriesName: seriesFromDB.name,
        lastUpdated: seriesFromDB.updatedAt
      });
    }

    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
    const RAPIDAPI_SERIES_POINTS_TABLE_URL = process.env.RAPIDAPI_SERIES_POINTS_TABLE_URL;

    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_SERIES_POINTS_TABLE_URL) {
      console.log('RapidAPI config missing, returning empty points table');
      return res.json({
        pointsTable: [],
        seriesName: seriesFromDB?.name || 'Series',
        lastUpdated: seriesFromDB?.updatedAt || new Date()
      });
    }

    const headers = {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST
    };

    // Try to fetch points table from Cricbuzz API
    const url = RAPIDAPI_SERIES_POINTS_TABLE_URL.replace('3718', id);
    console.log('Fetching points table from API:', url);
    const response = await axios.get(url, { headers, timeout: 15000 });

    // Debug: Log the actual API response structure
    console.log('Points Table API Response structure:', JSON.stringify(response.data, null, 2));

    // Process and store points table data with enhanced extraction
    let pointsTable: IPointsTableTeam[] = [];

    // Handle the actual API response structure for Asia Cup 2025
    if (response.data && response.data.pointsTable && Array.isArray(response.data.pointsTable)) {
      console.log(`📊 Found ${response.data.pointsTable.length} groups in points table`);

      // Process each group (Super Fours, Group A, Group B, etc.)
      for (const group of response.data.pointsTable) {
        const groupName = group.groupName || 'Unknown Group';
        console.log(`📋 Processing group: ${groupName}`);

        if (group.pointsTableInfo && Array.isArray(group.pointsTableInfo)) {
          const groupTeams = group.pointsTableInfo.map((team: any, index: number) => {
            // Safe parsing functions
            const parseIntSafe = (value: any): number => {
              const parsed = parseInt(value);
              return isNaN(parsed) ? 0 : parsed;
            };

            const parseFloatSafe = (value: any): number => {
              if (typeof value === 'string') {
                // Handle NRR format like "+0.689" or "-0.121"
                const cleanValue = value.replace(/[+]/g, '');
                const parsed = parseFloat(cleanValue);
                return isNaN(parsed) ? 0 : parsed;
              }
              const parsed = parseFloat(value);
              return isNaN(parsed) ? 0 : parsed;
            };

            // Enhanced data extraction
            const teamInfo: IPointsTableTeam = {
              teamId: team.teamId?.toString() || `team_${index}`,
              teamName: team.teamFullName || team.teamName || 'Unknown Team',
              teamShortName: team.teamName || team.teamSName || 'UNK',
              played: parseIntSafe(team.matchesPlayed),
              won: parseIntSafe(team.matchesWon),
              lost: parseIntSafe(team.matchesLost),
              tied: parseIntSafe(team.matchesTied || 0),
              noResult: parseIntSafe(team.matchesNoRes || 0),
              points: parseIntSafe(team.points),
              netRunRate: parseFloatSafe(team.nrr),
              position: index + 1, // Position within this group
              form: Array.isArray(team.form) ? team.form : []
            };

            console.log(`  ${groupName} - ${teamInfo.teamName}: P=${teamInfo.played}, W=${teamInfo.won}, L=${teamInfo.lost}, Pts=${teamInfo.points}, NRR=${teamInfo.netRunRate}`);
            return teamInfo;
          });

          pointsTable = pointsTable.concat(groupTeams);
        }
      }

      // If we want to show only the current/main stage, we can filter
      // For now, let's show the most relevant group (Super Fours if available, otherwise Group A)
      const superFours = response.data.pointsTable.find((group: any) =>
        group.groupName && group.groupName.toLowerCase().includes('super')
      );

      if (superFours && superFours.pointsTableInfo) {
        console.log('🏆 Using Super Fours as main points table');
        pointsTable = superFours.pointsTableInfo.map((team: any, index: number) => {
          const parseIntSafe = (value: any): number => {
            const parsed = parseInt(value);
            return isNaN(parsed) ? 0 : parsed;
          };

          const parseFloatSafe = (value: any): number => {
            if (typeof value === 'string') {
              const cleanValue = value.replace(/[+]/g, '');
              const parsed = parseFloat(cleanValue);
              return isNaN(parsed) ? 0 : parsed;
            }
            const parsed = parseFloat(value);
            return isNaN(parsed) ? 0 : parsed;
          };

          return {
            teamId: team.teamId?.toString() || `team_${index}`,
            teamName: team.teamFullName || team.teamName || 'Unknown Team',
            teamShortName: team.teamName || team.teamSName || 'UNK',
            played: parseIntSafe(team.matchesPlayed),
            won: parseIntSafe(team.matchesWon),
            lost: parseIntSafe(team.matchesLost),
            tied: parseIntSafe(team.matchesTied || 0),
            noResult: parseIntSafe(team.matchesNoRes || 0),
            points: parseIntSafe(team.points),
            netRunRate: parseFloatSafe(team.nrr),
            position: index + 1,
            form: Array.isArray(team.form) ? team.form : []
          };
        });
      }
    }

    console.log(`Processed points table with ${pointsTable.length} teams`);

    // Store points table data in database
    if (pointsTable.length > 0 && seriesFromDB) {
      console.log('Storing points table data in database');
      seriesFromDB.pointsTable = pointsTable;
      await seriesFromDB.save();
    }

    res.json({
      pointsTable,
      seriesName: seriesFromDB?.name || 'Series',
      lastUpdated: new Date()
    });
  } catch (error) {
    console.error('getSeriesPointsTable error:', error);

    // Handle rate limiting
    if ((error as any)?.response?.status === 429) {
      return res.status(429).json({
        message: 'API rate limit exceeded. Please try again later.',
        error: 'Too many requests'
      });
    }

    res.status(500).json({ message: 'Failed to fetch series points table', error: (error as Error).message });
  }
};