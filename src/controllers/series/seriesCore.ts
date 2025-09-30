import Series from '../../models/Series';
import { Request, Response } from 'express';
import axios from 'axios';

// Function to get all series - first check database, then API if needed
export const getAllSeries = async (req: Request, res: Response) => {
  try {
    // First, try to get series from database
    const seriesFromDB = await Series.find({}).sort({ startDate: -1 }).limit(100);
    
    // If we have series in the database, return them
    if (seriesFromDB && seriesFromDB.length > 0) {
      return res.json(seriesFromDB);
    }
    
    // If no series in database, we would normally fetch from API
    // But for now, let's return empty array since we don't want to overload the API
    res.json([]);
  } catch (error) {
    console.error('getAllSeries error:', (error as any)?.response?.data || (error as Error).message || error);
    res.status(500).json({ message: 'Failed to fetch series', error: (error as any)?.response?.data || (error as Error).message });
  }
};

// Function to get series by ID - first check database, then API if needed
export const getSeriesById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // First, try to get series from database
    const seriesFromDB = await Series.findOne({ seriesId: id });
    
    // If we have the series in the database, return it
    if (seriesFromDB) {
      return res.json(seriesFromDB);
    }
    
    // If series not in database, return 404
    res.status(404).json({ message: 'Series not found' });
  } catch (error) {
    console.error('getSeriesById error:', (error as any)?.response?.data || (error as Error).message || error);
    res.status(500).json({ message: 'Failed to fetch series', error: (error as any)?.response?.data || (error as Error).message });
  }
};

export const getSeriesStandings = async (req: Request, res: Response) => {
  try {
    const series = await Series.findOne({ seriesId: req.params.id })
      .select('standings teams name shortName');
    
    if (!series) return res.status(404).json({ message: 'Series not found' });

    // Sort standings by points, then by net run rate
    const sortedStandings = series.standings?.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return (b.netRunRate || 0) - (a.netRunRate || 0);
    });

    res.json({
      seriesName: series.name,
      standings: sortedStandings
    });
  } catch (error) {
    console.error('getSeriesStandings error:', error);
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};

export const getActiveSeries = async (req: Request, res: Response) => {
  try {
    const activeSeries = await Series.find({ 
      status: { $in: ['ONGOING', 'UPCOMING'] },
      isActive: true 
    })
    .sort({ priority: -1, startDate: 1 })
    .limit(10)
    .select('seriesId name shortName startDate endDate seriesType format totalMatches completedMatches featuredImage');

    res.json(activeSeries);
  } catch (error) {
    console.error('getActiveSeries error:', error);
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};

export const getSeriesByType = async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const { limit = 10 } = req.query;

    const series = await Series.find({ 
      seriesType: type.toUpperCase(),
      isActive: true 
    })
    .sort({ priority: -1, startDate: -1 })
    .limit(Number(limit))
    .select('seriesId name shortName startDate endDate status format featuredImage');

    res.json(series);
  } catch (error) {
    console.error('getSeriesByType error:', error);
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};