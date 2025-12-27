import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { EnvironmentValidator } from './app/core/security/environment-validator';

// Validate environment configuration before bootstrapping
try {
  EnvironmentValidator.validate();

  bootstrapApplication(App, appConfig)
    .catch((err) => console.error(err));
} catch (error) {
  console.error('❌ Environment validation failed:', error);
  console.error('Application cannot start with invalid configuration');

  // Display user-friendly error message
  document.body.innerHTML = `
    <div style="
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      font-family: sans-serif;
      background: #f5f5f5;
    ">
      <div style="
        background: white;
        padding: 2rem;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        max-width: 500px;
      ">
        <h1 style="color: #e53e3e; margin: 0 0 1rem 0;">Configuration Error</h1>
        <p style="color: #4a5568; margin: 0 0 1rem 0;">
          The application could not start due to a configuration error.
        </p>
        <p style="color: #718096; font-size: 0.875rem; margin: 0;">
          ${error instanceof Error ? error.message : 'Unknown error'}
        </p>
        <p style="color: #718096; font-size: 0.875rem; margin: 1rem 0 0 0;">
          Please contact the system administrator.
        </p>
      </div>
    </div>
  `;
}
