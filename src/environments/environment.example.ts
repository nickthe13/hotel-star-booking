/**
 * Example environment configuration file
 *
 * SETUP INSTRUCTIONS:
 * 1. Copy this file to 'environment.ts' for production
 * 2. Copy this file to 'environment.development.ts' for development
 * 3. Replace placeholder values with your actual configuration
 * 4. NEVER commit environment.ts or environment.development.ts to git
 *
 * SECURITY NOTE:
 * - Get your Stripe publishable key from: https://dashboard.stripe.com/apikeys
 * - Use test keys (pk_test_...) for development
 * - Use live keys (pk_live_...) for production only
 */

export const environment = {
  production: false, // Set to true for production
  apiUrl: 'http://localhost:3000/api/v1', // Change to your production API URL (include /api/v1)
  stripePublishableKey: 'pk_test_YOUR_STRIPE_PUBLISHABLE_KEY_HERE' // Replace with your actual Stripe key
};
