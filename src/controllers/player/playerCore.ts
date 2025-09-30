import Player from '../../models/Player';
import { Request, Response } from 'express';
import axios from 'axios';

// Function to get all players - first check database, then API if needed
export const getAllPlayers = async (req: Request, res: Response) => {
  try {
    // First, try to get players from database
    const playersFromDB = await Player.find({}).sort({ createdAt: -1 }).limit(100);
    
    // If we have players in the database, return them
    if (playersFromDB && playersFromDB.length > 0) {
      return res.json(playersFromDB);
    }
    
    // If no players in database, we would normally fetch from API
    // But for now, let's return empty array since we don't want to overload the API
    res.json([]);
  } catch (error) {
    console.error('getAllPlayers error:', (error as any)?.response?.data || (error as Error).message || error);
    res.status(500).json({ message: 'Failed to fetch players', error: (error as any)?.response?.data || (error as Error).message });
  }
};

// Function to get player by ID - first check database, then API if needed
export const getPlayerById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // First, try to get player from database
    const playerFromDB = await Player.findOne({ playerId: id });
    
    // If we have the player in the database, return it
    if (playerFromDB) {
      return res.json(playerFromDB);
    }
    
    // If player not in database, return 404
    res.status(404).json({ message: 'Player not found' });
  } catch (error) {
    console.error('getPlayerById error:', (error as any)?.response?.data || (error as Error).message || error);
    res.status(500).json({ message: 'Failed to fetch player', error: (error as any)?.response?.data || (error as Error).message });
  }
};