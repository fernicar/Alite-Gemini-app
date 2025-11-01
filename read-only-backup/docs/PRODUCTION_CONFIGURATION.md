# Alite Production Environment Configuration

## Environment Setup

This document outlines the production environment setup for Alite space trading game deployment.

### Build Configuration

**Production Build Features:**
- ✅ Minified JavaScript and CSS
- ✅ Compressed assets (images, audio, fonts)
- ✅ Service Worker for PWA functionality
- ✅ Progressive Web App manifest
- ✅ Source maps for debugging (optional)
- ✅ Bundle analysis and optimization
- ✅ Cross-browser compatibility layers
- ✅ Security headers and HTTPS enforcement

**Build Targets:**
- **Desktop:** Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile:** iOS 13+, Android 8+
- **Bundle Size:** < 10MB (gzipped)
- **Load Time:** < 10 seconds on 3G networks

### Server Requirements

**Minimum Server Specifications:**
- **CPU:** 1 vCPU
- **RAM:** 1GB
- **Storage:** 2GB SSD
- **Bandwidth:** 10GB/month
- **Uptime:** 99.9%

**Recommended Specifications:**
- **CPU:** 2 vCPUs
- **RAM:** 2GB
- **Storage:** 20GB SSD
- **Bandwidth:** 100GB/month
- **Uptime:** 99.99%

**Operating Systems:**
- Linux (Ubuntu 20.04+ LTS, CentOS 8+, Debian 10+)
- Windows Server 2019+
- Any platform supporting Node.js or static file serving

### Web Server Configuration

#### Apache Configuration

**Required Modules:**
- mod_rewrite (SPA routing)
- mod_deflate (compression)
- mod_expires (caching)
- mod_headers (security headers)

**Sample Virtual Host:**
```apache
<VirtualHost *:80>
    ServerName yourdomain.com
    DocumentRoot /var/www/alite
    DirectoryIndex index.html
    
    # Redirect HTTP to HTTPS
    RewriteEngine On
    RewriteCond %{HTTPS} off
    RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
    
    # Security headers
    <IfModule mod_headers.c>
        Header always set X-Content-Type-Options nosniff
        Header always set X-Frame-Options DENY
        Header always set X-XSS-Protection "1; mode=block"
        Header always set Referrer-Policy "strict-origin-when-cross-origin"
        Header always set Permissions-Policy "camera=(), microphone=(), geolocation=()"
    </IfModule>
    
    # Compression
    <IfModule mod_deflate.c>
        AddOutputFilterByType DEFLATE text/plain
        AddOutputFilterByType DEFLATE text/html
        AddOutputFilterByType DEFLATE text/css
        AddOutputFilterByType DEFLATE application/javascript
        AddOutputFilterByType DEFLATE application/json
        AddOutputFilterByType DEFLATE image/svg+xml
    </IfModule>
    
    # Caching
    <IfModule mod_expires.c>
        ExpiresActive On
        ExpiresByType text/css "access plus 1 year"
        ExpiresByType application/javascript "access plus 1 year"
        ExpiresByType image/png "access plus 1 year"
        ExpiresByType image/jpg "access plus 1 year"
        ExpiresByType image/jpeg "access plus 1 year"
        ExpiresByType image/gif "access plus 1 year"
        ExpiresByType image/svg+xml "access plus 1 year"
        ExpiresByType audio/mpeg "access plus 1 year"
        ExpiresByType application/pdf "access plus 1 year"
    </IfModule>
    
    # SPA routing
    <IfModule mod_rewrite.c>
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </IfModule>
</VirtualHost>

<VirtualHost *:443>
    ServerName yourdomain.com
    DocumentRoot /var/www/alite
    DirectoryIndex index.html
    
    # SSL Configuration
    SSLEngine on
    SSLCertificateFile /path/to/certificate.crt
    SSLCertificateKeyFile /path/to/private.key
    SSLCertificateChainFile /path/to/chain.crt
    
    # Same configuration as HTTP version
    # (Include the security headers, compression, caching, and SPA routing)
</VirtualHost>
```

#### Nginx Configuration

**Sample Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    root /var/www/alite;
    index index.html;
    
    # SSL Configuration
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()";
    
    # Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json
        image/svg+xml;
    
    # Caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Vary Accept-Encoding;
    }
    
    # Service Worker
    location = /sw.js {
        add_header Cache-Control "no-cache";
        proxy_cache_bypass $http_pragma;
        proxy_cache_revalidate on;
        expires off;
        access_log off;
    }
    
    # Main application
    location / {
        try_files $uri $uri/ /index.html;
        
        # Cache HTML with short duration
        location ~* \.html$ {
            expires 1h;
            add_header Cache-Control "public, must-revalidate";
        }
    }
    
    # Block access to sensitive files
    location ~ /\. {
        deny all;
    }
}
```

### Cloud Platform Deployment

#### Netlify Deployment

**netlify.toml Configuration:**
```toml
[build]
  publish = "dist"
  command = "npm run build"

[build.environment]
  NODE_VERSION = "18"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/sw.js"
  [headers.values]
    Cache-Control = "no-cache"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### Vercel Configuration

**vercel.json Configuration:**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/sw.js",
      "headers": {
        "Cache-Control": "no-cache"
      }
    },
    {
      "src": "/assets/(.*)",
      "headers": {
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        }
      ]
    }
  ]
}
```

### CDN Configuration

#### CloudFlare Settings

**Performance Settings:**
- Auto Minify: HTML, CSS, JavaScript
- Brotli Compression: Enabled
- Cache Level: Standard
- Browser Cache TTL: 4 hours
- Always Use HTTPS: Enabled
- HSTS: Enabled (with preload)
- WebSocket: Enabled

**Security Settings:**
- Bot Fight Mode: Medium
- Security Level: Medium
- Browser Integrity Check: Enabled

### SSL/TLS Configuration

#### Certificate Requirements

**Minimum SSL Requirements:**
- TLS 1.2 or higher
- Strong cipher suites (ECDHE-RSA-AES256-GCM-SHA384, etc.)
- HSTS header enabled
- Certificate validity period < 2 years

**Recommended SSL Providers:**
- Let's Encrypt (Free)
- CloudFlare (Free tier available)
- DigiCert
- Sectigo

#### SSL Testing

**Use SSL Labs Test:**
```
https://www.ssllabs.com/ssltest/
```

**Target SSL Rating:** A or A+

### Performance Monitoring

#### Required Monitoring

**Core Web Vitals:**
- Largest Contentful Paint (LCP): < 2.5s
- First Input Delay (FID): < 100ms
- Cumulative Layout Shift (CLS): < 0.1

**Game Performance:**
- First Contentful Paint (FCP): < 2s
- Time to Interactive (TTI): < 3.8s
- Frame Rate: 60 FPS (desktop), 30+ FPS (mobile)

#### Monitoring Tools

**Google Analytics 4:**
- Set up custom events for game interactions
- Track user engagement and retention
- Monitor performance metrics

**Google Search Console:**
- Monitor Core Web Vitals
- Track mobile usability
- Monitor search performance

**PageSpeed Insights:**
- Regular performance audits
- Mobile vs desktop performance
- Optimization recommendations

### Security Configuration

#### Security Headers

**Required Headers:**
```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

**Content Security Policy:**
```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; audio-src 'self' https:; connect-src 'self' https:; media-src 'self' https:;
```

#### WAF Configuration

**CloudFlare WAF Rules:**
- Block common attack patterns
- Rate limiting for API endpoints
- Geographic restrictions (if needed)
- IP reputation filtering

### Backup and Disaster Recovery

#### Backup Strategy

**Daily Backups:**
- Server configuration files
- SSL certificates
- Domain configurations
- Custom scripts

**Weekly Backups:**
- Complete deployment package
- Database dumps (if applicable)
- Log files
- Monitoring configurations

**Backup Storage:**
- Primary: Local storage
- Secondary: Cloud storage (S3, etc.)
- Retention: 30 days

#### Disaster Recovery

**Recovery Time Objective (RTO):** < 1 hour
**Recovery Point Objective (RPO):** < 15 minutes

**Recovery Procedures:**
1. Deploy from backup
2. Restore SSL certificates
3. Update DNS records
4. Verify functionality
5. Monitor for issues

### Environment Variables

**Production Environment:**
```bash
# Game Configuration
ALITE_ENV=production
ALITE_VERSION=1.0.0
ALITE_DEBUG=false

# Analytics
GOOGLE_ANALYTICS_ID=GA_MEASUREMENT_ID
GOOGLE_TAG_MANAGER_ID=GTM_CONTAINER_ID

# Performance
ALITE_PERFORMANCE_MONITORING=true
ALITE_ERROR_REPORTING=true

# Security
ALITE_CSP_ENABLED=true
ALITE_SECURITY_HEADERS=true

# PWA
ALITE_PWA_ENABLED=true
ALITE_OFFLINE_MODE=true
```

### Health Checks

#### Application Health Checks

**Endpoint: `/health`**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-31T16:00:00Z",
  "version": "1.0.0",
  "environment": "production",
  "uptime": "99.9%",
  "dependencies": {
    "database": "healthy",
    "cdn": "healthy",
    "ssl": "healthy"
  },
  "metrics": {
    "response_time": "150ms",
    "error_rate": "0.1%",
    "active_users": "1,234"
  }
}
```

**Monitoring Endpoints:**
- `/health` - Basic health check
- `/metrics` - Performance metrics
- `/version` - Version information
- `/ping` - Simple connectivity test

### Deployment Checklist

**Pre-Deployment:**
- [ ] Code review completed
- [ ] All tests passing
- [ ] Performance benchmarks met
- [ ] Security scan completed
- [ ] SSL certificate valid
- [ ] Backup completed

**Deployment:**
- [ ] Production build created
- [ ] Assets optimized and compressed
- [ ] Service worker registered
- [ ] PWA manifest validated
- [ ] Security headers configured
- [ ] CDN configured (if applicable)

**Post-Deployment:**
- [ ] Health check endpoint responding
- [ ] All game features functional
- [ ] Cross-browser compatibility verified
- [ ] Mobile optimization confirmed
- [ ] PWA installation tested
- [ ] Offline mode functional
- [ ] Performance metrics within targets
- [ ] Error logging operational

---

**Production Environment Configuration v1.0**  
**Author: MiniMax Agent**  
**Last Updated: October 31, 2025**

*This configuration should be reviewed and updated regularly to maintain optimal performance and security.*