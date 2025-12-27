import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private transporter: Transporter;
  private readonly logger = new Logger(EmailService.name);
  private readonly from: string;

  constructor(private configService: ConfigService) {
    this.from = this.configService.get<string>('EMAIL_FROM') || 'Hotel Booking <noreply@hotelbooking.com>';
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const host = this.configService.get<string>('EMAIL_HOST');
    const port = this.configService.get<number>('EMAIL_PORT');
    const user = this.configService.get<string>('EMAIL_USER');
    const pass = this.configService.get<string>('EMAIL_PASSWORD');
    const secure = this.configService.get<boolean>('EMAIL_SECURE') || false;

    if (!host || !user || !pass) {
      this.logger.warn('Email configuration is incomplete. Email sending will be disabled.');
      this.logger.warn('Please configure EMAIL_HOST, EMAIL_USER, and EMAIL_PASSWORD in your .env file');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });

    this.logger.log('Email service initialized successfully');
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn('Email transporter not configured. Skipping email send.');
      this.logger.log(`[MOCK EMAIL] To: ${options.to}, Subject: ${options.subject}`);
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      this.logger.log(`Email sent successfully to ${options.to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error.message);
      return false;
    }
  }

  async sendWelcomeEmail(email: string, name: string): Promise<boolean> {
    const subject = 'Welcome to Hotel Star Booking!';
    const html = this.getWelcomeEmailTemplate(name);
    const text = `Welcome to Hotel Star Booking, ${name}! Your account has been created successfully.`;

    return this.sendEmail({ to: email, subject, html, text });
  }

  async sendBookingConfirmation(
    email: string,
    bookingDetails: {
      name: string;
      hotelName: string;
      roomType: string;
      checkIn: Date;
      checkOut: Date;
      totalAmount: number;
      bookingId: string;
    },
  ): Promise<boolean> {
    const subject = `Booking Confirmation - ${bookingDetails.hotelName}`;
    const html = this.getBookingConfirmationTemplate(bookingDetails);
    const text = `Your booking at ${bookingDetails.hotelName} has been confirmed. Check-in: ${bookingDetails.checkIn.toDateString()}, Check-out: ${bookingDetails.checkOut.toDateString()}`;

    return this.sendEmail({ to: email, subject, html, text });
  }

  async sendPaymentReceipt(
    email: string,
    paymentDetails: {
      name: string;
      hotelName: string;
      amount: number;
      currency: string;
      paymentDate: Date;
      paymentId: string;
      bookingId: string;
    },
  ): Promise<boolean> {
    const subject = 'Payment Receipt - Hotel Star Booking';
    const html = this.getPaymentReceiptTemplate(paymentDetails);
    const text = `Your payment of ${paymentDetails.currency} ${(paymentDetails.amount / 100).toFixed(2)} has been received. Payment ID: ${paymentDetails.paymentId}`;

    return this.sendEmail({ to: email, subject, html, text });
  }

  async sendCancellationConfirmation(
    email: string,
    cancellationDetails: {
      name: string;
      hotelName: string;
      bookingId: string;
      refundAmount?: number;
      currency?: string;
    },
  ): Promise<boolean> {
    const subject = 'Booking Cancellation Confirmation';
    const html = this.getCancellationTemplate(cancellationDetails);
    const text = `Your booking at ${cancellationDetails.hotelName} has been cancelled.${cancellationDetails.refundAmount ? ` A refund of ${cancellationDetails.currency} ${(cancellationDetails.refundAmount / 100).toFixed(2)} will be processed.` : ''}`;

    return this.sendEmail({ to: email, subject, html, text });
  }

  // Email Templates

  private getWelcomeEmailTemplate(name: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏨 Welcome to Hotel Star Booking!</h1>
    </div>
    <div class="content">
      <h2>Hello ${name}!</h2>
      <p>Thank you for creating an account with Hotel Star Booking. We're excited to have you on board!</p>
      <p>With your new account, you can:</p>
      <ul>
        <li>Browse and book hotels worldwide</li>
        <li>Save your favorite properties</li>
        <li>Manage your bookings easily</li>
        <li>View your booking history and receipts</li>
      </ul>
      <a href="http://localhost:4200/hotels" class="button">Start Exploring Hotels</a>
      <p>If you have any questions, feel free to reach out to our support team.</p>
      <p>Happy travels!</p>
      <p><strong>The Hotel Star Booking Team</strong></p>
    </div>
    <div class="footer">
      <p>© 2024 Hotel Star Booking. All rights reserved.</p>
      <p>This is an automated email. Please do not reply.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  private getBookingConfirmationTemplate(details: any): string {
    const nights = Math.ceil((details.checkOut.getTime() - details.checkIn.getTime()) / (1000 * 60 * 60 * 24));

    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; }
    .booking-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
    .detail-label { font-weight: bold; color: #667eea; }
    .total { font-size: 24px; color: #667eea; font-weight: bold; }
    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Booking Confirmed!</h1>
    </div>
    <div class="content">
      <h2>Hello ${details.name}!</h2>
      <p>Great news! Your booking has been confirmed. We can't wait to host you!</p>

      <div class="booking-details">
        <h3 style="margin-top: 0; color: #667eea;">📋 Booking Details</h3>
        <div class="detail-row">
          <span class="detail-label">Booking ID:</span>
          <span>${details.bookingId}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Hotel:</span>
          <span>${details.hotelName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Room Type:</span>
          <span>${details.roomType}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Check-in:</span>
          <span>${details.checkIn.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Check-out:</span>
          <span>${details.checkOut.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Number of Nights:</span>
          <span>${nights}</span>
        </div>
        <div class="detail-row" style="border-bottom: none; padding-top: 20px;">
          <span class="detail-label">Total Amount:</span>
          <span class="total">$${(details.totalAmount / 100).toFixed(2)}</span>
        </div>
      </div>

      <a href="http://localhost:4200/dashboard/bookings" class="button">View My Bookings</a>

      <h3>📌 Important Information</h3>
      <ul>
        <li>Check-in time: 3:00 PM</li>
        <li>Check-out time: 11:00 AM</li>
        <li>Please bring a valid ID and credit card</li>
        <li>Cancellation policy: Free cancellation up to 24 hours before check-in</li>
      </ul>

      <p>If you need to make any changes to your booking, please log in to your account.</p>
      <p>Have a wonderful stay!</p>
      <p><strong>The Hotel Star Booking Team</strong></p>
    </div>
    <div class="footer">
      <p>© 2024 Hotel Star Booking. All rights reserved.</p>
      <p>Booking ID: ${details.bookingId}</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  private getPaymentReceiptTemplate(details: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; }
    .receipt { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #10b981; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
    .detail-label { font-weight: bold; color: #10b981; }
    .amount { font-size: 32px; color: #10b981; font-weight: bold; text-align: center; margin: 20px 0; }
    .button { display: inline-block; padding: 12px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💳 Payment Receipt</h1>
    </div>
    <div class="content">
      <h2>Hello ${details.name}!</h2>
      <p>Thank you for your payment. Your transaction has been processed successfully.</p>

      <div class="receipt">
        <h3 style="margin-top: 0; color: #10b981; text-align: center;">Payment Confirmation</h3>
        <div class="amount">
          ${details.currency.toUpperCase()} $${(details.amount / 100).toFixed(2)}
        </div>
        <div class="detail-row">
          <span class="detail-label">Payment ID:</span>
          <span>${details.paymentId}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Booking ID:</span>
          <span>${details.bookingId}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Hotel:</span>
          <span>${details.hotelName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Payment Date:</span>
          <span>${details.paymentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
        <div class="detail-row" style="border-bottom: none;">
          <span class="detail-label">Status:</span>
          <span style="color: #10b981; font-weight: bold;">✓ PAID</span>
        </div>
      </div>

      <a href="http://localhost:4200/dashboard/payment-history" class="button">View Payment History</a>

      <p>This receipt confirms your payment. Please keep it for your records.</p>
      <p>If you have any questions about this payment, please contact our support team.</p>
      <p><strong>The Hotel Star Booking Team</strong></p>
    </div>
    <div class="footer">
      <p>© 2024 Hotel Star Booking. All rights reserved.</p>
      <p>Payment ID: ${details.paymentId}</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  private getCancellationTemplate(details: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .cancellation-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
    .detail-label { font-weight: bold; }
    .refund-amount { font-size: 24px; color: #10b981; font-weight: bold; text-align: center; margin: 15px 0; }
    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>❌ Booking Cancelled</h1>
    </div>
    <div class="content">
      <h2>Hello ${details.name}</h2>
      <p>This email confirms that your booking has been cancelled.</p>

      <div class="cancellation-box">
        <h3 style="margin-top: 0;">Cancellation Details</h3>
        <div class="detail-row">
          <span class="detail-label">Booking ID:</span>
          <span>${details.bookingId}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Hotel:</span>
          <span>${details.hotelName}</span>
        </div>
        <div class="detail-row" style="border-bottom: none;">
          <span class="detail-label">Cancellation Date:</span>
          <span>${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
        ${details.refundAmount ? `
        <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #10b981;">
          <p style="margin: 0; text-align: center; color: #10b981; font-weight: bold;">Refund Amount</p>
          <div class="refund-amount">
            ${details.currency?.toUpperCase()} $${(details.refundAmount / 100).toFixed(2)}
          </div>
          <p style="text-align: center; font-size: 14px; color: #666;">Your refund will be processed within 5-10 business days.</p>
        </div>
        ` : ''}
      </div>

      <a href="http://localhost:4200/hotels" class="button">Browse Hotels</a>

      <p>We're sorry to see you cancel your booking. If you change your mind, we'd love to welcome you back!</p>
      <p>If you have any questions about this cancellation, please don't hesitate to contact us.</p>
      <p><strong>The Hotel Star Booking Team</strong></p>
    </div>
    <div class="footer">
      <p>© 2024 Hotel Star Booking. All rights reserved.</p>
      <p>Booking ID: ${details.bookingId}</p>
    </div>
  </div>
</body>
</html>
    `;
  }
}
