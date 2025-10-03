// Match detail helper functions

// Helper function to extract team scores from match data
export function extractTeamScore(matchData: any, teamKey: string) {
  const defaultScore = {
    runs: 0,
    wickets: 0,
    overs: 0,
    balls: 0,
    runRate: 0,
    requiredRunRate: 0
  };

  try {
    console.log(`🔍 Extracting score for ${teamKey}:`, JSON.stringify(matchData.scorecard, null, 2));
    
    // For completed matches, extract scores from the scorecard data
    if (matchData.scorecard?.scorecard && matchData.scorecard.scorecard.length > 0) {
      const scorecard = matchData.scorecard.scorecard;
      console.log(`📊 Scorecard data for ${teamKey}:`, JSON.stringify(scorecard, null, 2));

      // Try to find the correct innings for this team
      let targetInnings = null;
      
      // Let's properly match teams to innings by looking at the actual data
      // Instead of guessing, let's use the team names to match correctly
      
      const team1Name = matchData.matchInfo?.team1?.teamname || matchData.matchInfo?.team1?.teamName || '';
      const team2Name = matchData.matchInfo?.team2?.teamname || matchData.matchInfo?.team2?.teamName || '';
      const currentTeamName = teamKey === 'team1' ? team1Name : team2Name;
      
      console.log(`🔍 Looking for ${teamKey} (${currentTeamName}) in ${scorecard.length} innings`);
      console.log(`🏏 Team1: ${team1Name}, Team2: ${team2Name}`);
      
      // Look through all innings to find the one that matches this team
      for (let i = 0; i < scorecard.length; i++) {
        const innings = scorecard[i];
        const battingTeamName = innings.batteamname || innings.batTeamName || '';
        const runs = innings.score || innings.runs || innings.totalRuns || innings.totalruns || 0;
        const wickets = innings.wickets || innings.totalWickets || innings.totalwickets || 0;
        const overs = innings.overs || innings.totalOvers || innings.totalovers || 0;
        
        console.log(`📊 Innings ${i + 1} (ID: ${innings.inningsid}):`, {
          battingTeam: battingTeamName,
          runs: runs,
          wickets: wickets,
          overs: overs
        });
        
        // Match by team name instead of innings position
        // This is more reliable than assuming innings order
        if (battingTeamName) {
          const lowerBattingTeam = battingTeamName.toLowerCase();
          const lowerCurrentTeam = currentTeamName.toLowerCase();
          
          // First try exact team name matching
          if (lowerCurrentTeam && lowerBattingTeam.includes(lowerCurrentTeam)) {
            targetInnings = innings;
            console.log(`✅ Matched ${teamKey} (${currentTeamName}) to innings with batting team: ${battingTeamName}`);
            break;
          }
          
          // Fallback to common team name patterns
          if (teamKey === 'team1') {
            if (lowerBattingTeam.includes('india') || lowerBattingTeam.includes('ind')) {
              targetInnings = innings;
              console.log(`✅ Matched ${teamKey} (India pattern) to innings with batting team: ${battingTeamName}`);
              break;
            }
          }
          
          if (teamKey === 'team2') {
            if (lowerBattingTeam.includes('west indies') || lowerBattingTeam.includes('wi')) {
              targetInnings = innings;
              console.log(`✅ Matched ${teamKey} (West Indies pattern) to innings with batting team: ${battingTeamName}`);
              break;
            }
          }
        }
      }
      
      // Fallback: if no match found, use simple index
      if (!targetInnings) {
        console.log(`⚠️ No innings match found, using fallback`);
        const inningsIndex = teamKey === 'team1' ? 0 : 1;
        if (scorecard.length > inningsIndex) {
          targetInnings = scorecard[inningsIndex];
        }
      }

      if (targetInnings) {
        console.log(`🎯 Using innings data for ${teamKey}:`, JSON.stringify(targetInnings, null, 2));
        
        // Try to extract from batTeamDetails first
        if (targetInnings.batTeamDetails) {
          const batDetails = targetInnings.batTeamDetails;
          return {
            runs: batDetails.runs || batDetails.totalRuns || batDetails.score || 0,
            wickets: batDetails.wickets || batDetails.totalWickets || batDetails.wkts || 0,
            overs: batDetails.overs || batDetails.totalOvers || 0,
            balls: batDetails.balls || batDetails.totalBalls || 0,
            runRate: batDetails.runRate || batDetails.rr || 0,
            requiredRunRate: batDetails.requiredRunRate || batDetails.rrr || 0
          };
        }
        
        // Fallback to direct innings data
        const runs = targetInnings.score || targetInnings.totalRuns || targetInnings.totalruns || targetInnings.runs || 0;
        const wickets = targetInnings.wickets || targetInnings.totalWickets || targetInnings.totalwickets || targetInnings.wkts || 0;
        const overs = targetInnings.overs || targetInnings.totalOvers || targetInnings.totalovers || 0;

        return {
          runs: runs,
          wickets: wickets,
          overs: overs,
          balls: targetInnings.balls || targetInnings.totalballs || 0,
          runRate: targetInnings.runRate || targetInnings.runrate || 0,
          requiredRunRate: targetInnings.requiredRunRate || targetInnings.requiredrunrate || 0
        };
      }
    }

    // Try multiple locations for matchScore data (fallback for live matches)
    const matchScore = matchData.matchScore || matchData.score || matchData.scr || null;

    if (!matchScore) {
      // Try to get score from matchInfo if available
      if (matchData.matchInfo?.score) {
        const score = matchData.matchInfo.score;
        return {
          runs: score.r || score.runs || 0,
          wickets: score.w || score.wickets || 0,
          overs: score.o || score.overs || 0,
          balls: score.b || score.balls || 0,
          runRate: score.rr || score.runRate || 0,
          requiredRunRate: score.rrr || score.requiredRunRate || 0
        };
      }
      return defaultScore;
    }

    const teamScoreKey = `${teamKey}Score`;
    const teamScore = matchScore[teamScoreKey] || matchScore[teamKey];

    if (!teamScore) {
      // Try to get score directly from matchScore if it's not nested
      if (teamKey === 'team1' && (matchScore.t1s || matchScore.team1Score)) {
        const score = matchScore.t1s || matchScore.team1Score;
        return {
          runs: score.r || score.runs || 0,
          wickets: score.w || score.wickets || 0,
          overs: score.o || score.overs || 0,
          balls: score.b || score.balls || 0,
          runRate: score.rr || score.runRate || 0,
          requiredRunRate: score.rrr || score.requiredRunRate || 0
        };
      }
      if (teamKey === 'team2' && (matchScore.t2s || matchScore.team2Score)) {
        const score = matchScore.t2s || matchScore.team2Score;
        return {
          runs: score.r || score.runs || 0,
          wickets: score.w || score.wickets || 0,
          overs: score.o || score.overs || 0,
          balls: score.b || score.balls || 0,
          runRate: score.rr || score.runRate || 0,
          requiredRunRate: score.rrr || score.requiredRunRate || 0
        };
      }
      return defaultScore;
    }

    let totalRuns = 0;
    let totalWickets = 0;
    let totalOvers = 0;
    let totalBalls = 0;

    // Iterate through all innings for the team
    Object.keys(teamScore).forEach(key => {
      if (key.startsWith('inngs') || key.startsWith('inning')) {
        const innings = teamScore[key];
        totalRuns += innings.r || innings.runs || innings.score || 0;
        totalWickets = Math.max(totalWickets, innings.w || innings.wkts || innings.wickets || 0);
        totalOvers += innings.o || innings.overs || 0;
        totalBalls += innings.b || innings.balls || 0;
      }
    });

    const runRate = totalOvers > 0 ? (totalRuns / totalOvers) : 0;

    return {
      runs: totalRuns,
      wickets: totalWickets,
      overs: totalOvers,
      balls: totalBalls,
      runRate: parseFloat(runRate.toFixed(2)),
      requiredRunRate: 0
    };
  } catch (error) {
    console.error(`Error extracting score for ${teamKey}:`, error);
    return defaultScore;
  }
}

// Function to fetch match info data
export async function fetchMatchInfo(id: string, headers: any, RAPIDAPI_MATCHES_INFO_URL: string | undefined) {
  if (!RAPIDAPI_MATCHES_INFO_URL) return null;

  const { rapidApiRateLimiter } = await import('../../utils/rateLimiter');
  const infoUrl = `${RAPIDAPI_MATCHES_INFO_URL}/${id}`;

  return await rapidApiRateLimiter.makeRequest(infoUrl, { headers });
}

// Function to fetch scorecard data
export async function fetchScorecard(id: string, headers: any, RAPIDAPI_MATCHES_INFO_URL: string | undefined) {
  if (!RAPIDAPI_MATCHES_INFO_URL) return null;

  const { rapidApiRateLimiter } = await import('../../utils/rateLimiter');
  const scorecardUrl = `${RAPIDAPI_MATCHES_INFO_URL}/${id}/scard`;

  return await rapidApiRateLimiter.makeRequest(scorecardUrl, { headers });
}

// Function to fetch historical scorecard data
export async function fetchHistoricalScorecard(id: string, headers: any, RAPIDAPI_MATCHES_INFO_URL: string | undefined) {
  if (!RAPIDAPI_MATCHES_INFO_URL) return null;

  const { rapidApiRateLimiter } = await import('../../utils/rateLimiter');
  const hscorecardUrl = `${RAPIDAPI_MATCHES_INFO_URL}/${id}/hscard`;

  return await rapidApiRateLimiter.makeRequest(hscorecardUrl, { headers });
}

// Function to fetch commentary data
export async function fetchCommentary(id: string, headers: any, RAPIDAPI_MATCHES_INFO_URL: string | undefined) {
  if (!RAPIDAPI_MATCHES_INFO_URL) return null;

  const { rapidApiRateLimiter } = await import('../../utils/rateLimiter');
  const commentaryUrl = `${RAPIDAPI_MATCHES_INFO_URL}/${id}/comm`;

  return await rapidApiRateLimiter.makeRequest(commentaryUrl, { headers });
}

// Function to fetch historical commentary data
export async function fetchHistoricalCommentary(id: string, headers: any, RAPIDAPI_MATCHES_INFO_URL: string | undefined) {
  if (!RAPIDAPI_MATCHES_INFO_URL) return null;

  const { rapidApiRateLimiter } = await import('../../utils/rateLimiter');
  const hcommentaryUrl = `${RAPIDAPI_MATCHES_INFO_URL}/${id}/hcomm`;

  return await rapidApiRateLimiter.makeRequest(hcommentaryUrl, { headers });
}

// Function to fetch overs data
export async function fetchOvers(id: string, headers: any, RAPIDAPI_MATCHES_INFO_URL: string | undefined) {
  if (!RAPIDAPI_MATCHES_INFO_URL) return null;

  const { rapidApiRateLimiter } = await import('../../utils/rateLimiter');
  const oversUrl = `${RAPIDAPI_MATCHES_INFO_URL}/${id}/overs`;

  return await rapidApiRateLimiter.makeRequest(oversUrl, { headers });
}