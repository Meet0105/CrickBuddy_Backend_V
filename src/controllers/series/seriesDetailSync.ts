import { Request, Response } from 'express';
import axios from 'axios';
import Series from '../../models/Series';

// Function to sync comprehensive series details
export const syncSeriesDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
    const RAPIDAPI_SERIES_MATCHES_URL = process.env.RAPIDAPI_SERIES_MATCHES_URL;
    const RAPIDAPI_SERIES_SQUADS_URL = process.env.RAPIDAPI_SERIES_SQUADS_URL;
    const RAPIDAPI_SERIES_VENUES_URL = process.env.RAPIDAPI_SERIES_VENUES_URL;
    const RAPIDAPI_SERIES_POINTS_TABLE_URL = process.env.RAPIDAPI_SERIES_POINTS_TABLE_URL;
    const RAPIDAPI_SERIES_STATS_URL = process.env.RAPIDAPI_SERIES_STATS_URL;

    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST) {
      return res.status(500).json({
        message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY and RAPIDAPI_HOST in .env'
      });
    }

    const headers = {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST
    };

    console.log(`Starting comprehensive sync for series ${id}`);

    // Fetch series matches/schedule
    let schedule: any[] = [];
    let venues: any[] = [];
    let series: any = null;
    
    if (RAPIDAPI_SERIES_MATCHES_URL) {
      try {
        const matchesUrl = RAPIDAPI_SERIES_MATCHES_URL.replace('3641', id);
        console.log('Fetching series matches from:', matchesUrl);
        const matchesResponse = await axios.get(matchesUrl, { headers, timeout: 15000 });
        
        if (matchesResponse.data && matchesResponse.data.matchDetails) {
          // Extract teams and venue information
          const teamsSet = new Set<string>();
          const venuesSet = new Set<string>();
          let formatCounts: { [key: string]: number } = {};
          
          matchesResponse.data.matchDetails.forEach((matchDetail: any) => {
            if (matchDetail.matchDetailsMap && matchDetail.matchDetailsMap.match) {
              matchDetail.matchDetailsMap.match.forEach((match: any) => {
                if (match.matchInfo) {
                  const matchInfo = match.matchInfo;
                  
                  // Extract match details
                  const matchData = {
                    matchId: matchInfo.matchId?.toString(),
                    matchDesc: matchInfo.matchDesc || `Match ${schedule.length + 1}`,
                    team1: matchInfo.team1?.teamName || 'Team 1',
                    team2: matchInfo.team2?.teamName || 'Team 2',
                    startDate: matchInfo.startDate ? new Date(parseInt(matchInfo.startDate)) : new Date(),
                    venue: matchInfo.venueInfo?.ground || 'TBA',
                    status: matchInfo.state || 'UPCOMING',
                    format: matchInfo.matchFormat || 'T20'
                  };
                  
                  schedule.push(matchData);
                  
                  // Collect teams
                  if (matchInfo.team1?.teamName) {
                    teamsSet.add(JSON.stringify({
                      teamId: matchInfo.team1.teamId?.toString() || matchInfo.team1.teamName,
                      teamName: matchInfo.team1.teamName,
                      teamShortName: matchInfo.team1.teamSName || matchInfo.team1.teamName
                    }));
                  }
                  
                  if (matchInfo.team2?.teamName) {
                    teamsSet.add(JSON.stringify({
                      teamId: matchInfo.team2.teamId?.toString() || matchInfo.team2.teamName,
                      teamName: matchInfo.team2.teamName,
                      teamShortName: matchInfo.team2.teamSName || matchInfo.team2.teamName
                    }));
                  }
                  
                  // Collect venues
                  if (matchInfo.venueInfo?.ground) {
                    venuesSet.add(JSON.stringify({
                      venueId: matchInfo.venueInfo.id?.toString() || matchInfo.venueInfo.ground,
                      venueName: matchInfo.venueInfo.ground,
                      city: matchInfo.venueInfo.city || '',
                      country: matchInfo.venueInfo.country || '',
                      matches: [matchInfo.matchId?.toString()]
                    }));
                  }
                  
                  // Count formats
                  const format = matchInfo.matchFormat || 'T20';
                  formatCounts[format] = (formatCounts[format] || 0) + 1;
                }
              });
            }
          });
          
          // Convert sets back to arrays
          const teams = Array.from(teamsSet).map(teamStr => JSON.parse(teamStr as string));
          venues = Array.from(venuesSet).map(venueStr => JSON.parse(venueStr as string));
          
          // Determine primary format
          const primaryFormat = Object.keys(formatCounts).reduce((a, b) => 
            formatCounts[a] > formatCounts[b] ? a : b, 'MIXED'
          );
          
          // Find or create series in database
          series = await Series.findOne({ seriesId: id });
          
          if (!series) {
            // Create new series entry with required fields
            series = new Series({
              seriesId: id,
              name: `Series ${id}`,
              shortName: `S${id}`,
              seriesType: 'INTERNATIONAL',
              startDate: new Date(),
              endDate: new Date(),
              venue: { country: 'International', cities: [] },
              teams: [],
              format: 'MIXED',
              totalMatches: schedule.length || 0,
              status: 'ONGOING'
            });
          } else {
            // Ensure existing series has required fields
            if (!series.shortName) {
              series.shortName = series.name || `S${id}`;
            }
            if (!series.venue || !series.venue.country) {
              series.venue = { country: 'International', cities: [] };
            }
          }
          
          // Update series with extracted data
          if (series) {
            series.teams = teams;
            series.totalMatches = schedule.length;
            series.format = Object.keys(formatCounts).length > 1 ? 'MIXED' : (primaryFormat as any);
            
            // Update venue country from first venue
            if (venues.length > 0 && venues[0].country) {
              series.venue.country = venues[0].country;
              series.venue.cities = venues.map((v: any) => v.city).filter(Boolean);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch series matches:', error);
      }
    }

    // Fetch series squads
    let squads: any[] = [];
    if (RAPIDAPI_SERIES_SQUADS_URL) {
      try {
        const squadsUrl = RAPIDAPI_SERIES_SQUADS_URL.replace('3718', id);
        console.log('Fetching series squads from:', squadsUrl);
        const squadsResponse = await axios.get(squadsUrl, { headers, timeout: 15000 });
        
        if (squadsResponse.data && squadsResponse.data.squads) {
          squads = squadsResponse.data.squads.map((squad: any) => ({
            teamId: squad.teamId?.toString() || squad.teamName,
            teamName: squad.teamName || squad.teamFullName || 'Unknown Team',
            players: (squad.players || []).map((player: any) => ({
              playerId: player.playerId?.toString() || player.playerName,
              playerName: player.playerName || player.fullName || 'Unknown Player',
              role: player.role || player.battingStyle || 'All-rounder',
              battingStyle: player.battingStyle || '',
              bowlingStyle: player.bowlingStyle || '',
              isPlaying11: player.isPlaying11 || false,
              isCaptain: player.isCaptain || player.captain || false,
              isWicketKeeper: player.isWicketKeeper || player.wicketKeeper || false
            })),
            lastUpdated: new Date()
          }));
        }
      } catch (error) {
        console.error('Failed to fetch series squads:', error);
      }
    }

    // Fetch series venues
    if (RAPIDAPI_SERIES_VENUES_URL) {
      try {
        const venuesUrl = RAPIDAPI_SERIES_VENUES_URL.replace('3718', id);
        console.log('Fetching series venues from:', venuesUrl);
        const venuesResponse = await axios.get(venuesUrl, { headers, timeout: 15000 });
        
        if (venuesResponse.data && venuesResponse.data.venues) {
          venues = venuesResponse.data.venues.map((venue: any) => ({
            venueId: venue.venueId?.toString() || venue.venueName,
            venueName: venue.venueName || venue.ground || 'Unknown Venue',
            city: venue.city || '',
            country: venue.country || '',
            capacity: venue.capacity || 0,
            pitchType: venue.pitchType || '',
            matches: venue.matches || []
          }));
        }
      } catch (error) {
        console.error('Failed to fetch series venues:', error);
      }
    }

    // Fetch points table
    let pointsTable: any[] = [];
    if (RAPIDAPI_SERIES_POINTS_TABLE_URL) {
      try {
        const pointsUrl = RAPIDAPI_SERIES_POINTS_TABLE_URL.replace('3718', id);
        console.log('Fetching series points table from:', pointsUrl);
        const pointsResponse = await axios.get(pointsUrl, { headers, timeout: 15000 });
        
        if (pointsResponse.data && pointsResponse.data.pointsTable) {
          const tableData = pointsResponse.data.pointsTable[0] || pointsResponse.data.pointsTable;
          
          if (tableData && tableData.pointsTableInfo) {
            pointsTable = tableData.pointsTableInfo.map((team: any, index: number) => ({
              teamId: team.teamId?.toString() || team.teamName,
              teamName: team.teamName || team.teamFullName || 'Unknown Team',
              teamShortName: team.teamSName || team.teamName || 'UNK',
              played: team.matchesPlayed || team.played || 0,
              won: team.matchesWon || team.won || 0,
              lost: team.matchesLost || team.lost || 0,
              tied: team.matchesTied || team.tied || 0,
              noResult: team.matchesNoRes || team.noResult || 0,
              points: team.points || 0,
              netRunRate: team.nrr || team.netRunRate || 0,
              position: index + 1,
              form: team.form || []
            }));
          }
        }
      } catch (error) {
        console.error('Failed to fetch series points table:', error);
      }
    }

    // Fetch series stats
    let stats: any = null;
    if (RAPIDAPI_SERIES_STATS_URL) {
      try {
        const statsUrl = RAPIDAPI_SERIES_STATS_URL.replace('3718', id);
        console.log('Fetching series stats from:', statsUrl);
        const statsResponse = await axios.get(statsUrl, { headers, timeout: 15000 });
        
        if (statsResponse.data) {
          stats = {
            topRunScorers: statsResponse.data.topRunScorers || [],
            topWicketTakers: statsResponse.data.topWicketTakers || [],
            lastUpdated: new Date()
          };
        }
      } catch (error) {
        console.error('Failed to fetch series stats:', error);
      }
    }

    // Find or create series in database (if not already done)
    if (!series) {
      series = await Series.findOne({ seriesId: id });
      
      if (!series) {
        // Create new series entry with required fields
        series = new Series({
          seriesId: id,
          name: `Series ${id}`,
          shortName: `S${id}`,
          seriesType: 'INTERNATIONAL',
          startDate: new Date(),
          endDate: new Date(),
          venue: { country: 'International', cities: [] },
          teams: [],
          format: 'MIXED',
          totalMatches: schedule.length || 0,
          status: 'ONGOING'
        });
      } else {
        // Ensure existing series has required fields
        if (!series.shortName) {
          series.shortName = series.name || `S${id}`;
        }
        if (!series.venue || !series.venue.country) {
          series.venue = { country: 'International', cities: [] };
        }
      }
    }

    // Update series with fetched data
    if (schedule.length > 0) {
      series.schedule = schedule;
      series.totalMatches = schedule.length;
    }
    
    if (squads.length > 0) {
      series.squads = squads;
    }
    
    if (venues.length > 0) {
      series.venues = venues;
    }
    
    if (pointsTable.length > 0) {
      series.pointsTable = pointsTable;
    }
    
    if (stats) {
      series.stats = stats;
    }

    await series.save();

    console.log(`Successfully synced series ${id} with comprehensive data`);
    
    return res.json({
      message: `Successfully synced series ${id} with comprehensive data`,
      series: series,
      hasSchedule: schedule.length > 0,
      hasSquads: squads.length > 0,
      hasVenues: venues.length > 0,
      hasPointsTable: pointsTable.length > 0,
      hasStats: !!stats
    });
  } catch (error) {
    console.error('syncSeriesDetails error:', error);
    
    // Handle rate limiting
    if ((error as any)?.response?.status === 429) {
      return res.status(429).json({ 
        message: 'API rate limit exceeded. Please try again later.', 
        error: 'Too many requests' 
      });
    }
    
    res.status(500).json({ message: 'Failed to sync series details', error: (error as Error).message });
  }
};