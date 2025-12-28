import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new review' })
  @ApiResponse({
    status: 201,
    description: 'Review created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - User already reviewed this hotel',
  })
  @ApiResponse({
    status: 404,
    description: 'Hotel not found',
  })
  create(@Body() createReviewDto: CreateReviewDto, @CurrentUser() user: any) {
    return this.reviewsService.create(user.id, createReviewDto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all reviews' })
  @ApiQuery({ name: 'hotelId', required: false, description: 'Filter by hotel ID' })
  @ApiResponse({
    status: 200,
    description: 'Reviews retrieved successfully',
  })
  findAll(@Query('hotelId') hotelId?: string) {
    return this.reviewsService.findAll(hotelId);
  }

  @Public()
  @Get('hotel/:hotelId')
  @ApiOperation({ summary: 'Get all reviews for a specific hotel' })
  @ApiParam({ name: 'hotelId', description: 'Hotel ID' })
  @ApiResponse({
    status: 200,
    description: 'Hotel reviews retrieved successfully',
  })
  findByHotel(@Param('hotelId') hotelId: string) {
    return this.reviewsService.findByHotel(hotelId);
  }

  @Get('user/:hotelId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user\'s review for a specific hotel' })
  @ApiParam({ name: 'hotelId', description: 'Hotel ID' })
  @ApiResponse({
    status: 200,
    description: 'User review retrieved successfully',
  })
  findUserReview(@Param('hotelId') hotelId: string, @CurrentUser() user: any) {
    return this.reviewsService.findUserReview(user.id, hotelId);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get review by ID' })
  @ApiParam({ name: 'id', description: 'Review ID' })
  @ApiResponse({
    status: 200,
    description: 'Review retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Review not found',
  })
  findOne(@Param('id') id: string) {
    return this.reviewsService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update review' })
  @ApiParam({ name: 'id', description: 'Review ID' })
  @ApiResponse({
    status: 200,
    description: 'Review updated successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Can only update own reviews',
  })
  @ApiResponse({
    status: 404,
    description: 'Review not found',
  })
  update(
    @Param('id') id: string,
    @Body() updateReviewDto: UpdateReviewDto,
    @CurrentUser() user: any,
  ) {
    const isAdmin = user.role === UserRole.ADMIN;
    return this.reviewsService.update(id, user.id, updateReviewDto, isAdmin);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete review' })
  @ApiParam({ name: 'id', description: 'Review ID' })
  @ApiResponse({
    status: 200,
    description: 'Review deleted successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Can only delete own reviews',
  })
  @ApiResponse({
    status: 404,
    description: 'Review not found',
  })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    const isAdmin = user.role === UserRole.ADMIN;
    return this.reviewsService.remove(id, user.id, isAdmin);
  }
}
