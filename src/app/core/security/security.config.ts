/**
 * Security Configuration
 * Centralized security settings for the application
 */

export const SecurityConfig = {
  /**
   * Authentication settings
   */
  auth: {
    // Token expiration time in milliseconds (24 hours)
    tokenExpirationTime: 24 * 60 * 60 * 1000,

    // Refresh token before expiration (30 minutes before)
    tokenRefreshThreshold: 30 * 60 * 1000,

    // Maximum login attempts before lockout
    maxLoginAttempts: 5,

    // Account lockout duration in milliseconds (15 minutes)
    lockoutDuration: 15 * 60 * 1000,

    // Password requirements
    password: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: false
    }
  },

  /**
   * Session settings
   */
  session: {
    // Session timeout in milliseconds (30 minutes of inactivity)
    inactivityTimeout: 30 * 60 * 1000,

    // Warn user before session expires (5 minutes before)
    warningThreshold: 5 * 60 * 1000
  },

  /**
   * API request settings
   */
  api: {
    // Request timeout in milliseconds
    timeout: 30000,

    // Maximum retry attempts for failed requests
    maxRetries: 3,

    // Rate limiting
    rateLimit: {
      // Maximum requests per minute
      maxRequests: 60,
      // Time window in milliseconds
      window: 60 * 1000
    }
  },

  /**
   * Data protection settings
   */
  dataProtection: {
    // Encrypt sensitive data in localStorage
    encryptLocalStorage: true,

    // Clear sensitive data on logout
    clearDataOnLogout: true,

    // Sanitize user input
    sanitizeInput: true
  },

  /**
   * Content Security Policy
   */
  csp: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", 'https://js.stripe.com'],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'https:', 'blob:'],
    'font-src': ["'self'", 'data:'],
    'connect-src': ["'self'", 'https://api.stripe.com'],
    'frame-src': ["'self'", 'https://js.stripe.com', 'https://hooks.stripe.com'],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"]
  },

  /**
   * HTTP Security Headers
   */
  headers: {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
  },

  /**
   * Input validation patterns
   */
  validation: {
    email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    phone: /^\+?[\d\s\-()]+$/,
    alphanumeric: /^[a-zA-Z0-9]+$/,
    noSpecialChars: /^[a-zA-Z0-9\s\-_.]+$/,
    url: /^https?:\/\/.+/,
    // Prevent common XSS patterns
    xssPatterns: [
      /<script[^>]*>.*?<\/script>/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi
    ]
  },

  /**
   * Allowed file upload types
   */
  fileUpload: {
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedDocumentTypes: ['application/pdf']
  }
} as const;

/**
 * Security error messages
 */
export const SecurityMessages = {
  invalidToken: 'Your session has expired. Please log in again.',
  accountLocked: 'Account temporarily locked due to too many failed login attempts. Please try again later.',
  weakPassword: 'Password does not meet security requirements.',
  invalidInput: 'Invalid input detected. Please check your data.',
  sessionExpired: 'Your session has expired due to inactivity.',
  unauthorized: 'You are not authorized to perform this action.',
  suspiciousActivity: 'Suspicious activity detected. Action blocked.'
} as const;
