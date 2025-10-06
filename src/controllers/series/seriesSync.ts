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
  status: 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'ABANDONED' | 'CANCELLED';
  format: string;
  rawStatus?: string;
  result?: string | null;
}

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

// Function to update a specific series with fresh data
export const updateSeriesData = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
    const RAPIDAPI_SERIES_MATCHES_URL = process.env.RAPIDAPI_SERIES_MATCHES_URL;
    const RAPIDAPI_SERIES_POINTS_TABLE_URL = process.env.RAPIDAPI_SERIES_POINTS_TABLE_URL;
    const RAPIDAPI_SERIES_SQUADS_URL = process.env.RAPIDAPI_SERIES_SQUADS_URL;

    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST) {
      return res.status(500).json({
        message: 'RapidAPI config is missing'
      });
    }

    const headers = {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST
    };

    const seriesFromDB = await Series.findOne({ seriesId: id });
    if (!seriesFromDB) {
      return res.status(404).json({ message: 'Series not found' });
    }

    let updatedData: any = {};

    // Update schedule/matches
    if (RAPIDAPI_SERIES_MATCHES_URL) {
      try {
        const matchesUrl = RAPIDAPI_SERIES_MATCHES_URL.replace('3641', id);
        console.log('Updating series schedule from:', matchesUrl);
        const matchesResponse = await axios.get(matchesUrl, { headers, timeout: 15000 });

        let schedule: IScheduleMatch[] = [];
        if (matchesResponse.data && matchesResponse.data.matchDetails) {
          matchesResponse.data.matchDetails.forEach((matchDetail: any) => {
            if (matchDetail.matchDetailsMap && matchDetail.matchDetailsMap.match) {
              matchDetail.matchDetailsMap.match.forEach((match: any) => {
                if (match.matchInfo) {
                  const matchInfo = match.matchInfo;
                  const rawStatus = matchInfo.state || matchInfo.status || 'UPCOMING';

                  const matchId = matchInfo.matchId?.toString();
                  if (matchId) {
                    schedule.push({
                      matchId,
                      matchDesc: matchInfo.matchDesc || matchInfo.matchFormat || 'Match',
                      team1: matchInfo.team1?.teamName || matchInfo.team1?.teamSName || 'Team 1',
                      team2: matchInfo.team2?.teamName || matchInfo.team2?.teamSName || 'Team 2',
                      startDate: matchInfo.startDate ? new Date(parseInt(matchInfo.startDate)) : new Date(),
                      venue: matchInfo.venueInfo?.ground || matchInfo.venue || 'TBA',
                      status: mapStatusToEnum(rawStatus),
                      rawStatus: rawStatus,
                      format: matchInfo.matchFormat || 'T20',
                      result: matchInfo.result || null
                    });
                  }
                }
              });
            }
          });
        }

        if (schedule.length > 0) {
          updatedData.schedule = schedule;
          updatedData.totalMatches = schedule.length;
          updatedData.completedMatches = schedule.filter(m => m.status === 'COMPLETED').length;
        }
      } catch (error) {
        console.error('Error updating schedule:', error);
      }
    }

    // Update points table
    if (RAPIDAPI_SERIES_POINTS_TABLE_URL) {
      try {
        const pointsUrl = RAPIDAPI_SERIES_POINTS_TABLE_URL.replace('3718', id);
        console.log('Updating points table from:', pointsUrl);
        const pointsResponse = await axios.get(pointsUrl, { headers, timeout: 15000 });

        let pointsTable: IPointsTableTeam[] = [];
        if (pointsResponse.data) {
          // Try multiple possible response structures
          let tableData = null;

          if (pointsResponse.data.pointsTable) {
            if (Array.isArray(pointsResponse.data.pointsTable)) {
              tableData = pointsResponse.data.pointsTable[0];
            } else {
              tableData = pointsResponse.data.pointsTable;
            }
          } else if (pointsResponse.data.table) {
            tableData = pointsResponse.data.table;
          } else if (pointsResponse.data.standings) {
            tableData = pointsResponse.data.standings;
          }

          if (tableData) {
            let teamData = tableData.pointsTableInfo || tableData.teams || tableData;

            if (Array.isArray(teamData)) {
              pointsTable = teamData.map((team: any, index: number) => {
                // Safe parsing with fallbacks
                const parseIntSafe = (value: any): number => {
                  const parsed = parseInt(value);
                  return isNaN(parsed) ? 0 : parsed;
                };

                const parseFloatSafe = (value: any): number => {
                  const parsed = parseFloat(value);
                  return isNaN(parsed) ? 0 : parsed;
                };

                const teamInfo: IPointsTableTeam = {
                  teamId: team.teamId?.toString() || team.id?.toString() || team.teamName || `team_${index}`,
                  teamName: team.teamName || team.teamFullName || team.name || 'Unknown Team',
                  teamShortName: team.teamSName || team.shortName || (team.teamName ? team.teamName.substring(0, 3) : 'UNK'),
                  played: parseIntSafe(team.matchesPlayed || team.played || team.matches),
                  won: parseIntSafe(team.matchesWon || team.won || team.wins),
                  lost: parseIntSafe(team.matchesLost || team.lost || team.losses),
                  tied: parseIntSafe(team.matchesTied || team.tied || team.ties),
                  noResult: parseIntSafe(team.matchesNoRes || team.noResult || team.nr),
                  points: parseIntSafe(team.points || team.pts || team.totalPoints),
                  netRunRate: parseFloatSafe(team.nrr || team.netRunRate || team.runRate),
                  position: team.position || (index + 1),
                  form: Array.isArray(team.form) ? team.form : (Array.isArray(team.recentForm) ? team.recentForm : [])
                };

                return teamInfo;
              });
            }
          }
        }

        if (pointsTable.length > 0) {
          updatedData.pointsTable = pointsTable;
        }
      } catch (error) {
        console.error('Error updating points table:', error);
      }
    }

    // Update squads
    if (RAPIDAPI_SERIES_SQUADS_URL) {
      try {
        const baseUrl = RAPIDAPI_SERIES_SQUADS_URL.replace(/\/\d+\/squads$/, '');
        const squadsUrl = `${baseUrl}/${id}/squads`;
        console.log('Updating squads from:', squadsUrl);
        const squadsResponse = await axios.get(squadsUrl, { headers, timeout: 15000 });

        // Debug: Log the actual API response to see the real structure
        console.log('🔍 SQUADS API RESPONSE:', JSON.stringify(squadsResponse.data, null, 2));

        let squads: ISquad[] = [];

        // Try multiple possible response structures
        let squadData = null;
        if (squadsResponse.data && squadsResponse.data.squads) {
          console.log('✅ Found squads in response.data.squads');
          squadData = squadsResponse.data.squads;
        } else if (squadsResponse.data && Array.isArray(squadsResponse.data)) {
          console.log('✅ Found squads as direct array');
          squadData = squadsResponse.data;
        } else if (squadsResponse.data && squadsResponse.data.squad) {
          console.log('✅ Found squads in response.data.squad');
          squadData = squadsResponse.data.squad;
        } else {
          console.log('❌ No recognizable squad data structure found');
          console.log('Available keys:', Object.keys(squadsResponse.data || {}));
        }

        if (squadData && Array.isArray(squadData)) {
          console.log(`📋 Processing ${squadData.length} squads`);
          
          squads = squadData.map((squad: any, squadIndex: number) => {
            console.log(`\n🏏 Processing Squad ${squadIndex + 1}:`, JSON.stringify(squad, null, 2));
            
            // Enhanced team name extraction
            const teamName = squad.teamName ||
              squad.teamFullName ||
              squad.name ||
              squad.team?.teamName ||
              'Unknown Team';
            
            console.log(`👥 Team Name: ${teamName}`);

            // Enhanced player extraction
            let players: ISquadPlayer[] = [];
            const playerData = squad.players || squad.player || squad.squadPlayers || [];
            
            console.log(`🔍 Player data structure:`, {
              hasPlayers: !!squad.players,
              hasPlayer: !!squad.player,
              hasSquadPlayers: !!squad.squadPlayers,
              playerDataLength: Array.isArray(playerData) ? playerData.length : 'Not array',
              firstPlayerSample: Array.isArray(playerData) && playerData[0] ? playerData[0] : 'No players'
            });

            if (Array.isArray(playerData)) {
              console.log(`👨‍💼 Processing ${playerData.length} players for ${teamName}`);
              
              players = playerData.map((player: any, playerIndex: number): ISquadPlayer => {
                // Try multiple fields for player name with detailed logging
                const playerName = player.playerName || 
                                  player.fullName || 
                                  player.name ||
                                  player.player?.playerName ||
                                  player.player?.fullName ||
                                  player.player?.name ||
                                  `Player ${playerIndex + 1}`;
                
                console.log(`  Player ${playerIndex + 1}: "${playerName}" (from: ${JSON.stringify({
                  playerName: player.playerName,
                  fullName: player.fullName,
                  name: player.name,
                  nestedPlayerName: player.player?.playerName
                })})`);
                
                return {
                  playerId: player.playerId?.toString() ||
                    player.id?.toString() ||
                    player.playerName ||
                    `player_${playerIndex}`,
                  playerName: playerName,
                  role: player.role ||
                    player.playingRole ||
                    player.battingStyle ||
                    'All-rounder',
                  battingStyle: player.battingStyle || '',
                  bowlingStyle: player.bowlingStyle || '',
                  isPlaying11: player.isPlaying11 || false,
                  isCaptain: player.isCaptain || player.captain || false,
                  isWicketKeeper: player.isWicketKeeper || player.wicketKeeper || false
                };
              });
            } else {
              console.log(`❌ No valid player data found for ${teamName}`);
            }

            const squadInfo: ISquad = {
              teamId: squad.teamId?.toString() || squad.id?.toString() || teamName,
              teamName: teamName,
              players: players,
              lastUpdated: new Date()
            };
            
            console.log(`✅ Final squad for ${teamName}: ${players.length} players`);
            return squadInfo;
          });
        } else {
          console.log('❌ Squad data is not an array or is null');
        }

        if (squads.length > 0) {
          updatedData.squads = squads;
        }
      } catch (error) {
        console.error('Error updating squads:', error);
      }
    }

    // Update the series in database
    if (Object.keys(updatedData).length > 0) {
      await Series.findOneAndUpdate(
        { seriesId: id },
        { $set: updatedData },
        { new: true }
      );

      console.log(`Updated series ${id} with:`, Object.keys(updatedData));
    }

    res.json({
      message: 'Series data updated successfully',
      updated: Object.keys(updatedData),
      seriesId: id
    });
  } catch (error) {
    console.error('updateSeriesData error:', error);
    res.status(500).json({ message: 'Failed to update series data', error: (error as Error).message });
  }
};

// Helper function to map API status to our enum values
const mapStatusToEnum = (status: string): 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'ABANDONED' | 'CANCELLED' => {
  if (!status) return 'UPCOMING';

  const lowerStatus = status.toLowerCase();

  if (lowerStatus.includes('live') || lowerStatus.includes('in progress') ||
    lowerStatus.includes('innings break') || lowerStatus.includes('rain delay') ||
    lowerStatus.includes('tea break') || lowerStatus.includes('lunch break') ||
    lowerStatus.includes('drinks break')) {
    return 'LIVE';
  }

  if (lowerStatus.includes('complete') || lowerStatus.includes('finished') ||
    lowerStatus.includes('won by') || lowerStatus.includes('match tied') ||
    lowerStatus.includes('no result') || lowerStatus.includes('result')) {
    return 'COMPLETED';
  }

  if (lowerStatus.includes('abandon') || lowerStatus.includes('washed out')) {
    return 'ABANDONED';
  }

  if (lowerStatus.includes('cancel') || lowerStatus.includes('postponed')) {
    return 'CANCELLED';
  }

  if (lowerStatus.includes('match starts') || lowerStatus.includes('starts at') ||
    lowerStatus.includes('upcoming') || lowerStatus.includes('scheduled') ||
    lowerStatus.includes('preview')) {
    return 'UPCOMING';
  }

  if (lowerStatus.match(/\d{1,2}:\d{2}/) || lowerStatus.includes('gmt') || lowerStatus.includes('ist')) {
    return 'UPCOMING';
  }

  return 'UPCOMING';
};

// Function to sync series from RapidAPI
export const syncSeriesFromRapidAPI = async (req: Request, res: Response) => {
  try {
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
    const RAPIDAPI_SERIES_LIST_URL = process.env.RAPIDAPI_SERIES_LIST_URL;

    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_SERIES_LIST_URL) {
      return res.status(500).json({
        message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_SERIES_LIST_URL in .env'
      });
    }

    const headers = {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST
    };

    // Try to fetch series from Cricbuzz API
    const response = await axios.get(RAPIDAPI_SERIES_LIST_URL, { headers, timeout: 15000 });

    let seriesList: any[] = [];

    // Handle different response structures from RapidAPI
    if (response.data && response.data.seriesMapProto) {
      // Extract series from seriesMapProto structure
      for (const seriesProto of response.data.seriesMapProto) {
        if (seriesProto.series && Array.isArray(seriesProto.series)) {
          seriesList.push(...seriesProto.series);
        }
      }
    } else if (Array.isArray(response.data)) {
      seriesList = response.data;
    } else if (response.data.series) {
      seriesList = response.data.series;
    } else {
      const values = Object.values(response.data || {});
      const arr = values.find((v: any) => Array.isArray(v) && v.length && typeof v[0] === 'object') as any[];
      if (arr) seriesList = arr;
    }

    if (!seriesList || !seriesList.length) {
      return res.status(500).json({
        message: 'No series array found in RapidAPI response. Inspect provider response.',
        providerResponseSample: response.data
      });
    }

    const upsertPromises = seriesList.map(async (s) => {
      // Extract proper series ID
      const seriesId = s.id?.toString();

      if (!seriesId) {
        console.log('Skipping series without ID:', s);
        return null;
      }

      // Parse dates properly (they come as timestamps)
      let startDate = new Date();
      let endDate = new Date();

      if (s.startDt) {
        startDate = new Date(parseInt(s.startDt));
      }

      if (s.endDt) {
        endDate = new Date(parseInt(s.endDt));
      }

      // Determine series status based on dates
      const now = new Date();
      let status = 'UPCOMING';

      if (now >= startDate && now <= endDate) {
        status = 'ONGOING';
      } else if (now > endDate) {
        status = 'COMPLETED';
      }

      // Generate short name from full name
      const shortName = s.name ?
        s.name.split(' ').map((word: string) => word.charAt(0)).join('').substring(0, 10) :
        `S${seriesId}`;

      const doc: any = {
        seriesId: seriesId,
        name: s.name || 'Unknown Series',
        shortName: shortName,
        description: s.description || s.about || '',
        seriesType: 'INTERNATIONAL', // All from this endpoint are international
        startDate: startDate,
        endDate: endDate,
        venue: {
          country: 'International', // Will be updated when we get match details
          cities: []
        },
        teams: [], // Will be populated when we sync matches
        matches: [],
        status: status,
        format: 'MIXED', // Will be determined from matches
        totalMatches: 0, // Will be updated when we sync matches
        completedMatches: 0,
        isActive: status !== 'COMPLETED',
        priority: status === 'ONGOING' ? 10 : status === 'UPCOMING' ? 5 : 1,
        raw: s
      };

      Object.keys(doc).forEach((k) => doc[k] === undefined && delete doc[k]);

      console.log('Attempting to save series:', doc.name, doc.seriesId);

      try {
        const result = await Series.findOneAndUpdate(
          { seriesId: doc.seriesId },
          { $set: doc },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        console.log('Successfully saved series:', result.name);
        return result;
      } catch (saveError) {
        console.error('Error saving series:', doc.name, (saveError as Error).message);
        return null;
      }
    });

    const results = await Promise.all(upsertPromises.filter(p => p !== null));
    console.log('Sync results:', results.length);
    console.log('Sample synced series:', results[0] ? {
      name: results[0].name,
      seriesId: results[0].seriesId,
      status: results[0].status,
      startDate: results[0].startDate,
      endDate: results[0].endDate
    } : 'No results');

    res.json({ message: `Synced ${results.length} series.`, count: results.length });
  } catch (error) {
    console.error('syncSeriesFromRapidAPI error:', (error as any)?.response?.data || (error as Error).message || error);

    // Handle rate limiting
    if ((error as any)?.response?.status === 429) {
      return res.status(429).json({
        message: 'API rate limit exceeded. Please try again later.',
        error: 'Too many requests'
      });
    }

    res.status(500).json({ message: 'Series sync failed', error: (error as any)?.response?.data || (error as Error).message });
  }
};