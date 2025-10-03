import { Request, Response } from 'express';
// Import all the component functions
import { getAllSeries, getSeriesById } from './series/seriesCore';
import { getSeriesList } from './series/seriesList';
import { getSeriesMatches } from './series/seriesMatches';
import { getSeriesSquads } from './series/seriesSquads';
import { getSeriesStats } from './series/seriesStats';
import { getSeriesVenues } from './series/seriesVenues';
import { syncSeriesFromRapidAPI } from './series/seriesSync';
import { getSeriesPointsTable } from './series/seriesPointsTable';
import { getSeriesSchedule } from './series/seriesSchedule';
import { syncSeriesDetails } from './series/seriesDetailSync';

// Export all functions
export {
  // Core functions
  getAllSeries,
  getSeriesById,
  
  // List functions
  getSeriesList,
  
  // Matches functions
  getSeriesMatches,
  
  // Schedule functions
  getSeriesSchedule,
  
  // Squads functions
  getSeriesSquads,
  
  // Points table functions
  getSeriesPointsTable,
  
  // Stats functions
  getSeriesStats,
  
  // Venues functions
  getSeriesVenues,
  
  // Sync functions
  syncSeriesFromRapidAPI,
  syncSeriesDetails
};