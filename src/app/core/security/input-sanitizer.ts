import { SecurityConfig } from './security.config';

/**
 * Input Sanitization Utilities
 * Prevents XSS and injection attacks
 */
export class InputSanitizer {
  /**
   * Sanitizes string input to prevent XSS attacks
   */
  static sanitizeString(input: string): string {
    if (!input) return '';

    let sanitized = input;

    // Remove script tags and event handlers
    SecurityConfig.validation.xssPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    // Encode HTML special characters
    sanitized = this.encodeHTML(sanitized);

    return sanitized.trim();
  }

  /**
   * Encodes HTML special characters
   */
  static encodeHTML(input: string): string {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  }

  /**
   * Decodes HTML entities
   */
  static decodeHTML(input: string): string {
    const div = document.createElement('div');
    div.innerHTML = input;
    return div.textContent || '';
  }

  /**
   * Validates and sanitizes email input
   */
  static sanitizeEmail(email: string): string {
    if (!email) return '';

    const sanitized = email.trim().toLowerCase();

    if (!SecurityConfig.validation.email.test(sanitized)) {
      throw new Error('Invalid email format');
    }

    return sanitized;
  }

  /**
   * Sanitizes URL input
   */
  static sanitizeURL(url: string): string {
    if (!url) return '';

    const sanitized = url.trim();

    // Only allow HTTP and HTTPS protocols
    if (!sanitized.startsWith('http://') && !sanitized.startsWith('https://')) {
      throw new Error('Invalid URL protocol. Only HTTP and HTTPS are allowed.');
    }

    // Check for javascript: protocol
    if (sanitized.toLowerCase().includes('javascript:')) {
      throw new Error('Invalid URL detected');
    }

    return sanitized;
  }

  /**
   * Sanitizes numeric input
   */
  static sanitizeNumber(input: string | number): number {
    const num = typeof input === 'string' ? parseFloat(input) : input;

    if (isNaN(num) || !isFinite(num)) {
      throw new Error('Invalid number');
    }

    return num;
  }

  /**
   * Sanitizes file name
   */
  static sanitizeFileName(fileName: string): string {
    if (!fileName) return '';

    // Remove path traversal attempts
    let sanitized = fileName.replace(/[/\\]/g, '');

    // Remove special characters but keep extension
    sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');

    return sanitized;
  }

  /**
   * Validates file type
   */
  static validateFileType(file: File, allowedTypes: string[]): boolean {
    if (!file || !file.type) {
      return false;
    }

    return allowedTypes.includes(file.type);
  }

  /**
   * Validates file size
   */
  static validateFileSize(file: File, maxSize: number): boolean {
    if (!file) {
      return false;
    }

    return file.size <= maxSize;
  }

  /**
   * Sanitizes object by sanitizing all string values
   */
  static sanitizeObject<T extends Record<string, any>>(obj: T): T {
    const sanitized: Record<string, any> = { ...obj };

    Object.keys(sanitized).forEach(key => {
      const value = sanitized[key];

      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value);
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        sanitized[key] = this.sanitizeObject(value);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item =>
          typeof item === 'string'
            ? this.sanitizeString(item)
            : typeof item === 'object'
            ? this.sanitizeObject(item)
            : item
        );
      }
    });

    return sanitized as T;
  }

  /**
   * Detects potential XSS attacks in input
   */
  static detectXSS(input: string): boolean {
    if (!input) return false;

    return SecurityConfig.validation.xssPatterns.some(pattern =>
      pattern.test(input)
    );
  }

  /**
   * Validates password strength
   */
  static validatePassword(password: string): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const config = SecurityConfig.auth.password;

    if (password.length < config.minLength) {
      errors.push(`Password must be at least ${config.minLength} characters long`);
    }

    if (config.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (config.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (config.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (config.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check for common weak passwords
    const weakPasswords = ['password', '12345678', 'qwerty', 'abc123', 'password123'];
    if (weakPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Generates a strong random password
   */
  static generateStrongPassword(length: number = 16): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    const all = uppercase + lowercase + numbers + special;
    let password = '';

    // Ensure at least one of each type
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += all[Math.floor(Math.random() * all.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }
}
