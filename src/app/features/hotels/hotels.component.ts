import { Component, OnInit, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HotelService } from '../../core/services/hotel.service';
import { Hotel, HotelSearchParams } from '../../core/models';
import { HotelCardComponent } from '../../shared/components/hotel-card/hotel-card.component';
import { LoaderComponent } from '../../shared/components/loader/loader.component';
import { AMENITIES, STAR_RATINGS } from '../../core/constants/app.constants';

@Component({
  selector: 'app-hotels',
  imports: [CommonModule, FormsModule, HotelCardComponent, LoaderComponent],
  templateUrl: './hotels.component.html',
  styleUrl: './hotels.component.scss'
})
export class HotelsComponent implements OnInit {
  hotels = signal<Hotel[]>([]);
  loading = signal<boolean>(false);
  showFilters = signal<boolean>(false);

  // Filter signals
  searchQuery = signal<string>('');
  selectedCity = signal<string>('');
  minPrice = signal<number>(0);
  maxPrice = signal<number>(1000);
  selectedStarRating = signal<number | null>(null);
  selectedAmenities = signal<string[]>([]);
  sortBy = signal<'price' | 'rating' | 'popularity'>('popularity');
  sortOrder = signal<'asc' | 'desc'>('desc');

  // Available options
  cities = signal<string[]>([]);
  amenities = AMENITIES;
  starRatings = STAR_RATINGS;

  // Computed search params
  searchParams = computed<HotelSearchParams>(() => ({
    query: this.searchQuery() || undefined,
    city: this.selectedCity() || undefined,
    minPrice: this.minPrice(),
    maxPrice: this.maxPrice(),
    starRating: this.selectedStarRating() || undefined,
    amenities: this.selectedAmenities().length > 0 ? this.selectedAmenities() : undefined,
    sortBy: this.sortBy(),
    sortOrder: this.sortOrder()
  }));

  resultsCount = computed(() => this.hotels().length);

  // Computed active filters count
  activeFiltersCount = computed(() => {
    let count = 0;
    if (this.searchQuery()) count++;
    if (this.selectedCity()) count++;
    if (this.minPrice() > 0) count++;
    if (this.maxPrice() < 1000) count++;
    if (this.selectedStarRating()) count++;
    if (this.selectedAmenities().length > 0) count++;
    return count;
  });

  constructor(
    private hotelService: HotelService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    // Effect to fetch hotels when search params change
    effect(() => {
      const params = this.searchParams();
      this.fetchHotels(params);
    });
  }

  ngOnInit(): void {
    // Load cities from API
    this.hotelService.getCities().subscribe(cities => {
      this.cities.set(cities);
    });

    // Load initial filters from query params
    this.route.queryParams.subscribe(params => {
      if (params['city']) this.selectedCity.set(params['city']);
      if (params['minPrice']) this.minPrice.set(+params['minPrice']);
      if (params['maxPrice']) this.maxPrice.set(+params['maxPrice']);
      if (params['starRating']) this.selectedStarRating.set(+params['starRating']);
      if (params['sortBy']) this.sortBy.set(params['sortBy']);
    });
  }

  private fetchHotels(params: HotelSearchParams): void {
    this.loading.set(true);
    this.hotelService.getHotels(params).subscribe({
      next: (hotels) => {
        this.hotels.set(hotels);
        this.loading.set(false);
        this.updateQueryParams();
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  toggleFilters(): void {
    this.showFilters.update(show => !show);
  }

  onStarRatingChange(rating: number): void {
    if (this.selectedStarRating() === rating) {
      this.selectedStarRating.set(null);
    } else {
      this.selectedStarRating.set(rating);
    }
  }

  onAmenityToggle(amenity: string): void {
    const current = this.selectedAmenities();
    if (current.includes(amenity)) {
      this.selectedAmenities.set(current.filter(a => a !== amenity));
    } else {
      this.selectedAmenities.set([...current, amenity]);
    }
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.selectedCity.set('');
    this.minPrice.set(0);
    this.maxPrice.set(1000);
    this.selectedStarRating.set(null);
    this.selectedAmenities.set([]);
  }

  private updateQueryParams(): void {
    const queryParams: any = {};

    if (this.selectedCity()) queryParams.city = this.selectedCity();
    if (this.minPrice() > 0) queryParams.minPrice = this.minPrice();
    if (this.maxPrice() < 1000) queryParams.maxPrice = this.maxPrice();
    if (this.selectedStarRating()) queryParams.starRating = this.selectedStarRating();
    if (this.sortBy() !== 'popularity') queryParams.sortBy = this.sortBy();

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge'
    });
  }
}
