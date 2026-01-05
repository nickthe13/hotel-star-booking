import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { BookingStatus, UserRole, PaymentStatus } from '@prisma/client';
import { LoyaltyService } from '../loyalty/loyalty.service';

@Injectable()
export class BookingsService {
  constructor(
    private prismaService: PrismaService,
    @Inject(forwardRef(() => LoyaltyService))
    private loyaltyService: LoyaltyService,
  ) {}

  /**
   * Create a new booking
   */
  async create(userId: string, createBookingDto: CreateBookingDto) {
    const { roomId, checkIn, checkOut, guests, specialRequests } = createBookingDto;

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    // Validate dates
    if (checkOutDate <= checkInDate) {
      throw new BadRequestException('Check-out date must be after check-in date');
    }

    if (checkInDate < new Date()) {
      throw new BadRequestException('Check-in date cannot be in the past');
    }

    // Get room details
    const room = await this.prismaService.room.findUnique({
      where: { id: roomId },
      include: {
        hotel: true,
      },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    if (!room.isAvailable) {
      throw new BadRequestException('Room is not available for booking');
    }

    // Validate guest count
    if (guests > room.capacity) {
      throw new BadRequestException(
        `Room can accommodate maximum ${room.capacity} guests`,
      );
    }

    // Check for overlapping bookings
    const overlappingBookings = await this.prismaService.booking.count({
      where: {
        roomId,
        OR: [
          {
            checkIn: {
              lte: checkOutDate,
            },
            checkOut: {
              gte: checkInDate,
            },
          },
        ],
        status: {
          notIn: ['CANCELLED', 'NO_SHOW'],
        },
      },
    });

    if (overlappingBookings > 0) {
      throw new BadRequestException('Room is not available for selected dates');
    }

    // Calculate total price
    const nights = Math.ceil(
      (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const totalPrice = room.price * nights;

    // Create booking
    return this.prismaService.booking.create({
      data: {
        userId,
        roomId,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        numberOfGuests: guests,
        guestName: '',
        guestEmail: '',
        totalPrice,
        specialRequests,
        status: BookingStatus.PENDING_PAYMENT,
        paymentStatus: PaymentStatus.PENDING,
      },
      include: {
        room: {
          include: {
            hotel: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Get all bookings (admin) or user's bookings
   */
  async findAll(userId?: string, userRole?: string) {
    const where: any = {};

    // Non-admin users can only see their own bookings
    if (userRole !== UserRole.ADMIN && userId) {
      where.userId = userId;
    }

    return this.prismaService.booking.findMany({
      where,
      include: {
        room: {
          include: {
            hotel: {
              select: {
                id: true,
                name: true,
                address: true,
                city: true,
                images: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get booking by ID
   */
  async findOne(id: string, userId: string, userRole: string) {
    const booking = await this.prismaService.booking.findUnique({
      where: { id },
      include: {
        room: {
          include: {
            hotel: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        paymentTransaction: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Users can only view their own bookings unless admin
    if (booking.userId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only view your own bookings');
    }

    return booking;
  }

  /**
   * Update booking
   */
  async update(
    id: string,
    userId: string,
    userRole: string,
    updateBookingDto: UpdateBookingDto,
  ) {
    const booking = await this.findOne(id, userId, userRole);

    // Users can only update their own bookings unless admin
    if (booking.userId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only update your own bookings');
    }

    // Prevent certain status changes by non-admin users
    if (updateBookingDto.status && userRole !== UserRole.ADMIN) {
      const allowedStatuses: BookingStatus[] = [BookingStatus.CANCELLED];
      if (!allowedStatuses.includes(updateBookingDto.status as BookingStatus)) {
        throw new ForbiddenException(
          'Only admins can update booking status to this value',
        );
      }
    }

    return this.prismaService.booking.update({
      where: { id },
      data: updateBookingDto,
      include: {
        room: {
          include: {
            hotel: true,
          },
        },
      },
    });
  }

  /**
   * Cancel booking
   */
  async cancel(id: string, userId: string, userRole: string) {
    const booking = await this.findOne(id, userId, userRole);

    // Users can only cancel their own bookings unless admin
    if (booking.userId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only cancel your own bookings');
    }

    // Prevent cancelling already completed/cancelled bookings
    if (['CANCELLED', 'CHECKED_OUT', 'NO_SHOW'].includes(booking.status)) {
      throw new BadRequestException(
        `Cannot cancel booking with status: ${booking.status}`,
      );
    }

    // Check cancellation policy (24 hours before check-in)
    const now = new Date();
    const hoursUntilCheckIn = (booking.checkIn.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilCheckIn < 24 && userRole !== UserRole.ADMIN) {
      throw new BadRequestException(
        'Bookings can only be cancelled at least 24 hours before check-in',
      );
    }

    return this.prismaService.booking.update({
      where: { id },
      data: {
        status: BookingStatus.CANCELLED,
      },
      include: {
        room: {
          include: {
            hotel: true,
          },
        },
      },
    });
  }

  /**
   * Delete booking (admin only)
   */
  async remove(id: string) {
    const booking = await this.prismaService.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    await this.prismaService.booking.delete({
      where: { id },
    });

    return {
      message: 'Booking deleted successfully',
    };
  }

  /**
   * Confirm payment and update booking status
   */
  async confirmPayment(bookingId: string, paymentTransactionId: string) {
    const booking = await this.prismaService.booking.findUnique({
      where: { id: bookingId },
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

    // Calculate actual amount paid (totalPrice - discountFromPoints)
    const amountPaid = booking.totalPrice - (booking.discountFromPoints || 0);

    const updatedBooking = await this.prismaService.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CONFIRMED,
        paymentStatus: PaymentStatus.SUCCEEDED,
        paymentTransactionId,
        isPaid: true,
        paidAt: new Date(),
      },
      include: {
        room: {
          include: {
            hotel: true,
          },
        },
        user: true,
      },
    });

    // Award loyalty points for the actual amount paid
    try {
      await this.loyaltyService.awardPoints(
        booking.userId,
        bookingId,
        amountPaid,
        `Points earned for booking at ${booking.room.hotel.name}`,
      );
    } catch (error) {
      // Log error but don't fail the payment confirmation
      console.error('Failed to award loyalty points:', error);
    }

    return updatedBooking;
  }

  /**
   * Apply loyalty points redemption to a booking
   */
  async applyPointsRedemption(
    bookingId: string,
    userId: string,
    pointsToRedeem: number,
  ): Promise<{ discountAmount: number; newTotal: number }> {
    const booking = await this.prismaService.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.userId !== userId) {
      throw new ForbiddenException('Booking does not belong to user');
    }

    if (booking.status !== BookingStatus.PENDING_PAYMENT) {
      throw new BadRequestException('Can only apply points to pending bookings');
    }

    const result = await this.loyaltyService.redeemPoints(
      userId,
      bookingId,
      pointsToRedeem,
    );

    return {
      discountAmount: result.discountAmount,
      newTotal: booking.totalPrice - result.discountAmount,
    };
  }

  /**
   * Check in guest
   */
  async checkIn(id: string) {
    const booking = await this.prismaService.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('Can only check in confirmed bookings');
    }

    return this.prismaService.booking.update({
      where: { id },
      data: {
        status: BookingStatus.CHECKED_IN,
      },
    });
  }

  /**
   * Check out guest
   */
  async checkOut(id: string) {
    const booking = await this.prismaService.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status !== BookingStatus.CHECKED_IN) {
      throw new BadRequestException('Can only check out checked-in bookings');
    }

    return this.prismaService.booking.update({
      where: { id },
      data: {
        status: BookingStatus.CHECKED_OUT,
      },
    });
  }
}
