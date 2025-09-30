import { Request, Response } from 'express';
import Match from '../../models/Match';
import { extractTeamScore, fetchMatchInfo, fetchScorecard, fetchHistoricalScorecard, fetchCommentary, fetchHistoricalCommentary, fetchOvers } from './matchDetailHelpers';

// Helper function to map API status to our enum values
const mapStatusToEnum = (status: string): 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'ABANDONED' | 'CANCELLED' => {
  if (!status) return 'UPCOMING';
  
  // Convert to lowercase for case-insensitive comparison
  const lowerStatus = status.toLowerCase();
  
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

  // Map COMPLETED status patterns
  if (lowerStatus.includes('complete') ||
    lowerStatus.includes('finished') ||
    lowerStatus.includes('won by') ||
    lowerStatus.includes('match tied') ||
    lowerStatus.includes('no result') ||
    lowerStatus.includes('result') ||
    lowerStatus === 'completed' ||
    lowerStatus === 'finished') {
    return 'COMPLETED';
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

  // Default fallback
  return 'UPCOMING';
};

// Helper function to safely save match data with retry logic
const saveMatchWithRetry = async (match: any) => {
  let retries = 3;
  while (retries > 0) {
    try {
      await match.save();
      return;
    } catch (error: any) {
      if (error.name === 'VersionError' && retries > 1) {
        console.log(`VersionError occurred during save, retrying... (${retries - 1} retries left)`);
        retries--;
        // Instead of reload(), we need to fetch the document again from the database
        const freshMatch = await Match.findById(match._id);
        if (freshMatch) {
          // Copy the modified fields from the old document to the fresh one
          Object.assign(freshMatch, match);
          match = freshMatch;
        }
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
        throw error;
      }
    }
  }
};

// Function to sync detailed match data including scorecard
export const syncMatchDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
    const RAPIDAPI_MATCHES_INFO_URL = process.env.RAPIDAPI_MATCHES_INFO_URL;

    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_MATCHES_INFO_URL) {
      return res.status(500).json({
        message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_MATCHES_INFO_URL in .env'
      });
    }

    const headers = {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST
    };

    console.log(`Starting detailed sync for match ${id}`);

    // First, check if we have recent data in the database
    const existingMatch = await Match.findOne({ matchId: id });
    
    // If we have existing data, check if it's recent enough
    if (existingMatch) {
      const now = new Date();
      // Use get method to access timestamps or fallback to current time
      const lastUpdated = existingMatch.get('updatedAt') || existingMatch.get('createdAt') || new Date();
      
      // For completed matches, we can use cached data for longer
      const isCompleted = existingMatch.status === 'COMPLETED' || existingMatch.status === 'ABANDONED' || existingMatch.status === 'CANCELLED';
      
      // For live matches, refresh every 30 seconds
      // For upcoming matches, refresh every 5 minutes
      // For completed matches, refresh every 1 hour
      const refreshInterval = isCompleted ? 60 * 60 * 1000 : // 1 hour for completed
                            existingMatch.status === 'LIVE' ? 30 * 1000 : // 30 seconds for live
                            5 * 60 * 1000; // 5 minutes for upcoming
      
      if ((now.getTime() - new Date(lastUpdated).getTime()) < refreshInterval) {
        console.log(`Using cached data for match ${id}, last updated: ${lastUpdated}`);
        return res.json({
          message: `Using cached data for match ${id}`,
          match: existingMatch,
          hasScorecard: !!existingMatch.scorecard,
          hasHistoricalScorecard: !!existingMatch.historicalScorecard,
          hasCommentary: !!existingMatch.commentary,
          hasHistoricalCommentary: !!existingMatch.historicalCommentary,
          hasOvers: !!existingMatch.overs
        });
      }
    }

    // Fetch match info
    const matchInfo = await fetchMatchInfo(id, headers, RAPIDAPI_MATCHES_INFO_URL);

    // Fetch scorecard
    const scorecard = await fetchScorecard(id, headers, RAPIDAPI_MATCHES_INFO_URL);

    // Fetch historical scorecard
    const historicalScorecard = await fetchHistoricalScorecard(id, headers, RAPIDAPI_MATCHES_INFO_URL);

    // Fetch commentary
    const commentary = await fetchCommentary(id, headers, RAPIDAPI_MATCHES_INFO_URL);

    // Fetch historical commentary
    const historicalCommentary = await fetchHistoricalCommentary(id, headers, RAPIDAPI_MATCHES_INFO_URL);

    // Fetch overs
    const overs = await fetchOvers(id, headers, RAPIDAPI_MATCHES_INFO_URL);

    // Process and store match data
    if (matchInfo) {
      const m = matchInfo;
      const matchId = m.matchInfo?.matchId || m.matchId || m.id || m.match_id || id;

      // Parse teams data with scores
      const teams = [];
      // Check for team data in matchInfo first, then fall back to root level
      const team1Data = m.matchInfo?.team1 || m.team1;
      const team2Data = m.matchInfo?.team2 || m.team2;
      
      if (team1Data) {
        const team1Score = extractTeamScore({ ...m, scorecard }, 'team1');
        console.log('Extracted team1 score:', JSON.stringify(team1Score, null, 2));
        teams.push({
          teamId: team1Data.teamId?.toString() || team1Data.teamid?.toString() || '',
          teamName: team1Data.teamName || team1Data.teamname || 'Team 1',
          teamShortName: team1Data.teamSName || team1Data.teamsname || team1Data.teamName || team1Data.teamname || 'Team 1',
          score: team1Score
        });
      }
      
      if (team2Data) {
        const team2Score = extractTeamScore({ ...m, scorecard }, 'team2');
        console.log('Extracted team2 score:', JSON.stringify(team2Score, null, 2));
        teams.push({
          teamId: team2Data.teamId?.toString() || team2Data.teamid?.toString() || '',
          teamName: team2Data.teamName || team2Data.teamname || 'Team 2',
          teamShortName: team2Data.teamSName || team2Data.teamsname || team2Data.teamName || team2Data.teamname || 'Team 2',
          score: team2Score
        });
      }

      // Determine the correct status based on match data
      const rawStatus = m.matchInfo?.state || m.status || 'UPCOMING';
      const mappedStatus = mapStatusToEnum(rawStatus);
      
      // Check if match should be live based on time
      const currentTime = new Date();
      const matchStartTime = m.matchInfo?.startDate ? new Date(parseInt(m.matchInfo.startDate)) : null;
      const shouldBeLive = matchStartTime &&
        matchStartTime <= currentTime &&
        (currentTime.getTime() - matchStartTime.getTime()) < (8 * 60 * 60 * 1000) && // Started within 8 hours
        mappedStatus === 'UPCOMING'; // Only override if currently upcoming

      // Preserve existing status if it's already LIVE or COMPLETED
      let finalStatus = mappedStatus;
      if (existingMatch) {
        // If existing match is LIVE, keep it LIVE unless it's actually completed
        if (existingMatch.status === 'LIVE' && mappedStatus !== 'COMPLETED' && mappedStatus !== 'ABANDONED' && mappedStatus !== 'CANCELLED') {
          finalStatus = 'LIVE';
        }
        // If existing match is COMPLETED, ABANDONED, or CANCELLED, keep that status
        else if (['COMPLETED', 'ABANDONED', 'CANCELLED'].includes(existingMatch.status)) {
          finalStatus = existingMatch.status;
        }
      }
      
      // Override with time-based logic if needed
      if (shouldBeLive) {
        finalStatus = 'LIVE';
      }
      
      const isLive = finalStatus === 'LIVE';

      const doc: any = {
        matchId: matchId?.toString(),
        title: m.matchInfo?.matchDesc || m.name || m.title || 'Match',
        shortTitle: m.matchInfo?.matchDesc || m.shortName || m.title || 'Match',
        subTitle: m.matchInfo?.seriesName || m.subtitle || '',
        format: m.matchInfo?.matchFormat || 'OTHER',
        status: finalStatus,
        venue: { 
          name: m.matchInfo?.venueInfo?.ground || m.venueinfo?.ground || m.venue || 'Unknown Venue',
          city: m.matchInfo?.venueInfo?.city || m.venueinfo?.city || m.city || '',
          country: m.matchInfo?.venueInfo?.country || m.venueinfo?.country || m.country || ''
        },
        startDate: m.matchInfo?.startDate ? new Date(parseInt(m.matchInfo.startDate)) : new Date(),
        endDate: m.matchInfo?.endDate ? new Date(parseInt(m.matchInfo.endDate)) : undefined,
        series: {
          id: m.matchInfo?.seriesId?.toString() || '0',
          name: m.matchInfo?.seriesName || 'Unknown Series',
          seriesType: 'INTERNATIONAL'
        },
        teams: teams,
        isLive: isLive,
        priority: 0,
        raw: m
      };

      // Add scorecard data if available
      if (scorecard) {
        // Log scorecard data for debugging
        console.log('Scorecard data:', JSON.stringify(scorecard, null, 2));
        doc.scorecard = scorecard;
      }

      // Add historical scorecard data if available
      if (historicalScorecard) {
        doc.historicalScorecard = historicalScorecard;
      }

      // Add commentary data if available
      if (commentary) {
        doc.commentary = {
          ...commentary,
          lastUpdated: new Date()
        };
      }

      // Add historical commentary data if available
      if (historicalCommentary) {
        doc.historicalCommentary = {
          ...historicalCommentary,
          lastUpdated: new Date()
        };
      }

      // Add overs data if available
      if (overs) {
        doc.overs = {
          ...overs,
          lastUpdated: new Date()
        };
      }

      // Remove undefined values
      Object.keys(doc).forEach((k) => doc[k] === undefined && delete doc[k]);

      // Update or create match
      const updatedMatch = await Match.findOneAndUpdate(
        { matchId: doc.matchId },
        { $set: doc },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      console.log(`Successfully synced match ${id} with detailed data`);
      
      return res.json({
        message: `Successfully synced match ${id} with detailed data`,
        match: updatedMatch,
        hasScorecard: !!scorecard,
        hasHistoricalScorecard: !!historicalScorecard,
        hasCommentary: !!commentary,
        hasHistoricalCommentary: !!historicalCommentary,
        hasOvers: !!overs
      });
    }

    res.status(404).json({ message: 'No match data found' });
  } catch (error) {
    console.error('syncMatchDetails error:', error);
    
    // Handle rate limiting
    if ((error as any)?.response?.status === 429) {
      return res.status(429).json({ 
        message: 'API rate limit exceeded. Please try again later.', 
        error: 'Too many requests' 
      });
    }
    
    res.status(500).json({ message: 'Failed to sync match details', error: (error as Error).message });
  }
};

// Function to sync multiple matches with details
export const syncMultipleMatchDetails = async (req: Request, res: Response) => {
  try {
    const { matchIds } = req.body;
    
    if (!matchIds || !Array.isArray(matchIds)) {
      return res.status(400).json({ message: 'matchIds array is required' });
    }

    const results = [];
    
    for (const matchId of matchIds) {
      try {
        // Create a proper mock request object for syncMatchDetails
        const mockReq = {
          params: { id: matchId },
          query: {},
          body: {},
          headers: {},
          get: (name: string) => undefined,
          header: (name: string) => undefined,
        } as unknown as Request;
        
        let result = null;
        
        // Create a mock response object to capture the result
        const mockRes = {
          json: (data: any) => { result = data; },
          status: (code: number) => ({ 
            json: (data: any) => { result = { status: code, ...data }; },
            send: (data: any) => { result = { status: code, ...data }; }
          }),
          send: (data: any) => { result = data; }
        } as Response;

        await syncMatchDetails(mockReq, mockRes);
        results.push({ matchId, result });
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        results.push({ matchId, error: (error as Error).message });
      }
    }

    res.json({
      message: `Processed ${matchIds.length} matches`,
      results
    });
  } catch (error) {
    console.error('syncMultipleMatchDetails error:', error);
    res.status(500).json({ message: 'Failed to sync multiple match details', error: (error as Error).message });
  }
};