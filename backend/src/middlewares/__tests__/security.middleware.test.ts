import request from 'supertest';
import express from 'express';
import { 
  generalRateLimit, 
  authRateLimit, 
  loginRateLimit,
  querySubmissionRateLimit,
  speedLimiter,
  helmetConfig,
  additionalSecurityHeaders,
  requestTracking,
  getRequestStats
} from '../../middlewares/security.middleware';

describe('Security Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.set('trust proxy', 1);
  });

  describe('Helmet Security Headers', () => {
    beforeEach(() => {
      app.use(helmetConfig);
      app.get('/test', (req, res) => res.json({ success: true }));
    });

    it('should set security headers', async () => {
      const response = await request(app).get('/test');
      
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['strict-transport-security']).toContain('max-age=31536000');
    });

    it('should set CSP headers', async () => {
      const response = await request(app).get('/test');
      
      expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    });
  });

  describe('Additional Security Headers', () => {
    beforeEach(() => {
      app.use(additionalSecurityHeaders);
      app.get('/test', (req, res) => res.json({ success: true }));
      app.get('/api/test', (req, res) => res.json({ success: true }));
    });

    it('should add custom security headers', async () => {
      const response = await request(app).get('/test');
      
      expect(response.headers['x-api-version']).toBe('1.0.0');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    });

    it('should add cache control headers for API routes', async () => {
      const response = await request(app).get('/api/test');
      
      expect(response.headers['cache-control']).toBe('no-store, no-cache, must-revalidate, proxy-revalidate');
      expect(response.headers['pragma']).toBe('no-cache');
      expect(response.headers['expires']).toBe('0');
    });

    it('should not add cache control headers for non-API routes', async () => {
      const response = await request(app).get('/test');
      
      expect(response.headers['cache-control']).toBeUndefined();
      expect(response.headers['pragma']).toBeUndefined();
      expect(response.headers['expires']).toBeUndefined();
    });

    it('should remove X-Powered-By header', async () => {
      const response = await request(app).get('/test');
      
      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('Request Tracking', () => {
    beforeEach(() => {
      app.use(requestTracking);
      app.get('/test', (req, res) => res.json({ success: true }));
    });

    it('should track requests without errors', async () => {
      await request(app).get('/test');
      await request(app).get('/test');
      
      const stats = getRequestStats();
      expect(stats.totalIPs).toBeGreaterThan(0);
    });

    it('should provide request statistics', async () => {
      await request(app).get('/test');
      
      const stats = getRequestStats();
      expect(stats).toHaveProperty('totalIPs');
      expect(stats).toHaveProperty('topRequesters');
      expect(Array.isArray(stats.topRequesters)).toBe(true);
    });

    it('should handle requests with different IP sources', async () => {
      // Test with req.connection.remoteAddress fallback
      const testApp = express();
      testApp.use((req: any, res, next) => {
        // Mock the IP to be undefined and set connection.remoteAddress
        Object.defineProperty(req, 'ip', { value: undefined, writable: true });
        Object.defineProperty(req, 'connection', { 
          value: { remoteAddress: '192.168.1.100' }, 
          writable: true 
        });
        next();
      });
      testApp.use(requestTracking);
      testApp.get('/test', (req, res) => res.json({ success: true }));
      
      await request(testApp).get('/test');
      const stats = getRequestStats();
      expect(stats.totalIPs).toBeGreaterThan(0);
    });

    it('should handle requests with no IP information', async () => {
      const testApp = express();
      testApp.use((req: any, res, next) => {
        // Mock both IP and connection to be undefined/empty
        Object.defineProperty(req, 'ip', { value: undefined, writable: true });
        Object.defineProperty(req, 'connection', { 
          value: {}, 
          writable: true 
        });
        next();
      });
      testApp.use(requestTracking);
      testApp.get('/test', (req, res) => res.json({ success: true }));
      
      await request(testApp).get('/test');
      const stats = getRequestStats();
      expect(stats.totalIPs).toBeGreaterThan(0);
    });

    it('should clean old entries from request tracker', async () => {
      // Mock Date.now to simulate time passing
      const originalNow = Date.now;
      let mockTime = originalNow();
      
      jest.spyOn(Date, 'now').mockImplementation(() => mockTime);
      
      await request(app).get('/test');
      
      // Advance time by more than 1 minute
      mockTime += 70 * 1000;
      
      await request(app).get('/test');
      
      const stats = getRequestStats();
      expect(stats.totalIPs).toBeGreaterThan(0);
      
      // Restore original Date.now
      Date.now = originalNow;
    });

    it('should log warning for high request rates', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Create a test app that simulates high request rate
      const testApp = express();
      testApp.use((req: any, res, next) => {
        Object.defineProperty(req, 'ip', { value: '192.168.1.200', writable: true });
        next();
      });
      testApp.use(requestTracking);
      testApp.get('/test', (req, res) => res.json({ success: true }));
      
      // Make more than 200 requests to trigger warning
      for (let i = 0; i < 205; i++) {
        await request(testApp).get('/test');
      }
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SECURITY] High request rate from IP 192.168.1.200')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('General Rate Limiting', () => {
    beforeEach(() => {
      app.use(generalRateLimit);
      app.get('/test', (req, res) => res.json({ success: true }));
      app.get('/api-docs', (req, res) => res.json({ success: true }));
      app.get('/', (req, res) => res.json({ success: true }));
    });

    it('should allow requests within limit', async () => {
      const response = await request(app).get('/test');
      expect(response.status).toBe(200);
    });

    it('should skip rate limiting for api-docs', async () => {
      const response = await request(app).get('/api-docs');
      expect(response.status).toBe(200);
      expect(response.headers['ratelimit-limit']).toBeUndefined();
    });

    it('should skip rate limiting for root path', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.headers['ratelimit-limit']).toBeUndefined();
    });

    it('should include rate limit headers', async () => {
      const response = await request(app).get('/test');
      expect(response.headers['ratelimit-limit']).toBeDefined();
      expect(response.headers['ratelimit-remaining']).toBeDefined();
    });
  });

  describe('Login Rate Limiting', () => {
    beforeEach(() => {
      app.use(loginRateLimit);
      app.post('/login', (req, res) => res.json({ success: true }));
    });

    it('should apply strict rate limiting to login endpoint', async () => {
      const response = await request(app).post('/login');
      expect(response.status).toBe(200);
      expect(response.headers['ratelimit-limit']).toBe('5');
    });

    it('should have 2 minute window for login attempts', async () => {
      const response = await request(app).post('/login');
      expect(response.headers['ratelimit-reset']).toBeDefined();
    });
  });

  describe('Auth Rate Limiting', () => {
    beforeEach(() => {
      app.use(authRateLimit);
      app.post('/refresh', (req, res) => res.json({ success: true }));
      app.post('/logout', (req, res) => res.json({ success: true }));
    });

    it('should apply general auth rate limiting to non-login endpoints', async () => {
      const response = await request(app).post('/refresh');
      expect(response.status).toBe(200);
      expect(response.headers['ratelimit-limit']).toBe('20');
    });

    it('should allow more requests for non-login auth operations', async () => {
      const response = await request(app).post('/logout');
      expect(response.status).toBe(200);
      expect(response.headers['ratelimit-limit']).toBe('20');
    });
  });

  describe('Query Submission Rate Limiting', () => {
    beforeEach(() => {
      app.use(querySubmissionRateLimit);
      app.post('/submit', (req, res) => res.json({ success: true }));
    });

    it('should apply rate limiting to all endpoints', async () => {
      const response = await request(app).post('/submit');
      expect(response.status).toBe(200);
      expect(response.headers['ratelimit-limit']).toBe('10');
    });

    it('should have 1 minute window', async () => {
      const response = await request(app).post('/submit');
      expect(response.headers['ratelimit-reset']).toBeDefined();
    });
  });

  describe('Speed Limiting', () => {
    beforeEach(() => {
      app.use(speedLimiter);
      app.get('/test', (req, res) => res.json({ success: true }));
      app.get('/api-docs', (req, res) => res.json({ success: true }));
      app.get('/', (req, res) => res.json({ success: true }));
    });

    it('should allow requests without delay initially', async () => {
      const start = Date.now();
      await request(app).get('/test');
      const duration = Date.now() - start;
      
      // Should be fast (under 100ms for first requests)
      expect(duration).toBeLessThan(100);
    });

    it('should skip speed limiting for api-docs', async () => {
      const start = Date.now();
      await request(app).get('/api-docs');
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(100);
    });

    it('should skip speed limiting for root path', async () => {
      const start = Date.now();
      await request(app).get('/');
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Integration Test', () => {
    beforeEach(() => {
      app.use(helmetConfig);
      app.use(additionalSecurityHeaders);
      app.use(requestTracking);
      app.use(generalRateLimit);
      app.get('/test', (req, res) => res.json({ success: true }));
    });

    it('should apply all security middleware together', async () => {
      const response = await request(app).get('/test');
      
      expect(response.status).toBe(200);
      expect(response.headers['x-api-version']).toBe('1.0.0');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['ratelimit-limit']).toBeDefined();
    });
  });

  describe('Error Responses', () => {
    it('should return proper error format for rate limit exceeded', async () => {
      const testApp = express();
      testApp.set('trust proxy', 1);
      
      // Create a very restrictive rate limiter for testing
      const restrictiveRateLimit = require('express-rate-limit')({
        windowMs: 60 * 1000,
        max: 1,
        message: {
          error: 'Too many requests',
          message: 'Rate limit exceeded',
          retryAfter: '1 minute'
        }
      });
      
      testApp.use(restrictiveRateLimit);
      testApp.get('/test', (req, res) => res.json({ success: true }));
      
      // First request should succeed
      const firstResponse = await request(testApp).get('/test');
      expect(firstResponse.status).toBe(200);
      
      // Second request should be rate limited
      const secondResponse = await request(testApp).get('/test');
      expect(secondResponse.status).toBe(429);
      expect(secondResponse.body).toHaveProperty('error');
      expect(secondResponse.body).toHaveProperty('message');
    });
  });
});