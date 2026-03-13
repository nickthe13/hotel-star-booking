import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus } from '@prisma/client';

@Injectable()
export class BookingExpirationService {
  private readonly logger = new Logger(BookingExpirationService.name);
  private static readonly EXPIRATION_MINUTES = 15;

  constructor(private prismaService: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async expireStaleBookings() {
    const expirationThreshold = new Date();
    expirationThreshold.setMinutes(
      expirationThreshold.getMinutes() - BookingExpirationService.EXPIRATION_MINUTES,
    );

    const result = await this.prismaService.booking.updateMany({
      where: {
        status: BookingStatus.PENDING_PAYMENT,
        createdAt: { lt: expirationThreshold },
      },
      data: {
        status: BookingStatus.CANCELLED,
      },
    });

    if (result.count > 0) {
      this.logger.log(`Expired ${result.count} stale PENDING_PAYMENT booking(s)`);
    }
  }
}
