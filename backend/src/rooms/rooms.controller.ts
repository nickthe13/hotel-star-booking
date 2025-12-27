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
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, RoomType } from '@prisma/client';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Rooms')
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new room (admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Room created successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Hotel not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  create(@Body() createRoomDto: CreateRoomDto) {
    return this.roomsService.create(createRoomDto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all rooms with optional filtering' })
  @ApiQuery({ name: 'hotelId', required: false })
  @ApiQuery({ name: 'type', required: false, enum: RoomType })
  @ApiQuery({ name: 'available', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'Rooms retrieved successfully',
  })
  findAll(
    @Query('hotelId') hotelId?: string,
    @Query('type') type?: RoomType,
    @Query('available') available?: string,
  ) {
    const availableBool = available === 'true' ? true : available === 'false' ? false : undefined;
    return this.roomsService.findAll(hotelId, type, availableBool);
  }

  @Public()
  @Get('available')
  @ApiOperation({ summary: 'Get available rooms for hotel and date range' })
  @ApiQuery({ name: 'hotelId', description: 'Hotel ID' })
  @ApiQuery({ name: 'checkIn', description: 'Check-in date (ISO format)' })
  @ApiQuery({ name: 'checkOut', description: 'Check-out date (ISO format)' })
  @ApiResponse({
    status: 200,
    description: 'Available rooms retrieved successfully',
  })
  getAvailable(
    @Query('hotelId') hotelId: string,
    @Query('checkIn') checkIn: string,
    @Query('checkOut') checkOut: string,
  ) {
    return this.roomsService.getAvailableRooms(
      hotelId,
      new Date(checkIn),
      new Date(checkOut),
    );
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get room by ID' })
  @ApiParam({ name: 'id', description: 'Room ID' })
  @ApiResponse({
    status: 200,
    description: 'Room retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Room not found',
  })
  findOne(@Param('id') id: string) {
    return this.roomsService.findOne(id);
  }

  @Public()
  @Get(':id/availability')
  @ApiOperation({ summary: 'Check room availability for date range' })
  @ApiParam({ name: 'id', description: 'Room ID' })
  @ApiQuery({ name: 'checkIn', description: 'Check-in date (ISO format)' })
  @ApiQuery({ name: 'checkOut', description: 'Check-out date (ISO format)' })
  @ApiResponse({
    status: 200,
    description: 'Availability checked successfully',
  })
  checkAvailability(
    @Param('id') id: string,
    @Query('checkIn') checkIn: string,
    @Query('checkOut') checkOut: string,
  ) {
    return this.roomsService.checkAvailability(
      id,
      new Date(checkIn),
      new Date(checkOut),
    );
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update room (admin only)' })
  @ApiParam({ name: 'id', description: 'Room ID' })
  @ApiResponse({
    status: 200,
    description: 'Room updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Room not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  update(@Param('id') id: string, @Body() updateRoomDto: UpdateRoomDto) {
    return this.roomsService.update(id, updateRoomDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete room (admin only)' })
  @ApiParam({ name: 'id', description: 'Room ID' })
  @ApiResponse({
    status: 200,
    description: 'Room deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Room not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete room with active bookings',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  remove(@Param('id') id: string) {
    return this.roomsService.remove(id);
  }
}
