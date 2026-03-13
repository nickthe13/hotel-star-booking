import { Module, forwardRef } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingExpirationService } from './booking-expiration.service';
import { BookingsController } from './bookings.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [PrismaModule, forwardRef(() => LoyaltyModule), PaymentsModule],
  controllers: [BookingsController],
  providers: [BookingsService, BookingExpirationService],
  exports: [BookingsService],
})
export class BookingsModule {}
