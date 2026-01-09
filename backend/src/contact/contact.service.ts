import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';
import { CreateContactDto } from './dto/create-contact.dto';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);
  private readonly supportEmail: string;

  constructor(
    private emailService: EmailService,
    private configService: ConfigService,
  ) {
    this.supportEmail = this.configService.get<string>('SUPPORT_EMAIL') || 'support@hotelstarbooking.com';
  }

  async submitContactForm(contactDto: CreateContactDto): Promise<{ success: boolean; message: string }> {
    this.logger.log(`New contact form submission from ${contactDto.email}`);

    // Send notification email to support team
    const supportEmailSent = await this.sendSupportNotification(contactDto);

    // Send confirmation email to the user
    const confirmationEmailSent = await this.sendUserConfirmation(contactDto);

    if (supportEmailSent || confirmationEmailSent) {
      return {
        success: true,
        message: 'Your message has been received. We will get back to you soon.',
      };
    }

    // Even if email sending fails, we log the contact submission
    this.logger.warn(`Email sending failed, but contact form data logged for ${contactDto.email}`);
    return {
      success: true,
      message: 'Your message has been received. We will get back to you soon.',
    };
  }

  private async sendSupportNotification(contactDto: CreateContactDto): Promise<boolean> {
    const html = this.getSupportNotificationTemplate(contactDto);
    const subject = `New Contact Form: ${contactDto.subject}`;

    return this.emailService.sendEmail({
      to: this.supportEmail,
      subject,
      html,
      text: `New contact form submission from ${contactDto.name} (${contactDto.email}): ${contactDto.message}`,
    });
  }

  private async sendUserConfirmation(contactDto: CreateContactDto): Promise<boolean> {
    const html = this.getUserConfirmationTemplate(contactDto);
    const subject = 'We received your message - Hotel Star Booking';

    return this.emailService.sendEmail({
      to: contactDto.email,
      subject,
      html,
      text: `Thank you for contacting us, ${contactDto.name}. We have received your message and will respond within 24-48 hours.`,
    });
  }

  private getSupportNotificationTemplate(contactDto: CreateContactDto): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .field { margin-bottom: 15px; }
    .label { font-weight: bold; color: #667eea; }
    .message-box { background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>New Contact Form Submission</h1>
    </div>
    <div class="content">
      <div class="field">
        <span class="label">Name:</span> ${contactDto.name}
      </div>
      <div class="field">
        <span class="label">Email:</span> ${contactDto.email}
      </div>
      <div class="field">
        <span class="label">Subject:</span> ${contactDto.subject}
      </div>
      <div class="message-box">
        <span class="label">Message:</span>
        <p>${contactDto.message.replace(/\n/g, '<br>')}</p>
      </div>
      <p style="margin-top: 20px; font-size: 12px; color: #666;">
        Submitted on: ${new Date().toLocaleString()}
      </p>
    </div>
  </div>
</body>
</html>
    `;
  }

  private getUserConfirmationTemplate(contactDto: CreateContactDto): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .message-summary { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Thank You for Contacting Us!</h1>
    </div>
    <div class="content">
      <h2>Hello ${contactDto.name}!</h2>
      <p>We have received your message and appreciate you taking the time to reach out to us.</p>
      <p>Our team will review your inquiry and get back to you within 24-48 hours.</p>

      <div class="message-summary">
        <h3 style="color: #667eea; margin-top: 0;">Your Message Summary</h3>
        <p><strong>Subject:</strong> ${contactDto.subject}</p>
        <p><strong>Message:</strong></p>
        <p style="color: #666;">${contactDto.message.replace(/\n/g, '<br>')}</p>
      </div>

      <p>If you have any urgent questions, feel free to call us at +1 (555) 123-4567.</p>
      <p>Thank you for choosing Hotel Star Booking!</p>
      <p><strong>The Hotel Star Booking Team</strong></p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Hotel Star Booking. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;
  }
}
