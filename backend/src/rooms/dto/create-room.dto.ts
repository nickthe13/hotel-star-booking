import {
  IsString,
  IsNumber,
  IsEnum,
  Min,
  Max,
  MinLength,
  IsArray,
  IsUrl,
  IsOptional,
  IsInt,
} from 'class-validator';
import { RoomType } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoomDto {
  @ApiProperty({
    example: 'cuid123456',
    description: 'Hotel ID',
  })
  @IsString()
  hotelId: string;

  @ApiProperty({
    example: 'DELUXE',
    description: 'Room type',
    enum: RoomType,
  })
  @IsEnum(RoomType, { message: 'Invalid room type' })
  type: RoomType;

  @ApiProperty({
    example: 'Deluxe King Room',
    description: 'Room name/title',
  })
  @IsString()
  @MinLength(2, { message: 'Room name must be at least 2 characters long' })
  name: string;

  @ApiProperty({
    example: 'Spacious room with king-size bed and city view',
    description: 'Room description',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 199.99,
    description: 'Price per night',
  })
  @IsNumber()
  @Min(0, { message: 'Price must be positive' })
  pricePerNight: number;

  @ApiProperty({
    example: 2,
    description: 'Maximum number of guests',
  })
  @IsInt()
  @Min(1, { message: 'Must accommodate at least 1 guest' })
  @Max(10, { message: 'Cannot accommodate more than 10 guests' })
  maxGuests: number;

  @ApiProperty({
    example: 450,
    description: 'Room size in square feet',
  })
  @IsInt()
  @Min(50, { message: 'Room size must be at least 50 sq ft' })
  size: number;

  @ApiProperty({
    example: 2,
    description: 'Number of beds',
  })
  @IsInt()
  @Min(1)
  bedCount: number;

  @ApiProperty({
    example: 'King',
    description: 'Bed type (King, Queen, Twin, etc.)',
  })
  @IsString()
  bedType: string;

  @ApiProperty({
    example: ['WiFi', 'TV', 'Mini Bar', 'Safe'],
    description: 'Room amenities',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  amenities: string[];

  @ApiProperty({
    example: ['https://example.com/room1.jpg'],
    description: 'Room image URLs',
    type: [String],
  })
  @IsArray()
  @IsUrl({}, { each: true, message: 'Each image must be a valid URL' })
  images: string[];

  @ApiProperty({
    example: true,
    description: 'Is room available for booking',
    required: false,
    default: true,
  })
  @IsOptional()
  isAvailable?: boolean = true;
}
