import { Request, Response } from 'express';
// Import all the component functions
import { getAllPlayers, getPlayerById } from './player/playerCore';
import { getPlayerInfo, getPlayerNews } from './player/playerInfo';
import { getPlayerCareer, getPlayerBatting, getPlayerBowling } from './player/playerStats';
import { getTrendingPlayers } from './player/playerTrending';
import { searchPlayers } from './player/playerSearch';
import { syncPlayersFromRapidAPI } from './player/playerSync';

// Export all functions
export {
  // Core functions
  getAllPlayers,
  getPlayerById,
  
  // Info functions
  getPlayerInfo,
  getPlayerNews,
  
  // Stats functions
  getPlayerCareer,
  getPlayerBatting,
  getPlayerBowling,
  
  // Trending functions
  getTrendingPlayers,
  
  // Search functions
  searchPlayers,
  
  // Sync functions
  syncPlayersFromRapidAPI
};