# Security Setup Guide

This document provides instructions for setting up and configuring security features in the Hotel Booking Application.

## Table of Contents

1. [Environment Configuration](#environment-configuration)
2. [Security Features](#security-features)
3. [Quick Start](#quick-start)
4. [Production Deployment](#production-deployment)
5. [Security Best Practices](#security-best-practices)

---

## Environment Configuration

### Backend Configuration

1. **Copy the example environment file:**
   ```bash
   cd backend
   cp .env.example .env
   ```

2. **Generate strong JWT secrets:**
   ```bash
   # Generate JWT secret
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

   # Generate JWT refresh secret
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

3. **Update `backend/.env` with your configuration:**

   ```env
   # Server Configuration
   NODE_ENV=development
   PORT=3000

   # Frontend URL (for CORS)
   FRONTEND_URL=http://localhost:4200

   # Database
   DATABASE_URL="your-database-connection-string"

   # JWT Configuration (use generated secrets from step 2)
   JWT_SECRET=your-generated-secret-here
   JWT_EXPIRATION=24h
   JWT_REFRESH_SECRET=your-generated-refresh-secret-here
   JWT_REFRESH_EXPIRATION=7d

   # Stripe Configuration
   STRIPE_SECRET_KEY=sk_test_your_key_here
   STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

   # Email Configuration
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-app-specific-password
   EMAIL_FROM="Hotel Booking <noreply@hotelbooking.com>"

   # Rate Limiting
   THROTTLE_TTL=60000
   THROTTLE_LIMIT=100
   ```

### Frontend Configuration

1. **Copy the example environment file:**
   ```bash
   cd src/environments
   cp environment.example.ts environment.ts
   cp environment.example.ts environment.development.ts
   ```

2. **Update `environment.ts` for production:**
   ```typescript
   export const environment = {
     production: true,
     apiUrl: 'https://your-api-domain.com/api',
     apiVersion: 'v1',
     stripePublishableKey: 'pk_live_YOUR_LIVE_KEY_HERE'
   };
   ```

3. **Update `environment.development.ts` for development:**
   ```typescript
   export const environment = {
     production: false,
     apiUrl: 'http://localhost:3000/api',
     apiVersion: 'v1',
     stripePublishableKey: 'pk_test_YOUR_TEST_KEY_HERE'
   };
   ```

---

## Security Features

### 1. Authentication & Authorization

- **JWT-based authentication** with access and refresh tokens
- **Role-based access control** (USER/ADMIN)
- **Password hashing** using bcrypt (10 salt rounds)
- **Secure token storage** using httpOnly cookies (backend configured)

### 2. Rate Limiting

- **Global rate limiting**: 100 requests per minute
- **Authentication endpoints**:
  - Login: 10 attempts per minute
  - Register: 5 attempts per minute
- **Server-side enforcement** using NestJS Throttler with Redis support

### 3. Data Encryption

- **Client-side encryption**: TweetNaCl (authenticated encryption)
- **Secure key generation**: Automatic per-session
- **Protection**: Confidentiality + integrity verification

### 4. Security Headers

**Backend (Helmet.js):**
- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- X-Frame-Options (clickjacking protection)
- X-Content-Type-Options (MIME sniffing protection)
- XSS Protection

**Frontend (Meta tags):**
- Content Security Policy
- Referrer Policy
- X-Frame-Options
- X-XSS-Protection

### 5. Input Validation

- **DTO validation** using class-validator
- **Whitelisting**: Only decorated properties accepted
- **Transformation**: Auto-transform to correct types
- **XSS prevention**: Input sanitization

### 6. CORS Configuration

- **Strict origin checking**
- **Credentials support** (for httpOnly cookies)
- **Allowed methods** whitelisting
- **Headers control**

---

## Quick Start

### Development Setup

1. **Install dependencies:**
   ```bash
   # Root
   npm install

   # Backend
   cd backend
   npm install

   # Frontend
   cd ..
   npm install
   ```

2. **Configure environment files** (see above)

3. **Generate database:**
   ```bash
   cd backend
   npx prisma generate
   npx prisma migrate dev
   ```

4. **Start development servers:**
   ```bash
   # Backend (from backend directory)
   npm run start:dev

   # Frontend (from root directory)
   npm start
   ```

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] All environment files configured with production values
- [ ] Strong JWT secrets generated (64+ bytes)
- [ ] Database credentials secured
- [ ] Stripe live keys configured (not test keys)
- [ ] Email service configured and tested
- [ ] HTTPS/SSL certificate obtained and configured
- [ ] Domain name configured for CORS
- [ ] Rate limiting tested
- [ ] Security headers verified

### Environment Variables

**Critical security configurations for production:**

```env
# Backend
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com
DATABASE_URL=your-production-database-url
JWT_SECRET=your-strong-production-secret
JWT_REFRESH_SECRET=your-strong-production-refresh-secret
STRIPE_SECRET_KEY=sk_live_your_live_key
```

### SSL/HTTPS

1. **Obtain SSL certificate** (Let's Encrypt, AWS Certificate Manager, etc.)

2. **Configure reverse proxy** (Nginx example):
   ```nginx
   server {
       listen 443 ssl http2;
       server_name yourdomain.com;

       ssl_certificate /path/to/cert.pem;
       ssl_certificate_key /path/to/key.pem;

       # Security headers
       add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
       add_header X-Frame-Options "DENY" always;
       add_header X-Content-Type-Options "nosniff" always;
       add_header X-XSS-Protection "1; mode=block" always;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }

   # Redirect HTTP to HTTPS
   server {
       listen 80;
       server_name yourdomain.com;
       return 301 https://$server_name$request_uri;
   }
   ```

### Database Security

1. **Use connection pooling** (already configured in Prisma)
2. **Restrict database access** to application server IP only
3. **Regular backups** (automated daily minimum)
4. **Encrypted connections** (SSL/TLS for database)

---

## Security Best Practices

### 1. Secret Management

❌ **Never commit:**
- `.env` files
- `environment.ts` files with real keys
- Database credentials
- API keys

✅ **Always:**
- Use `.env.example` as template
- Generate unique secrets per environment
- Rotate secrets regularly
- Use secret management services (AWS Secrets Manager, HashiCorp Vault)

### 2. Authentication

✅ **Do:**
- Use httpOnly cookies for tokens (prevents XSS)
- Implement refresh token rotation
- Set appropriate token expiration (24h access, 7d refresh)
- Require strong passwords (8+ chars, mixed case, numbers)
- Implement account lockout after failed attempts

❌ **Don't:**
- Store tokens in localStorage (XSS vulnerable)
- Use weak JWT secrets
- Allow tokens without expiration
- Skip password hashing

### 3. API Security

✅ **Do:**
- Validate all inputs
- Use parameterized queries (Prisma handles this)
- Implement rate limiting
- Log security events
- Use HTTPS everywhere

❌ **Don't:**
- Trust client-side validation alone
- Expose detailed error messages
- Allow unlimited requests
- Use GET for sensitive operations

### 4. Frontend Security

✅ **Do:**
- Sanitize user inputs
- Use Content Security Policy
- Implement CSRF protection
- Validate data from API
- Keep dependencies updated

❌ **Don't:**
- Use `eval()` or similar
- Trust data from external sources
- Disable security features
- Include sensitive data in URLs

### 5. Monitoring & Logging

✅ **Implement:**
- Authentication attempt logging
- Failed login tracking
- API error logging
- Security event alerts
- Regular security audits

### 6. Dependency Management

```bash
# Check for vulnerabilities
npm audit

# Update dependencies
npm update

# Fix vulnerabilities (review breaking changes first)
npm audit fix
```

---

## Security Incident Response

### If a security breach occurs:

1. **Immediate Actions:**
   - Rotate all JWT secrets
   - Invalidate all existing sessions
   - Review access logs
   - Identify breach vector

2. **Investigation:**
   - Check database for unauthorized access
   - Review recent code changes
   - Audit user accounts
   - Check for data exfiltration

3. **Remediation:**
   - Fix vulnerability
   - Deploy patch immediately
   - Notify affected users (if required)
   - Document incident

4. **Prevention:**
   - Update security measures
   - Conduct security review
   - Train team on lessons learned
   - Implement additional monitoring

---

## Security Testing

### Recommended Tools

- **OWASP ZAP**: Web application security scanner
- **npm audit**: Dependency vulnerability scanner
- **SonarQube**: Code quality and security analysis
- **Burp Suite**: Web security testing

### Regular Security Checks

```bash
# Backend vulnerabilities
cd backend
npm audit

# Frontend vulnerabilities
npm audit

# Outdated dependencies
npm outdated
```

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NestJS Security](https://docs.nestjs.com/security/authentication)
- [Angular Security](https://angular.io/guide/security)
- [Stripe Security](https://stripe.com/docs/security)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

---

## Contact & Support

For security concerns or vulnerabilities:
- **Do not** create public GitHub issues
- Email security concerns privately to the maintainer
- Follow responsible disclosure practices

---

**Last Updated:** 2025-12-27
**Version:** 1.0.0
