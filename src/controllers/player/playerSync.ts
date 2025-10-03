import Player from '../../models/Player';
import { Request, Response } from 'express';
import axios from 'axios';

// Function to sync players from RapidAPI
export const syncPlayersFromRapidAPI = async (req: Request, res: Response) => {
  try {
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
    const RAPIDAPI_PLAYERS_URL = process.env.RAPIDAPI_PLAYERS_URL;

    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_PLAYERS_URL) {
      return res.status(500).json({ 
        message: 'Missing environment variables for RapidAPI configuration' 
      });
    }

    // Fetch players from RapidAPI
    const response = await axios.get(RAPIDAPI_PLAYERS_URL, {
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST
      }
    });

    const playersData = response.data;

    // Sync players to database
    let syncedCount = 0;
    
    // Handle the structure returned by the search endpoint
    // The response has a 'player' field which is an array of player objects
    if (playersData && playersData.player && Array.isArray(playersData.player)) {
      for (const playerData of playersData.player) {
        // Extract player ID
        const playerId = playerData.id || playerData.playerId;
        
        if (playerId) {
          try {
            // Update or create player in database
            await Player.findOneAndUpdate(
              { playerId: playerId },
              {
                playerId: playerId,
                name: playerData.name || playerData.fullName || '',
                role: playerData.role || playerData.position || '',
                country: playerData.teamName || playerData.country || playerData.nationality || '',
                raw: playerData
              },
              { upsert: true, new: true }
            );
            syncedCount++;
          } catch (error) {
            console.error(`Error syncing player ${playerId}:`, error);
          }
        }
      }
    }

    res.json({ 
      message: `Synced ${syncedCount} players.`, 
      count: syncedCount 
    });
  } catch (error: any) {
    console.error('syncPlayersFromRapidAPI error:', error?.response?.data || error.message || error);
    
    // Handle rate limiting
    if (error?.response?.status === 429) {
      return res.status(429).json({ 
        message: 'API rate limit exceeded. Please try again later.', 
        error: 'Too many requests' 
      });
    }
    
    res.status(500).json({ message: 'Players sync failed', error: error?.response?.data || error.message });
  }
};