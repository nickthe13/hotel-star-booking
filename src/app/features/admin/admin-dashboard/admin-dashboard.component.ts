import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BookingService } from '../../../core/services/booking.service';
import { HotelService } from '../../../core/services/hotel.service';
import { Booking, BookingStatus } from '../../../core/models/booking.model';
import { Hotel } from '../../../core/models';
import { DashboardStatistics, PopularHotel } from '../../../core/models/admin.model';

@Component({
  selector: 'app-admin-dashboard',
  imports: [CommonModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss'
})
export class AdminDashboardComponent implements OnInit {
  allBookings = signal<Booking[]>([]);
  allHotels = signal<Hotel[]>([]);
  loading = signal<boolean>(true);

  statistics = computed<DashboardStatistics>(() => {
    const bookings = this.allBookings();
    const totalRevenue = bookings.reduce((sum, b) => sum + b.totalPrice, 0);
    const totalBookings = bookings.length;
    const averageBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

    // Calculate popular hotels
    const hotelBookingData = new Map<string, { count: number; revenue: number; hotel: any }>();
    bookings.forEach(booking => {
      const existing = hotelBookingData.get(booking.hotelId);
      if (existing) {
        existing.count++;
        existing.revenue += booking.totalPrice;
      } else {
        hotelBookingData.set(booking.hotelId, {
          count: 1,
          revenue: booking.totalPrice,
          hotel: booking.hotel
        });
      }
    });

    const popularHotels: PopularHotel[] = Array.from(hotelBookingData.entries())
      .map(([hotelId, data]) => ({
        hotelId,
        hotelName: data.hotel.name,
        bookingCount: data.count,
        revenue: data.revenue
      }))
      .sort((a, b) => b.bookingCount - a.bookingCount)
      .slice(0, 5);

    // Get recent bookings
    const recentBookings = [...bookings]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    return {
      totalBookings,
      totalRevenue,
      totalHotels: this.allHotels().length,
      activeBookings: bookings.filter(
        b => b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.PENDING
      ).length,
      completedBookings: bookings.filter(b => b.status === BookingStatus.COMPLETED).length,
      cancelledBookings: bookings.filter(b => b.status === BookingStatus.CANCELLED).length,
      averageBookingValue,
      popularHotels,
      recentBookings
    };
  });

  pendingBookings = computed(() => {
    return this.allBookings().filter(b => b.status === BookingStatus.PENDING).length;
  });

  confirmedBookings = computed(() => {
    return this.allBookings().filter(b => b.status === BookingStatus.CONFIRMED).length;
  });

  constructor(
    private bookingService: BookingService,
    private hotelService: HotelService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);

    this.bookingService.getAllBookings().subscribe({
      next: (bookings) => {
        this.allBookings.set(bookings);
      },
      error: (error) => {
        console.error('Error loading bookings:', error);
      }
    });

    this.hotelService.getHotels().subscribe({
      next: (hotels) => {
        this.allHotels.set(hotels);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading hotels:', error);
        this.loading.set(false);
      }
    });
  }

  getStatusBadgeClass(status: BookingStatus): string {
    switch (status) {
      case BookingStatus.CONFIRMED:
        return 'badge--success';
      case BookingStatus.PENDING:
        return 'badge--warning';
      case BookingStatus.CANCELLED:
        return 'badge--danger';
      case BookingStatus.COMPLETED:
        return 'badge--info';
      default:
        return '';
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}
