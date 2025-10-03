export const API_CONFIG = {
  // Rate limiting settings
  RATE_LIMIT: {
    MAX_REQUESTS_PER_MINUTE: 8,  // Conservative limit
    MAX_REQUESTS_PER_HOUR: 400,  // Adjust based on your RapidAPI plan
    RETRY_DELAY_MS: 8000,        // Wait 8 seconds between retries
    MAX_RETRIES: 2               // Reduced retries to avoid hitting limits
  },

  // Cache settings
  CACHE: {
    SERIES_LIST_TTL: 6 * 60 * 60 * 1000,      // 6 hours
    SERIES_DETAILS_TTL: 2 * 60 * 60 * 1000,   // 2 hours
    MATCH_DETAILS_TTL: 30 * 60 * 1000,        // 30 minutes
    LIVE_MATCH_TTL: 2 * 60 * 1000             // 2 minutes for live matches
  },

  // Feature flags to disable expensive operations
  FEATURES: {
    ENABLE_MATCH_COMMENTARY: false,     // Disable commentary fetching to save API calls
    ENABLE_HISTORICAL_DATA: false,      // Disable historical data fetching
    ENABLE_OVERS_DATA: false,          // Disable overs data fetching
    ENABLE_AUTO_SYNC: true,            // Keep auto sync enabled
    ENABLE_DETAILED_SQUADS: false,     // Disable detailed squad fetching
    ENABLE_UPCOMING_MATCHES_API: false, // Disable if 403 errors occur
    ENABLE_LIVE_MATCHES_API: false,     // Disable if 403 errors occur
    ENABLE_RECENT_MATCHES_API: false    // Disable if 403 errors occur
  },

  // Priority settings
  PRIORITY: {
    LIVE_MATCHES: 1,        // Highest priority
    RECENT_MATCHES: 2,      // Medium priority
    UPCOMING_MATCHES: 3,    // Lower priority
    HISTORICAL_DATA: 4      // Lowest priority
  }
};

// Function to check if a feature is enabled
export const isFeatureEnabled = (feature: keyof typeof API_CONFIG.FEATURES): boolean => {
  return API_CONFIG.FEATURES[feature];
};

// Function to get cache TTL based on data type
export const getCacheTTL = (dataType: keyof typeof API_CONFIG.CACHE): number => {
  return API_CONFIG.CACHE[dataType];
};