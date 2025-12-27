import {
  IsString,
  IsArray,
  IsOptional,
  IsNumber,
  Min,
  Max,
  MinLength,
  IsUrl,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateHotelDto {
  @ApiProperty({
    example: 'Grand Plaza Hotel',
    description: 'Hotel name',
  })
  @IsString()
  @MinLength(2, { message: 'Hotel name must be at least 2 characters long' })
  name: string;

  @ApiProperty({
    example: 'A luxurious 5-star hotel in the heart of the city',
    description: 'Hotel description',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: '123 Main Street, New York, NY 10001',
    description: 'Hotel address',
  })
  @IsString()
  @MinLength(5, { message: 'Address must be at least 5 characters long' })
  address: string;

  @ApiProperty({
    example: 'New York',
    description: 'City name',
  })
  @IsString()
  @MinLength(2, { message: 'City must be at least 2 characters long' })
  city: string;

  @ApiProperty({
    example: 'NY',
    description: 'State or province code',
  })
  @IsString()
  state: string;

  @ApiProperty({
    example: 'USA',
    description: 'Country name',
  })
  @IsString()
  @MinLength(2, { message: 'Country must be at least 2 characters long' })
  country: string;

  @ApiProperty({
    example: '10001',
    description: 'Postal/ZIP code',
  })
  @IsString()
  zipCode: string;

  @ApiProperty({
    example: 40.7128,
    description: 'Latitude coordinate',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiProperty({
    example: -74.0060,
    description: 'Longitude coordinate',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiProperty({
    example: [
      'https://example.com/hotel1.jpg',
      'https://example.com/hotel2.jpg',
    ],
    description: 'Array of hotel image URLs',
    type: [String],
  })
  @IsArray()
  @IsUrl({}, { each: true, message: 'Each image must be a valid URL' })
  images: string[];

  @ApiProperty({
    example: ['WiFi', 'Pool', 'Gym', 'Restaurant', 'Parking'],
    description: 'Array of hotel amenities',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  amenities: string[];

  @ApiProperty({
    example: 4.5,
    description: 'Hotel rating (0-5)',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  rating?: number;
}
