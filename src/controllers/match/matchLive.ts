import Match from '../../models/Match';
import { Request, Response } from 'express';
import axios from 'axios';
import { processRawMatchData, extractScoresFromScorecard } from './matchLiveHelpers';

// Helper function to map API status to our enum values
const mapStatusToEnum = (status: string): 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'ABANDONED' | 'CANCELLED' => {
  if (!status) return 'LIVE'; // For live endpoint, default to LIVE if no status

  // Convert to lowercase for case-insensitive comparison
  const lowerStatus = status.toLowerCase();

  // Map COMPLETED status patterns (check this first to avoid misclassification)
  if (lowerStatus.includes('complete') ||
    lowerStatus.includes('finished') ||
    lowerStatus.includes('won by') ||
    lowerStatus.includes('match tied') ||
    lowerStatus.includes('no result') ||
    lowerStatus.includes('result') ||
    lowerStatus === 'completed' ||
    lowerStatus === 'finished' ||
    lowerStatus.includes('won') ||
    lowerStatus.includes('lost') ||
    lowerStatus.includes('draw') ||
    lowerStatus.includes('tied')) {
    return 'COMPLETED';
  }

  // Map LIVE status patterns
  if (lowerStatus.includes('live') ||
    lowerStatus.includes('in progress') ||
    lowerStatus.includes('innings break') ||
    lowerStatus.includes('rain delay') ||
    lowerStatus.includes('tea break') ||
    lowerStatus.includes('lunch break') ||
    lowerStatus.includes('drinks break') ||
    lowerStatus === 'live') {
    return 'LIVE';
  }

  // Map ABANDONED status patterns
  if (lowerStatus.includes('abandon') ||
    lowerStatus.includes('washed out') ||
    lowerStatus === 'abandoned') {
    return 'ABANDONED';
  }

  // Map CANCELLED status patterns
  if (lowerStatus.includes('cancel') ||
    lowerStatus.includes('postponed') ||
    lowerStatus === 'cancelled') {
    return 'CANCELLED';
  }

  // Map UPCOMING status patterns
  if (lowerStatus.includes('match starts') ||
    lowerStatus.includes('starts at') ||
    lowerStatus.includes('upcoming') ||
    lowerStatus.includes('scheduled') ||
    lowerStatus.includes('preview') ||
    lowerStatus === 'upcoming' ||
    lowerStatus === 'scheduled') {
    return 'UPCOMING';
  }

  // If we can't determine the status, try to make an educated guess
  // Check if it contains time information (likely upcoming)
  if (lowerStatus.match(/\d{1,2}:\d{2}/) || lowerStatus.includes('gmt') || lowerStatus.includes('ist')) {
    return 'UPCOMING';
  }

  // Default fallback for live endpoint
  return 'LIVE';
};

export const getLiveMatches = async (req: Request, res: Response) => {
  try {
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
    const RAPIDAPI_MATCHES_LIVE_URL = process.env.RAPIDAPI_MATCHES_LIVE_URL;
    const RAPIDAPI_MATCHES_INFO_URL = process.env.RAPIDAPI_MATCHES_INFO_URL;

    // If API key is available, try to fetch from API first
    if (RAPIDAPI_KEY && RAPIDAPI_HOST && RAPIDAPI_MATCHES_LIVE_URL) {
      try {
        console.log('Fetching live matches from API');
        const headers = {
          'x-rapidapi-key': RAPIDAPI_KEY,
          'x-rapidapi-host': RAPIDAPI_HOST
        };

        const response = await axios.get(RAPIDAPI_MATCHES_LIVE_URL, { headers, timeout: 15000 });

        // Process API response and save to database
        if (response.data && response.data.typeMatches) {
          console.log('Available match types:', response.data.typeMatches.map((t: any) => t.matchType));

          const liveMatchesData = response.data.typeMatches.find((type: any) =>
            type.matchType === 'Live Matches'
          );

          // Also check for matches that should be live based on time
          const allMatches: any[] = [];

          // Collect all matches from all categories
          response.data.typeMatches.forEach((typeMatch: any) => {
            if (typeMatch.seriesMatches) {
              typeMatch.seriesMatches.forEach((seriesMatch: any) => {
                if (seriesMatch.seriesAdWrapper && seriesMatch.seriesAdWrapper.matches) {
                  allMatches.push(...seriesMatch.seriesAdWrapper.matches);
                }
              });
            }
          });

          console.log(`Found ${allMatches.length} total matches across all categories`);

          const matchesList: any[] = [];

          if (liveMatchesData && liveMatchesData.seriesMatches) {
            // Extract matches from live matches category
            for (const seriesMatch of liveMatchesData.seriesMatches) {
              if (seriesMatch.seriesAdWrapper && seriesMatch.seriesAdWrapper.matches) {
                matchesList.push(...seriesMatch.seriesAdWrapper.matches);
              }
            }
          }

          // Also check all matches to find ones that should be live based on time
          const currentTime = new Date();
          const potentialLiveMatches = allMatches.filter((match) => {
            const matchStartTime = match.matchInfo?.startDate ? new Date(parseInt(match.matchInfo.startDate)) : null;
            const rawStatus = match.matchInfo?.status || match.matchInfo?.state || match.status || '';

            // Check if match should be live based on time (started within last 8 hours)
            const shouldBeLive = matchStartTime &&
              matchStartTime <= currentTime &&
              (currentTime.getTime() - matchStartTime.getTime()) < (8 * 60 * 60 * 1000); // 8 hours

            if (shouldBeLive) {
              console.log(`Potential live match found: ${match.matchInfo?.matchId} - Status: "${rawStatus}", Start: ${matchStartTime}`);
            }

            return shouldBeLive;
          });

          // Add potential live matches to the list
          matchesList.push(...potentialLiveMatches);

          // Remove duplicates based on matchId
          const uniqueMatches = matchesList.filter((match, index, self) =>
            index === self.findIndex((m) =>
              (m.matchInfo?.matchId || m.matchId) === (match.matchInfo?.matchId || match.matchId)
            )
          );

          console.log(`Processing ${uniqueMatches.length} unique matches (${matchesList.length - uniqueMatches.length} duplicates removed)`);

          if (uniqueMatches.length > 0) {

            // Process and save each match
            const upsertPromises = uniqueMatches.map(async (m) => {
              const matchId = m.matchInfo?.matchId || m.matchId || m.id || (typeof m === 'object' ? JSON.stringify(m).slice(0, 40) : String(m).slice(0, 40)) || 'unknown';
              // Ensure matchId is a string
              const safeMatchId = typeof matchId === 'string' ? matchId : String(matchId);

              // Extract series information
              const seriesId = m.matchInfo?.seriesId || m.seriesId || '0';
              const seriesName = m.matchInfo?.seriesName || m.seriesName || 'Unknown Series';

              // Extract team information
              const team1Info = m.matchInfo?.team1 || m.team1 || {};
              const team2Info = m.matchInfo?.team2 || m.team2 || {};

              const team1Name = team1Info.teamName || team1Info.teamSName || team1Info.name || 'Team 1';
              const team2Name = team2Info.teamName || team2Info.teamSName || team2Info.name || 'Team 2';
              const team1Id = team1Info.teamId || team1Info.id || '1';
              const team2Id = team2Info.teamId || team2Info.id || '2';

              // Extract format and status
              const format = m.matchInfo?.matchFormat || m.matchInfo?.matchType || m.format || m.type || m.matchType || 'Other';
              const title = m.matchInfo?.matchDesc || m.title || m.name || `${team1Name} vs ${team2Name}`;
              const rawStatus = m.matchInfo?.status || m.matchInfo?.state || m.status || m.matchStatus || 'LIVE';
              let status = mapStatusToEnum(rawStatus); // Use the mapping function

              // Check if match should be live based on time
              const matchStartTime = m.matchInfo?.startDate ? new Date(parseInt(m.matchInfo.startDate)) : null;
              const currentTime = new Date();
              const shouldBeLive = matchStartTime &&
                matchStartTime <= currentTime &&
                (currentTime.getTime() - matchStartTime.getTime()) < (8 * 60 * 60 * 1000) && // Started within 8 hours
                status === 'UPCOMING'; // Only override if currently upcoming

              if (shouldBeLive) {
                console.log(`⚡ Overriding status for match ${matchId}: "${rawStatus}" -> "LIVE" (based on start time)`);
                status = 'LIVE';
              }

              console.log(`Match ${matchId}: rawStatus="${rawStatus}" -> mappedStatus="${status}"`);

              // Debug: Log available score data
              if (m.matchScore) {
                console.log(`Match ${matchId} score data available:`, Object.keys(m.matchScore));
              }

              // Extract venue information
              const venueName = m.matchInfo?.venueInfo?.ground || m.matchInfo?.venue || m.venue?.name || m.venue || 'Venue TBD';
              const venueCity = m.matchInfo?.venueInfo?.city || m.venue?.city || '';
              const venueCountry = m.matchInfo?.venueInfo?.country || m.venue?.country || '';

              // Extract date information
              let startDate = null;
              if (m.matchInfo?.startDate) startDate = new Date(parseInt(m.matchInfo.startDate));
              else if (m.startDate) startDate = new Date(m.startDate);
              else if (m.date) startDate = new Date(m.date);

              // Extract score information with comprehensive fallbacks
              const matchScore = m.matchScore || m.score || {};
              const scoreData = matchScore.scoreData || matchScore;

              // Helper function to extract team score
              const extractTeamScore = (teamData: any, teamIndex: number) => {
                // Try multiple possible score sources
                const scoreFromArray = scoreData[teamIndex] || {};
                const scoreFromInnings = scoreData[`inngs${teamIndex + 1}`] || {};
                const scoreFromTeam = teamData.score || {};

                return {
                  runs: scoreFromArray.runs || scoreFromInnings.runs || scoreFromTeam.runs || 0,
                  wickets: scoreFromArray.wickets || scoreFromInnings.wickets || scoreFromTeam.wickets || 0,
                  overs: scoreFromArray.overs || scoreFromInnings.overs || scoreFromTeam.overs || 0,
                  balls: scoreFromArray.balls || scoreFromInnings.balls || scoreFromTeam.balls || 0,
                  runRate: scoreFromArray.runRate || scoreFromArray.runrate || scoreFromInnings.runRate || scoreFromInnings.runrate || scoreFromTeam.runRate || 0
                };
              };

              // Create teams array in the expected format with enhanced score extraction
              const teams = [
                {
                  teamId: team1Id.toString(),
                  teamName: team1Name,
                  teamShortName: team1Info.teamSName || team1Name.substring(0, 3),
                  score: extractTeamScore(team1Info, 0)
                },
                {
                  teamId: team2Id.toString(),
                  teamName: team2Name,
                  teamShortName: team2Info.teamSName || team2Name.substring(0, 3),
                  score: extractTeamScore(team2Info, 1)
                }
              ];

              // Log score extraction for debugging
              console.log(`Match ${matchId} scores: Team1=${teams[0].score.runs}/${teams[0].score.wickets}, Team2=${teams[1].score.runs}/${teams[1].score.wickets}`);

              // Validate essential match data before saving
              const hasValidTeams = team1Name !== 'Team 1' && team2Name !== 'Team 2' &&
                team1Name.trim() !== '' && team2Name.trim() !== '';
              const hasValidId = matchId && matchId.trim() !== '' && matchId !== 'undefined';

              if (!hasValidTeams || !hasValidId) {
                console.log(`⚠️ Skipping match with invalid data: ID=${matchId}, Team1=${team1Name}, Team2=${team2Name}`);
                return null; // Skip this match
              }

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
                status, // This is now properly mapped
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
                { matchId: safeMatchId },
                { $set: { ...doc, matchId: safeMatchId } },
                { upsert: true, new: true, setDefaultsOnInsert: true }
              );
            });

            // Filter out null results and execute valid upserts
            const validUpserts = upsertPromises.filter(promise => promise !== null);
            await Promise.all(validUpserts);
            console.log(`Saved ${validUpserts.length} valid matches out of ${upsertPromises.length} total`);

            // Return from database after saving
            const liveMatches = await Match.find({
              $and: [
                {
                  $or: [
                    { isLive: true },
                    { status: 'LIVE' },
                    { status: { $regex: 'live', $options: 'i' } },
                    { status: { $regex: 'in progress', $options: 'i' } },
                    { status: { $regex: 'innings break', $options: 'i' } },
                    { status: { $regex: 'rain delay', $options: 'i' } },
                    { status: { $regex: 'tea break', $options: 'i' } },
                    { status: { $regex: 'lunch break', $options: 'i' } },
                    { status: { $regex: 'drinks break', $options: 'i' } }
                  ]
                },
                {
                  // Exclude completed, abandoned, and cancelled matches
                  status: { 
                    $nin: [
                      'COMPLETED', 'Complete', 'COMPLETE', 'Completed',
                      'ABANDONED', 'Abandoned', 'ABANDON', 'Abandon',
                      'CANCELLED', 'Cancelled', 'CANCEL', 'Cancel',
                      'UPCOMING', 'Upcoming', 'SCHEDULED', 'Scheduled',
                      // Add more completed status patterns
                      'Finished', 'FINISHED',
                      'Won', 'WON', 'Win', 'WIN',
                      'Lost', 'LOST', 'Loss', 'LOSS',
                      'Draw', 'DRAW', 'Drawn', 'DRAWN',
                      'Tied', 'TIED', 'Tie', 'TIE',
                      'No Result', 'NO RESULT', 'No result', 'no result',
                      'Result', 'RESULT'
                    ] 
                  }
                },
                {
                  // Exclude matches that ended more than 24 hours ago
                  $or: [
                    { endDate: { $exists: false } },
                    { endDate: null },
                    { endDate: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
                  ]
                }
              ]
            })
              .sort({ priority: -1, startDate: -1 })
              .select('matchId title shortTitle teams venue series status commentary currentlyPlaying isLive format startDate endDate raw scorecard');

            // Process matches to extract data from raw field if needed and update scores from scorecard
            const processedMatches = await Promise.all(liveMatches.map(async match => {
              console.log(`Processing match ${match.matchId}: status="${match.status}", isLive=${match.isLive}, startDate=${match.startDate}`);

              // Check if match should be live based on time
              const currentTime = new Date();
              const shouldBeLive = match.startDate &&
                match.startDate <= currentTime &&
                (currentTime.getTime() - match.startDate.getTime()) < (8 * 60 * 60 * 1000) && // Started within 8 hours
                match.status === 'UPCOMING';

              let processedMatch = match;

              // Always process if we have raw data to get latest scores
              if (match.raw) {
                processedMatch = processRawMatchData(match);
                console.log(`Processed raw data for match ${match.matchId}, teams count: ${processedMatch.teams?.length || 0}`);
              }

              // If we have scorecard data, extract scores from it and update team scores
              if (match.scorecard && match.scorecard.scorecard && Array.isArray(match.scorecard.scorecard)) {
                console.log(`Extracting scores from scorecard for match ${match.matchId}`);
                const { team1Score, team2Score } = extractScoresFromScorecard(match.scorecard);
                
                // Update team scores if we have valid data
                if (processedMatch.teams && processedMatch.teams.length >= 2) {
                  // Only update if we have actual scores (not all zeros)
                  if (team1Score.runs > 0 || team1Score.wickets > 0 || team2Score.runs > 0 || team2Score.wickets > 0) {
                    processedMatch.teams[0].score = team1Score;
                    processedMatch.teams[1].score = team2Score;
                    console.log(`Updated scores from scorecard for match ${match.matchId}: Team1=${team1Score.runs}/${team1Score.wickets}, Team2=${team2Score.runs}/${team2Score.wickets}`);
                  }
                }
              }
              // If we don't have scorecard data or scores are still zero, try to fetch scorecard
              else if ((!match.scorecard || match.teams.some(team => 
                  !team.score || 
                  (team.score.runs === 0 && team.score.wickets === 0 && team.score.overs === 0))) && 
                  RAPIDAPI_KEY && RAPIDAPI_HOST && RAPIDAPI_MATCHES_INFO_URL) {
                
                try {
                  console.log(`Fetching scorecard for match ${match.matchId}`);
                  const headers = {
                    'x-rapidapi-key': RAPIDAPI_KEY,
                    'x-rapidapi-host': RAPIDAPI_HOST
                  };

                  // Try to fetch match scorecard from Cricbuzz API
                  const url = `${RAPIDAPI_MATCHES_INFO_URL}/${match.matchId}/scard`;
                  const scorecardResponse = await axios.get(url, { headers, timeout: 10000 });

                  if (scorecardResponse.data) {
                    console.log(`Scorecard fetched for match ${match.matchId}`);
                    
                    // Map status to valid enum value before saving
                    let updatedStatus = match.status;
                    if (match.raw && match.raw.state) {
                      updatedStatus = mapStatusToEnum(match.raw.state);
                    } else if (match.raw && match.raw.status) {
                      updatedStatus = mapStatusToEnum(match.raw.status);
                    }
                    
                    // Store scorecard data in database
                    const updateData: any = { 
                      scorecard: scorecardResponse.data,
                      status: updatedStatus,
                      isLive: updatedStatus === 'LIVE'
                    };
                    
                    const updatedMatch = await Match.findOneAndUpdate(
                      { matchId: match.matchId },
                      { $set: updateData },
                      { new: true }
                    );

                    if (updatedMatch) {
                      // Extract scores from scorecard
                      const { team1Score, team2Score } = extractScoresFromScorecard(scorecardResponse.data);
                      
                      // Update team scores
                      if (updatedMatch.teams && updatedMatch.teams.length >= 2) {
                        updatedMatch.teams[0].score = team1Score;
                        updatedMatch.teams[1].score = team2Score;
                        
                        // Save updated scores
                        try {
                          await updatedMatch.save();
                          console.log(`Updated scores for match ${match.matchId}: Team1=${team1Score.runs}/${team1Score.wickets}, Team2=${team2Score.runs}/${team2Score.wickets}`);
                        } catch (saveError) {
                          console.error(`Error saving updated scores for match ${match.matchId}:`, saveError);
                          // If save fails, try to update just the teams
                          try {
                            await Match.findOneAndUpdate(
                              { matchId: match.matchId },
                              { $set: { 
                                "teams.0.score": team1Score,
                                "teams.1.score": team2Score
                              } },
                              { new: true }
                            );
                            console.log(`Updated scores via findOneAndUpdate for match ${match.matchId}: Team1=${team1Score.runs}/${team1Score.wickets}, Team2=${team2Score.runs}/${team2Score.wickets}`);
                          } catch (updateError) {
                            console.error(`Error updating scores via findOneAndUpdate for match ${match.matchId}:`, updateError);
                          }
                        }
                        
                        processedMatch = updatedMatch;
                      }
                    }
                  }
                } catch (scorecardError) {
                  console.error(`Error fetching scorecard for match ${match.matchId}:`, scorecardError);
                  // Continue with existing data if scorecard fetch fails
                }
              }

              // Override status if match should be live based on time
              if (shouldBeLive) {
                console.log(`⚡ Auto-updating match ${match.matchId} status to LIVE based on start time`);

                // Update the processed match properties directly (avoiding type issues)
                if (processedMatch && typeof processedMatch === 'object') {
                  (processedMatch as any).status = 'LIVE';
                  (processedMatch as any).isLive = true;
                }

                // Update in database asynchronously
                Match.findOneAndUpdate(
                  { matchId: match.matchId },
                  { $set: { status: 'LIVE', isLive: true } }
                ).catch(err => console.error('Error updating match status:', err));
              }

              return processedMatch;
            }));

            console.log(`Found ${processedMatches.length} live matches from database`);
            return res.json(processedMatches);
          }
        }
      } catch (apiError) {
        console.error('API fetch failed for live matches:', apiError);
        // Continue to fallback logic
      }
    }

    // Get live matches from database with updated scores
    const liveMatches = await Match.find({
      $and: [
        {
          $or: [
            { isLive: true },
            { status: 'LIVE' },
            { status: { $regex: 'live', $options: 'i' } },
            { status: { $regex: 'in progress', $options: 'i' } },
            { status: { $regex: 'innings break', $options: 'i' } },
            { status: { $regex: 'rain delay', $options: 'i' } },
            { status: { $regex: 'tea break', $options: 'i' } },
            { status: { $regex: 'lunch break', $options: 'i' } },
            { status: { $regex: 'drinks break', $options: 'i' } }
          ]
        },
        {
          // Exclude completed, abandoned, and cancelled matches
          status: { 
            $nin: [
              'COMPLETED', 'Complete', 'COMPLETE', 'Completed',
              'ABANDONED', 'Abandoned', 'ABANDON', 'Abandon',
              'CANCELLED', 'Cancelled', 'CANCEL', 'Cancel',
              'UPCOMING', 'Upcoming', 'SCHEDULED', 'Scheduled',
              // Add more completed status patterns
              'Finished', 'FINISHED', 'Finished', 'FINISHED',
              'Won', 'WON', 'Win', 'WIN',
              'Lost', 'LOST', 'Loss', 'LOSS',
              'Draw', 'DRAW', 'Drawn', 'DRAWN',
              'Tied', 'TIED', 'Tie', 'TIE',
              'No Result', 'NO RESULT', 'No result', 'no result',
              'Result', 'RESULT'
            ] 
          }
        },
        {
          // Exclude matches that ended more than 48 hours ago
          $or: [
            { endDate: { $exists: false } },
            { endDate: null },
            { endDate: { $gte: new Date(Date.now() - 48 * 60 * 60 * 1000) } }
          ]
        }
      ]
    })
      .sort({ priority: -1, startDate: -1 })
      .select('matchId title shortTitle teams venue series status commentary currentlyPlaying isLive format startDate endDate raw scorecard');

    // Remove duplicates based on matchId
    const uniqueMatches = liveMatches.filter((match, index, self) =>
      index === self.findIndex((m) => m.matchId === match.matchId)
    );
    
    // Additional deduplication based on title and teams to catch edge cases
    const deduplicatedMatches = uniqueMatches.filter((match, index, self) => {
      // Check if teams exist and have the required properties
      if (!match.teams || match.teams.length < 2 || 
          !match.teams[0] || !match.teams[1] || 
          !match.teams[0].teamName || !match.teams[1].teamName) {
        // If teams are not properly defined, keep the first occurrence
        return self.findIndex((m) => m.title === match.title) === index;
      }
      
      const isDuplicate = self.findIndex((m) => 
        m.title === match.title && 
        m.teams && m.teams.length >= 2 &&
        m.teams[0] && m.teams[1] &&
        m.teams[0].teamName === match.teams[0].teamName &&
        m.teams[1].teamName === match.teams[1].teamName
      ) !== index;
      
      return !isDuplicate;
    });

    // Process matches to extract data from raw field if needed and update scores from scorecard
    const processedMatches = await Promise.all(deduplicatedMatches.map(async match => {
      console.log(`Processing match ${match.matchId}: status="${match.status}", isLive=${match.isLive}, startDate=${match.startDate}, endDate=${match.endDate}`);

      // Check if match should be live based on time
      const currentTime = new Date();
      const shouldBeLive = match.startDate &&
        match.startDate <= currentTime &&
        (currentTime.getTime() - match.startDate.getTime()) < (8 * 60 * 60 * 1000) && // Started within 8 hours
        match.status === 'UPCOMING';

      let processedMatch = match;

      // Always process if we have raw data to get latest scores
      if (match.raw) {
        processedMatch = processRawMatchData(match);
        console.log(`Processed raw data for match ${match.matchId}, teams count: ${processedMatch.teams?.length || 0}`);
      }

      // If we have scorecard data, extract scores from it and update team scores
      if (match.scorecard && match.scorecard.scorecard && Array.isArray(match.scorecard.scorecard)) {
        console.log(`Extracting scores from scorecard for match ${match.matchId}`);
        const { team1Score, team2Score } = extractScoresFromScorecard(match.scorecard);
        
        // Update team scores if we have valid data
        if (processedMatch.teams && processedMatch.teams.length >= 2) {
          // Only update if we have actual scores (not all zeros)
          if (team1Score.runs > 0 || team1Score.wickets > 0 || team2Score.runs > 0 || team2Score.wickets > 0) {
            processedMatch.teams[0].score = team1Score;
            processedMatch.teams[1].score = team2Score;
            console.log(`Updated scores from scorecard for match ${match.matchId}: Team1=${team1Score.runs}/${team1Score.wickets}, Team2=${team2Score.runs}/${team2Score.wickets}`);
          }
        }
      }
      // If we don't have scorecard data or scores are still zero, try to fetch scorecard
      else if ((!match.scorecard || match.teams.some(team => 
          !team.score || 
          (team.score.runs === 0 && team.score.wickets === 0 && team.score.overs === 0))) && 
          RAPIDAPI_KEY && RAPIDAPI_HOST && RAPIDAPI_MATCHES_INFO_URL) {
        
        try {
          console.log(`Fetching scorecard for match ${match.matchId}`);
          const headers = {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
          };

          // Try to fetch match scorecard from Cricbuzz API
          const url = `${RAPIDAPI_MATCHES_INFO_URL}/${match.matchId}/scard`;
          const scorecardResponse = await axios.get(url, { headers, timeout: 10000 });

          if (scorecardResponse.data) {
            console.log(`Scorecard fetched for match ${match.matchId}`);
            
            // Map status to valid enum value before saving
            let updatedStatus = match.status;
            if (match.raw && match.raw.state) {
              updatedStatus = mapStatusToEnum(match.raw.state);
            } else if (match.raw && match.raw.status) {
              updatedStatus = mapStatusToEnum(match.raw.status);
            }
            
            // Store scorecard data in database
            const updateData: any = { 
              scorecard: scorecardResponse.data,
              status: updatedStatus,
              isLive: updatedStatus === 'LIVE'
            };
            
            const updatedMatch = await Match.findOneAndUpdate(
              { matchId: match.matchId },
              { $set: updateData },
              { new: true }
            );

            if (updatedMatch) {
              // Extract scores from scorecard
              const { team1Score, team2Score } = extractScoresFromScorecard(scorecardResponse.data);
              
              // Update team scores
              if (updatedMatch.teams && updatedMatch.teams.length >= 2) {
                updatedMatch.teams[0].score = team1Score;
                updatedMatch.teams[1].score = team2Score;
                
                // Save updated scores
                try {
                  await updatedMatch.save();
                  console.log(`Updated scores for match ${match.matchId}: Team1=${team1Score.runs}/${team1Score.wickets}, Team2=${team2Score.runs}/${team2Score.wickets}`);
                } catch (saveError) {
                  console.error(`Error saving updated scores for match ${match.matchId}:`, saveError);
                  // If save fails, try to update just the teams
                  try {
                    await Match.findOneAndUpdate(
                      { matchId: match.matchId },
                      { $set: { 
                        "teams.0.score": team1Score,
                        "teams.1.score": team2Score
                      } },
                      { new: true }
                    );
                    console.log(`Updated scores via findOneAndUpdate for match ${match.matchId}: Team1=${team1Score.runs}/${team1Score.wickets}, Team2=${team2Score.runs}/${team2Score.wickets}`);
                  } catch (updateError) {
                    console.error(`Error updating scores via findOneAndUpdate for match ${match.matchId}:`, updateError);
                  }
                }
                
                processedMatch = updatedMatch;
              }
            }
          }
        } catch (scorecardError) {
          console.error(`Error fetching scorecard for match ${match.matchId}:`, scorecardError);
          // Continue with existing data if scorecard fetch fails
        }
      }

      // Override status if match should be live based on time
      if (shouldBeLive) {
        console.log(`⚡ Auto-updating match ${match.matchId} status to LIVE based on start time`);

        // Update the processed match properties directly (avoiding type issues)
        if (processedMatch && typeof processedMatch === 'object') {
          (processedMatch as any).status = 'LIVE';
          (processedMatch as any).isLive = true;
        }

        // Update in database asynchronously
        Match.findOneAndUpdate(
          { matchId: match.matchId },
          { $set: { status: 'LIVE', isLive: true } }
        ).catch(err => console.error('Error updating match status:', err));
      }

      return processedMatch;
    }));

    // Filter out matches that have actually ended
    const actuallyLiveMatches = processedMatches.filter(match => {
      // Check if match has ended more than 48 hours ago
      if (match.endDate && match.endDate < new Date(Date.now() - 48 * 60 * 60 * 1000)) {
        console.log(`Filtering out match ${match.matchId} - ended more than 48 hours ago`);
        return false;
      }
      
      // Check if match status indicates it's completed
      const lowerStatus = (match.status || '').toLowerCase();
      const isCompleted = 
        lowerStatus.includes('complete') ||
        lowerStatus.includes('finished') ||
        lowerStatus.includes('won') ||
        lowerStatus.includes('abandon') ||
        lowerStatus.includes('cancel') ||
        lowerStatus.includes('no result') ||
        lowerStatus.includes('tied') ||
        lowerStatus.includes('draw') ||
        lowerStatus.includes('lost') ||
        match.status === 'COMPLETED' ||
        match.status === 'ABANDONED' ||
        match.status === 'CANCELLED';
        
      if (isCompleted) {
        console.log(`Filtering out match ${match.matchId} - marked as completed`);
        return false;
      }
      
      // Additional check: if both teams have zero scores and match ended more than 24 hours ago, it's likely completed
      const team1Score = match.teams?.[0]?.score || { runs: 0, wickets: 0 };
      const team2Score = match.teams?.[1]?.score || { runs: 0, wickets: 0 };
      const bothTeamsZeroScore = (team1Score.runs === 0 && team1Score.wickets === 0) && 
                                (team2Score.runs === 0 && team2Score.wickets === 0);
      
      if (bothTeamsZeroScore && match.endDate && match.endDate < new Date(Date.now() - 24 * 60 * 60 * 1000)) {
        console.log(`Filtering out match ${match.matchId} - zero scores and ended more than 24 hours ago`);
        return false;
      }
      
      return true;
    });

    console.log(`Found ${actuallyLiveMatches.length} actually live matches from database (filtered from ${processedMatches.length})`);
    return res.json(actuallyLiveMatches);
  } catch (error) {
    console.error('getLiveMatches error:', error);

    // Handle rate limiting
    if ((error as any)?.response?.status === 429) {
      // Fallback to database if API rate limit exceeded
      try {
        const liveMatches = await Match.find({
          $and: [
            {
              $or: [
                { isLive: true },
                { status: 'LIVE' },
                { status: { $regex: 'live', $options: 'i' } },
                { status: { $regex: 'in progress', $options: 'i' } },
                { status: { $regex: 'innings break', $options: 'i' } },
                { status: { $regex: 'rain delay', $options: 'i' } },
                { status: { $regex: 'tea break', $options: 'i' } },
                { status: { $regex: 'lunch break', $options: 'i' } },
                { status: { $regex: 'drinks break', $options: 'i' } }
              ]
            },
            {
              // Exclude completed, abandoned, and cancelled matches
              status: { 
                $nin: [
                  'COMPLETED', 'Complete', 'COMPLETE', 'Completed',
                  'ABANDONED', 'Abandoned', 'ABANDON', 'Abandon',
                  'CANCELLED', 'Cancelled', 'CANCEL', 'Cancel',
                  'UPCOMING', 'Upcoming', 'SCHEDULED', 'Scheduled',
                  // Add more completed status patterns
                  'Finished', 'FINISHED', 'Finished', 'FINISHED',
                  'Won', 'WON', 'Win', 'WIN',
                  'Lost', 'LOST', 'Loss', 'LOSS',
                  'Draw', 'DRAW', 'Drawn', 'DRAWN',
                  'Tied', 'TIED', 'Tie', 'TIE',
                  'No Result', 'NO RESULT', 'No result', 'no result',
                  'Result', 'RESULT'
                ] 
              }
            },
            {
              // Exclude matches that ended more than 48 hours ago
              $or: [
                { endDate: { $exists: false } },
                { endDate: null },
                { endDate: { $gte: new Date(Date.now() - 48 * 60 * 60 * 1000) } }
              ]
            }
          ]
        })
          .sort({ priority: -1, startDate: -1 })
          .select('matchId title shortTitle teams venue series status commentary currentlyPlaying isLive format startDate endDate raw scorecard');

        // Remove duplicates based on matchId
        const uniqueMatches = liveMatches.filter((match, index, self) =>
          index === self.findIndex((m) => m.matchId === match.matchId)
        );
        
        // Additional deduplication based on title and teams to catch edge cases
        const deduplicatedMatches = uniqueMatches.filter((match, index, self) => {
          // Check if teams exist and have the required properties
          if (!match.teams || match.teams.length < 2 || 
              !match.teams[0] || !match.teams[1] || 
              !match.teams[0].teamName || !match.teams[1].teamName) {
            // If teams are not properly defined, keep the first occurrence
            return self.findIndex((m) => m.title === match.title) === index;
          }
          
          const isDuplicate = self.findIndex((m) => 
            m.title === match.title && 
            m.teams && m.teams.length >= 2 &&
            m.teams[0] && m.teams[1] &&
            m.teams[0].teamName === match.teams[0].teamName &&
            m.teams[1].teamName === match.teams[1].teamName
          ) !== index;
          
          return !isDuplicate;
        });

        return res.json(deduplicatedMatches);
      } catch (dbError) {
        return res.status(500).json({ message: 'Server error', error: (dbError as Error).message });
      }
    }

    // Fallback to database if API fails
    try {
      const liveMatches = await Match.find({
        $and: [
          {
            $or: [
              { isLive: true },
              { status: 'LIVE' },
              { status: { $regex: 'live', $options: 'i' } },
              { status: { $regex: 'in progress', $options: 'i' } },
              { status: { $regex: 'innings break', $options: 'i' } },
              { status: { $regex: 'rain delay', $options: 'i' } },
              { status: { $regex: 'tea break', $options: 'i' } },
              { status: { $regex: 'lunch break', $options: 'i' } },
              { status: { $regex: 'drinks break', $options: 'i' } }
            ]
          },
          {
            // Exclude completed, abandoned, and cancelled matches
            status: { 
              $nin: [
                'COMPLETED', 'Complete', 'COMPLETE', 'Completed',
                'ABANDONED', 'Abandoned', 'ABANDON', 'Abandon',
                'CANCELLED', 'Cancelled', 'CANCEL', 'Cancel',
                'UPCOMING', 'Upcoming', 'SCHEDULED', 'Scheduled',
                // Add more completed status patterns
                'Finished', 'FINISHED', 'Finished', 'FINISHED',
                'Won', 'WON', 'Win', 'WIN',
                'Lost', 'LOST', 'Loss', 'LOSS',
                'Draw', 'DRAW', 'Drawn', 'DRAWN',
                'Tied', 'TIED', 'Tie', 'TIE',
                'No Result', 'NO RESULT', 'No result', 'no result',
                'Result', 'RESULT'
              ] 
            }
          },
          {
            // Exclude matches that ended more than 48 hours ago
            $or: [
              { endDate: { $exists: false } },
              { endDate: null },
              { endDate: { $gte: new Date(Date.now() - 48 * 60 * 60 * 1000) } }
            ]
          }
        ]
      })
        .sort({ priority: -1, startDate: -1 })
        .select('matchId title shortTitle teams venue series status commentary currentlyPlaying isLive format startDate endDate raw scorecard');

      // Remove duplicates based on matchId
      const uniqueMatches = liveMatches.filter((match, index, self) =>
        index === self.findIndex((m) => m.matchId === match.matchId)
      );
      
      // Additional deduplication based on title and teams to catch edge cases
      const deduplicatedMatches = uniqueMatches.filter((match, index, self) => {
        // Check if teams exist and have the required properties
        if (!match.teams || match.teams.length < 2 || 
            !match.teams[0] || !match.teams[1] || 
            !match.teams[0].teamName || !match.teams[1].teamName) {
          // If teams are not properly defined, keep the first occurrence
          return self.findIndex((m) => m.title === match.title) === index;
        }
        
        const isDuplicate = self.findIndex((m) => 
          m.title === match.title && 
          m.teams && m.teams.length >= 2 &&
          m.teams[0] && m.teams[1] &&
          m.teams[0].teamName === match.teams[0].teamName &&
          m.teams[1].teamName === match.teams[1].teamName
        ) !== index;
        
        return !isDuplicate;
      });

      res.json(deduplicatedMatches);
    } catch (dbError) {
      res.status(500).json({ message: 'Server error', error: (dbError as Error).message });
    }
  }
};