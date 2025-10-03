import { Router } from 'express';
import { 
  getAllMatches, 
  getMatchById, 
  getMatchInfo,
  getMatchScorecard,
  getMatchScorecardV2,
  getMatchCommentaries,
  getLiveMatches,
  getRecentMatches,
  getUpcomingMatches,
  searchMatches,
  syncRecentMatchesFromRapidAPI,
  syncUpcomingMatchesFromRapidAPI,
  syncMatchDetails,
  syncMultipleMatchDetails,
  getMatchOvers
} from '../controllers/matchController';

const router = Router();

router.get('/', getAllMatches);
router.get('/live', getLiveMatches);
router.get('/recent', getRecentMatches);
router.get('/upcoming', getUpcomingMatches);
router.get('/search', searchMatches);
router.get('/:id', getMatchById);
router.get('/:id/info', getMatchInfo);
router.get('/:id/scorecard', getMatchScorecard);
router.get('/:id/historical-scorecard', getMatchScorecardV2);
router.get('/:id/commentary', getMatchCommentaries);
router.get('/:id/overs', getMatchOvers);
router.post('/sync-recent', syncRecentMatchesFromRapidAPI);
router.post('/sync-upcoming', syncUpcomingMatchesFromRapidAPI);
router.post('/:id/sync-details', syncMatchDetails);
router.post('/sync-multiple-details', syncMultipleMatchDetails);

export default router;