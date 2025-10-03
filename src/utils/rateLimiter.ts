import axios, { AxiosRequestConfig } from 'axios';

interface RateLimitConfig {
  maxRequestsPerMinute: number;
  maxRequestsPerHour: number;
  retryAfterMs: number;
  maxRetries: number;
}

class RateLimiter {
  private requestTimes: number[] = [];
  private hourlyRequestTimes: number[] = [];
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  private cleanOldRequests() {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;

    // Clean minute-based requests
    this.requestTimes = this.requestTimes.filter(time => time > oneMinuteAgo);
    
    // Clean hour-based requests
    this.hourlyRequestTimes = this.hourlyRequestTimes.filter(time => time > oneHourAgo);
  }

  private canMakeRequest(): boolean {
    this.cleanOldRequests();
    
    return (
      this.requestTimes.length < this.config.maxRequestsPerMinute &&
      this.hourlyRequestTimes.length < this.config.maxRequestsPerHour
    );
  }

  private recordRequest() {
    const now = Date.now();
    this.requestTimes.push(now);
    this.hourlyRequestTimes.push(now);
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async makeRequest<T>(
    url: string, 
    config: AxiosRequestConfig = {}, 
    retryCount = 0
  ): Promise<T | null> {
    try {
      // Check if we can make the request
      if (!this.canMakeRequest()) {
        console.log(`Rate limit reached. Waiting ${this.config.retryAfterMs}ms before retry...`);
        await this.delay(this.config.retryAfterMs);
        
        if (retryCount < this.config.maxRetries) {
          return this.makeRequest<T>(url, config, retryCount + 1);
        } else {
          console.log(`Max retries (${this.config.maxRetries}) reached for ${url}`);
          return null;
        }
      }

      // Record the request
      this.recordRequest();

      // Make the request
      console.log(`Making API request to: ${url}`);
      const response = await axios.get(url, {
        ...config,
        timeout: 15000
      });

      return response.data;

    } catch (error: any) {
      if (error.response?.status === 429) {
        console.log(`Rate limited by API for ${url}. Waiting ${this.config.retryAfterMs * 2}ms...`);
        
        if (retryCount < this.config.maxRetries) {
          await this.delay(this.config.retryAfterMs * 2);
          return this.makeRequest<T>(url, config, retryCount + 1);
        } else {
          console.log(`Max retries reached for rate-limited request: ${url}`);
          return null;
        }
      } else if (error.response?.status === 403) {
        console.warn(`⚠️ API access forbidden (403) for ${url} - subscription may not include this endpoint`);
        return null;
      } else if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
        console.log(`Connection error for ${url}. Retrying...`);
        
        if (retryCount < this.config.maxRetries) {
          await this.delay(1000);
          return this.makeRequest<T>(url, config, retryCount + 1);
        }
      }

      console.error(`Request failed for ${url}:`, error.message);
      return null;
    }
  }

  getStatus() {
    this.cleanOldRequests();
    return {
      requestsThisMinute: this.requestTimes.length,
      requestsThisHour: this.hourlyRequestTimes.length,
      maxPerMinute: this.config.maxRequestsPerMinute,
      maxPerHour: this.config.maxRequestsPerHour,
      canMakeRequest: this.canMakeRequest()
    };
  }
}

import { API_CONFIG } from '../config/apiConfig';

// Create a singleton rate limiter for RapidAPI
const rapidApiRateLimiter = new RateLimiter({
  maxRequestsPerMinute: API_CONFIG.RATE_LIMIT.MAX_REQUESTS_PER_MINUTE,
  maxRequestsPerHour: API_CONFIG.RATE_LIMIT.MAX_REQUESTS_PER_HOUR,
  retryAfterMs: API_CONFIG.RATE_LIMIT.RETRY_DELAY_MS,
  maxRetries: API_CONFIG.RATE_LIMIT.MAX_RETRIES
});

export { RateLimiter, rapidApiRateLimiter };