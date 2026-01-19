# Deployment Guide

## Frontend Deployment (Vercel)

### Prerequisites
- Vercel account connected to your GitHub repository
- Repository pushed to GitHub

### Configuration Files Added
1. **`frontend/vercel.json`** - Handles SPA routing and security headers
2. **`frontend/public/_redirects`** - Fallback routing configuration
3. **`frontend/vite.config.ts`** - Optimized build configuration

### Environment Variables
Set these in your Vercel dashboard:
```
VITE_API_URL=https://your-backend-url.onrender.com/api
```

### Deployment Steps
1. Connect your GitHub repository to Vercel
2. Set the root directory to `frontend`
3. Vercel will automatically detect it's a Vite project
4. Set environment variables in Vercel dashboard
5. Deploy

### Common Issues & Solutions

#### 404 Error on Page Reload
**Problem**: Getting 404 when reloading pages like `/dashboard` or `/approval`
**Solution**: The `vercel.json` file fixes this by redirecting all routes to `index.html`

#### API Connection Issues
**Problem**: Frontend can't connect to backend
**Solution**: Ensure `VITE_API_URL` environment variable is set correctly in Vercel

## Backend Deployment (Render)

### Prerequisites
- Render account connected to your GitHub repository
- PostgreSQL database (can use Render's PostgreSQL service)

### Environment Variables
Set these in your Render dashboard:
```
NODE_ENV=production
PORT=3000
DB_HOST=your-postgres-host
DB_PORT=5432
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=your-db-name
DB_SSL=true
JWT_SECRET=your-jwt-secret-here
ENCRYPTION_KEY=your-32-char-encryption-key
FRONTEND_URL=https://your-frontend-url.vercel.app
ALLOWED_ORIGINS=https://your-frontend-url.vercel.app
```

### Build Configuration
Render will automatically:
1. Run `npm install`
2. Run `npm run build`
3. Start with `npm start`

### Database Setup
1. Create a PostgreSQL service on Render
2. Run migrations manually or set up auto-migration
3. Update environment variables with database credentials

## Security Considerations

### CORS Configuration
The backend is configured to allow requests from:
- `http://localhost:5173` (development)
- Your Vercel deployment URL
- All `*.vercel.app` domains (for preview deployments)

### Rate Limiting
Production rate limits are active:
- Login attempts: 5 per 15 minutes per IP
- General API: 100 requests per 15 minutes per IP
- Query submissions: 10 per 5 minutes per IP

### Security Headers
Both frontend and backend include security headers:
- CSP (Content Security Policy)
- HSTS (HTTP Strict Transport Security)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff

## Monitoring & Maintenance

### Health Checks
- Backend: `GET /` returns server status
- Frontend: Vercel provides automatic health monitoring

### Logs
- **Render**: View logs in Render dashboard
- **Vercel**: View function logs and analytics in Vercel dashboard

### Database Maintenance
- Regular backups (Render PostgreSQL includes automatic backups)
- Monitor connection limits
- Review query performance

## Troubleshooting

### Frontend Issues
1. **404 on reload**: Check `vercel.json` is deployed
2. **API errors**: Verify `VITE_API_URL` environment variable
3. **Build failures**: Check Node.js version compatibility

### Backend Issues
1. **Database connection**: Verify all DB environment variables
2. **CORS errors**: Check `ALLOWED_ORIGINS` includes your frontend URL
3. **Rate limiting**: Monitor for legitimate users being blocked

### Common Environment Variable Issues
- Ensure all required variables are set in production
- Check for typos in variable names
- Verify database SSL settings match your provider

## Performance Optimization

### Frontend
- Static assets are cached by Vercel CDN
- Code splitting implemented in Vite config
- Optimized bundle sizes with manual chunks

### Backend
- Database connection pooling enabled
- Rate limiting prevents abuse
- Efficient query patterns implemented

## Scaling Considerations

### Frontend
- Vercel automatically scales based on traffic
- Global CDN distribution included

### Backend
- Render provides auto-scaling options
- Database connection pooling handles concurrent requests
- Rate limiting protects against traffic spikes

## Backup & Recovery

### Database
- Render PostgreSQL includes automatic daily backups
- Manual backup procedures documented
- Point-in-time recovery available

### Application Code
- Source code backed up in GitHub
- Deployment history available in Render/Vercel
- Environment variables should be documented securely

## Cost Optimization

### Vercel
- Free tier suitable for development/small projects
- Pro tier for production with custom domains

### Render
- Free tier available with limitations
- Paid tiers for production workloads
- Database costs separate from application hosting

---

## Quick Deployment Checklist

### Frontend (Vercel)
- [ ] `vercel.json` file added
- [ ] `_redirects` file in public folder
- [ ] Environment variables configured
- [ ] Repository connected to Vercel
- [ ] Custom domain configured (optional)

### Backend (Render)
- [ ] Environment variables configured
- [ ] Database service created and configured
- [ ] Migrations run
- [ ] CORS origins updated for production
- [ ] Health check endpoint working

### Post-Deployment
- [ ] Test all major user flows
- [ ] Verify rate limiting is working
- [ ] Check security headers are applied
- [ ] Monitor logs for errors
- [ ] Set up monitoring/alerting (optional)

This deployment configuration provides a production-ready setup with proper security, performance, and scalability considerations.