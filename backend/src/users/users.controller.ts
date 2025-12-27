import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Delete,
  Post,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all users (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Can only view own profile',
  })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.usersService.findOne(id, user.id, user.role);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Can only update own profile',
  })
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: any,
  ) {
    return this.usersService.update(id, updateUserDto, user.id, user.role);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Current password is incorrect',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid password format',
  })
  changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @CurrentUser() user: any,
  ) {
    return this.usersService.changePassword(user.id, changePasswordDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete user (admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Cannot delete admin accounts',
  })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Get(':id/bookings')
  @ApiOperation({ summary: 'Get user bookings' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Bookings retrieved successfully',
  })
  getUserBookings(@Param('id') id: string, @CurrentUser() user: any) {
    // Ensure users can only view their own bookings unless admin
    if (id !== user.id && user.role !== UserRole.ADMIN) {
      return { error: 'Forbidden' };
    }
    return this.usersService.getUserBookings(id);
  }

  @Get(':id/reviews')
  @ApiOperation({ summary: 'Get user reviews' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Reviews retrieved successfully',
  })
  getUserReviews(@Param('id') id: string, @CurrentUser() user: any) {
    // Ensure users can only view their own reviews unless admin
    if (id !== user.id && user.role !== UserRole.ADMIN) {
      return { error: 'Forbidden' };
    }
    return this.usersService.getUserReviews(id);
  }

  @Get(':id/favorites')
  @ApiOperation({ summary: 'Get user favorite hotels' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Favorite hotels retrieved successfully',
  })
  getUserFavorites(@Param('id') id: string, @CurrentUser() user: any) {
    // Ensure users can only view their own favorites unless admin
    if (id !== user.id && user.role !== UserRole.ADMIN) {
      return { error: 'Forbidden' };
    }
    return this.usersService.getUserFavorites(id);
  }
}
