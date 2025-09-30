import Match from '../../models/Match';

// Helper function to map API status to our enum values
const mapStatusToEnum = (status: string): 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'ABANDONED' | 'CANCELLED' => {
  if (!status) return 'COMPLETED'; // For recent helpers, default to COMPLETED if no status
  
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

  // Default fallback for recent helpers
  return 'COMPLETED';
};

// Function to process raw match data and extract proper fields
export function processRawMatchData(match: any) {
  console.log('processRawMatchData called for match:', match.matchId);
  
  // Always process if we have raw data, regardless of existing data
  // This ensures we extract scores from raw data even when teams exist but have zero scores
  if (match.raw) {
    console.log('Match has raw data, trying to extract');
    try {
      // Handle direct matchInfo structure (most common case)
      if (match.raw.matchInfo) {
        console.log('Processing direct matchInfo structure');
        return extractMatchInfo(match.raw.matchInfo, match.raw.matchScore, match);
      }
      // Handle the structure with seriesMatches directly
      else if (match.raw.seriesMatches && Array.isArray(match.raw.seriesMatches)) {
        console.log('Processing seriesMatches structure');
        for (const seriesMatch of match.raw.seriesMatches) {
          if (seriesMatch.seriesAdWrapper && seriesMatch.seriesAdWrapper.matches) {
            for (const m of seriesMatch.seriesAdWrapper.matches) {
              if (m.matchInfo) {
                console.log('Found matchInfo in seriesMatches, extracting');
                return extractMatchInfo(m.matchInfo, m.matchScore, match);
              }
            }
          }
        }
      }
      // Handle the structure with typeMatches
      else if (match.raw.typeMatches && Array.isArray(match.raw.typeMatches)) {
        console.log('Processing typeMatches structure');
        for (const typeMatch of match.raw.typeMatches) {
          if (typeMatch.seriesMatches && Array.isArray(typeMatch.seriesMatches)) {
            for (const seriesMatch of typeMatch.seriesMatches) {
              if (seriesMatch.seriesAdWrapper && seriesMatch.seriesAdWrapper.matches) {
                for (const m of seriesMatch.seriesAdWrapper.matches) {
                  if (m.matchInfo) {
                    console.log('Found matchInfo in typeMatches, extracting');
                    return extractMatchInfo(m.matchInfo, m.matchScore, match);
                  }
                }
              }
            }
          }
        }
      }
      else {
        console.log('Raw data structure not recognized:', Object.keys(match.raw));
      }
    } catch (error) {
      console.error('Error processing raw match data:', error);
    }
  }
  
  // If we can't extract data, return the original match
  console.log('Could not extract data, returning original match');
  return match;
}

// Helper function to extract match information from raw data
export function extractMatchInfo(matchInfo: any, matchScore: any, originalMatch: any) {
  console.log('extractMatchInfo called with:', { matchInfo: !!matchInfo, matchScore: !!matchScore });
  
  // Extract team information
  const team1Info = matchInfo.team1 || {};
  const team2Info = matchInfo.team2 || {};
  
  const team1Name = team1Info.teamName || team1Info.teamSName || team1Info.name || 'Team 1';
  const team2Name = team2Info.teamName || team2Info.teamSName || team2Info.name || 'Team 2';
  const team1Id = team1Info.teamId || team1Info.id || '1';
  const team2Id = team2Info.teamId || team2Info.id || '2';

  // Extract score information
  let team1Score = { runs: 0, wickets: 0, overs: 0, balls: 0, runRate: 0 };
  let team2Score = { runs: 0, wickets: 0, overs: 0, balls: 0, runRate: 0 };

  if (matchScore) {
    console.log('Processing matchScore:', JSON.stringify(matchScore, null, 2));
    
    // Handle the specific structure we see in the data
    const team1ScoreData = matchScore.team1Score || {};
    const team2ScoreData = matchScore.team2Score || {};
    
    // Function to calculate total score from all innings
    const calculateTotalScore = (teamScoreData: any) => {
      let totalRuns = 0;
      let totalWickets = 0;
      let totalOvers = 0;
      let totalBalls = 0;
      let runRate = 0;
      
      console.log('calculateTotalScore input:', JSON.stringify(teamScoreData, null, 2));
      
      // Check if we have innings data
      if (teamScoreData && Object.keys(teamScoreData).some(key => key.startsWith('inngs'))) {
        // Iterate through all innings
        Object.keys(teamScoreData).forEach(key => {
          if (key.startsWith('inngs')) {
            const innings = teamScoreData[key];
            totalRuns += innings.runs || 0;
            // For wickets, we take the value from the last innings
            totalWickets = innings.wickets || totalWickets;
            // For overs, we need to combine properly
            if (innings.overs) {
              totalOvers += innings.overs;
            }
          }
        });
      } else if (teamScoreData && Object.keys(teamScoreData).length > 0) {
        // Handle single innings or flat structure
        totalRuns = teamScoreData.runs || 0;
        totalWickets = teamScoreData.wickets || 0;
        totalOvers = teamScoreData.overs || 0;
        totalBalls = teamScoreData.balls || 0;
        runRate = teamScoreData.runRate || teamScoreData.runrate || teamScoreData.rpo || 0;
      }
      
      const result = {
        runs: totalRuns,
        wickets: totalWickets,
        overs: totalOvers,
        balls: totalBalls,
        runRate: runRate
      };
      
      console.log('calculateTotalScore output:', result);
      return result;
    };
    
    // Extract detailed score information for team 1
    team1Score = calculateTotalScore(team1ScoreData);
    
    // Extract detailed score information for team 2
    team2Score = calculateTotalScore(team2ScoreData);
  }

  console.log('Extracted scores:', { team1Score, team2Score });

  // Create teams array in the expected format
  const teams = [
    {
      teamId: team1Id.toString(),
      teamName: team1Name,
      teamShortName: team1Info.teamSName || team1Name.substring(0, 3),
      score: team1Score,
      isWinner: matchInfo.winner && matchInfo.winner === team1Id.toString()
    },
    {
      teamId: team2Id.toString(),
      teamName: team2Name,
      teamShortName: team2Info.teamSName || team2Name.substring(0, 3),
      score: team2Score,
      isWinner: matchInfo.winner && matchInfo.winner === team2Id.toString()
    }
  ];
  
  // Extract other information
  const format = matchInfo.matchFormat || matchInfo.matchType || originalMatch.format || 'Other';
  const title = matchInfo.matchDesc || matchInfo.title || matchInfo.name || `${team1Name} vs ${team2Name}`;
  const rawStatus = matchInfo.status || matchInfo.state || originalMatch.status || 'COMPLETED';
  const status = mapStatusToEnum(rawStatus);
  
  const seriesName = matchInfo.seriesName || matchInfo.tour || 'Unknown Series';
  const seriesId = matchInfo.seriesId || matchInfo.tourId || '0';
  
  const venueName = matchInfo.venueInfo?.ground || matchInfo.venueInfo?.stadium || matchInfo.venue || 'Venue TBD';
  const venueCity = matchInfo.venueInfo?.city || '';
  const venueCountry = matchInfo.venueInfo?.country || '';
  
  let startDate = null;
  if (matchInfo.startDate) startDate = new Date(parseInt(matchInfo.startDate));
  else if (matchInfo.startDateTime) startDate = new Date(matchInfo.startDateTime);
  else if (originalMatch.startDate) startDate = new Date(originalMatch.startDate);
  
  let endDate = null;
  if (matchInfo.endDate) endDate = new Date(parseInt(matchInfo.endDate));
  else if (matchInfo.endDateTime) endDate = new Date(matchInfo.endDateTime);
  else if (originalMatch.endDate) endDate = new Date(originalMatch.endDate);
  
  // Extract result information
  const resultText = matchInfo.status || matchInfo.result || matchInfo.winner || '';
  const winnerTeam = matchInfo.winnerTeam || matchInfo.winner || '';
  
  // Extract toss information if available
  let tossResults = undefined;
  if (matchInfo.tossWinner || matchInfo.toss) {
    tossResults = {
      tossWinnerTeam: matchInfo.tossWinner || matchInfo.toss.winner || '',
      decision: matchInfo.tossDecision || matchInfo.toss.decision || 'BAT'
    };
  }
  
  // Return the processed match with proper structure
  return {
    ...originalMatch,
    matchId: matchInfo.matchId?.toString() || originalMatch.matchId,
    format,
    title,
    shortTitle: matchInfo.shortDesc || matchInfo.subtitle || title,
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
    startDate: startDate && !isNaN(startDate.getTime()) ? startDate : originalMatch.startDate,
    endDate: endDate && !isNaN(endDate.getTime()) ? endDate : originalMatch.endDate,
    result: {
      resultText,
      winnerTeam,
      winType: matchInfo.winType || matchInfo.margin?.type || '',
      winMargin: matchInfo.winMargin || matchInfo.margin?.value || 0
    },
    tossResults,
    isLive: status.toLowerCase().includes('live') || originalMatch.isLive || false
  };
}