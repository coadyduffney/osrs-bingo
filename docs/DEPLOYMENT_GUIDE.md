# OSRS Bingo Deployment Guide

This guide covers deploying the OSRS Bingo application with a React frontend and Node.js backend.

## Table of Contents
- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Backend Deployment](#backend-deployment)
- [Frontend Deployment](#frontend-deployment)
- [Nginx Configuration](#nginx-configuration)
- [Environment Variables](#environment-variables)
- [Deployment Checklist](#deployment-checklist)
- [Troubleshooting](#troubleshooting)

## Architecture Overview

### Application Stack
- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express + Socket.IO
- **Database**: Firebase Firestore
- **Image Storage**: ImgBB API
- **Web Server**: Nginx (recommended)

### Deployment Architecture
```
┌─────────────────────────────────────────┐
│           Nginx Reverse Proxy           │
│         (https://your-domain.com)       │
└─────────────┬───────────────────────────┘
              │
    ┌─────────┴─────────┐
    │                   │
    ▼                   ▼
┌─────────┐      ┌──────────────┐
│ Frontend│      │   Backend    │
│ (Static)│      │ (Node.js:3000)│
│  Files  │      │  + Socket.IO │
└─────────┘      └──────┬───────┘
                        │
                        ▼
                 ┌─────────────┐
                 │  Firebase   │
                 │  Firestore  │
                 └─────────────┘
```

## Prerequisites

### Server Requirements
- Ubuntu 20.04+ or similar Linux distribution
- Node.js 18+ installed
- Nginx installed
- SSL certificate (Let's Encrypt recommended)
- Minimum 1GB RAM, 10GB storage

### Required Accounts
- Firebase project with Firestore enabled
- ImgBB API account (for image uploads)
- Domain name with DNS configured

## Backend Deployment

### 1. Install Dependencies

```bash
# Install Node.js (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install build tools
sudo apt-get install -y build-essential
```

### 2. Upload Backend Code

```bash
# Clone or upload your code to the server
cd /var/www
sudo git clone https://github.com/yourusername/osrs-bingo.git
cd osrs-bingo/server

# Install dependencies
npm install

# Build TypeScript
npm run build
```

### 3. Configure Environment Variables

Create `/var/www/osrs-bingo/server/.env`:

```env
# Server Configuration
NODE_ENV=production
PORT=3000

# Frontend URL for CORS
FRONTEND_URL=https://your-domain.com

# JWT Secret (generate a secure random string)
JWT_SECRET=your-super-secure-jwt-secret-here

# Firebase Configuration
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com

# Optional: Logging
LOG_LEVEL=info
```

**Important:** 
- Generate a strong JWT secret: `openssl rand -base64 64`
- Get Firebase credentials from Firebase Console → Project Settings → Service Accounts
- Keep the `.env` file secure and never commit it to version control

### 4. Start Backend with PM2

```bash
# Start the application
pm2 start dist/index.js --name osrs-bingo-backend

# Configure PM2 to start on system boot
pm2 startup
pm2 save

# Check status
pm2 status

# View logs
pm2 logs osrs-bingo-backend
```

### 5. PM2 Ecosystem File (Optional)

Create `/var/www/osrs-bingo/server/ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'osrs-bingo-backend',
    script: './dist/index.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

Then start with: `pm2 start ecosystem.config.js`

## Frontend Deployment

### 1. Configure Environment Variables

Create `.env.production` in the frontend root:

```env
# Backend API URL
VITE_API_URL=https://your-domain.com/api

# Socket.IO URL (usually same as API)
VITE_SOCKET_URL=https://your-domain.com

# ImgBB API Key
VITE_IMGBB_API_KEY=your-imgbb-api-key
```

### 2. Build Frontend

```bash
# On your local machine or CI/CD
cd /path/to/osrs-bingo
npm install
npm run build

# This creates a 'dist' folder with static files
```

### 3. Upload to Server

```bash
# Upload the dist folder to your server
scp -r dist/* user@your-server:/var/www/html/osrs-bingo/

# Or if using git deployment
ssh user@your-server
cd /var/www/html/osrs-bingo
git pull
npm install
npm run build
```

### 4. Set Proper Permissions

```bash
sudo chown -R www-data:www-data /var/www/html/osrs-bingo
sudo chmod -R 755 /var/www/html/osrs-bingo
```

## Nginx Configuration

### 1. Install Nginx

```bash
sudo apt update
sudo apt install nginx
```

### 2. Create Nginx Configuration

Create `/etc/nginx/sites-available/osrs-bingo`:

```nginx
# HTTP -> HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com www.your-domain.com;
    
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL Configuration (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Frontend - Static Files
    location / {
        root /var/www/html/osrs-bingo;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API - Reverse Proxy
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Socket.IO - WebSocket Support
    location /socket.io {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket timeouts
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript 
               application/x-javascript application/xml+rss 
               application/json application/javascript;
}
```

### 3. Enable Site and Restart Nginx

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/osrs-bingo /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Enable Nginx to start on boot
sudo systemctl enable nginx
```

### 4. Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test automatic renewal
sudo certbot renew --dry-run
```

## Environment Variables

### Backend Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NODE_ENV` | Yes | Environment mode | `production` |
| `PORT` | Yes | Backend port | `3000` |
| `FRONTEND_URL` | Yes | Frontend URL for CORS | `https://your-domain.com` |
| `JWT_SECRET` | Yes | Secret for JWT tokens | `your-secret-key` |
| `FIREBASE_PROJECT_ID` | Yes | Firebase project ID | `osrs-bingo-12345` |
| `FIREBASE_PRIVATE_KEY` | Yes | Firebase private key | `-----BEGIN PRIVATE KEY-----...` |
| `FIREBASE_CLIENT_EMAIL` | Yes | Firebase service account email | `firebase-adminsdk@...` |
| `LOG_LEVEL` | No | Logging level | `info` |

### Frontend Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_API_URL` | Yes | Backend API URL | `https://your-domain.com/api` |
| `VITE_SOCKET_URL` | Yes | Socket.IO URL | `https://your-domain.com` |
| `VITE_IMGBB_API_KEY` | Yes | ImgBB API key | `your-imgbb-key` |

## Deployment Checklist

### Pre-Deployment
- [ ] Domain configured with DNS pointing to server
- [ ] SSL certificate obtained
- [ ] Firebase project created and configured
- [ ] ImgBB API key obtained
- [ ] Server meets minimum requirements

### Backend Deployment
- [ ] Node.js installed
- [ ] Backend code uploaded
- [ ] Dependencies installed (`npm install`)
- [ ] TypeScript compiled (`npm run build`)
- [ ] `.env` file created with all required variables
- [ ] PM2 installed and configured
- [ ] Backend running (`pm2 status`)
- [ ] PM2 configured for startup (`pm2 startup`)

### Frontend Deployment
- [ ] `.env.production` created with correct API URL
- [ ] Frontend built (`npm run build`)
- [ ] Static files uploaded to server
- [ ] Permissions set correctly

### Nginx Configuration
- [ ] Nginx installed
- [ ] Site configuration created
- [ ] Configuration tested (`nginx -t`)
- [ ] Site enabled
- [ ] Nginx restarted
- [ ] SSL certificate installed

### Testing
- [ ] Frontend loads correctly
- [ ] API health check works (`https://your-domain.com/api/health`)
- [ ] User registration/login works
- [ ] Socket.IO connection established
- [ ] Image uploads work
- [ ] All features functional

### Monitoring
- [ ] PM2 logs configured
- [ ] Nginx logs accessible
- [ ] Disk space monitoring
- [ ] SSL certificate auto-renewal configured

## Troubleshooting

### Backend Not Starting

```bash
# Check PM2 logs
pm2 logs osrs-bingo-backend

# Check if port is already in use
sudo lsof -i :3000

# Verify environment variables
pm2 env 0  # Replace 0 with your app ID
```

### CORS Errors

1. Verify `FRONTEND_URL` in backend `.env` matches your actual frontend URL
2. Check browser console for the exact CORS error
3. Ensure Nginx is properly proxying headers

```bash
# Check backend logs
pm2 logs osrs-bingo-backend

# Test backend directly
curl http://localhost:3000/api/health
```

### Socket.IO Connection Failed

1. Check that `/socket.io` location is properly configured in Nginx
2. Verify WebSocket upgrade headers are set
3. Check browser console for connection errors

```nginx
# Ensure these headers are set
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

### 502 Bad Gateway

1. Backend is not running
   ```bash
   pm2 status
   pm2 restart osrs-bingo-backend
   ```

2. Wrong backend port in Nginx config
   ```nginx
   # Should match PORT in backend .env
   proxy_pass http://localhost:3000;
   ```

### Frontend Not Loading

1. Check Nginx error logs
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

2. Verify static files exist
   ```bash
   ls -la /var/www/html/osrs-bingo
   ```

3. Check permissions
   ```bash
   sudo chown -R www-data:www-data /var/www/html/osrs-bingo
   ```

### Image Uploads Failing

1. Verify `VITE_IMGBB_API_KEY` is set in frontend build
2. Check ImgBB API quota/limits
3. Check browser console for errors

### Firebase Connection Issues

1. Verify Firebase credentials in backend `.env`
2. Check Firebase project permissions
3. Ensure service account has Firestore access

```bash
# Test Firebase connection
pm2 logs osrs-bingo-backend | grep -i firebase
```

## Useful Commands

### PM2 Process Management
```bash
# Start/Stop/Restart
pm2 start ecosystem.config.js
pm2 stop osrs-bingo-backend
pm2 restart osrs-bingo-backend
pm2 reload osrs-bingo-backend  # Zero-downtime reload

# Monitoring
pm2 status
pm2 logs osrs-bingo-backend
pm2 monit

# Clear logs
pm2 flush
```

### Nginx Management
```bash
# Test configuration
sudo nginx -t

# Reload configuration (no downtime)
sudo nginx -s reload

# Restart Nginx
sudo systemctl restart nginx

# View logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### System Monitoring
```bash
# Check disk space
df -h

# Check memory usage
free -h

# Check CPU usage
top

# Check open connections
sudo netstat -tulpn
```

## Updates and Maintenance

### Updating Backend
```bash
# Pull latest code
cd /var/www/osrs-bingo/server
git pull

# Install dependencies
npm install

# Build
npm run build

# Restart with zero downtime
pm2 reload osrs-bingo-backend
```

### Updating Frontend
```bash
# Build locally or on server
cd /var/www/osrs-bingo
git pull
npm install
npm run build

# Files are automatically served by Nginx
```

### Database Backups
- Firebase Firestore has automatic backups
- Configure exports for additional safety
- See [Firebase documentation](https://firebase.google.com/docs/firestore/backups)

## Security Best Practices

1. **Keep packages updated**: Regularly run `npm audit` and update dependencies
2. **Use strong secrets**: Generate secure JWT secrets and API keys
3. **Limit server access**: Use SSH keys, disable password login
4. **Configure firewall**: Only open necessary ports (80, 443, 22)
5. **Monitor logs**: Regularly check PM2 and Nginx logs for suspicious activity
6. **Backup regularly**: Backup database and environment configurations
7. **Use HTTPS only**: Redirect all HTTP traffic to HTTPS
8. **Rate limiting**: Consider adding rate limiting for API endpoints

## Support

For issues specific to this application:
- Check application logs: `pm2 logs osrs-bingo-backend`
- Review Nginx logs: `sudo tail -f /var/log/nginx/error.log`
- Check Firebase Console for database issues
- Verify all environment variables are correctly set

---

**Last Updated**: February 2026
**Version**: 1.0.0
