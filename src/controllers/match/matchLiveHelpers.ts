import Match from '../../models/Match';

// Helper function to map API status to our enum values
const mapStatusToEnum = (status: string): 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'ABANDONED' | 'CANCELLED' => {
  if (!status) return 'LIVE'; // For live helpers, default to LIVE if no status
  
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

  // Default fallback for live helpers
  return 'LIVE';
};

// Function to process raw match data and extract proper fields
export function processRawMatchData(match: any) {
  // If we already have proper data, return as is
  if (match.title && match.title !== ' vs ' && match.teams && match.teams.length > 0) {
    return match;
  }
  
  // Try to extract data from raw field
  if (match.raw) {
    try {
      // Handle the structure with seriesMatches directly
      if (match.raw.seriesMatches && Array.isArray(match.raw.seriesMatches)) {
        for (const seriesMatch of match.raw.seriesMatches) {
          if (seriesMatch.seriesAdWrapper && seriesMatch.seriesAdWrapper.matches) {
            for (const m of seriesMatch.seriesAdWrapper.matches) {
              if (m.matchInfo) {
                return extractMatchInfo(m.matchInfo, m.matchScore, match);
              }
            }
          }
        }
      }
      // Handle the structure with typeMatches
      else if (match.raw.typeMatches && Array.isArray(match.raw.typeMatches)) {
        for (const typeMatch of match.raw.typeMatches) {
          if (typeMatch.seriesMatches && Array.isArray(typeMatch.seriesMatches)) {
            for (const seriesMatch of typeMatch.seriesMatches) {
              if (seriesMatch.seriesAdWrapper && seriesMatch.seriesAdWrapper.matches) {
                for (const m of seriesMatch.seriesAdWrapper.matches) {
                  if (m.matchInfo) {
                    return extractMatchInfo(m.matchInfo, m.matchScore, match);
                  }
                }
              }
            }
          }
        }
      }
      // Handle direct matchInfo structure
      else if (match.raw.matchInfo) {
        return extractMatchInfo(match.raw.matchInfo, match.raw.matchScore, match);
      }
      // Handle flat structure (the actual structure we're seeing in the data)
      else if (match.raw.matchid || match.raw.matchId) {
        return extractMatchInfoFromFlatStructure(match.raw, match);
      }
    } catch (error) {
      console.error('Error processing raw match data:', error);
    }
  }
  
  // If we can't extract data, return the original match
  return match;
}

// Helper function to extract match information from flat raw data structure
export function extractMatchInfoFromFlatStructure(rawData: any, originalMatch: any) {
  // Extract team information
  const team1Info = rawData.team1 || {};
  const team2Info = rawData.team2 || {};
  
  const team1Name = team1Info.teamname || team1Info.teamName || team1Info.teamsname || team1Info.teamSName || team1Info.name || 'Team 1';
  const team2Name = team2Info.teamname || team2Info.teamName || team2Info.teamsname || team2Info.teamSName || team2Info.name || 'Team 2';
  const team1Id = team1Info.teamid || team1Info.teamId || team1Info.id || '1';
  const team2Id = team2Info.teamid || team2Info.teamId || team2Info.id || '2';

  // Extract score information from matchScore if available
  let team1Score = { runs: 0, wickets: 0, overs: 0, balls: 0, runRate: 0 };
  let team2Score = { runs: 0, wickets: 0, overs: 0, balls: 0, runRate: 0 };

  // Check for score data in multiple locations
  const matchScore = rawData.matchScore || originalMatch.matchScore || rawData.score || originalMatch.score || {};
  
  if (matchScore && Object.keys(matchScore).length > 0) {
    // Handle the specific structure we see in the data
    const team1ScoreData = matchScore.team1Score || matchScore[0] || matchScore.team1 || {};
    const team2ScoreData = matchScore.team2Score || matchScore[1] || matchScore.team2 || {};
    
    // Function to calculate total score from all innings
    const calculateTotalScore = (teamScoreData: any) => {
      let totalRuns = 0;
      let totalWickets = 0;
      let totalOvers = 0;
      let totalBalls = 0;
      let runRate = 0;
      
      // Check if we have innings data
      if (Object.keys(teamScoreData).some(key => key.startsWith('inngs'))) {
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
      } else if (Object.keys(teamScoreData).length > 0) {
        // Handle single innings or flat structure
        totalRuns = teamScoreData.runs || 0;
        totalWickets = teamScoreData.wickets || 0;
        totalOvers = teamScoreData.overs || 0;
        totalBalls = teamScoreData.balls || 0;
        runRate = teamScoreData.runRate || teamScoreData.runrate || teamScoreData.rpo || 0;
      }
      
      return {
        runs: totalRuns,
        wickets: totalWickets,
        overs: totalOvers,
        balls: totalBalls,
        runRate: runRate
      };
    };
    
    // Extract detailed score information for team 1
    team1Score = calculateTotalScore(team1ScoreData);
    
    // Extract detailed score information for team 2
    team2Score = calculateTotalScore(team2ScoreData);
  }

  // Create teams array in the expected format
  const teams = [
    {
      teamId: team1Id.toString(),
      teamName: team1Name,
      teamShortName: team1Info.teamsname || team1Info.teamSName || team1Name.substring(0, 3),
      score: team1Score,
      isWinner: rawData.winner && rawData.winner === team1Id.toString()
    },
    {
      teamId: team2Id.toString(),
      teamName: team2Name,
      teamShortName: team2Info.teamsname || team2Info.teamSName || team2Name.substring(0, 3),
      score: team2Score,
      isWinner: rawData.winner && rawData.winner === team2Id.toString()
    }
  ];
  
  // Extract other information
  const format = rawData.matchformat || rawData.matchFormat || rawData.format || originalMatch.format || 'Other';
  const title = rawData.matchdesc || rawData.matchDesc || rawData.title || rawData.name || `${team1Name} vs ${team2Name}`;
  const rawStatus = rawData.status || rawData.state || originalMatch.status || 'LIVE';
  const status = mapStatusToEnum(rawStatus);
  
  const seriesName = rawData.seriesname || rawData.seriesName || 'Unknown Series';
  const seriesId = rawData.seriesid || rawData.seriesId || '0';
  
  const venueInfo = rawData.venueinfo || rawData.venueInfo || {};
  const venueName = venueInfo.ground || venueInfo.stadium || rawData.venue || 'Venue TBD';
  const venueCity = venueInfo.city || '';
  const venueCountry = venueInfo.country || '';
  
  let startDate = null;
  if (rawData.startdate) startDate = new Date(parseInt(rawData.startdate));
  else if (rawData.startDate) startDate = new Date(parseInt(rawData.startDate));
  else if (originalMatch.startDate) startDate = new Date(originalMatch.startDate);
  
  let endDate = null;
  if (rawData.enddate) endDate = new Date(parseInt(rawData.enddate));
  else if (rawData.endDate) endDate = new Date(parseInt(rawData.endDate));
  else if (originalMatch.endDate) endDate = new Date(originalMatch.endDate);
  
  // Extract result information if available (for live matches that might be completed)
  const resultText = rawData.status || rawData.result || rawData.winner || '';
  const winnerTeam = rawData.winnerTeam || rawData.winner || '';
  
  // Extract toss information if available
  let tossResults = undefined;
  if (rawData.tossstatus) {
    tossResults = {
      tossWinnerTeam: rawData.tossstatus.split(' opt to ')[0] || '',
      decision: rawData.tossstatus.includes('bat') ? 'BAT' : 'BOWL'
    };
  }
  
  // Extract commentary information if available
  let commentary = undefined;
  if (rawData.status) {
    commentary = {
      liveText: rawData.status,
      lastUpdated: new Date()
    };
  }
  
  // Return the processed match with proper structure
  return {
    ...originalMatch,
    matchId: (rawData.matchid || rawData.matchId)?.toString() || originalMatch.matchId,
    format,
    title,
    shortTitle: rawData.shortstatus || rawData.shortStatus || title,
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
    result: resultText || winnerTeam ? {
      resultText,
      winnerTeam,
    } : undefined,
    tossResults,
    commentary,
    isLive: status.toLowerCase().includes('live') || originalMatch.isLive || true // Live matches should be marked as live
  };
}

// Helper function to extract match information from raw data
export function extractMatchInfo(matchInfo: any, matchScore: any, originalMatch: any) {
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

  // Use matchScore if available, otherwise fallback to matchInfo scores
  const scoreData = matchScore || matchInfo.matchScore || {};
  
  if (scoreData && Object.keys(scoreData).length > 0) {
    // Handle the specific structure we see in the data
    const team1ScoreData = scoreData.team1Score || scoreData[0] || scoreData.team1 || {};
    const team2ScoreData = scoreData.team2Score || scoreData[1] || scoreData.team2 || {};
    
    // Function to calculate total score from all innings
    const calculateTotalScore = (teamScoreData: any) => {
      let totalRuns = 0;
      let totalWickets = 0;
      let totalOvers = 0;
      let totalBalls = 0;
      let runRate = 0;
      
      // Check if we have innings data
      if (Object.keys(teamScoreData).some(key => key.startsWith('inngs'))) {
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
      } else if (Object.keys(teamScoreData).length > 0) {
        // Handle single innings or flat structure
        totalRuns = teamScoreData.runs || 0;
        totalWickets = teamScoreData.wickets || 0;
        totalOvers = teamScoreData.overs || 0;
        totalBalls = teamScoreData.balls || 0;
        runRate = teamScoreData.runRate || teamScoreData.runrate || teamScoreData.rpo || 0;
      }
      
      return {
        runs: totalRuns,
        wickets: totalWickets,
        overs: totalOvers,
        balls: totalBalls,
        runRate: runRate
      };
    };
    
    // Extract detailed score information for team 1
    team1Score = calculateTotalScore(team1ScoreData);
    
    // Extract detailed score information for team 2
    team2Score = calculateTotalScore(team2ScoreData);
  }

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
  const rawStatus = matchInfo.status || matchInfo.state || originalMatch.status || 'LIVE';
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
  
  // Extract result information if available (for live matches that might be completed)
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
  
  // Extract commentary information if available
  let commentary = undefined;
  if (matchInfo.liveText || matchInfo.commentary) {
    commentary = {
      liveText: matchInfo.liveText || matchInfo.commentary?.text || '',
      lastUpdated: matchInfo.lastUpdated ? new Date(matchInfo.lastUpdated) : new Date()
    };
  }
  
  // Extract currently playing information if available
  let currentlyPlaying = undefined;
  if (matchInfo.currBatTeamId) {
    currentlyPlaying = {
      teamId: matchInfo.currBatTeamId?.toString(),
      innings: matchInfo.currInngs || 1
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
    result: resultText || winnerTeam ? {
      resultText,
      winnerTeam,
    } : undefined,
    tossResults,
    commentary,
    currentlyPlaying,
    isLive: status.toLowerCase().includes('live') || originalMatch.isLive || true // Live matches should be marked as live
  };
}

// Helper function to extract current scores from scorecard data
export function extractScoresFromScorecard(scorecardData: any): { team1Score: any, team2Score: any } {
  const team1Score = { runs: 0, wickets: 0, overs: 0, balls: 0, runRate: 0 };
  const team2Score = { runs: 0, wickets: 0, overs: 0, balls: 0, runRate: 0 };

  // Handle different scorecard data structures
  let inningsData = null;
  
  // Check if scorecardData is the actual scorecard object or nested inside a scorecard property
  if (scorecardData && scorecardData.scorecard && Array.isArray(scorecardData.scorecard)) {
    inningsData = scorecardData.scorecard;
  } else if (Array.isArray(scorecardData)) {
    inningsData = scorecardData;
  }

  if (!inningsData || !Array.isArray(inningsData)) {
    console.log('No valid innings data found in scorecard');
    return { team1Score, team2Score };
  }

  console.log(`Processing ${inningsData.length} innings from scorecard`);

  // Process each innings to get current scores
  inningsData.forEach((innings: any, index: number) => {
    if (!innings) {
      console.log(`Skipping null innings at index ${index}`);
      return;
    }
    
    // Handle Mongoose document structure - data might be in _doc field
    let inningsData = innings;
    if (innings._doc) {
      inningsData = innings._doc;
    }
    
    // Log the keys for debugging
    const keys = Object.keys(inningsData);
    console.log(`Innings ${index + 1} keys:`, keys.slice(0, 15)); // Log first 15 keys
    
    // Log the entire innings data for debugging (first few fields)
    console.log(`Innings ${index + 1} data sample:`, {
      totalRuns: inningsData.totalRuns,
      total: inningsData.total,
      runs: inningsData.runs,
      score: inningsData.score,
      wickets: inningsData.wickets,
      overs: inningsData.overs
    });
    
    // Log batsmen data if it exists
    let batsmen = inningsData.batsmen || inningsData.batsman;
    console.log(`Innings ${index + 1} batsmen/batsman data type:`, typeof batsmen);
    
    // Log the structure of batsmen/batsman data for debugging
    if (batsmen && typeof batsmen === 'object') {
      const batsmenKeys = Object.keys(batsmen);
      console.log(`Innings ${index + 1} batsmen/batsman keys:`, batsmenKeys.slice(0, 10));
      
      // Log the actual batsman field data if it exists
      if (inningsData.batsman) {
        console.log(`Innings ${index + 1} inningsData.batsman type:`, typeof inningsData.batsman);
        if (typeof inningsData.batsman === 'object') {
          const batsmanKeys = Object.keys(inningsData.batsman);
          console.log(`Innings ${index + 1} inningsData.batsman keys:`, batsmanKeys.slice(0, 10));
          
          // Check structure of individual batsman entries
          batsmanKeys.forEach(key => {
            const value = inningsData.batsman[key];
            if (value && typeof value === 'object' && value.runs !== undefined) {
              console.log(`Innings ${index + 1} batsman[${key}] has runs:`, value.runs);
            }
          });
        }
      }
      
      // Also log the inningsData.batsmen field specifically
      if (inningsData.batsmen) {
        console.log(`Innings ${index + 1} inningsData.batsmen type:`, typeof inningsData.batsmen);
        if (typeof inningsData.batsmen === 'object' && !Array.isArray(inningsData.batsmen)) {
          const batsmenKeys = Object.keys(inningsData.batsmen);
          console.log(`Innings ${index + 1} inningsData.batsmen keys:`, batsmenKeys.slice(0, 10));
        }
      }
      
      // Check if any of the keys look like batsman data
      const potentialBatsmenKeys = batsmenKeys.filter(key => {
        const value = (batsmen as any)[key];
        return value && typeof value === 'object' && value.runs !== undefined;
      });
      
      if (potentialBatsmenKeys.length > 0) {
        console.log(`Innings ${index + 1} potential batsmen keys:`, potentialBatsmenKeys);
        // Log first potential batsman data
        if (potentialBatsmenKeys.length > 0) {
          const firstBatsman = (batsmen as any)[potentialBatsmenKeys[0]];
          console.log(`Innings ${index + 1} first potential batsman data:`, firstBatsman);
        }
      }
    }
    
    // Handle both array and object formats for logging
    if (batsmen && !Array.isArray(batsmen)) {
      // If it's an object, check if it has a batsman array property
      if ((batsmen as any).batsman && Array.isArray((batsmen as any).batsman)) {
        batsmen = (batsmen as any).batsman;
      } 
      // Or convert object values to array if it's a key-value object
      else if (typeof batsmen === 'object' && batsmen !== null) {
        const batsmenValues: any[] = Object.values(batsmen);
        if (batsmenValues.length > 0 && batsmenValues[0].runs !== undefined) {
          batsmen = batsmenValues;
        } else {
          batsmen = [];
        }
      } else {
        batsmen = [];
      }
    }
    
    if (Array.isArray(batsmen)) {
      console.log(`Innings ${index + 1} processed batsmen count:`, batsmen.length);
      if (batsmen.length > 0) {
        console.log(`Innings ${index + 1} first processed batsman keys:`, Object.keys(batsmen[0]));
        console.log(`Innings ${index + 1} first processed batsman data:`, batsmen[0]);
      }
    }
    
    // Extract runs, wickets, and overs with multiple fallbacks
    let runs = 0;
    let wickets = 0;
    let overs = 0;
    
    // Try to find runs in various possible locations
    runs = inningsData.totalRuns || 
           inningsData.total || 
           inningsData.runs || 
           inningsData.score ||
           (inningsData.batTeamDetails ? inningsData.batTeamDetails.totalRuns : 0) ||
           (inningsData.batTeamDetails ? inningsData.batTeamDetails.runs : 0) ||
           (inningsData.batTeamDetails ? inningsData.batTeamDetails.score : 0) ||
           (inningsData.scoreObj ? inningsData.scoreObj.totalRuns : 0) ||
           (inningsData.scoreObj ? inningsData.scoreObj.runs : 0) ||
           0;
           
    // If still no runs, try to calculate from batsmen data
    if (runs === 0 && (inningsData.batsmen || inningsData.batsman)) {
      let batsmen = inningsData.batsmen || inningsData.batsman;
      
      // Log what we're working with
      console.log(`Innings ${index + 1}: Initial batsmen type:`, typeof batsmen, 'isArray:', Array.isArray(batsmen));
      
      // Handle different possible structures for batsmen data
      if (batsmen && !Array.isArray(batsmen)) {
        // If it's an object, check if it has a batsman array property
        if ((batsmen as any).batsman && Array.isArray((batsmen as any).batsman)) {
          batsmen = (batsmen as any).batsman;
          console.log(`Innings ${index + 1}: Using batsmen.batsman array`);
        } 
        // Check if we should use the inningsData.batsman field directly
        else if (inningsData.batsman && typeof inningsData.batsman === 'object') {
          // Get all batsman entries from the inningsData.batsman object
          const batsmanEntries = Object.entries(inningsData.batsman);
          console.log(`Innings ${index + 1}: Found ${batsmanEntries.length} entries in inningsData.batsman`);
          
          // Filter for entries that look like batsman data (have runs property)
          const validBatsmen = batsmanEntries.filter(([key, value]) => {
            const isValid = value && 
              typeof value === 'object' && 
              (value as any).runs !== undefined;
            if (isValid) {
              console.log(`Innings ${index + 1}: Valid batsman entry [${key}]:`, (value as any).runs, 'runs');
            }
            return isValid;
          }).map(([key, value]) => value);
          
          if (validBatsmen.length > 0) {
            batsmen = validBatsmen;
            console.log(`Innings ${index + 1}: Using ${validBatsmen.length} valid batsmen from inningsData.batsman`);
          } else {
            // If we have numeric keys, try to extract all values
            const numericKeys = Object.keys(inningsData.batsman).filter(key => !isNaN(Number(key)));
            if (numericKeys.length > 0) {
              batsmen = numericKeys.map(key => inningsData.batsman[key]);
              console.log(`Innings ${index + 1}: Using ${batsmen.length} batsmen from numeric keys`);
            } else {
              batsmen = [];
              console.log(`Innings ${index + 1}: No valid batsmen found in inningsData.batsman`);
            }
          }
        }
        // Check if it's the main batsman object with individual batsman properties
        else if (typeof batsmen === 'object' && batsmen !== null) {
          // Try to get all batsman entries from the object
          const batsmenEntries = Object.entries(batsmen);
          console.log(`Innings ${index + 1}: Found ${batsmenEntries.length} entries in batsmen object`);
          
          // Filter for entries that look like batsman data (have runs property)
          const validBatsmen = batsmenEntries.filter(([key, value]) => {
            const isValid = key !== 'batsman' &&  // Exclude the batsman property itself if it exists
              value && 
              typeof value === 'object' && 
              (value as any).runs !== undefined;
            if (isValid) {
              console.log(`Innings ${index + 1}: Valid batsman entry [${key}]:`, (value as any).runs, 'runs');
            }
            return isValid;
          }).map(([key, value]) => value);
          
          if (validBatsmen.length > 0) {
            batsmen = validBatsmen;
            console.log(`Innings ${index + 1}: Using ${validBatsmen.length} valid batsmen from batsmen object`);
          } else {
            batsmen = [];
            console.log(`Innings ${index + 1}: No valid batsmen found in batsmen object`);
          }
        } else {
          batsmen = [];
          console.log(`Innings ${index + 1}: batsmen is not an object or array, setting to empty array`);
        }
      } else if (batsmen && Array.isArray(batsmen) && batsmen.length === 0) {
        // If batsmen is an empty array, try to populate it from inningsData.batsman
        console.log(`Innings ${index + 1}: batsmen is empty array, checking inningsData.batsman`);
        if (inningsData.batsman && typeof inningsData.batsman === 'object') {
          // Get all batsman entries from the inningsData.batsman object
          const batsmanEntries = Object.entries(inningsData.batsman);
          console.log(`Innings ${index + 1}: Found ${batsmanEntries.length} entries in inningsData.batsman`);
          
          // Filter for entries that look like batsman data (have runs property)
          const validBatsmen = batsmanEntries.filter(([key, value]) => {
            const isValid = value && 
              typeof value === 'object' && 
              (value as any).runs !== undefined;
            if (isValid) {
              console.log(`Innings ${index + 1}: Valid batsman entry [${key}]:`, (value as any).runs, 'runs');
            }
            return isValid;
          }).map(([key, value]) => value);
          
          if (validBatsmen.length > 0) {
            batsmen = validBatsmen;
            console.log(`Innings ${index + 1}: Using ${validBatsmen.length} valid batsmen from inningsData.batsman`);
          } else {
            // If we have numeric keys, try to extract all values
            const numericKeys = Object.keys(inningsData.batsman).filter(key => !isNaN(Number(key)));
            if (numericKeys.length > 0) {
              batsmen = numericKeys.map(key => inningsData.batsman[key]);
              console.log(`Innings ${index + 1}: Using ${batsmen.length} batsmen from numeric keys`);
            }
          }
        }
      }
      
      console.log(`Innings ${index + 1}: Final batsmen array length:`, Array.isArray(batsmen) ? batsmen.length : 'not an array');
      
      if (Array.isArray(batsmen) && batsmen.length > 0) {
        // Calculate total runs from individual batsmen scores
        runs = batsmen.reduce((total, batsman) => {
          const batsmanRuns = batsman?.runs || 0;
          console.log(`Innings ${index + 1}: Adding batsman runs: ${batsmanRuns}`);
          return total + batsmanRuns;
        }, 0);
        console.log(`Innings ${index + 1}: Calculated runs from batsmen data: ${runs}`);
      }
    }
           
    // Try to find wickets in various possible locations
    wickets = inningsData.totalWickets || 
              inningsData.wickets || 
              inningsData.wkts ||
              (inningsData.batTeamDetails ? inningsData.batTeamDetails.totalWickets : 0) ||
              (inningsData.batTeamDetails ? inningsData.batTeamDetails.wickets : 0) ||
              (inningsData.batTeamDetails ? inningsData.batTeamDetails.wkts : 0) ||
              (inningsData.scoreObj ? inningsData.scoreObj.totalWickets : 0) ||
              (inningsData.scoreObj ? inningsData.scoreObj.wickets : 0) ||
              0;
              
    // Try to find overs in various possible locations
    overs = inningsData.totalOvers || 
            inningsData.overs || 
            inningsData.over ||
            (inningsData.batTeamDetails ? inningsData.batTeamDetails.totalOvers : 0) ||
            (inningsData.batTeamDetails ? inningsData.batTeamDetails.overs : 0) ||
            (inningsData.batTeamDetails ? inningsData.batTeamDetails.over : 0) ||
            (inningsData.scoreObj ? inningsData.scoreObj.totalOvers : 0) ||
            (inningsData.scoreObj ? inningsData.scoreObj.overs : 0) ||
            0;
    
    console.log(`Innings ${index + 1}: runs=${runs}, wickets=${wickets}, overs=${overs}`);
    
    // Assign to team1 or team2 based on innings order
    if (index === 0) {
      team1Score.runs = runs;
      team1Score.wickets = wickets;
      team1Score.overs = overs;
      // Calculate balls from overs (e.g., 12.3 overs = 12*6 + 3 = 75 balls)
      team1Score.balls = Math.floor(overs) * 6 + Math.round((overs - Math.floor(overs)) * 10);
      
      // Calculate run rate if not provided and overs > 0
      if (!team1Score.runRate && overs > 0) {
        team1Score.runRate = parseFloat((runs / overs).toFixed(2));
      }
    } else if (index === 1) {
      team2Score.runs = runs;
      team2Score.wickets = wickets;
      team2Score.overs = overs;
      // Calculate balls from overs
      team2Score.balls = Math.floor(overs) * 6 + Math.round((overs - Math.floor(overs)) * 10);
      
      // Calculate run rate if not provided and overs > 0
      if (!team2Score.runRate && overs > 0) {
        team2Score.runRate = parseFloat((runs / overs).toFixed(2));
      }
    }
  });

  console.log(`Extracted scores - Team1: ${team1Score.runs}/${team1Score.wickets} (${team1Score.overs} ov), Team2: ${team2Score.runs}/${team2Score.wickets} (${team2Score.overs} ov)`);
  
  return { team1Score, team2Score };
}
