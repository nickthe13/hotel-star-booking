import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FavoritesService } from '../../core/services/favorites.service';
import { AuthService } from '../../core/services/auth.service';
import { Hotel } from '../../core/models';
import { HotelCardComponent } from '../../shared/components/hotel-card/hotel-card.component';
import { LoaderComponent } from '../../shared/components/loader/loader.component';

@Component({
  selector: 'app-favorites',
  imports: [CommonModule, RouterLink, HotelCardComponent, LoaderComponent],
  templateUrl: './favorites.component.html',
  styleUrl: './favorites.component.scss'
})
export class FavoritesComponent implements OnInit {
  favorites = signal<Hotel[]>([]);
  loading = signal<boolean>(true);

  constructor(
    private favoritesService: FavoritesService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadFavorites();
  }

  private loadFavorites(): void {
    this.loading.set(true);
    this.favoritesService.loadFavorites().subscribe({
      next: (hotels) => {
        this.favorites.set(hotels);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  get favoritesCount(): number {
    return this.favorites().length;
  }

  clearAllFavorites(): void {
    if (confirm('Are you sure you want to remove all favorites?')) {
      const hotels = [...this.favorites()];
      hotels.forEach(hotel => {
        this.favoritesService.removeFromFavorites(hotel.id).subscribe();
      });
      this.favorites.set([]);
    }
  }
}
