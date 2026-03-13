import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-help-center',
  imports: [CommonModule, RouterLink],
  templateUrl: './help-center.component.html',
  styleUrl: './help-center.component.scss'
})
export class HelpCenterComponent {
  openIndex = signal<number | null>(null);

  faqs = [
    {
      question: 'How do I book a hotel?',
      answer: 'Browse our hotels page, select a hotel you like, choose your room and dates from the availability calendar, then proceed to checkout. You can pay with a new card or a saved payment method.'
    },
    {
      question: 'How do I cancel a booking?',
      answer: 'Go to your Dashboard, find the booking you want to cancel, and click the "Cancel" button. Please note that cancellation policies vary by hotel and you may be subject to cancellation fees depending on how close to the check-in date you cancel.'
    },
    {
      question: 'How do loyalty points work?',
      answer: 'You earn 1 loyalty point for every $1 spent on bookings. Points can be redeemed for discounts on future bookings. Check your points balance and redeem rewards from your Profile page under the Loyalty tab.'
    },
    {
      question: 'How do I contact support?',
      answer: 'You can reach our support team through the Contact Us page. Fill out the form with your inquiry and we\'ll get back to you as soon as possible.'
    },
    {
      question: 'Is my payment information secure?',
      answer: 'Absolutely. All payments are processed securely through Stripe, an industry-leading payment processor. We never store your full card details on our servers.'
    },
    {
      question: 'Can I save my payment methods?',
      answer: 'Yes! When making a booking, your card can be saved for future use. You can manage your saved payment methods from your Profile page.'
    }
  ];

  toggleFaq(index: number): void {
    this.openIndex.set(this.openIndex() === index ? null : index);
  }

  isFaqOpen(index: number): boolean {
    return this.openIndex() === index;
  }
}
