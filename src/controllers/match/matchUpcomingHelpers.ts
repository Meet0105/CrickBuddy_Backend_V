import Match from '../../models/Match';

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
    } catch (error) {
      console.error('Error processing raw match data:', error);
    }
  }
  
  // If we can't extract data, return the original match
  return match;
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

  // For upcoming matches, scores are typically 0
  const team1Score = { runs: 0, wickets: 0, overs: 0, balls: 0, runRate: 0 };
  const team2Score = { runs: 0, wickets: 0, overs: 0, balls: 0, runRate: 0 };

  // Create teams array in the expected format
  const teams = [
    {
      teamId: team1Id.toString(),
      teamName: team1Name,
      teamShortName: team1Info.teamSName || team1Name.substring(0, 3),
      score: team1Score
    },
    {
      teamId: team2Id.toString(),
      teamName: team2Name,
      teamShortName: team2Info.teamSName || team2Name.substring(0, 3),
      score: team2Score
    }
  ];
  
  // Extract other information
  const format = matchInfo.matchFormat || matchInfo.matchType || originalMatch.format || 'Other';
  const title = matchInfo.matchDesc || matchInfo.title || matchInfo.name || `${team1Name} vs ${team2Name}`;
  const rawStatus = matchInfo.status || matchInfo.state || originalMatch.status || 'UPCOMING';
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
    tossResults,
    isLive: false // Upcoming matches are not live
  };
}