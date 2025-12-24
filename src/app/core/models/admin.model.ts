export interface TableColumn<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => string;
}

export interface TableAction<T> {
  label: string;
  icon?: string;
  onClick: (item: T) => void;
  variant?: 'primary' | 'danger' | 'secondary';
  condition?: (item: T) => boolean;
}

export interface DashboardStatistics {
  totalHotels: number;
  totalBookings: number;
  totalRevenue: number;
  activeBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  averageBookingValue: number;
  popularHotels: PopularHotel[];
  recentBookings: any[]; // Will use Booking type
}

export interface PopularHotel {
  hotelId: string;
  hotelName: string;
  bookingCount: number;
  revenue: number;
  averageRating?: number;
}
