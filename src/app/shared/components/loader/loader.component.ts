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
  styleUrl: './loader.component.scss'
})
export class LoaderComponent {}
