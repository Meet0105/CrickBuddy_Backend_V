import axios from 'axios';
import Match from '../../models/Match';

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
    // For completed matches, extract scores from the scorecard data
    if (matchData.scorecard?.scorecard && matchData.scorecard.scorecard.length > 0) {
      const scorecard = matchData.scorecard.scorecard;
      
      // Team 1 is typically the first innings (index 0)
      // Team 2 is typically the second innings (index 1)
      let inningsIndex = 0;
      if (teamKey === 'team2') {
        inningsIndex = 1;
      }
      
      // Make sure we have the innings data
      if (scorecard.length > inningsIndex) {
        const innings = scorecard[inningsIndex];
        
        // Handle different possible scorecard structures
        // Try various field names for runs, wickets, overs
        const runs = innings.totalRuns || innings.totalruns || innings.runs || innings.score || 0;
        const wickets = innings.totalWickets || innings.totalwickets || innings.wickets || innings.wkts || 0;
        const overs = innings.totalOvers || innings.totalovers || innings.overs || 0;
        
        return {
          runs: runs,
          wickets: wickets,
          overs: overs,
          balls: innings.balls || innings.totalballs || 0,
          runRate: innings.runRate || innings.runrate || 0,
          requiredRunRate: innings.requiredRunRate || innings.requiredrunrate || 0
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
  try {
    const infoUrl = `${RAPIDAPI_MATCHES_INFO_URL}/${id}`;
    console.log('Fetching match info from:', infoUrl);
    const infoResponse = await axios.get(infoUrl, { headers, timeout: 15000 });
    return infoResponse.data;
  } catch (error) {
    console.error('Failed to fetch match info:', error);
    return null;
  }
}

// Function to fetch scorecard data
export async function fetchScorecard(id: string, headers: any, RAPIDAPI_MATCHES_INFO_URL: string | undefined) {
  try {
    const scorecardUrl = `${RAPIDAPI_MATCHES_INFO_URL}/${id}/scard`;
    console.log('Fetching scorecard from:', scorecardUrl);
    const scorecardResponse = await axios.get(scorecardUrl, { headers, timeout: 15000 });
    return scorecardResponse.data;
  } catch (error) {
    console.error('Failed to fetch scorecard:', error);
    return null;
  }
}

// Function to fetch historical scorecard data
export async function fetchHistoricalScorecard(id: string, headers: any, RAPIDAPI_MATCHES_INFO_URL: string | undefined) {
  try {
    const hscorecardUrl = `${RAPIDAPI_MATCHES_INFO_URL}/${id}/hscard`;
    console.log('Fetching historical scorecard from:', hscorecardUrl);
    const hscorecardResponse = await axios.get(hscorecardUrl, { headers, timeout: 15000 });
    return hscorecardResponse.data;
  } catch (error) {
    console.error('Failed to fetch historical scorecard:', error);
    return null;
  }
}

// Function to fetch commentary data
export async function fetchCommentary(id: string, headers: any, RAPIDAPI_MATCHES_INFO_URL: string | undefined) {
  try {
    const commentaryUrl = `${RAPIDAPI_MATCHES_INFO_URL}/${id}/comm`;
    console.log('Fetching commentary from:', commentaryUrl);
    const commentaryResponse = await axios.get(commentaryUrl, { headers, timeout: 15000 });
    return commentaryResponse.data;
  } catch (error) {
    console.error('Failed to fetch commentary:', error);
    return null;
  }
}

// Function to fetch historical commentary data
export async function fetchHistoricalCommentary(id: string, headers: any, RAPIDAPI_MATCHES_INFO_URL: string | undefined) {
  try {
    const hcommentaryUrl = `${RAPIDAPI_MATCHES_INFO_URL}/${id}/hcomm`;
    console.log('Fetching historical commentary from:', hcommentaryUrl);
    const hcommentaryResponse = await axios.get(hcommentaryUrl, { headers, timeout: 15000 });
    return hcommentaryResponse.data;
  } catch (error) {
    console.error('Failed to fetch historical commentary:', error);
    return null;
  }
}

// Function to fetch overs data
export async function fetchOvers(id: string, headers: any, RAPIDAPI_MATCHES_INFO_URL: string | undefined) {
  try {
    const oversUrl = `${RAPIDAPI_MATCHES_INFO_URL}/${id}/overs`;
    console.log('Fetching overs from:', oversUrl);
    const oversResponse = await axios.get(oversUrl, { headers, timeout: 15000 });
    return oversResponse.data;
  } catch (error) {
    console.error('Failed to fetch overs:', error);
    return null;
  }
}