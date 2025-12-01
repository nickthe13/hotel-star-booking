import { Component } from '@angular/core';

@Component({
  selector: 'app-loader',
  imports: [],
  template: `
    <div class="loader">
      <div class="loader__spinner"></div>
      <p class="loader__text">Loading...</p>
    </div>
  `,
  styles: [
    `
      @import '../../../../assets/styles/variables';

      .loader {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 48px;
        gap: 16px;

        &__spinner {
          width: 48px;
          height: 48px;
          border: 4px solid $neutral-200;
          border-top-color: $primary-500;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        &__text {
          color: $text-secondary;
          font-size: 14px;
        }
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
    `
  ]
})
export class LoaderComponent {}
