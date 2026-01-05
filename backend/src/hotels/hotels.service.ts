import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHotelDto } from './dto/create-hotel.dto';
import { UpdateHotelDto } from './dto/update-hotel.dto';
import { QueryHotelDto } from './dto/query-hotel.dto';

@Injectable()
export class HotelsService {
  constructor(private prismaService: PrismaService) {}

  /**
   * Create a new hotel
   */
  async create(createHotelDto: CreateHotelDto) {
    return this.prismaService.hotel.create({
      data: createHotelDto,
    });
  }

  /**
   * Get all hotels with filtering and pagination
   */
  async findAll(query: QueryHotelDto) {
    const {
      city,
      state,
      country,
      search,
      minRating,
      amenity,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    // Build where clause
    const where: any = {};

    if (city) {
      where.city = { contains: city, mode: 'insensitive' };
    }

    if (state) {
      where.state = { contains: state, mode: 'insensitive' };
    }

    if (country) {
      where.country = { contains: country, mode: 'insensitive' };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (minRating !== undefined) {
      where.rating = { gte: minRating };
    }

    if (amenity) {
      where.amenities = { has: amenity };
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get total count for pagination metadata
    const total = await this.prismaService.hotel.count({ where });

    // Get hotels with pagination
    const hotels = await this.prismaService.hotel.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        _count: {
          select: {
            rooms: true,
            reviews: true,
          },
        },
      },
    });

    return {
      data: hotels,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Get hotel by ID
   */
  async findOne(id: string) {
    const hotel = await this.prismaService.hotel.findUnique({
      where: { id },
      include: {
        rooms: true,
        reviews: {
          include: {
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
        },
        _count: {
          select: {
            rooms: true,
            reviews: true,
            favoriteBy: true,
          },
        },
      },
    });

    if (!hotel) {
      throw new NotFoundException(`Hotel with ID ${id} not found`);
    }

    return hotel;
  }

  /**
   * Update hotel
   */
  async update(id: string, updateHotelDto: UpdateHotelDto) {
    // Check if hotel exists
    await this.findOne(id);

    return this.prismaService.hotel.update({
      where: { id },
      data: updateHotelDto,
    });
  }

  /**
   * Delete hotel
   */
  async remove(id: string) {
    // Check if hotel exists
    await this.findOne(id);

    // Delete hotel (cascade will delete related rooms, bookings, etc.)
    await this.prismaService.hotel.delete({
      where: { id },
    });

    return {
      message: 'Hotel deleted successfully',
    };
  }

  /**
   * Get featured hotels (highest rated)
   */
  async getFeatured(limit: number = 6) {
    return this.prismaService.hotel.findMany({
      take: limit,
      orderBy: {
        rating: 'desc',
      },
      include: {
        _count: {
          select: {
            reviews: true,
          },
        },
      },
    });
  }

  /**
   * Add hotel to user's favorites
   */
  async addToFavorites(hotelId: string, userId: string) {
    // Check if hotel exists
    await this.findOne(hotelId);

    // Check if already favorited
    const existing = await this.prismaService.favoriteHotel.findFirst({
      where: {
        hotelId,
        userId,
      },
    });

    if (existing) {
      return { message: 'Hotel already in favorites' };
    }

    await this.prismaService.favoriteHotel.create({
      data: {
        hotelId,
        userId,
      },
    });

    return { message: 'Hotel added to favorites' };
  }

  /**
   * Remove hotel from user's favorites
   */
  async removeFromFavorites(hotelId: string, userId: string) {
    const favorite = await this.prismaService.favoriteHotel.findFirst({
      where: {
        hotelId,
        userId,
      },
    });

    if (!favorite) {
      throw new NotFoundException('Hotel not in favorites');
    }

    await this.prismaService.favoriteHotel.delete({
      where: {
        id: favorite.id,
      },
    });

    return { message: 'Hotel removed from favorites' };
  }

  /**
   * Get hotel availability for date range
   */
  async getAvailability(hotelId: string, checkIn: Date, checkOut: Date) {
    // Check if hotel exists
    await this.findOne(hotelId);

    // Get all rooms for this hotel
    const rooms = await this.prismaService.room.findMany({
      where: { hotelId },
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

    return rooms.map((room) => ({
      ...room,
      isAvailable: room.bookings.length === 0,
      bookedCount: room.bookings.length,
    }));
  }
}
