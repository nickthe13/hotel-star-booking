import { Component, OnInit, OnDestroy, ViewChild, ElementRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaymentService } from '../../../core/services/payment.service';
import { SavedPaymentMethod } from '../../../core/models/payment.model';
import { getCardBrandIcon as sharedGetCardBrandIcon } from '../../../shared/utils/card-brand';
import { Stripe, StripeCardElement, StripeElements } from '@stripe/stripe-js';

@Component({
  selector: 'app-saved-payment-methods',
  imports: [CommonModule],
  templateUrl: './saved-payment-methods.component.html',
  styleUrl: './saved-payment-methods.component.scss'
})
export class SavedPaymentMethodsComponent implements OnInit, OnDestroy {
  @ViewChild('addCardElement') addCardElementRef!: ElementRef;

  paymentMethods = signal<SavedPaymentMethod[]>([]);
  loading = signal<boolean>(false);
  error = signal<string>('');

  // For delete confirmation
  showDeleteModal = signal<boolean>(false);
  methodToDelete = signal<SavedPaymentMethod | null>(null);
  deleting = signal<boolean>(false);

  // For adding new method
  showAddMethodModal = signal<boolean>(false);
  addingCard = signal<boolean>(false);
  addCardError = signal<string>('');
  cardComplete = signal<boolean>(false);

  private stripe: Stripe | null = null;
  private elements: StripeElements | null = null;
  private cardElement: StripeCardElement | null = null;

  constructor(private paymentService: PaymentService) {}

  ngOnInit(): void {
    this.loadPaymentMethods();
  }

  ngOnDestroy(): void {
    this.destroyCardElement();
  }

  loadPaymentMethods(): void {
    this.loading.set(true);
    this.error.set('');

    this.paymentService.getUserPaymentMethods().subscribe({
      next: (methods) => {
        this.paymentMethods.set(methods);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load payment methods');
        this.loading.set(false);
        console.error('Error loading payment methods:', err);
      }
    });
  }

  getCardBrandIcon(brand: string): string {
    return sharedGetCardBrandIcon(brand);
  }

  getCardBrandName(brand: string): string {
    const names: { [key: string]: string } = {
      'visa': 'Visa',
      'mastercard': 'Mastercard',
      'amex': 'American Express',
      'discover': 'Discover',
      'diners': 'Diners Club',
      'jcb': 'JCB',
      'unionpay': 'UnionPay'
    };
    return names[brand.toLowerCase()] || brand;
  }

  formatCardNumber(last4: string): string {
    return `•••• •••• •••• ${last4}`;
  }

  formatExpiryDate(method: SavedPaymentMethod): string {
    const month = method.card.expMonth;
    const year = method.card.expYear;
    const paddedMonth = month.toString().padStart(2, '0');
    const shortYear = year.toString().slice(-2);
    return `${paddedMonth}/${shortYear}`;
  }

  isExpired(method: SavedPaymentMethod): boolean {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const month = method.card.expMonth;
    const year = method.card.expYear;

    return year < currentYear || (year === currentYear && month < currentMonth);
  }

  isExpiringSoon(method: SavedPaymentMethod): boolean {
    const now = new Date();
    const month = method.card.expMonth;
    const year = method.card.expYear;

    // Check if expiring within 3 months
    const expiryDate = new Date(year, month - 1);
    const threeMonthsFromNow = new Date(now.getFullYear(), now.getMonth() + 3);

    return !this.isExpired(method) && expiryDate <= threeMonthsFromNow;
  }

  onSetDefault(method: SavedPaymentMethod): void {
    if (method.isDefault) {
      return;
    }

    this.paymentService.setDefaultPaymentMethod(method.id).subscribe({
      next: () => {
        // Update local state
        const methods = this.paymentMethods().map(m => ({
          ...m,
          isDefault: m.id === method.id
        }));
        this.paymentMethods.set(methods);
      },
      error: (err) => {
        this.error.set('Failed to set default payment method');
        console.error('Error setting default payment method:', err);
      }
    });
  }

  openDeleteModal(method: SavedPaymentMethod): void {
    this.methodToDelete.set(method);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.methodToDelete.set(null);
  }

  confirmDelete(): void {
    const method = this.methodToDelete();
    if (!method) {
      return;
    }

    this.deleting.set(true);

    this.paymentService.deletePaymentMethod(method.id).subscribe({
      next: () => {
        // Remove from local state
        const methods = this.paymentMethods().filter(m => m.id !== method.id);

        // If deleted method was default and there are other methods, set first one as default
        if (method.isDefault && methods.length > 0) {
          methods[0].isDefault = true;
        }

        this.paymentMethods.set(methods);
        this.deleting.set(false);
        this.closeDeleteModal();
      },
      error: (err) => {
        this.error.set('Failed to delete payment method');
        this.deleting.set(false);
        console.error('Error deleting payment method:', err);
      }
    });
  }

  async openAddMethodModal(): Promise<void> {
    this.showAddMethodModal.set(true);
    this.addCardError.set('');
    this.cardComplete.set(false);

    // Initialize Stripe and mount card element after DOM renders
    this.stripe = await this.paymentService.getStripe();
    setTimeout(() => this.mountAddCardElement(), 100);
  }

  closeAddMethodModal(): void {
    this.destroyCardElement();
    this.showAddMethodModal.set(false);
    this.addCardError.set('');
    this.cardComplete.set(false);
  }

  private mountAddCardElement(): void {
    if (!this.stripe || !this.addCardElementRef) {
      return;
    }

    this.elements = this.stripe.elements();
    this.cardElement = this.elements.create('card', {
      style: {
        base: {
          color: '#32325d',
          fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
          fontSmoothing: 'antialiased',
          fontSize: '16px',
          '::placeholder': { color: '#aab7c4' }
        },
        invalid: {
          color: '#fa755a',
          iconColor: '#fa755a'
        }
      }
    });
    this.cardElement.mount(this.addCardElementRef.nativeElement);

    this.cardElement.on('change', (event) => {
      this.cardComplete.set(event.complete);
      if (event.error) {
        this.addCardError.set(event.error.message);
      } else {
        this.addCardError.set('');
      }
    });
  }

  private destroyCardElement(): void {
    if (this.cardElement) {
      this.cardElement.destroy();
      this.cardElement = null;
    }
    this.elements = null;
  }

  async onAddCard(): Promise<void> {
    if (!this.stripe || !this.cardElement || !this.cardComplete()) {
      return;
    }

    this.addingCard.set(true);
    this.addCardError.set('');

    const { paymentMethod, error } = await this.stripe.createPaymentMethod({
      type: 'card',
      card: this.cardElement,
    });

    if (error) {
      this.addCardError.set(error.message || 'Failed to add card');
      this.addingCard.set(false);
      return;
    }

    if (!paymentMethod) {
      this.addCardError.set('Failed to create payment method');
      this.addingCard.set(false);
      return;
    }

    // Save to backend
    this.paymentService.savePaymentMethod(paymentMethod.id, this.paymentMethods().length === 0).subscribe({
      next: () => {
        this.addingCard.set(false);
        this.loadPaymentMethods();
        this.closeAddMethodModal();
      },
      error: (err) => {
        this.addCardError.set('Failed to save payment method. Please try again.');
        this.addingCard.set(false);
        console.error('Error saving payment method:', err);
      }
    });
  }

  onMethodAdded(): void {
    // Reload payment methods after adding new one
    this.loadPaymentMethods();
    this.closeAddMethodModal();
  }
}
