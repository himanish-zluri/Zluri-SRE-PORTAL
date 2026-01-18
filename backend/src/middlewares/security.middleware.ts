import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import helmet from 'helmet';

// Rate limiting configuration
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip successful requests to static files
  skip: (req) => {
    return req.path.startsWith('/api-docs') || req.path === '/';
  }
});

// Stricter rate limiting for login attempts specifically
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: {
    error: 'Too many login attempts',
    message: 'Too many login attempts from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// General rate limiting for other auth endpoints (refresh, logout, etc.)
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // More lenient for non-login auth operations
  message: {
    error: 'Too many authentication requests',
    message: 'Too many authentication requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Stricter rate limiting for query submission
export const querySubmissionRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Limit each IP to 10 query submissions per 5 minutes
  message: {
    error: 'Too many query submissions',
    message: 'Too many query submissions from this IP, please try again later.',
    retryAfter: '5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Speed limiting - progressively delay responses
export const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // Allow 50 requests per windowMs without delay
  delayMs: () => 500, // Add 500ms delay per request after delayAfter (fixed for v2+)
  maxDelayMs: 20000, // Maximum delay of 20 seconds
  // Skip successful requests to static files
  skip: (req) => {
    return req.path.startsWith('/api-docs') || req.path === '/';
  },
  validate: { delayMs: false } // Disable the warning
});

// Helmet configuration for security headers
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for Swagger UI
      scriptSrc: ["'self'"], 
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for API compatibility
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: 'deny' } // Explicitly set X-Frame-Options to DENY
});

// Custom middleware to add additional security headers
export const additionalSecurityHeaders = (req: any, res: any, next: any) => {
  // Prevent information disclosure
  res.removeHeader('X-Powered-By');
  
  // Add custom security headers
  res.setHeader('X-API-Version', '1.0.0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Add cache control for API responses
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  next();
};

// IP-based request tracking (for monitoring)
const requestTracker = new Map<string, { count: number; firstRequest: number }>();

export const requestTracking = (req: any, res: any, next: any) => {
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  
  // Clean old entries
  for (const [ip, data] of requestTracker.entries()) {
    if (now - data.firstRequest > windowMs) {
      requestTracker.delete(ip);
    }
  }
  
  // Track current request
  const existing = requestTracker.get(clientIP);
  if (existing) {
    existing.count++;
  } else {
    requestTracker.set(clientIP, { count: 1, firstRequest: now });
  }
  
  // Log suspicious activity (more than 200 requests per minute)
  const currentData = requestTracker.get(clientIP);
  if (currentData && currentData.count > 200) {
    console.warn(`[SECURITY] High request rate from IP ${clientIP}: ${currentData.count} requests in 1 minute`);
  }
  
  next();
};

// Export request tracker for monitoring
export const getRequestStats = () => {
  const stats = Array.from(requestTracker.entries()).map(([ip, data]) => ({
    ip,
    requests: data.count,
    duration: Date.now() - data.firstRequest
  }));
  
  return {
    totalIPs: requestTracker.size,
    topRequesters: stats.sort((a, b) => b.requests - a.requests).slice(0, 10)
  };
};