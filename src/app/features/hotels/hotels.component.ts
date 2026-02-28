import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HotelService } from '../../core/services/hotel.service';
import { Hotel } from '../../core/models';
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
  // All hotels from a single API call (never changes until page reload)
  private allHotels = signal<Hotel[]>([]);

  loading = signal<boolean>(true);
  showFilters = signal<boolean>(false);
  error = signal<string>('');

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

  // Computed: filter + sort happens instantly in memory (no API call)
  hotels = computed(() => {
    let result = [...this.allHotels()];

    // Search filter
    const query = this.searchQuery().toLowerCase();
    if (query) {
      result = result.filter(h =>
        h.name.toLowerCase().includes(query) ||
        h.city.toLowerCase().includes(query) ||
        h.country.toLowerCase().includes(query) ||
        h.description.toLowerCase().includes(query)
      );
    }

    // City filter
    const city = this.selectedCity();
    if (city) {
      result = result.filter(h => h.city === city);
    }

    // Price filter
    const min = this.minPrice();
    const max = this.maxPrice();
    if (min > 0 || max < 1000) {
      result = result.filter(h => h.pricePerNight >= min && h.pricePerNight <= max);
    }

    // Star rating filter
    const star = this.selectedStarRating();
    if (star) {
      result = result.filter(h => h.starRating >= star);
    }

    // Amenities filter
    const amenities = this.selectedAmenities();
    if (amenities.length > 0) {
      result = result.filter(h =>
        amenities.every(a => h.amenities.includes(a))
      );
    }

    // Sort
    const sortBy = this.sortBy();
    const sortOrder = this.sortOrder();
    const multiplier = sortOrder === 'asc' ? 1 : -1;

    result.sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return (a.pricePerNight - b.pricePerNight) * multiplier;
        case 'rating':
          return ((a.averageRating || 0) - (b.averageRating || 0)) * multiplier;
        case 'popularity':
        default:
          return ((a.totalReviews || 0) - (b.totalReviews || 0)) * multiplier;
      }
    });

    return result;
  });

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
  ) {}

  ngOnInit(): void {
    // Load initial filters from URL query params
    this.route.queryParams.subscribe(params => {
      if (params['city']) this.selectedCity.set(params['city']);
      if (params['minPrice']) this.minPrice.set(+params['minPrice']);
      if (params['maxPrice']) this.maxPrice.set(+params['maxPrice']);
      if (params['starRating']) this.selectedStarRating.set(+params['starRating']);
      if (params['sortBy']) this.sortBy.set(params['sortBy']);
    });

    // Single API call — fetch ALL hotels once
    this.loadHotels();
  }

  private loadHotels(): void {
    this.loading.set(true);
    this.error.set('');

    this.hotelService.getHotels({}).subscribe({
      next: (hotels) => {
        this.allHotels.set(hotels);
        this.loading.set(false);

        // Extract cities from loaded data
        const uniqueCities = [...new Set(hotels.map(h => h.city))].sort();
        this.cities.set(uniqueCities);
      },
      error: (err) => {
        console.error('Error loading hotels:', err);
        this.error.set('Failed to load hotels. Please check your connection and try again.');
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

  retry(): void {
    this.loadHotels();
  }
}
