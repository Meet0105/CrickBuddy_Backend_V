import { Router } from 'express';
import { 
  getAllSeries, 
  getSeriesById, 
  getSeriesList,
  getSeriesMatches,
  getSeriesSchedule,
  getSeriesSquads,
  getSeriesPointsTable,
  getSeriesStats,
  getSeriesVenues,
  syncSeriesFromRapidAPI,
  syncSeriesDetails
} from '../controllers/seriesController';
import { updateSeriesData } from '../controllers/series/seriesSync';
import { testSeriesSquadsAPI, clearSeriesSquads, refreshSeriesSquads, getSeriesPlayers, getSeriesSquadsWithPlayers } from '../controllers/series/seriesSquads';
import { testSeriesPointsTableAPI, refreshSeriesPointsTable } from '../controllers/series/seriesPointsTable';

const router = Router();

router.get('/', getAllSeries);
router.get('/list', getSeriesList);
router.get('/:id', getSeriesById);
router.get('/:id/matches', getSeriesMatches);
router.get('/:id/schedule', getSeriesSchedule);
router.get('/:id/squads', getSeriesSquads);
router.get('/:id/points-table', getSeriesPointsTable);
router.get('/:id/stats', getSeriesStats);
router.get('/:id/venues', getSeriesVenues);
router.post('/sync', syncSeriesFromRapidAPI);
router.post('/:id/sync-details', syncSeriesDetails);
router.post('/:id/update', updateSeriesData);
router.get('/:id/test-squads', testSeriesSquadsAPI);
router.get('/:id/test-points', testSeriesPointsTableAPI);
router.post('/:id/points-table/refresh', refreshSeriesPointsTable);
router.delete('/:id/squads', clearSeriesSquads);
router.post('/:id/squads/refresh', refreshSeriesSquads);
router.get('/:id/squads/with-players', getSeriesSquadsWithPlayers);
router.get('/:id/squads/:squadId', getSeriesPlayers);

export default router;