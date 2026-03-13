import { Component, OnInit, OnDestroy, signal, Input, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HotelService } from '../../core/services/hotel.service';
import { AuthService } from '../../core/services/auth.service';
import { ReviewService } from '../../core/services/review.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { BookingService } from '../../core/services/booking.service';
import { Hotel, Review, DateRange, Room } from '../../core/models';
import { Booking } from '../../core/models/booking.model';
import { LoaderComponent } from '../../shared/components/loader/loader.component';
import { ReviewListComponent } from '../../shared/components/review-list/review-list.component';
import { ReviewFormComponent, ReviewFormData } from '../../shared/components/review-form/review-form.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { BookingStepperComponent, BookingDetails } from '../../shared/components/booking-stepper/booking-stepper.component';
import { PaymentModalComponent, PaymentModalData } from '../../shared/components/payment-modal/payment-modal.component';
import { HotelMapComponent } from '../../shared/components/hotel-map/hotel-map.component';

@Component({
  selector: 'app-hotel-details',
  imports: [CommonModule, RouterLink, LoaderComponent, ReviewListComponent, ReviewFormComponent, ModalComponent, BookingStepperComponent, PaymentModalComponent, HotelMapComponent],
  templateUrl: './hotel-details.component.html',
  styleUrl: './hotel-details.component.scss'
})
export class HotelDetailsComponent implements OnInit, OnDestroy {
  @Input() id!: string;

  @ViewChild(ReviewFormComponent) reviewFormComponent?: ReviewFormComponent;
  @ViewChild('bookingCard') bookingCardRef?: ElementRef;

  hotel = signal<Hotel | undefined>(undefined);
  loading = signal<boolean>(true);
  selectedImageIndex = signal<number>(0);
  imageAnimating = signal<boolean>(false);
  userRating = signal<number>(0);

  // Auto-slide
  private autoSlideTimer: ReturnType<typeof setInterval> | null = null;
  private readonly SLIDE_INTERVAL = 4000; // 4 seconds
  hoveredRating = signal<number>(0);
  hasRated = signal<boolean>(false);

  // Reviews
  reviews = signal<Review[]>([]);
  reviewsLoading = signal<boolean>(false);
  userReview = signal<Review | undefined>(undefined);
  showReviewModal = signal<boolean>(false);
  editingReview = signal<Review | undefined>(undefined);

  // Calendar / Date Selection
  selectedCheckIn = signal<string | null>(null);
  selectedCheckOut = signal<string | null>(null);

  // Room Selection
  selectedRoom = signal<Room | undefined>(undefined);
  roomBookings = signal<Booking[]>([]);

  // Payment Modal
  showPaymentModal = signal<boolean>(false);
  paymentModalData = signal<PaymentModalData | null>(null);

  constructor(
    private hotelService: HotelService,
    public authService: AuthService,
    private reviewService: ReviewService,
    private favoritesService: FavoritesService,
    private bookingService: BookingService,
    private router: Router
  ) {}

  get isFavorite(): boolean {
    const currentHotel = this.hotel();
    if (!currentHotel) return false;
    return this.favoritesService.isFavorite(currentHotel.id);
  }

  toggleFavorite(): void {
    const currentHotel = this.hotel();
    if (!currentHotel) return;

    if (!this.authService.isAuthenticated()) {
      alert('Please log in to save favorites');
      return;
    }

    this.favoritesService.toggleFavorite(currentHotel).subscribe({
      error: (err) => {
        console.error('Failed to toggle favorite:', err);
      }
    });
  }

  ngOnInit(): void {
    if (this.id) {
      this.loadHotel();
      this.loadUserRating();
    }
  }

  private loadHotel(): void {
    this.loading.set(true);
    this.reviewsLoading.set(true);
    this.hotelService.getHotelById(this.id).subscribe({
      next: (hotel) => {
        this.hotel.set(hotel);
        this.loading.set(false);
        this.startAutoSlide();

        // Extract reviews from hotel response (already included by backend)
        if (hotel && hotel.reviews) {
          this.reviews.set(hotel.reviews);

          // Find the current user's review from the list
          if (this.authService.isAuthenticated()) {
            const userId = this.authService.user()?.id;
            const userReview = hotel.reviews.find((r: Review) => r.userId === userId || (r as any).user?.id === userId);
            if (userReview) {
              this.userReview.set(userReview);
            }
          }
        }
        this.loadLocalReviews();
        this.reviewsLoading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.reviewsLoading.set(false);
        this.router.navigate(['/hotels']);
      }
    });
  }

  private loadUserRating(): void {
    if (!this.authService.isAuthenticated()) {
      return;
    }

    const userId = this.authService.user()?.id;
    if (!userId) {
      return;
    }

    const ratingsKey = `hotel_ratings_${userId}`;
    const storedRatings = localStorage.getItem(ratingsKey);

    if (storedRatings) {
      try {
        const ratings = JSON.parse(storedRatings);
        const userRating = ratings[this.id];

        if (userRating) {
          this.userRating.set(userRating);
          this.hasRated.set(true);
        }
      } catch (error) {
        console.error('Error loading user ratings:', error);
      }
    }
  }

  private saveUserRating(rating: number): void {
    const userId = this.authService.user()?.id;
    if (!userId) {
      return;
    }

    const ratingsKey = `hotel_ratings_${userId}`;
    let ratings: Record<string, number> = {};

    const storedRatings = localStorage.getItem(ratingsKey);
    if (storedRatings) {
      try {
        ratings = JSON.parse(storedRatings);
      } catch (error) {
        console.error('Error parsing stored ratings:', error);
      }
    }

    ratings[this.id] = rating;
    localStorage.setItem(ratingsKey, JSON.stringify(ratings));
  }

  ngOnDestroy(): void {
    this.stopAutoSlide();
  }

  selectImage(index: number): void {
    this.animateToImage(index);
  }

  nextImage(): void {
    const hotel = this.hotel();
    if (!hotel) return;
    const next = (this.selectedImageIndex() + 1) % hotel.images.length;
    this.animateToImage(next);
  }

  prevImage(): void {
    const hotel = this.hotel();
    if (!hotel) return;
    const prev = (this.selectedImageIndex() - 1 + hotel.images.length) % hotel.images.length;
    this.animateToImage(prev);
  }

  private animateToImage(index: number): void {
    if (index === this.selectedImageIndex()) return;
    this.imageAnimating.set(true);
    // Brief fade-out, then swap image and fade-in
    setTimeout(() => {
      this.selectedImageIndex.set(index);
      this.imageAnimating.set(false);
    }, 300);
  }

  startAutoSlide(): void {
    this.stopAutoSlide();
    const hotel = this.hotel();
    if (!hotel || hotel.images.length <= 1) return;
    this.autoSlideTimer = setInterval(() => this.nextImage(), this.SLIDE_INTERVAL);
  }

  stopAutoSlide(): void {
    if (this.autoSlideTimer) {
      clearInterval(this.autoSlideTimer);
      this.autoSlideTimer = null;
    }
  }

  onGalleryMouseEnter(): void {
    this.stopAutoSlide();
  }

  onGalleryMouseLeave(): void {
    this.startAutoSlide();
  }

  onDateRangeSelected(dateRange: DateRange): void {
    this.selectedCheckIn.set(dateRange.checkIn);
    this.selectedCheckOut.set(dateRange.checkOut);
  }

  onDateRangeCleared(): void {
    this.selectedCheckIn.set(null);
    this.selectedCheckOut.set(null);
  }

  selectRoom(room: Room): void {
    if (!room.available) {
      return;
    }
    // Toggle selection if clicking the same room
    if (this.selectedRoom()?.id === room.id) {
      this.selectedRoom.set(undefined);
      this.roomBookings.set([]);
    } else {
      this.selectedRoom.set(room);
      // Fetch bookings for the selected room to show on availability calendar
      this.bookingService.getRoomBookings(room.id).subscribe({
        next: (bookings) => this.roomBookings.set(bookings),
        error: () => this.roomBookings.set([])
      });
      // Scroll to booking card after brief delay for visual feedback
      setTimeout(() => {
        this.bookingCardRef?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }

  isRoomSelected(room: Room): boolean {
    return this.selectedRoom()?.id === room.id;
  }

  onBookNowClick(): void {
    if (!this.selectedRoom()) {
      // Scroll to rooms section so user can select a room
      const roomsSection = document.querySelector('.rooms-list');
      if (roomsSection) {
        roomsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }

    // Room and dates are selected - proceed to payment
    const room = this.selectedRoom()!;
    const checkIn = this.selectedCheckIn()!;
    const checkOut = this.selectedCheckOut()!;

    // Calculate nights and total
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalPrice = room.pricePerNight * nights;

    // Open payment modal directly
    const bookingDetails: BookingDetails = {
      hotel: this.hotel()!,
      room: room,
      checkIn: checkIn,
      checkOut: checkOut,
      guests: 2, // Default guests
      specialRequests: '',
      nights: nights,
      totalPrice: totalPrice
    };

    this.onConfirmBooking(bookingDetails);
  }

  onConfirmBooking(bookingDetails: BookingDetails): void {
    // Open payment modal with booking details
    this.paymentModalData.set({
      hotel: bookingDetails.hotel,
      room: bookingDetails.room,
      checkIn: bookingDetails.checkIn,
      checkOut: bookingDetails.checkOut,
      guests: bookingDetails.guests,
      specialRequests: bookingDetails.specialRequests,
      nights: bookingDetails.nights,
      totalPrice: bookingDetails.totalPrice
    });
    this.showPaymentModal.set(true);
  }

  closePaymentModal(): void {
    this.showPaymentModal.set(false);
    this.paymentModalData.set(null);
  }

  onBookingComplete(result: { confirmationNumber: string; bookingId: string }): void {
    console.log('Booking completed:', result.confirmationNumber);
    // Refresh room bookings so calendar shows newly booked dates
    const room = this.selectedRoom();
    if (room) {
      this.bookingService.getRoomBookings(room.id).subscribe({
        next: (bookings) => this.roomBookings.set(bookings),
        error: () => {}
      });
    }
  }

  canBookNow(): boolean {
    return this.selectedCheckIn() !== null && this.selectedCheckOut() !== null;
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

      const roundedAverageRating = Math.round(newAverageRating * 10) / 10;

      this.hotel.set({
        ...hotel,
        averageRating: roundedAverageRating,
        totalReviews: newTotalReviews
      });

      // Persist hotel rating to the service and localStorage
      this.hotelService.updateHotelRating(hotel.id, roundedAverageRating, newTotalReviews);
    }

    this.userRating.set(rating);
    this.hasRated.set(true);
    this.hoveredRating.set(0);

    // Save user's rating to localStorage
    this.saveUserRating(rating);
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

  // Review methods
  openReviewModal(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/auth/login']);
      return;
    }

    this.editingReview.set(this.userReview());
    this.showReviewModal.set(true);
  }

  closeReviewModal(): void {
    this.showReviewModal.set(false);
    this.editingReview.set(undefined);
  }

  submitReview(formData: ReviewFormData): void {
    const existingReview = this.userReview();

    if (existingReview) {
      // Update existing review
      this.reviewService.updateReview(existingReview.id, {
        rating: formData.rating,
        comment: formData.comment
      }).subscribe({
        next: (updatedReview) => {
          this.userReview.set(updatedReview);
          this.loadHotel();
          this.closeReviewModal();
          if (this.reviewFormComponent) {
            this.reviewFormComponent.resetSubmitting();
          }
        },
        error: () => {
          // API unavailable — update locally
          const updatedReview: Review = {
            ...existingReview,
            rating: formData.rating,
            comment: formData.comment
          };
          this.userReview.set(updatedReview);
          this.reviews.update(list => list.map(r => r.id === existingReview.id ? updatedReview : r));
          this.saveLocalReviews();
          this.closeReviewModal();
          if (this.reviewFormComponent) {
            this.reviewFormComponent.resetSubmitting();
          }
        }
      });
    } else {
      // Create new review
      this.reviewService.createReview({
        hotelId: this.id,
        rating: formData.rating,
        comment: formData.comment
      }).subscribe({
        next: (newReview) => {
          this.userReview.set(newReview);
          this.loadHotel();
          this.closeReviewModal();
          if (this.reviewFormComponent) {
            this.reviewFormComponent.resetSubmitting();
          }
        },
        error: () => {
          // API unavailable — save locally
          const user = this.authService.user();
          const localReview: Review = {
            id: 'local_' + Date.now(),
            hotelId: this.id,
            userId: user?.id || '',
            userName: user?.name || 'You',
            rating: formData.rating,
            comment: formData.comment,
            createdAt: new Date()
          };
          this.userReview.set(localReview);
          this.reviews.update(list => [localReview, ...list]);
          this.saveLocalReviews();
          this.closeReviewModal();
          if (this.reviewFormComponent) {
            this.reviewFormComponent.resetSubmitting();
          }
        }
      });
    }
  }

  private saveLocalReviews(): void {
    const reviews = this.reviews();
    const localReviews = reviews.filter(r => r.id.startsWith('local_'));
    if (localReviews.length > 0) {
      const key = `local_reviews_${this.id}`;
      localStorage.setItem(key, JSON.stringify(localReviews));
    }
  }

  private loadLocalReviews(): void {
    const key = `local_reviews_${this.id}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const localReviews: Review[] = JSON.parse(stored).map((r: any) => ({
          ...r,
          createdAt: new Date(r.createdAt)
        }));
        // Merge with existing reviews (avoid duplicates)
        this.reviews.update(list => {
          const existingIds = new Set(list.map(r => r.id));
          const newReviews = localReviews.filter(r => !existingIds.has(r.id));
          return [...newReviews, ...list];
        });
        // Set user review if found
        const user = this.authService.user();
        if (user) {
          const userLocalReview = localReviews.find(r => r.userId === user.id);
          if (userLocalReview && !this.userReview()) {
            this.userReview.set(userLocalReview);
          }
        }
      } catch (e) {
        console.error('Error loading local reviews:', e);
      }
    }
  }

  editReview(review: Review): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/auth/login']);
      return;
    }

    this.editingReview.set(review);
    this.showReviewModal.set(true);
  }

  deleteReview(reviewId: string): void {
    // Handle local reviews directly
    if (reviewId.startsWith('local_')) {
      if (this.userReview()?.id === reviewId) {
        this.userReview.set(undefined);
      }
      this.reviews.update(list => list.filter(r => r.id !== reviewId));
      this.saveLocalReviews();
      // Clean up if no local reviews left
      const key = `local_reviews_${this.id}`;
      const remaining = this.reviews().filter(r => r.id.startsWith('local_'));
      if (remaining.length === 0) {
        localStorage.removeItem(key);
      }
      return;
    }

    this.reviewService.deleteReview(reviewId).subscribe({
      next: () => {
        if (this.userReview()?.id === reviewId) {
          this.userReview.set(undefined);
        }
        this.loadHotel();
      },
      error: () => {
        // API unavailable — remove locally
        if (this.userReview()?.id === reviewId) {
          this.userReview.set(undefined);
        }
        this.reviews.update(list => list.filter(r => r.id !== reviewId));
      }
    });
  }
}
