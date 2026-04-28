import {
  Injectable,
  CanActivate,
  ExecutionContext,
  TooManyRequestsException,
} from '@nestjs/common';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

interface RequestMetadata {
  count: number;
  firstRequestTime: number;
}

/**
 * Rate Limiting Guard
 * Prevents abuse by limiting requests per IP within a time window
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private requestMap = new Map<string, RequestMetadata>();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig = { windowMs: 60000, maxRequests: 100 }) {
    this.config = config;
    // Cleanup old entries periodically
    setInterval(() => this.cleanup(), this.config.windowMs * 2);
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const ipAddress = this.getClientIp(request);
    const now = Date.now();

    let metadata = this.requestMap.get(ipAddress);

    if (!metadata) {
      // First request from this IP
      this.requestMap.set(ipAddress, {
        count: 1,
        firstRequestTime: now,
      });
      return true;
    }

    // Check if window has expired
    if (now - metadata.firstRequestTime > this.config.windowMs) {
      // Reset counter
      this.requestMap.set(ipAddress, {
        count: 1,
        firstRequestTime: now,
      });
      return true;
    }

    // Within window - increment counter
    metadata.count++;

    if (metadata.count > this.config.maxRequests) {
      throw new TooManyRequestsException(
        `Too many requests from ${ipAddress}. Please try again later.`,
      );
    }

    return true;
  }

  private getClientIp(request: any): string {
    return (
      request.ip ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      request.connection.socket?.remoteAddress ||
      'unknown'
    );
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [ip, metadata] of this.requestMap.entries()) {
      if (now - metadata.firstRequestTime > this.config.windowMs * 2) {
        this.requestMap.delete(ip);
      }
    }
  }
}
