import Match from '../../models/Match';
import { Request, Response } from 'express';

export const searchMatches = async (req: Request, res: Response) => {
  try {
    const { q, limit = 10 } = req.query;
    
    if (!q) {
      return res.status(400).json({ message: 'Search query required' });
    }

    const searchResults = await Match.find({
      $or: [
        { title: { $regex: q as string, $options: 'i' } },
        { shortTitle: { $regex: q as string, $options: 'i' } },
        { 'teams.teamName': { $regex: q as string, $options: 'i' } },
        { 'series.name': { $regex: q as string, $options: 'i' } },
        { 'venue.name': { $regex: q as string, $options: 'i' } }
      ]
    })
    .sort({ startDate: -1 })
    .limit(Number(limit))
    .select('matchId title shortTitle teams venue series startDate status format');

    res.json(searchResults);
  } catch (error) {
    console.error('searchMatches error:', error);
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};