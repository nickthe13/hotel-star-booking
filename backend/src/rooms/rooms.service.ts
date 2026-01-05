import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { RoomType } from '@prisma/client';

@Injectable()
export class RoomsService {
  constructor(private prismaService: PrismaService) {}

  /**
   * Create a new room
   */
  async create(createRoomDto: CreateRoomDto) {
    const { hotelId, ...roomData } = createRoomDto;

    // Verify hotel exists
    const hotel = await this.prismaService.hotel.findUnique({
      where: { id: hotelId },
    });

    if (!hotel) {
      throw new NotFoundException(`Hotel with ID ${hotelId} not found`);
    }

    return this.prismaService.room.create({
      data: {
        ...roomData,
        hotel: {
          connect: { id: hotelId },
        },
      },
      include: {
        hotel: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Get all rooms with optional filtering
   */
  async findAll(hotelId?: string, type?: RoomType, available?: boolean) {
    const where: any = {};

    if (hotelId) {
      where.hotelId = hotelId;
    }

    if (type) {
      where.type = type;
    }

    if (available !== undefined) {
      where.isAvailable = available;
    }

    return this.prismaService.room.findMany({
      where,
      include: {
        hotel: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
          },
        },
        _count: {
          select: {
            bookings: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get room by ID
   */
  async findOne(id: string) {
    const room = await this.prismaService.room.findUnique({
      where: { id },
      include: {
        hotel: true,
        bookings: {
          where: {
            status: {
              notIn: ['CANCELLED', 'NO_SHOW'],
            },
          },
          select: {
            id: true,
            checkIn: true,
            checkOut: true,
            status: true,
          },
          orderBy: {
            checkIn: 'asc',
          },
        },
      },
    });

    if (!room) {
      throw new NotFoundException(`Room with ID ${id} not found`);
    }

    return room;
  }

  /**
   * Update room
   */
  async update(id: string, updateRoomDto: UpdateRoomDto) {
    // Check if room exists
    await this.findOne(id);

    return this.prismaService.room.update({
      where: { id },
      data: updateRoomDto,
      include: {
        hotel: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Delete room
   */
  async remove(id: string) {
    // Check if room exists
    await this.findOne(id);

    // Check for active bookings
    const activeBookings = await this.prismaService.booking.count({
      where: {
        roomId: id,
        status: {
          in: ['PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN'],
        },
      },
    });

    if (activeBookings > 0) {
      throw new BadRequestException(
        'Cannot delete room with active bookings',
      );
    }

    await this.prismaService.room.delete({
      where: { id },
    });

    return {
      message: 'Room deleted successfully',
    };
  }

  /**
   * Check room availability for date range
   */
  async checkAvailability(roomId: string, checkIn: Date, checkOut: Date) {
    const room = await this.findOne(roomId);

    if (!room.isAvailable) {
      return {
        available: false,
        reason: 'Room is currently unavailable',
      };
    }

    // Check for overlapping bookings
    const overlappingBookings = await this.prismaService.booking.count({
      where: {
        roomId,
        OR: [
          {
            checkIn: {
              lte: checkOut,
            },
            checkOut: {
              gte: checkIn,
            },
          },
        ],
        status: {
          notIn: ['CANCELLED', 'NO_SHOW'],
        },
      },
    });

    if (overlappingBookings > 0) {
      return {
        available: false,
        reason: 'Room is already booked for the selected dates',
      };
    }

    return {
      available: true,
      room: {
        id: room.id,
        name: room.name,
        type: room.type,
        price: room.price,
      },
    };
  }

  /**
   * Get available rooms for hotel and date range
   */
  async getAvailableRooms(hotelId: string, checkIn: Date, checkOut: Date) {
    const rooms = await this.prismaService.room.findMany({
      where: {
        hotelId,
        isAvailable: true,
      },
      include: {
        bookings: {
          where: {
            OR: [
              {
                checkIn: {
                  lte: checkOut,
                },
                checkOut: {
                  gte: checkIn,
                },
              },
            ],
            status: {
              notIn: ['CANCELLED', 'NO_SHOW'],
            },
          },
        },
      },
    });

    return rooms
      .filter((room) => room.bookings.length === 0)
      .map(({ bookings, ...room }) => room);
  }
}
