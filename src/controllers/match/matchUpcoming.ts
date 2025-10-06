import Match from '../../models/Match';
import { Request, Response } from 'express';
import axios from 'axios';
import { processRawMatchData } from './matchUpcomingHelpers';

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

export const getUpcomingMatches = async (req: Request, res: Response) => {
  try {
    const { limit = 10 } = req.query;
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
    const RAPIDAPI_MATCHES_UPCOMING_URL = process.env.RAPIDAPI_MATCHES_UPCOMING_URL;

    // Clean up stale upcoming matches from database (older than 6 hours)
    try {
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
      const deleteResult = await Match.deleteMany({
        status: 'UPCOMING',
        updatedAt: { $lt: sixHoursAgo }
      });
      if (deleteResult.deletedCount > 0) {
        console.log(`Deleted ${deleteResult.deletedCount} stale upcoming matches from database`);
      }
    } catch (cleanupError) {
      console.error('Error cleaning up stale upcoming matches:', cleanupError);
    }

    // If API key is available, try to fetch from API first
    if (RAPIDAPI_KEY && RAPIDAPI_HOST && RAPIDAPI_MATCHES_UPCOMING_URL) {
      try {
        console.log('=== FETCHING UPCOMING MATCHES FROM API ===');
        console.log('API URL:', RAPIDAPI_MATCHES_UPCOMING_URL);
        console.log('API Host:', RAPIDAPI_HOST);
        console.log('API Key present:', !!RAPIDAPI_KEY);
        
        const headers = {
          'x-rapidapi-key': RAPIDAPI_KEY,
          'x-rapidapi-host': RAPIDAPI_HOST
        };

        const response = await axios.get(RAPIDAPI_MATCHES_UPCOMING_URL, { headers, timeout: 15000 });
        console.log('API Response Status:', response.status);
        console.log('API Response has data:', !!response.data);
        console.log('API Response has typeMatches:', !!response.data?.typeMatches);

        // Process API response and save to database
        if (response.data && response.data.typeMatches) {
          console.log('Available match types:', response.data.typeMatches.map((t: any) => t.matchType));
          
          const upcomingMatchesData = response.data.typeMatches.find((type: any) => 
            type.matchType === 'Upcoming Matches'
          );
          
          console.log('Found Upcoming Matches section:', !!upcomingMatchesData);

          if (upcomingMatchesData && upcomingMatchesData.seriesMatches) {
            console.log('Number of series with matches:', upcomingMatchesData.seriesMatches.length);
            
            const matchesList: any[] = [];
            
            // Extract matches from series
            for (const seriesMatch of upcomingMatchesData.seriesMatches) {
              if (seriesMatch.seriesAdWrapper && seriesMatch.seriesAdWrapper.matches) {
                console.log(`Found ${seriesMatch.seriesAdWrapper.matches.length} matches in series`);
                matchesList.push(...seriesMatch.seriesAdWrapper.matches);
              }
            }
            
            console.log(`Total matches extracted from API: ${matchesList.length}`);

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
              const rawStatus = m.matchInfo?.status || m.matchInfo?.state || m.status || m.matchStatus || 'UPCOMING';
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
              if (m.matchInfo?.startDate) startDate = new Date(parseInt(m.matchInfo.startDate));
              else if (m.startDate) startDate = new Date(m.startDate);
              else if (m.date) startDate = new Date(m.date);

              // Create teams array in the expected format
              const teams = [
                {
                  teamId: team1Id.toString(),
                  teamName: team1Name,
                  teamShortName: team1Info.teamSName || team1Name.substring(0, 3),
                  score: {
                    runs: 0,
                    wickets: 0,
                    overs: 0
                  }
                },
                {
                  teamId: team2Id.toString(),
                  teamName: team2Name,
                  teamShortName: team2Info.teamSName || team2Name.substring(0, 3),
                  score: {
                    runs: 0,
                    wickets: 0,
                    overs: 0
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

            // Return from database after saving - only UPCOMING matches
            const upcomingMatches = await Match.find({ 
              status: 'UPCOMING',
              startDate: { $gte: new Date() } // Only future matches
            })
            .sort({ startDate: 1 })
            .limit(Number(limit) * 2) // Get more to filter
            .select('matchId title shortTitle teams venue series startDate format status raw');
            
            // Filter out any matches that aren't actually upcoming
            const validUpcomingMatches = upcomingMatches.filter(match => {
              // Double-check the status
              if (match.status !== 'UPCOMING') return false;
              
              // Check raw data if available
              if (match.raw) {
                const rawState = (match.raw.state || '').toLowerCase();
                const rawStatus = (match.raw.status || '').toLowerCase();
                
                // Skip if raw data indicates it's completed or live
                if (rawState.includes('complete') || rawState.includes('live') || 
                    rawStatus.includes('complete') || rawStatus.includes('live') ||
                    rawState.includes('finished') || rawStatus.includes('won')) {
                  return false;
                }
              }
              
              return true;
            }).slice(0, Number(limit)); // Limit after filtering
            
            return res.json(validUpcomingMatches);
          }
        }
      } catch (apiError: any) {
        console.error('=== API FETCH FAILED FOR UPCOMING MATCHES ===');
        console.error('Error message:', apiError.message);
        console.error('Error response status:', apiError.response?.status);
        console.error('Error response data:', apiError.response?.data);
        console.error('Full error:', apiError);
        // Continue to fallback logic
      }
    } else {
      console.log('=== API KEYS NOT CONFIGURED ===');
      console.log('RAPIDAPI_KEY present:', !!RAPIDAPI_KEY);
      console.log('RAPIDAPI_HOST present:', !!RAPIDAPI_HOST);
      console.log('RAPIDAPI_MATCHES_UPCOMING_URL present:', !!RAPIDAPI_MATCHES_UPCOMING_URL);
    }

    // Fallback to database if API config is missing or API call failed - only UPCOMING matches
    console.log('Falling back to database for upcoming matches');
    const dbMatches = await Match.find({ 
      status: 'UPCOMING',
      startDate: { $gte: new Date() } // Only future matches
    })
    .sort({ startDate: 1 })
    .limit(Number(limit) * 2) // Get more to filter
    .select('matchId title shortTitle teams venue series startDate format status raw');
    
    // Process matches to extract data from raw field if needed
    const processedMatches = dbMatches.map(match => {
      // If the match doesn't have proper data but has raw data, extract from raw
      if ((!match.title || match.title === ' vs ' || !match.teams || match.teams.length === 0) && match.raw) {
        return processRawMatchData(match);
      }
      return match;
    });
    
    // Filter out any non-upcoming matches
    const validMatches = processedMatches.filter(match => {
      if (match.status !== 'UPCOMING') {
        console.log(`Filtering out match ${match.matchId} - status is ${match.status}, not UPCOMING`);
        return false;
      }
      
      // Check raw data if available
      if (match.raw) {
        const rawState = (match.raw.state || '').toLowerCase();
        const rawStatus = (match.raw.status || '').toLowerCase();
        
        if (rawState.includes('complete') || rawState.includes('live') || 
            rawStatus.includes('complete') || rawStatus.includes('live') ||
            rawState.includes('finished') || rawStatus.includes('won')) {
          console.log(`Filtering out match ${match.matchId} - raw data indicates not upcoming`);
          return false;
        }
      }
      
      return true;
    }).slice(0, Number(limit)); // Limit after filtering
    
    console.log(`Returning ${validMatches.length} valid upcoming matches (filtered from ${processedMatches.length})`);
    return res.json(validMatches);
  } catch (error) {
    console.error('getUpcomingMatches error:', error);
    
    // Handle rate limiting
    if ((error as any)?.response?.status === 429) {
      // Fallback to database if API rate limit exceeded
      try {
        const { limit = 10 } = req.query;
        const upcomingMatches = await Match.find({ 
          status: 'UPCOMING',
          startDate: { $gte: new Date() }
        })
        .sort({ startDate: 1 })
        .limit(Number(limit))
        .select('matchId title shortTitle teams venue series startDate format status');
        
        return res.json(upcomingMatches);
      } catch (dbError) {
        return res.status(500).json({ message: 'Server error', error: (dbError as Error).message });
      }
    }
    
    // Fallback to database if API fails
    try {
      const { limit = 10 } = req.query;
      const upcomingMatches = await Match.find({ 
        status: 'UPCOMING',
        startDate: { $gte: new Date() }
      })
      .sort({ startDate: 1 })
      .limit(Number(limit))
      .select('matchId title shortTitle teams venue series startDate format status');
      
      res.json(upcomingMatches);
    } catch (dbError) {
      res.status(500).json({ message: 'Server error', error: (dbError as Error).message });
    }
  }
};