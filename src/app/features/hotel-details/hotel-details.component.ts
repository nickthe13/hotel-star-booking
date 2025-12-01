import { Component, OnInit, signal, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HotelService } from '../../core/services/hotel.service';
import { AuthService } from '../../core/services/auth.service';
import { Hotel } from '../../core/models';
import { LoaderComponent } from '../../shared/components/loader/loader.component';

@Component({
  selector: 'app-hotel-details',
  imports: [CommonModule, RouterLink, LoaderComponent],
  templateUrl: './hotel-details.component.html',
  styleUrl: './hotel-details.component.scss'
})
export class HotelDetailsComponent implements OnInit {
  @Input() id!: string;

  hotel = signal<Hotel | undefined>(undefined);
  loading = signal<boolean>(true);
  selectedImageIndex = signal<number>(0);
  userRating = signal<number>(0);
  hoveredRating = signal<number>(0);
  hasRated = signal<boolean>(false);

  constructor(
    private hotelService: HotelService,
    public authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (this.id) {
      this.loadHotel();
    }
  }

  private loadHotel(): void {
    this.loading.set(true);
    this.hotelService.getHotelById(this.id).subscribe({
      next: (hotel) => {
        this.hotel.set(hotel);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.router.navigate(['/hotels']);
      }
    });
  }

  selectImage(index: number): void {
    this.selectedImageIndex.set(index);
  }

  bookNow(): void {
    if (this.hotel()) {
      this.router.navigate(['/booking', this.hotel()!.id]);
    }
  }

  hoverRating(rating: number): void {
    this.hoveredRating.set(rating);
  }

  clearHover(): void {
    this.hoveredRating.set(0);
  }

  setRating(rating: number): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/auth/login']);
      return;
    }

    const hotel = this.hotel();
    if (hotel) {
      const previousRating = this.userRating();
      const currentTotal = (hotel.averageRating || 0) * (hotel.totalReviews || 0);

      let newTotalReviews: number;
      let newAverageRating: number;

      if (this.hasRated()) {
        // User is changing their rating - subtract old, add new
        newTotalReviews = hotel.totalReviews || 0;
        newAverageRating = (currentTotal - previousRating + rating) / newTotalReviews;
      } else {
        // First time rating - add to total
        newTotalReviews = (hotel.totalReviews || 0) + 1;
        newAverageRating = (currentTotal + rating) / newTotalReviews;
      }

      this.hotel.set({
        ...hotel,
        averageRating: Math.round(newAverageRating * 10) / 10,
        totalReviews: newTotalReviews
      });
    }

    this.userRating.set(rating);
    this.hasRated.set(true);
    this.hoveredRating.set(0);
  }

  getDisplayRating(index: number): boolean {
    const hovered = this.hoveredRating();
    const rated = this.userRating();

    if (hovered > 0) {
      return index <= hovered;
    }
    if (rated > 0) {
      return index <= rated;
    }
    return false;
  }
}
