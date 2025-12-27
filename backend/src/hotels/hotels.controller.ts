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
import { HotelsService } from './hotels.service';
import { CreateHotelDto } from './dto/create-hotel.dto';
import { UpdateHotelDto } from './dto/update-hotel.dto';
import { QueryHotelDto } from './dto/query-hotel.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Hotels')
@Controller('hotels')
export class HotelsController {
  constructor(private readonly hotelsService: HotelsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new hotel (admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Hotel created successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  create(@Body() createHotelDto: CreateHotelDto) {
    return this.hotelsService.create(createHotelDto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all hotels with filtering and pagination' })
  @ApiResponse({
    status: 200,
    description: 'Hotels retrieved successfully',
  })
  findAll(@Query() query: QueryHotelDto) {
    return this.hotelsService.findAll(query);
  }

  @Public()
  @Get('featured')
  @ApiOperation({ summary: 'Get featured hotels (highest rated)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Featured hotels retrieved successfully',
  })
  getFeatured(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 6;
    return this.hotelsService.getFeatured(parsedLimit);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get hotel by ID' })
  @ApiParam({ name: 'id', description: 'Hotel ID' })
  @ApiResponse({
    status: 200,
    description: 'Hotel retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Hotel not found',
  })
  findOne(@Param('id') id: string) {
    return this.hotelsService.findOne(id);
  }

  @Public()
  @Get(':id/availability')
  @ApiOperation({ summary: 'Get hotel room availability for date range' })
  @ApiParam({ name: 'id', description: 'Hotel ID' })
  @ApiQuery({ name: 'checkIn', description: 'Check-in date (ISO format)' })
  @ApiQuery({ name: 'checkOut', description: 'Check-out date (ISO format)' })
  @ApiResponse({
    status: 200,
    description: 'Availability retrieved successfully',
  })
  getAvailability(
    @Param('id') id: string,
    @Query('checkIn') checkIn: string,
    @Query('checkOut') checkOut: string,
  ) {
    return this.hotelsService.getAvailability(
      id,
      new Date(checkIn),
      new Date(checkOut),
    );
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update hotel (admin only)' })
  @ApiParam({ name: 'id', description: 'Hotel ID' })
  @ApiResponse({
    status: 200,
    description: 'Hotel updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Hotel not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  update(@Param('id') id: string, @Body() updateHotelDto: UpdateHotelDto) {
    return this.hotelsService.update(id, updateHotelDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete hotel (admin only)' })
  @ApiParam({ name: 'id', description: 'Hotel ID' })
  @ApiResponse({
    status: 200,
    description: 'Hotel deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Hotel not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  remove(@Param('id') id: string) {
    return this.hotelsService.remove(id);
  }

  @Post(':id/favorites')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add hotel to favorites' })
  @ApiParam({ name: 'id', description: 'Hotel ID' })
  @ApiResponse({
    status: 200,
    description: 'Hotel added to favorites',
  })
  @ApiResponse({
    status: 404,
    description: 'Hotel not found',
  })
  addToFavorites(@Param('id') id: string, @CurrentUser() user: any) {
    return this.hotelsService.addToFavorites(id, user.id);
  }

  @Delete(':id/favorites')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove hotel from favorites' })
  @ApiParam({ name: 'id', description: 'Hotel ID' })
  @ApiResponse({
    status: 200,
    description: 'Hotel removed from favorites',
  })
  @ApiResponse({
    status: 404,
    description: 'Hotel not in favorites',
  })
  removeFromFavorites(@Param('id') id: string, @CurrentUser() user: any) {
    return this.hotelsService.removeFromFavorites(id, user.id);
  }
}
