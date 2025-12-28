import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createReviewDto: CreateReviewDto) {
    const { hotelId, rating, comment } = createReviewDto;

    // Check if hotel exists
    const hotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
    });

    if (!hotel) {
      throw new NotFoundException('Hotel not found');
    }

    // Check if user already reviewed this hotel
    const existingReview = await this.prisma.review.findUnique({
      where: {
        userId_hotelId: {
          userId,
          hotelId,
        },
      },
    });

    if (existingReview) {
      throw new BadRequestException('You have already reviewed this hotel. Use update instead.');
    }

    // Create the review
    const review = await this.prisma.review.create({
      data: {
        userId,
        hotelId,
        rating,
        comment,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Update hotel's average rating
    await this.updateHotelRating(hotelId);

    return review;
  }

  async findAll(hotelId?: string) {
    const where = hotelId ? { hotelId } : {};

    return this.prisma.review.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        hotel: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        hotel: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return review;
  }

  async findByHotel(hotelId: string) {
    return this.prisma.review.findMany({
      where: { hotelId },
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
    });
  }

  async findUserReview(userId: string, hotelId: string) {
    const review = await this.prisma.review.findUnique({
      where: {
        userId_hotelId: {
          userId,
          hotelId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return review;
  }

  async update(id: string, userId: string, updateReviewDto: UpdateReviewDto, isAdmin: boolean = false) {
    const review = await this.prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // Only allow the review owner or admin to update
    if (review.userId !== userId && !isAdmin) {
      throw new ForbiddenException('You can only update your own reviews');
    }

    const updatedReview = await this.prisma.review.update({
      where: { id },
      data: updateReviewDto,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Update hotel's average rating
    await this.updateHotelRating(review.hotelId);

    return updatedReview;
  }

  async remove(id: string, userId: string, isAdmin: boolean = false) {
    const review = await this.prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // Only allow the review owner or admin to delete
    if (review.userId !== userId && !isAdmin) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    const hotelId = review.hotelId;

    await this.prisma.review.delete({
      where: { id },
    });

    // Update hotel's average rating
    await this.updateHotelRating(hotelId);

    return { message: 'Review deleted successfully' };
  }

  private async updateHotelRating(hotelId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { hotelId },
      select: { rating: true },
    });

    if (reviews.length === 0) {
      await this.prisma.hotel.update({
        where: { id: hotelId },
        data: { rating: 0 },
      });
      return;
    }

    const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
    const roundedRating = Math.round(averageRating * 10) / 10;

    await this.prisma.hotel.update({
      where: { id: hotelId },
      data: { rating: roundedRating },
    });
  }
}
