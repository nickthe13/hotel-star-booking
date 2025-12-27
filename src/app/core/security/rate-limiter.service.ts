import { Injectable } from '@angular/core';
import { SecurityConfig, SecurityMessages } from './security.config';

interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  lockedUntil?: number;
}

/**
 * Rate Limiter Service
 * Prevents brute force attacks by limiting request rates
 */
@Injectable({
  providedIn: 'root'
})
export class RateLimiterService {
  private readonly attempts: Map<string, RateLimitEntry> = new Map();
  private readonly apiRequests: Map<string, number[]> = new Map();

  /**
   * Checks if login attempt is allowed
   * @param identifier User identifier (email/username)
   * @returns Object with allowed status and message
   */
  checkLoginAttempt(identifier: string): {
    allowed: boolean;
    message?: string;
    remainingAttempts?: number;
  } {
    const key = `login_${identifier.toLowerCase()}`;
    const now = Date.now();
    const entry = this.attempts.get(key);

    // Check if account is locked
    if (entry?.lockedUntil && entry.lockedUntil > now) {
      const minutesRemaining = Math.ceil(
        (entry.lockedUntil - now) / (60 * 1000)
      );
      return {
        allowed: false,
        message: `${SecurityMessages.accountLocked} Try again in ${minutesRemaining} minute(s).`
      };
    }

    // Reset if lockout period has expired
    if (entry?.lockedUntil && entry.lockedUntil <= now) {
      this.attempts.delete(key);
      return { allowed: true };
    }

    // Check if within rate limit
    if (!entry) {
      return {
        allowed: true,
        remainingAttempts: SecurityConfig.auth.maxLoginAttempts
      };
    }

    const remainingAttempts =
      SecurityConfig.auth.maxLoginAttempts - entry.count;

    if (remainingAttempts <= 0) {
      // Lock the account
      entry.lockedUntil = now + SecurityConfig.auth.lockoutDuration;
      this.attempts.set(key, entry);

      return {
        allowed: false,
        message: SecurityMessages.accountLocked
      };
    }

    return {
      allowed: true,
      remainingAttempts
    };
  }

  /**
   * Records a failed login attempt
   */
  recordFailedLogin(identifier: string): void {
    const key = `login_${identifier.toLowerCase()}`;
    const now = Date.now();
    const entry = this.attempts.get(key);

    if (!entry) {
      this.attempts.set(key, {
        count: 1,
        firstAttempt: now
      });
    } else {
      entry.count++;
      this.attempts.set(key, entry);
    }

    // Clean up old entries
    this.cleanupOldEntries();
  }

  /**
   * Resets login attempts for a user (on successful login)
   */
  resetLoginAttempts(identifier: string): void {
    const key = `login_${identifier.toLowerCase()}`;
    this.attempts.delete(key);
  }

  /**
   * Checks if API request is within rate limit
   * @param endpoint API endpoint
   * @returns true if allowed, false if rate limited
   */
  checkAPIRateLimit(endpoint: string): boolean {
    const key = `api_${endpoint}`;
    const now = Date.now();
    const config = SecurityConfig.api.rateLimit;

    const timestamps = this.apiRequests.get(key) || [];

    // Remove timestamps outside the time window
    const recentTimestamps = timestamps.filter(
      timestamp => now - timestamp < config.window
    );

    // Check if within limit
    if (recentTimestamps.length >= config.maxRequests) {
      return false;
    }

    // Add current timestamp
    recentTimestamps.push(now);
    this.apiRequests.set(key, recentTimestamps);

    return true;
  }

  /**
   * Gets remaining API requests for an endpoint
   */
  getRemainingAPIRequests(endpoint: string): number {
    const key = `api_${endpoint}`;
    const now = Date.now();
    const config = SecurityConfig.api.rateLimit;

    const timestamps = this.apiRequests.get(key) || [];
    const recentTimestamps = timestamps.filter(
      timestamp => now - timestamp < config.window
    );

    return Math.max(0, config.maxRequests - recentTimestamps.length);
  }

  /**
   * Cleans up old entries to prevent memory leaks
   */
  private cleanupOldEntries(): void {
    const now = Date.now();
    const maxAge = SecurityConfig.auth.lockoutDuration * 2;

    // Clean up login attempts
    this.attempts.forEach((entry, key) => {
      if (now - entry.firstAttempt > maxAge) {
        this.attempts.delete(key);
      }
    });

    // Clean up API requests
    this.apiRequests.forEach((timestamps, key) => {
      const recentTimestamps = timestamps.filter(
        timestamp => now - timestamp < SecurityConfig.api.rateLimit.window
      );
      if (recentTimestamps.length === 0) {
        this.apiRequests.delete(key);
      } else {
        this.apiRequests.set(key, recentTimestamps);
      }
    });
  }

  /**
   * Gets lockout status for a user
   */
  getLockoutStatus(identifier: string): {
    isLocked: boolean;
    unlockAt?: Date;
    attempts: number;
  } {
    const key = `login_${identifier.toLowerCase()}`;
    const entry = this.attempts.get(key);
    const now = Date.now();

    if (!entry) {
      return {
        isLocked: false,
        attempts: 0
      };
    }

    const isLocked = !!entry.lockedUntil && entry.lockedUntil > now;

    return {
      isLocked,
      unlockAt: entry.lockedUntil ? new Date(entry.lockedUntil) : undefined,
      attempts: entry.count
    };
  }

  /**
   * Manually locks a user account (admin function)
   */
  lockAccount(identifier: string, durationMs?: number): void {
    const key = `login_${identifier.toLowerCase()}`;
    const now = Date.now();
    const duration = durationMs || SecurityConfig.auth.lockoutDuration;

    this.attempts.set(key, {
      count: SecurityConfig.auth.maxLoginAttempts,
      firstAttempt: now,
      lockedUntil: now + duration
    });
  }

  /**
   * Manually unlocks a user account (admin function)
   */
  unlockAccount(identifier: string): void {
    const key = `login_${identifier.toLowerCase()}`;
    this.attempts.delete(key);
  }

  /**
   * Clears all rate limit data
   */
  clearAll(): void {
    this.attempts.clear();
    this.apiRequests.clear();
  }
}
