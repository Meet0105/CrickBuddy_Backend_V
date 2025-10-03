import { Router } from 'express';
import { 
  getRankings, 
  syncRankingsFromRapidAPI,
  getIccRankings,
  getIccStandings
} from '../controllers/rankingController';
import { 
  getRecordsFilters,
  getRecords
} from '../controllers/records/recordsController';

const router = Router();

router.get('/', getRankings);
router.get('/icc-rankings', getIccRankings);
router.get('/icc-standings/:matchType', getIccStandings);
router.get('/records-filters', getRecordsFilters);
router.get('/records', getRecords);
router.post('/sync', syncRankingsFromRapidAPI);

export default router;