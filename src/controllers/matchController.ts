import { Request, Response } from 'express';
// Import all the component functions
import { getAllMatches, getMatchById } from './match/matchCore';
import { getMatchInfo } from './match/matchInfo';
import { getMatchScorecard, getMatchScorecardV2 } from './match/matchScorecard';
import { getMatchCommentaries } from './match/matchCommentaries';
import { getLiveMatches } from './match/matchLive';
import { getRecentMatches } from './match/matchRecent';
import { getUpcomingMatches } from './match/matchUpcoming';
import { searchMatches } from './match/matchSearch';
import { syncRecentMatchesFromRapidAPI, syncUpcomingMatchesFromRapidAPI } from './match/matchSync';
import { syncMatchDetails, syncMultipleMatchDetails } from './match/matchDetailSync';
import { getMatchOvers } from './match/matchMisc';
import { extractTeamScore } from './match/matchDetailHelpers';

// Export all functions
export {
  // Core functions
  getAllMatches,
  getMatchById,
  
  // Info functions
  getMatchInfo,
  
  // Scorecard functions
  getMatchScorecard,
  getMatchScorecardV2,
  
  // Commentary functions
  getMatchCommentaries,
  
  // Live matches functions
  getLiveMatches,
  
  // Recent matches functions
  getRecentMatches,
  
  // Upcoming matches functions
  getUpcomingMatches,
  
  // Search functions
  searchMatches,
  
  // Sync functions
  syncRecentMatchesFromRapidAPI,
  syncUpcomingMatchesFromRapidAPI,
  syncMatchDetails,
  syncMultipleMatchDetails,
  
  // Overs functions
  getMatchOvers,
  
  // Helper functions
  extractTeamScore
};