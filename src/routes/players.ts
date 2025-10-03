import { Router } from 'express';
import { getAllPlayers, getPlayerById, syncPlayersFromRapidAPI, getTrendingPlayers, getPlayerCareer, getPlayerNews, getPlayerBowling, getPlayerBatting, getPlayerInfo, searchPlayers } from '../controllers/playerController';

const router = Router();

router.get('/', getAllPlayers);
router.get('/trending', getTrendingPlayers);
router.get('/search', searchPlayers);
router.get('/:id', getPlayerById);
router.get('/:id/career', getPlayerCareer);
router.get('/:id/news', getPlayerNews);
router.get('/:id/bowling', getPlayerBowling);
router.get('/:id/batting', getPlayerBatting);
router.get('/:id/info', getPlayerInfo);
router.post('/sync', syncPlayersFromRapidAPI);

export default router;