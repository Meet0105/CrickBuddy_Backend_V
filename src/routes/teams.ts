import { Router } from 'express';
import { getAllTeams, getTeamById, syncTeamsFromRapidAPI, getTeamSchedules, getTeamResults, getTeamNews, getTeamPlayers, getTeamStatsFilters, getTeamStats, testTeamAPI } from '../controllers/teamController';

const router = Router();

router.get('/', getAllTeams);
router.get('/:id', getTeamById);
router.get('/:id/schedules', getTeamSchedules);
router.get('/:id/results', getTeamResults);
router.get('/:id/news', getTeamNews);
router.get('/:id/players', getTeamPlayers);
router.get('/:id/stats-filters', getTeamStatsFilters);
router.get('/:id/stats', getTeamStats);
router.get('/:id/test', testTeamAPI);
router.post('/sync', syncTeamsFromRapidAPI);

export default router;