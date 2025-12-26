import { Component, Input, Output, EventEmitter, OnInit, AfterViewInit, OnDestroy, signal, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Stripe, StripeCardElement, StripeElements } from '@stripe/stripe-js';
import { PaymentService } from '../../../core/services/payment.service';
import { SavedPaymentMethod } from '../../../core/models/payment.model';

@Component({
  selector: 'app-stripe-payment',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './stripe-payment.component.html',
  styleUrl: './stripe-payment.component.scss'
})
export class StripePaymentComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('cardElement') cardElementRef!: ElementRef;

  @Input() clientSecret!: string;
  @Input() amount!: number;
  @Input() savedPaymentMethods: SavedPaymentMethod[] = [];
  @Input() allowSavePaymentMethod: boolean = true;

  @Output() paymentSuccess = new EventEmitter<string>();
  @Output() paymentError = new EventEmitter<string>();
  @Output() savePaymentMethodChange = new EventEmitter<boolean>();
  @Output() selectedPaymentMethodChange = new EventEmitter<string | null>();

  paymentForm: FormGroup;
  stripe: Stripe | null = null;
  elements: StripeElements | null = null;
  cardElement: StripeCardElement | null = null;

  processing = signal<boolean>(false);
  error = signal<string>('');
  cardComplete = signal<boolean>(false);
  useNewCard = signal<boolean>(true);

  constructor(
    private fb: FormBuilder,
    private paymentService: PaymentService
  ) {
    this.paymentForm = this.fb.group({
      saveCard: [false],
      selectedMethod: [null]
    });
  }

  async ngOnInit(): Promise<void> {
    this.stripe = await this.paymentService.getStripe();

    // Watch for saved payment method selection
    this.paymentForm.get('selectedMethod')?.valueChanges.subscribe((value) => {
      this.selectedPaymentMethodChange.emit(value);
      this.useNewCard.set(!value);

      if (value) {
        // User selected a saved card, hide card element
        this.cardElement?.unmount();
      } else {
        // User wants to use new card, show card element
        this.mountCardElement();
      }
    });

    // Watch for save card checkbox
    this.paymentForm.get('saveCard')?.valueChanges.subscribe((value) => {
      this.savePaymentMethodChange.emit(value);
    });

    // If user has saved cards, default to using new card
    if (this.savedPaymentMethods.length > 0) {
      this.useNewCard.set(true);
    }
  }

  async ngAfterViewInit(): Promise<void> {
    // Wait for Stripe to be fully loaded
    if (!this.stripe) {
      this.stripe = await this.paymentService.getStripe();
    }

    // Mount card element if using new card
    if (this.useNewCard()) {
      setTimeout(async () => {
        await this.mountCardElement();
      }, 100);
    }
  }

  ngOnDestroy(): void {
    if (this.cardElement) {
      this.cardElement.destroy();
    }
  }

  async mountCardElement(): Promise<void> {
    if (!this.stripe) {
      console.error('Stripe not initialized');
      this.error.set('Payment system not initialized. Please refresh the page.');
      return;
    }

    if (!this.cardElementRef) {
      console.error('Card element ref not available');
      return;
    }

    try {
      // Create elements if not exists
      if (!this.elements) {
        this.elements = this.stripe.elements();
      }

      // Destroy existing card element if any
      if (this.cardElement) {
        this.cardElement.unmount();
        this.cardElement.destroy();
      }

      // Create card element
      const style = {
        base: {
          color: '#32325d',
          fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
          fontSmoothing: 'antialiased',
          fontSize: '16px',
          '::placeholder': {
            color: '#aab7c4'
          }
        },
        invalid: {
          color: '#fa755a',
          iconColor: '#fa755a'
        }
      };

      this.cardElement = this.elements.create('card', { style });
      this.cardElement.mount(this.cardElementRef.nativeElement);

      console.log('Stripe card element mounted successfully');

      // Listen for card element changes
      this.cardElement.on('change', (event) => {
        this.cardComplete.set(event.complete);
        if (event.error) {
          this.error.set(event.error.message);
        } else {
          this.error.set('');
        }
      });
    } catch (error) {
      console.error('Error mounting card element:', error);
      this.error.set('Failed to load payment form. Please refresh the page.');
    }
  }

  async onSubmit(): Promise<void> {
    if (this.processing()) {
      return;
    }

    this.processing.set(true);
    this.error.set('');

    try {
      const selectedMethodId = this.paymentForm.value.selectedMethod;

      if (selectedMethodId) {
        // Using saved payment method
        await this.confirmPaymentWithSavedMethod(selectedMethodId);
      } else {
        // Using new card
        await this.confirmPaymentWithNewCard();
      }
    } catch (error: any) {
      this.error.set(error.message || 'Payment failed');
      this.paymentError.emit(this.error());
      this.processing.set(false);
    }
  }

  async confirmPaymentWithNewCard(): Promise<void> {
    if (!this.stripe || !this.cardElement) {
      throw new Error('Stripe not initialized');
    }

    if (!this.cardComplete()) {
      throw new Error('Please enter complete card details');
    }

    const result = await this.stripe.confirmCardPayment(this.clientSecret, {
      payment_method: {
        card: this.cardElement
      }
    });

    if (result.error) {
      throw new Error(result.error.message || 'Payment failed');
    }

    if (result.paymentIntent?.status === 'succeeded') {
      this.processing.set(false);
      this.paymentSuccess.emit(result.paymentIntent.id);
    } else {
      throw new Error('Payment was not successful');
    }
  }

  async confirmPaymentWithSavedMethod(paymentMethodId: string): Promise<void> {
    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    const result = await this.stripe.confirmCardPayment(this.clientSecret, {
      payment_method: paymentMethodId
    });

    if (result.error) {
      throw new Error(result.error.message || 'Payment failed');
    }

    if (result.paymentIntent?.status === 'succeeded') {
      this.processing.set(false);
      this.paymentSuccess.emit(result.paymentIntent.id);
    } else {
      throw new Error('Payment was not successful');
    }
  }

  getCardBrandIcon(brand: string): string {
    const icons: { [key: string]: string } = {
      'visa': '💳',
      'mastercard': '💳',
      'amex': '💳',
      'discover': '💳',
      'diners': '💳',
      'jcb': '💳',
      'unionpay': '💳'
    };
    return icons[brand.toLowerCase()] || '💳';
  }

  formatCardNumber(last4: string): string {
    return `•••• •••• •••• ${last4}`;
  }

  onUseNewCard(): void {
    this.paymentForm.patchValue({ selectedMethod: null });
    this.useNewCard.set(true);
    this.selectedPaymentMethodChange.emit(null);
  }

  onUseSavedCard(methodId: string): void {
    this.paymentForm.patchValue({ selectedMethod: methodId });
    this.useNewCard.set(false);
  }
}
