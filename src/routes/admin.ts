import { Router } from 'express';
import { getRateLimitStatus } from '../controllers/admin/rateLimitStatus';
import { getFeatureFlags, updateFeatureFlag } from '../controllers/admin/featureFlags';

const router = Router();

// Rate limiting status
router.get('/rate-limit-status', getRateLimitStatus);

// Feature flags management
router.get('/feature-flags', getFeatureFlags);
router.post('/feature-flags/update', updateFeatureFlag);

export default router;