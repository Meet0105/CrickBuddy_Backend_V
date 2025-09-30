import Match from '../../models/Match';
import { Request, Response } from 'express';
import axios from 'axios';
import { processRawMatchData } from './matchRecentHelpers';

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

export const getRecentMatches = async (req: Request, res: Response) => {
  try {
    const { limit = 10 } = req.query;
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
    const RAPIDAPI_MATCHES_RECENT_URL = process.env.RAPIDAPI_MATCHES_RECENT_URL;

    // If API key is available, try to fetch from API first
    if (RAPIDAPI_KEY && RAPIDAPI_HOST && RAPIDAPI_MATCHES_RECENT_URL) {
      try {
        console.log('Fetching recent matches from API');
        const headers = {
          'x-rapidapi-key': RAPIDAPI_KEY,
          'x-rapidapi-host': RAPIDAPI_HOST
        };

        const response = await axios.get(RAPIDAPI_MATCHES_RECENT_URL, { headers, timeout: 15000 });

        // Process API response and save to database
        if (response.data && response.data.typeMatches) {
          const recentMatchesData = response.data.typeMatches.find((type: any) => 
            type.matchType === 'Recent Matches'
          );

          if (recentMatchesData && recentMatchesData.seriesMatches) {
            const matchesList: any[] = [];
            
            // Extract matches from series
            for (const seriesMatch of recentMatchesData.seriesMatches) {
              if (seriesMatch.seriesAdWrapper && seriesMatch.seriesAdWrapper.matches) {
                matchesList.push(...seriesMatch.seriesAdWrapper.matches);
              }
            }

            // Process and save each match
            const upsertPromises = matchesList.map(async (m) => {
              const matchId = m.matchInfo?.matchId || m.id || m.matchId || JSON.stringify(m).slice(0, 40);
              
              // Extract series information
              const seriesId = m.matchInfo?.seriesId || '0';
              const seriesName = m.matchInfo?.seriesName || 'Unknown Series';
              
              // Extract team information
              const team1Info = m.matchInfo?.team1 || m.teamA || m.team1 || {};
              const team2Info = m.matchInfo?.team2 || m.teamB || m.team2 || {};
              
              const team1Name = team1Info.teamName || team1Info.teamSName || team1Info.name || 'Team 1';
              const team2Name = team2Info.teamName || team2Info.teamSName || team2Info.name || 'Team 2';
              const team1Id = team1Info.teamId || team1Info.id || '1';
              const team2Id = team2Info.teamId || team2Info.id || '2';

              // Extract format and status
              const format = m.matchInfo?.matchFormat || m.matchInfo?.matchType || m.format || m.type || m.matchType || 'Other';
              const title = m.matchInfo?.matchDesc || m.title || m.name || `${team1Name} vs ${team2Name}`;
              const rawStatus = m.matchInfo?.status || m.matchInfo?.state || m.status || m.matchStatus || 'COMPLETED';
              const mappedStatus = mapStatusToEnum(rawStatus);
              
              // Check if match should be live based on time
              const matchStartTime = m.matchInfo?.startDate ? new Date(parseInt(m.matchInfo.startDate)) : null;
              const currentTime = new Date();
              const shouldBeLive = matchStartTime &&
                matchStartTime <= currentTime &&
                (currentTime.getTime() - matchStartTime.getTime()) < (8 * 60 * 60 * 1000) && // Started within 8 hours
                mappedStatus === 'UPCOMING'; // Only override if currently upcoming

              const status = shouldBeLive ? 'LIVE' : mappedStatus;

              // Extract venue information
              const venueName = m.matchInfo?.venueInfo?.ground || m.matchInfo?.venue || m.venue?.name || m.venue || 'Venue TBD';
              const venueCity = m.matchInfo?.venueInfo?.city || m.venue?.city || '';
              const venueCountry = m.matchInfo?.venueInfo?.country || m.venue?.country || '';

              // Extract date information
              let startDate = null;
              let endDate = null;
              if (m.matchInfo?.startDate) startDate = new Date(parseInt(m.matchInfo.startDate));
              else if (m.startDate) startDate = new Date(m.startDate);
              else if (m.date) startDate = new Date(m.date);
              
              if (m.matchInfo?.endDate) endDate = new Date(parseInt(m.matchInfo.endDate));
              else if (m.endDate) endDate = new Date(m.endDate);

              // Extract result information
              const resultText = m.matchInfo?.status || m.status || '';
              const winnerTeam = m.matchInfo?.winner || m.winner || '';
              
              // Extract score information
              const innings = m.matchScore?.scoreData || m.innings || [];
              
              // Create teams array in the expected format
              const teams = [
                {
                  teamId: team1Id.toString(),
                  teamName: team1Name,
                  teamShortName: team1Info.teamSName || team1Name.substring(0, 3),
                  score: {
                    runs: innings[0]?.runs || 0,
                    wickets: innings[0]?.wickets || 0,
                    overs: innings[0]?.overs || 0,
                    balls: innings[0]?.balls || 0,
                    runRate: innings[0]?.runRate || 0
                  }
                },
                {
                  teamId: team2Id.toString(),
                  teamName: team2Name,
                  teamShortName: team2Info.teamSName || team2Name.substring(0, 3),
                  score: {
                    runs: innings[1]?.runs || 0,
                    wickets: innings[1]?.wickets || 0,
                    overs: innings[1]?.overs || 0,
                    balls: innings[1]?.balls || 0,
                    runRate: innings[1]?.runRate || 0
                  }
                }
              ];

              const doc: any = {
                matchId: matchId?.toString(),
                format: format || 'Other',
                title,
                shortTitle: m.matchInfo?.shortDesc || title,
                series: {
                  id: seriesId.toString(),
                  name: seriesName,
                  seriesType: 'INTERNATIONAL' // Default value
                },
                teams,
                status,
                venue: {
                  name: venueName,
                  city: venueCity,
                  country: venueCountry
                },
                startDate: startDate && !isNaN(startDate.getTime()) ? startDate : undefined,
                endDate: endDate && !isNaN(endDate.getTime()) ? endDate : undefined,
                result: {
                  resultText,
                  winnerTeam
                },
                isLive: status === 'LIVE',
                raw: m
              };

              Object.keys(doc).forEach((k) => doc[k] === undefined && delete doc[k]);

              return Match.findOneAndUpdate(
                { matchId: doc.matchId },
                { $set: doc },
                { upsert: true, new: true, setDefaultsOnInsert: true }
              );
            });

            await Promise.all(upsertPromises);

            // Return from database after saving
            const recentMatches = await Match.find({ 
              $and: [
                {
                  $or: [
                    { status: 'COMPLETED' },
                    { status: 'Complete' },
                    { status: { $regex: 'Complete', $options: 'i' } },
                    { status: { $regex: 'complete', $options: 'i' } },
                    { status: { $regex: 'won', $options: 'i' } },
                    { status: { $regex: 'Finished', $options: 'i' } },
                    { status: { $regex: 'finished', $options: 'i' } },
                    { 
                      endDate: { $lte: new Date() },
                      status: { $nin: ['UPCOMING', 'Upcoming', 'upcoming', 'LIVE', 'Live', 'live'] }
                    }
                  ]
                },
                {
                  status: { $nin: ['UPCOMING', 'Upcoming', 'upcoming', 'LIVE', 'Live', 'live'] }
                }
              ]
            })
            .sort({ endDate: -1 })
            .limit(Number(limit))
            .select('matchId title shortTitle teams venue series endDate result format status');
            
            return res.json(recentMatches);
          }
        }
      } catch (apiError) {
        console.error('API fetch failed for recent matches:', apiError);
        // Continue to fallback logic
      }
    }

    // Fallback to database if API config is missing or API call failed
    console.log('Falling back to database for recent matches');
    const dbMatches = await Match.find({ 
      $and: [
        {
          $or: [
            { status: 'COMPLETED' },
            { status: 'Complete' },
            { status: { $regex: 'Complete', $options: 'i' } },
            { status: { $regex: 'complete', $options: 'i' } },
            { status: { $regex: 'won', $options: 'i' } },
            { status: { $regex: 'Finished', $options: 'i' } },
            { status: { $regex: 'finished', $options: 'i' } },
            { 
              endDate: { $lte: new Date() },
              status: { $nin: ['UPCOMING', 'Upcoming', 'upcoming', 'LIVE', 'Live', 'live'] }
            }
          ]
        },
        {
          status: { $nin: ['UPCOMING', 'Upcoming', 'upcoming', 'LIVE', 'Live', 'live'] }
        }
      ]
    })
    .sort({ endDate: -1 })
    .limit(Number(limit))
    .select('matchId title shortTitle teams venue series endDate result format status raw');

    console.log(`Found ${dbMatches.length} matches in database`);

    // Process matches to extract data from raw field if needed
    const processedMatches = dbMatches.map(match => {
      console.log(`Processing match ${match.matchId}:`, {
        hasTitle: !!match.title,
        title: match.title,
        teamsLength: match.teams?.length,
        hasRaw: !!match.raw,
        teamsNeedProcessing: !match.teams || match.teams.some(team => !team.score || (team.score.runs === 0 && team.score.wickets === 0 && team.score.overs === 0))
      });
      
      // Always process if we have raw data, regardless of existing data
      // This ensures we extract scores from raw data even when teams exist but have zero scores
      if (match.raw) {
        console.log(`Processing match ${match.matchId} - has raw data, extracting`);
        return processRawMatchData(match);
      }
      return match;
    });

    console.log('Returning processed matches');
    return res.json(processedMatches);
  } catch (error) {
    console.error('getRecentMatches error:', error);
    
    // Handle rate limiting
    if ((error as any)?.response?.status === 429) {
      // Fallback to database if API rate limit exceeded
      try {
        const { limit = 10 } = req.query;
        const recentMatches = await Match.find({ 
          $and: [
            {
              $or: [
                { status: 'COMPLETED' },
                { status: 'Complete' },
                { status: { $regex: 'Complete', $options: 'i' } },
                { status: { $regex: 'complete', $options: 'i' } },
                { status: { $regex: 'won', $options: 'i' } },
                { status: { $regex: 'Finished', $options: 'i' } },
                { status: { $regex: 'finished', $options: 'i' } },
                { 
                  endDate: { $lte: new Date() },
                  status: { $nin: ['UPCOMING', 'Upcoming', 'upcoming', 'LIVE', 'Live', 'live'] }
                }
              ]
            },
            {
              status: { $nin: ['UPCOMING', 'Upcoming', 'upcoming', 'LIVE', 'Live', 'live'] }
            }
          ]
        })
        .sort({ endDate: -1 })
        .limit(Number(limit))
        .select('matchId title shortTitle teams venue series endDate result format status');
        
        return res.json(recentMatches);
      } catch (dbError) {
        return res.status(500).json({ message: 'Server error', error: (dbError as Error).message });
      }
    }
    
    // Fallback to database if API fails
    try {
      const { limit = 10 } = req.query;
      const recentMatches = await Match.find({ 
        $and: [
          {
            $or: [
              { status: 'COMPLETED' },
              { status: 'Complete' },
              { status: { $regex: 'Complete', $options: 'i' } },
              { status: { $regex: 'complete', $options: 'i' } },
              { status: { $regex: 'won', $options: 'i' } },
              { status: { $regex: 'Finished', $options: 'i' } },
              { status: { $regex: 'finished', $options: 'i' } },
              { 
                endDate: { $lte: new Date() },
                status: { $nin: ['UPCOMING', 'Upcoming', 'upcoming', 'LIVE', 'Live', 'live'] }
              }
            ]
          },
          {
            status: { $nin: ['UPCOMING', 'Upcoming', 'upcoming', 'LIVE', 'Live', 'live'] }
          }
        ]
      })
      .sort({ endDate: -1 })
      .limit(Number(limit))
      .select('matchId title shortTitle teams venue series endDate result format status');
      
      res.json(recentMatches);
    } catch (dbError) {
      res.status(500).json({ message: 'Server error', error: (dbError as Error).message });
    }
  }
};