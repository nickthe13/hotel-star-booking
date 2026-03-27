import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreatePaymentIntentDto, ConfirmPaymentDto, RefundPaymentDto } from './dto';
import { PaymentStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }

    this.stripe = new Stripe(stripeSecretKey);
  }

  /**
   * Get or create a Stripe Customer for a user
   */
  async getOrCreateStripeCustomer(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, stripeCustomerId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.stripeCustomerId) {
      return user.stripeCustomerId;
    }

    // Create a new Stripe Customer
    const customer = await this.stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId: user.id },
    });

    // Save the Stripe Customer ID to the user record
    await this.prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customer.id },
    });

    return customer.id;
  }

  /**
   * Create a payment intent for a booking
   */
  async createPaymentIntent(userId: string, dto: CreatePaymentIntentDto) {
    // Verify booking exists and belongs to user
    const booking = await this.prisma.booking.findFirst({
      where: {
        id: dto.bookingId,
        userId,
      },
      include: {
        room: {
          include: {
            hotel: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Check if payment already exists
    const existingPayment = await this.prisma.paymentTransaction.findFirst({
      where: {
        bookingId: booking.id,
        status: {
          in: [PaymentStatus.PENDING, PaymentStatus.SUCCEEDED],
        },
      },
    });

    if (existingPayment) {
      throw new BadRequestException('Payment already exists for this booking');
    }

    // Get or create Stripe Customer for the user
    const stripeCustomerId = await this.getOrCreateStripeCustomer(userId);

    // Create Stripe payment intent with customer
    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: dto.amount,
      currency: dto.currency || 'usd',
      customer: stripeCustomerId,
      metadata: {
        bookingId: booking.id,
        userId,
        hotelName: booking.room.hotel.name,
        roomType: booking.room.type,
        savePaymentMethod: dto.savePaymentMethod ? 'true' : 'false',
      },
      automatic_payment_methods: {
        enabled: true,
      },
    };

    // Allow reuse of payment method if user wants to save it
    if (dto.savePaymentMethod) {
      paymentIntentParams.setup_future_usage = 'off_session';
    }

    const paymentIntent = await this.stripe.paymentIntents.create(paymentIntentParams);

    // Create payment record in database
    const payment = await this.prisma.paymentTransaction.create({
      data: {
        bookingId: booking.id,
        amount: dto.amount,
        currency: dto.currency || 'usd',
        status: PaymentStatus.PENDING,
        stripePaymentIntentId: paymentIntent.id,
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      payment,
    };
  }

  /**
   * Confirm a payment (called after Stripe confirms on client)
   */
  async confirmPayment(userId: string, dto: ConfirmPaymentDto) {
    // Retrieve payment intent from Stripe
    const paymentIntent = await this.stripe.paymentIntents.retrieve(
      dto.paymentIntentId,
    );

    if (!paymentIntent) {
      throw new NotFoundException('Payment intent not found');
    }

    // Find payment in database
    const payment = await this.prisma.paymentTransaction.findFirst({
      where: {
        stripePaymentIntentId: dto.paymentIntentId,
      },
      include: {
        booking: {
          include: {
            user: true,
            room: {
              include: {
                hotel: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Verify user owns this payment
    if (payment.booking.userId !== userId) {
      throw new BadRequestException('Unauthorized');
    }

    // Update payment status based on Stripe status
    const updatedPayment = await this.prisma.paymentTransaction.update({
      where: { id: payment.id },
      data: {
        status: paymentIntent.status === 'succeeded' ? PaymentStatus.SUCCEEDED : PaymentStatus.FAILED,
        paymentMethod: dto.paymentMethodId,
      },
    });

    // Update booking status if payment succeeded
    if (paymentIntent.status === 'succeeded') {
      await this.prisma.booking.update({
        where: { id: payment.bookingId },
        data: { status: 'CONFIRMED' },
      });

      // Save payment method if requested
      if (paymentIntent.metadata?.savePaymentMethod === 'true') {
        await this.savePaymentMethod(userId, dto.paymentMethodId);
      }
    }

    return {
      payment: updatedPayment,
      success: paymentIntent.status === 'succeeded',
    };
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(signature: string, payload: Buffer) {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');

    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
    }

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret,
      );
    } catch (err) {
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'charge.refunded':
        await this.handleRefund(event.data.object as Stripe.Charge);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }

  /**
   * Get payment history for a user
   */
  async getPaymentHistory(userId: string) {
    const payments = await this.prisma.paymentTransaction.findMany({
      where: {
        booking: {
          userId,
        },
      },
      include: {
        booking: {
          include: {
            room: {
              include: {
                hotel: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return payments.map((p) => ({
      ...p,
      hotelName: p.booking?.room?.hotel?.name ?? null,
      roomType: p.booking?.room?.type ?? null,
    }));
  }

  /**
   * Get saved payment methods for a user
   */
  async getSavedPaymentMethods(userId: string) {
    const savedMethods = await this.prisma.paymentMethod.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return savedMethods.map(m => this.formatPaymentMethod(m));
  }

  private formatPaymentMethod(m: any) {
    return {
      id: m.id,
      userId: m.userId,
      stripePaymentMethodId: m.stripePaymentMethodId,
      type: m.type,
      card: {
        brand: m.cardBrand || 'unknown',
        last4: m.cardLast4 || '****',
        expMonth: m.cardExpMonth || 0,
        expYear: m.cardExpYear || 0,
      },
      isDefault: m.isDefault,
      createdAt: m.createdAt,
    };
  }

  /**
   * Process a refund
   */
  async refundPayment(userId: string, dto: RefundPaymentDto, options?: { skipBookingUpdate?: boolean }) {
    // Find payment
    const payment = await this.prisma.paymentTransaction.findFirst({
      where: {
        stripePaymentIntentId: dto.paymentIntentId,
        booking: {
          userId,
        },
      },
      include: {
        booking: {
          include: {
            user: true,
            room: {
              include: {
                hotel: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== PaymentStatus.SUCCEEDED) {
      throw new BadRequestException('Can only refund completed payments');
    }

    // Create refund in Stripe
    const refund = await this.stripe.refunds.create({
      payment_intent: dto.paymentIntentId,
      amount: dto.amount, // If not specified, full refund
      reason: 'requested_by_customer',
      metadata: {
        reason: dto.reason || 'Customer requested refund',
      },
    });

    // Update payment status
    const isPartialRefund = dto.amount && dto.amount < payment.amount;
    await this.prisma.paymentTransaction.update({
      where: { id: payment.id },
      data: {
        status: isPartialRefund ? PaymentStatus.PARTIALLY_REFUNDED : PaymentStatus.REFUNDED,
        refundAmount: dto.amount || payment.amount,
        refundReason: dto.reason || 'Customer requested refund',
      },
    });

    // Update booking status (skip if already handled by BookingsService.cancel())
    if (!options?.skipBookingUpdate) {
      await this.prisma.booking.update({
        where: { id: payment.bookingId },
        data: {
          status: 'CANCELLED',
        },
      });
    }

    // Send cancellation email
    this.emailService.sendCancellationConfirmation(payment.booking.user.email, {
      name: payment.booking.user.name,
      hotelName: payment.booking.room.hotel.name,
      bookingId: payment.bookingId,
      refundAmount: dto.amount || payment.amount,
      currency: payment.currency,
    }).catch(err => console.error('Failed to send cancellation email:', err));

    return {
      refund,
      success: true,
    };
  }

  // Private helper methods

  private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    const payment = await this.prisma.paymentTransaction.findFirst({
      where: {
        stripePaymentIntentId: paymentIntent.id,
      },
      include: {
        booking: {
          include: {
            user: true,
            room: {
              include: {
                hotel: true,
              },
            },
          },
        },
      },
    });

    if (payment) {
      await this.prisma.paymentTransaction.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.SUCCEEDED },
      });

      await this.prisma.booking.update({
        where: { id: payment.bookingId },
        data: { status: 'CONFIRMED' },
      });

      // Send booking confirmation and payment receipt emails
      const booking = payment.booking;

      // Send booking confirmation
      this.emailService.sendBookingConfirmation(booking.user.email, {
        name: booking.user.name,
        hotelName: booking.room.hotel.name,
        roomType: booking.room.type,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        totalAmount: payment.amount,
        bookingId: booking.id,
      }).catch(err => console.error('Failed to send booking confirmation:', err));

      // Send payment receipt
      this.emailService.sendPaymentReceipt(booking.user.email, {
        name: booking.user.name,
        hotelName: booking.room.hotel.name,
        amount: payment.amount,
        currency: payment.currency,
        paymentDate: new Date(),
        paymentId: payment.id,
        bookingId: booking.id,
      }).catch(err => console.error('Failed to send payment receipt:', err));
    }
  }

  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    const payment = await this.prisma.paymentTransaction.findFirst({
      where: {
        stripePaymentIntentId: paymentIntent.id,
      },
    });

    if (payment) {
      await this.prisma.paymentTransaction.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      });
    }
  }

  private async handleRefund(charge: Stripe.Charge) {
    if (charge.payment_intent) {
      const payment = await this.prisma.paymentTransaction.findFirst({
        where: {
          stripePaymentIntentId: charge.payment_intent as string,
        },
      });

      if (payment) {
        await this.prisma.paymentTransaction.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.REFUNDED },
        });
      }
    }
  }

  async savePaymentMethodForUser(userId: string, paymentMethodId: string, setAsDefault: boolean = false) {
    // Check if already saved
    const existing = await this.prisma.paymentMethod.findFirst({
      where: { stripePaymentMethodId: paymentMethodId, userId },
    });

    if (existing) {
      return this.formatPaymentMethod(existing);
    }

    // Attach payment method to Stripe Customer
    const stripeCustomerId = await this.getOrCreateStripeCustomer(userId);
    try {
      await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: stripeCustomerId,
      });
    } catch (error) {
      // Payment method may already be attached (e.g., via setup_future_usage)
      if (error.code !== 'resource_already_exists') {
        console.error('Failed to attach payment method to customer:', error.message);
      }
    }

    // Retrieve payment method details from Stripe
    const paymentMethod = await this.stripe.paymentMethods.retrieve(
      paymentMethodId,
    );

    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found in Stripe');
    }

    // If setting as default, unset current default first
    if (setAsDefault) {
      await this.prisma.paymentMethod.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const saved = await this.prisma.paymentMethod.create({
      data: {
        userId,
        stripePaymentMethodId: paymentMethodId,
        type: paymentMethod.type,
        cardBrand: paymentMethod.card?.brand || null,
        cardLast4: paymentMethod.card?.last4 || null,
        cardExpMonth: paymentMethod.card?.exp_month || null,
        cardExpYear: paymentMethod.card?.exp_year || null,
        isDefault: setAsDefault,
      },
    });
    return this.formatPaymentMethod(saved);
  }

  async deleteSavedPaymentMethod(userId: string, id: string) {
    const method = await this.prisma.paymentMethod.findFirst({
      where: { id, userId },
    });

    if (!method) {
      throw new NotFoundException('Payment method not found');
    }

    // Detach from Stripe
    try {
      await this.stripe.paymentMethods.detach(method.stripePaymentMethodId);
    } catch (error) {
      console.error('Failed to detach payment method from Stripe:', error);
    }

    await this.prisma.paymentMethod.delete({ where: { id } });

    return { message: 'Payment method deleted successfully' };
  }

  async setDefaultPaymentMethod(userId: string, id: string) {
    const method = await this.prisma.paymentMethod.findFirst({
      where: { id, userId },
    });

    if (!method) {
      throw new NotFoundException('Payment method not found');
    }

    // Unset current default
    await this.prisma.paymentMethod.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });

    // Set new default
    return this.prisma.paymentMethod.update({
      where: { id },
      data: { isDefault: true },
    });
  }

  private async savePaymentMethod(userId: string, paymentMethodId: string) {
    await this.savePaymentMethodForUser(userId, paymentMethodId, false);
  }
}
