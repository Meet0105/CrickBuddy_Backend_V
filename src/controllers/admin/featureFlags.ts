import { Request, Response } from 'express';
import { API_CONFIG, isFeatureEnabled } from '../../config/apiConfig';

export const getFeatureFlags = async (req: Request, res: Response) => {
  try {
    const flags = API_CONFIG.FEATURES;
    const flagsWithStatus = Object.entries(flags).map(([key, value]) => ({
      name: key,
      enabled: value,
      description: getFeatureDescription(key)
    }));

    res.json({
      features: flagsWithStatus,
      rateLimits: API_CONFIG.RATE_LIMIT,
      cache: API_CONFIG.CACHE,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('getFeatureFlags error:', error);
    res.status(500).json({ 
      message: 'Failed to get feature flags', 
      error: (error as Error).message 
    });
  }
};

export const updateFeatureFlag = async (req: Request, res: Response) => {
  try {
    const { flagName, enabled } = req.body;

    if (!flagName || typeof enabled !== 'boolean') {
      return res.status(400).json({ 
        message: 'flagName (string) and enabled (boolean) are required' 
      });
    }

    if (!(flagName in API_CONFIG.FEATURES)) {
      return res.status(404).json({ 
        message: `Feature flag '${flagName}' not found` 
      });
    }

    // Update the feature flag
    (API_CONFIG.FEATURES as any)[flagName] = enabled;

    res.json({
      message: `Feature flag '${flagName}' updated successfully`,
      flagName,
      enabled,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('updateFeatureFlag error:', error);
    res.status(500).json({ 
      message: 'Failed to update feature flag', 
      error: (error as Error).message 
    });
  }
};

function getFeatureDescription(flagName: string): string {
  const descriptions: { [key: string]: string } = {
    'ENABLE_MATCH_COMMENTARY': 'Fetch match commentary data from API',
    'ENABLE_HISTORICAL_DATA': 'Fetch historical match data from API',
    'ENABLE_OVERS_DATA': 'Fetch over-by-over data from API',
    'ENABLE_AUTO_SYNC': 'Automatically sync data in background',
    'ENABLE_DETAILED_SQUADS': 'Fetch detailed squad information',
    'ENABLE_UPCOMING_MATCHES_API': 'Fetch upcoming matches from API (disable if 403 errors)',
    'ENABLE_LIVE_MATCHES_API': 'Fetch live matches from API (disable if 403 errors)',
    'ENABLE_RECENT_MATCHES_API': 'Fetch recent matches from API (disable if 403 errors)'
  };

  return descriptions[flagName] || 'No description available';
}