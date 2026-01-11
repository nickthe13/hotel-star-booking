import { environment } from '../../../environments/environment';

/**
 * Environment Configuration Validator
 * Ensures all required environment variables are present and valid
 */
export class EnvironmentValidator {
  private static readonly REQUIRED_KEYS = [
    'apiUrl',
    'stripePublishableKey'
  ];

  private static readonly STRIPE_KEY_PATTERNS = {
    test: /^pk_test_/,
    live: /^pk_live_/
  };

  /**
   * Validates environment configuration on app startup
   * @throws Error if validation fails
   */
  static validate(): void {
    // Check for missing required keys
    const missingKeys = this.REQUIRED_KEYS.filter(
      key => !environment[key as keyof typeof environment]
    );

    if (missingKeys.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missingKeys.join(', ')}`
      );
    }

    // Validate Stripe key format
    this.validateStripeKey();

    // Warn about placeholder values in production
    if (environment.production) {
      this.validateProductionConfig();
    }

    console.log('✅ Environment configuration validated successfully');
  }

  private static validateStripeKey(): void {
    const stripeKey = environment.stripePublishableKey;

    if (!stripeKey) {
      throw new Error('Stripe publishable key is required');
    }

    // Check if it's a placeholder
    if (stripeKey.includes('YOUR_') || stripeKey.includes('REPLACE')) {
      throw new Error(
        'Stripe publishable key appears to be a placeholder. Please set a real key.'
      );
    }

    // Validate key format
    const isTestKey = this.STRIPE_KEY_PATTERNS.test.test(stripeKey);
    const isLiveKey = this.STRIPE_KEY_PATTERNS.live.test(stripeKey);

    if (!isTestKey && !isLiveKey) {
      throw new Error(
        'Invalid Stripe publishable key format. Must start with pk_test_ or pk_live_'
      );
    }

    // Warn if using live key in development
    if (!environment.production && isLiveKey) {
      console.warn(
        '⚠️ WARNING: Using live Stripe key in development environment!'
      );
    }

    // Warn if using test key in production
    if (environment.production && isTestKey) {
      console.warn(
        '⚠️ WARNING: Using test Stripe key in production environment!'
      );
    }
  }

  private static validateProductionConfig(): void {
    // Check for localhost in production
    if (environment.apiUrl.includes('localhost') ||
        environment.apiUrl.includes('127.0.0.1')) {
      console.warn(
        '⚠️ WARNING: API URL points to localhost in production environment!'
      );
    }

    // Ensure HTTPS in production
    if (!environment.apiUrl.startsWith('https://')) {
      console.warn(
        '⚠️ WARNING: API URL should use HTTPS in production environment!'
      );
    }
  }

  /**
   * Sanitizes environment values for logging (removes sensitive data)
   */
  static getSafeEnvironmentInfo(): Record<string, string> {
    return {
      production: String(environment.production),
      apiUrl: environment.apiUrl,
      stripeKeyType: environment.stripePublishableKey.startsWith('pk_test_')
        ? 'test'
        : 'live',
      stripeKeyPrefix: environment.stripePublishableKey.substring(0, 12) + '...'
    };
  }
}
