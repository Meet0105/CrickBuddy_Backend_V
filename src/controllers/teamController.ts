import { Request, Response } from 'express';
// Import all the component functions
import { getAllTeams, getTeamById } from './team/teamCore';
import { syncTeamsFromRapidAPI } from './team/teamSync';
import { getTeamSchedules, getTeamResults, testTeamAPI } from './team/teamSchedule';
import { getTeamNews, getTeamPlayers } from './team/teamNews';
import { getTeamStatsFilters, getTeamStats } from './team/teamStats';

// Export all functions
export {
  // Core functions
  getAllTeams,
  getTeamById,
  
  // Sync functions
  syncTeamsFromRapidAPI,
  
  // Schedule functions
  getTeamSchedules,
  getTeamResults,
  testTeamAPI,
  
  // News and stats functions
  getTeamNews,
  getTeamPlayers,
  getTeamStatsFilters,
  getTeamStats
};