import { Router } from 'express';
import { getAllVenues, getVenueById, getVenueInfo, getVenueStats, getVenueMatches, syncVenuesFromRapidAPI } from '../controllers/venueController';

const router = Router();

router.get('/', getAllVenues);
router.get('/:id', getVenueById);
router.get('/:id/info', getVenueInfo);
router.get('/:id/stats', getVenueStats);
router.get('/:id/matches', getVenueMatches);
router.post('/sync', syncVenuesFromRapidAPI);

export default router;