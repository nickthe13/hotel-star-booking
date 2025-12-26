import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { BookingService } from '../../../core/services/booking.service';
import { Booking, BookingStatus } from '../../../core/models/booking.model';
import { TableComponent } from '../../../shared/components/table/table.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { ConfirmationDialogComponent } from '../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { TableColumn, TableAction } from '../../../core/models/admin.model';

@Component({
  selector: 'app-admin-bookings',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableComponent,
    ModalComponent,
    ConfirmationDialogComponent
  ],
  templateUrl: './admin-bookings.component.html',
  styleUrl: './admin-bookings.component.scss'
})
export class AdminBookingsComponent implements OnInit {
  allBookings = signal<Booking[]>([]);
  loading = signal<boolean>(false);
  showStatusModal = signal<boolean>(false);
  showCancelDialog = signal<boolean>(false);
  selectedBooking = signal<Booking | null>(null);

  // Filter signals
  searchQuery = signal<string>('');
  statusFilter = signal<BookingStatus | 'all'>('all');

  // Expose BookingStatus enum to template
  readonly BookingStatus = BookingStatus;

  statusForm!: FormGroup;

  // Computed filtered bookings
  filteredBookings = computed(() => {
    let bookings = this.allBookings();
    const query = this.searchQuery().toLowerCase();
    const status = this.statusFilter();

    // Filter by search query
    if (query) {
      bookings = bookings.filter(booking =>
        booking.hotel?.name.toLowerCase().includes(query) ||
        booking.hotel?.location.toLowerCase().includes(query) ||
        booking.id.toLowerCase().includes(query) ||
        booking.userId.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (status !== 'all') {
      bookings = bookings.filter(booking => booking.status === status);
    }

    return bookings;
  });

  columns: TableColumn<Booking>[] = [
    {
      key: 'id',
      label: 'Booking ID',
      sortable: true,
      render: (booking: Booking) => `#${booking.id}`
    },
    {
      key: 'hotel',
      label: 'Hotel',
      sortable: false,
      render: (booking: Booking) => booking.hotel?.name || 'N/A'
    },
    {
      key: 'location',
      label: 'Location',
      sortable: false,
      render: (booking: Booking) => booking.hotel?.location || 'N/A'
    },
    {
      key: 'checkIn',
      label: 'Check-In',
      sortable: true,
      render: (booking: Booking) => this.formatDate(booking.checkIn)
    },
    {
      key: 'checkOut',
      label: 'Check-Out',
      sortable: true,
      render: (booking: Booking) => this.formatDate(booking.checkOut)
    },
    {
      key: 'guests',
      label: 'Guests',
      sortable: true
    },
    {
      key: 'totalPrice',
      label: 'Total',
      sortable: true,
      render: (booking: Booking) => this.formatCurrency(booking.totalPrice)
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (booking: Booking) => this.getStatusBadge(booking.status)
    }
  ];

  actions: TableAction<Booking>[] = [
    {
      label: 'Update Status',
      icon: '🔄',
      onClick: (booking: Booking) => this.openStatusModal(booking),
      variant: 'primary',
      condition: (booking: Booking) => booking.status !== BookingStatus.COMPLETED && booking.status !== BookingStatus.CANCELLED
    },
    {
      label: 'Cancel',
      icon: '❌',
      onClick: (booking: Booking) => this.openCancelDialog(booking),
      variant: 'danger',
      condition: (booking: Booking) => booking.status !== BookingStatus.COMPLETED && booking.status !== BookingStatus.CANCELLED
    },
    {
      label: 'View Details',
      icon: '👁️',
      onClick: (booking: Booking) => this.viewBookingDetails(booking),
      variant: 'secondary'
    }
  ];

  bookingStatuses = [
    BookingStatus.PENDING_PAYMENT,
    BookingStatus.PENDING,
    BookingStatus.CONFIRMED,
    BookingStatus.COMPLETED,
    BookingStatus.CANCELLED
  ];

  constructor(
    private fb: FormBuilder,
    private bookingService: BookingService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.loadBookings();
  }

  initForm(): void {
    this.statusForm = this.fb.group({
      status: ['']
    });
  }

  loadBookings(): void {
    this.loading.set(true);
    this.bookingService.getAllBookings().subscribe({
      next: (bookings) => {
        this.allBookings.set(bookings);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading bookings:', error);
        this.loading.set(false);
      }
    });
  }

  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  onStatusFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.statusFilter.set(select.value as BookingStatus | 'all');
  }

  openStatusModal(booking: Booking): void {
    this.selectedBooking.set(booking);
    this.statusForm.patchValue({
      status: booking.status
    });
    this.showStatusModal.set(true);
  }

  openCancelDialog(booking: Booking): void {
    this.selectedBooking.set(booking);
    this.showCancelDialog.set(true);
  }

  closeStatusModal(): void {
    this.showStatusModal.set(false);
    this.selectedBooking.set(null);
  }

  closeCancelDialog(): void {
    this.showCancelDialog.set(false);
    this.selectedBooking.set(null);
  }

  updateBookingStatus(): void {
    const booking = this.selectedBooking();
    if (!booking) return;

    const newStatus = this.statusForm.value.status;

    this.bookingService.updateBookingStatus(booking.id, newStatus).subscribe({
      next: () => {
        this.loadBookings();
        this.closeStatusModal();
      },
      error: (error) => {
        console.error('Error updating booking status:', error);
      }
    });
  }

  confirmCancel(): void {
    const booking = this.selectedBooking();
    if (!booking) return;

    this.bookingService.cancelBooking(booking.id).subscribe({
      next: () => {
        this.loadBookings();
        this.closeCancelDialog();
      },
      error: (error) => {
        console.error('Error cancelling booking:', error);
      }
    });
  }

  viewBookingDetails(booking: Booking): void {
    // In a real app, this would navigate to a detailed view or open a modal
    console.log('Viewing booking details:', booking);
    alert(`Booking Details:\n\nID: ${booking.id}\nHotel: ${booking.hotel?.name || 'N/A'}\nGuests: ${booking.guests}\nTotal: ${this.formatCurrency(booking.totalPrice)}\nStatus: ${booking.status}\n\nSpecial Requests: ${booking.specialRequests || 'None'}`);
  }

  getStatusBadge(status: BookingStatus): string {
    const badges: Record<BookingStatus, string> = {
      [BookingStatus.PENDING_PAYMENT]: '<span class="badge badge--warning">Pending Payment</span>',
      [BookingStatus.PENDING]: '<span class="badge badge--warning">Pending</span>',
      [BookingStatus.CONFIRMED]: '<span class="badge badge--success">Confirmed</span>',
      [BookingStatus.CANCELLED]: '<span class="badge badge--danger">Cancelled</span>',
      [BookingStatus.COMPLETED]: '<span class="badge badge--info">Completed</span>'
    };
    return badges[status] || status;
  }

  getStatusBadgeClass(status: BookingStatus): string {
    switch (status) {
      case BookingStatus.PENDING_PAYMENT:
        return 'badge--warning';
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

  getStatusLabel(status: BookingStatus): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.statusFilter.set('all');
  }
}
