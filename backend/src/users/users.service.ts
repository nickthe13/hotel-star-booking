import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prismaService: PrismaService) {}

  /**
   * Get all users (admin only)
   */
  async findAll() {
    return this.prismaService.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get user by ID
   */
  async findOne(id: string, requestingUserId: string, requestingUserRole: string) {
    // Users can only view their own profile unless they're admin
    if (id !== requestingUserId && requestingUserRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only view your own profile');
    }

    const user = await this.prismaService.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            bookings: true,
            reviews: true,
            favoriteHotels: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Update user profile
   */
  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    requestingUserId: string,
    requestingUserRole: string,
  ) {
    // Users can only update their own profile unless they're admin
    if (id !== requestingUserId && requestingUserRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only update your own profile');
    }

    const user = await this.prismaService.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prismaService.user.update({
      where: { id },
      data: updateUserDto,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ) {
    const { currentPassword, newPassword } = changePasswordDto;

    // Get user with password
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Check new password is different from current
    const isSamePassword = await bcrypt.compare(newPassword, user.password);

    if (isSamePassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await this.prismaService.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return {
      message: 'Password changed successfully',
    };
  }

  /**
   * Delete user (admin only)
   */
  async remove(id: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prevent deleting admin accounts (optional safety measure)
    if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException('Cannot delete admin accounts');
    }

    await this.prismaService.user.delete({
      where: { id },
    });

    return {
      message: 'User deleted successfully',
    };
  }

  /**
   * Get user's bookings
   */
  async getUserBookings(userId: string) {
    return this.prismaService.booking.findMany({
      where: { userId },
      include: {
        room: {
          include: {
            hotel: {
              select: {
                id: true,
                name: true,
                address: true,
                images: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get user's reviews
   */
  async getUserReviews(userId: string) {
    return this.prismaService.review.findMany({
      where: { userId },
      include: {
        hotel: {
          select: {
            id: true,
            name: true,
            images: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get user's favorite hotels
   */
  async getUserFavorites(userId: string) {
    const favorites = await this.prismaService.favoriteHotel.findMany({
      where: { userId },
      include: {
        hotel: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return favorites.map((fav) => fav.hotel);
  }
}
