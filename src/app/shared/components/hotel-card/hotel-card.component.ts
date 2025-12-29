import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Hotel } from '../../../core/models';
import { FavoritesService } from '../../../core/services/favorites.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-hotel-card',
  imports: [CommonModule, RouterLink],
  templateUrl: './hotel-card.component.html',
  styleUrl: './hotel-card.component.scss'
})
export class HotelCardComponent {
  @Input({ required: true }) hotel!: Hotel;

  constructor(
    private favoritesService: FavoritesService,
    private authService: AuthService
  ) {}

  get isFavorite(): boolean {
    return this.favoritesService.isFavorite(this.hotel.id);
  }

  get isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  toggleFavorite(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    if (!this.isAuthenticated) {
      // Could show a toast or redirect to login
      alert('Please log in to save favorites');
      return;
    }

    this.favoritesService.toggleFavorite(this.hotel).subscribe({
      error: (err) => {
        console.error('Failed to toggle favorite:', err);
      }
    });
  }
}
