import { BookingStatus } from '../../core/models/booking.model';
import { PaymentStatus } from '../../core/models/payment.model';

export function getBookingStatusClass(status: BookingStatus): string {
  switch (status) {
    case BookingStatus.CONFIRMED:
      return 'status--confirmed';
    case BookingStatus.PENDING:
      return 'status--pending';
    case BookingStatus.CANCELLED:
      return 'status--cancelled';
    case BookingStatus.COMPLETED:
      return 'status--completed';
    case BookingStatus.CHECKED_IN:
      return 'status--checked-in';
    case BookingStatus.CHECKED_OUT:
      return 'status--checked-out';
    case BookingStatus.NO_SHOW:
      return 'status--no-show';
    default:
      return '';
  }
}

export function getPaymentStatusClass(status?: PaymentStatus): string {
  if (!status) return 'payment-status--unknown';

  switch (status) {
    case PaymentStatus.SUCCEEDED:
      return 'payment-status--success';
    case PaymentStatus.PENDING:
    case PaymentStatus.PROCESSING:
      return 'payment-status--warning';
    case PaymentStatus.FAILED:
    case PaymentStatus.CANCELLED:
      return 'payment-status--danger';
    case PaymentStatus.REFUNDED:
    case PaymentStatus.PARTIALLY_REFUNDED:
      return 'payment-status--info';
    default:
      return 'payment-status--unknown';
  }
}

export function getPaymentStatusLabel(status?: PaymentStatus): string {
  if (!status) return 'Not Paid';

  return status.split('_').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
}
