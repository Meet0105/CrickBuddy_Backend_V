import { Request, Response } from 'express';
import { rapidApiRateLimiter } from '../../utils/rateLimiter';

export const getRateLimitStatus = async (req: Request, res: Response) => {
  try {
    const status = rapidApiRateLimiter.getStatus();

    res.json({
      rateLimitStatus: status,
      recommendations: {
        canMakeRequest: status.canMakeRequest,
        requestsRemaining: {
          thisMinute: status.maxPerMinute - status.requestsThisMinute,
          thisHour: status.maxPerHour - status.requestsThisHour
        },
        utilizationPercentage: {
          minute: Math.round((status.requestsThisMinute / status.maxPerMinute) * 100),
          hour: Math.round((status.requestsThisHour / status.maxPerHour) * 100)
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('getRateLimitStatus error:', error);
    res.status(500).json({
      message: 'Failed to get rate limit status',
      error: (error as Error).message
    });
  }
};