import {
  IsString,
  IsDateString,
  IsInt,
  Min,
  Max,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({
    example: 'cuid123456',
    description: 'Room ID',
  })
  @IsString()
  roomId: string;

  @ApiProperty({
    example: '2024-12-01T15:00:00Z',
    description: 'Check-in date and time',
  })
  @IsDateString()
  checkIn: string;

  @ApiProperty({
    example: '2024-12-05T11:00:00Z',
    description: 'Check-out date and time',
  })
  @IsDateString()
  checkOut: string;

  @ApiProperty({
    example: 2,
    description: 'Number of guests',
  })
  @IsInt()
  @Min(1, { message: 'At least 1 guest is required' })
  @Max(10, { message: 'Maximum 10 guests allowed' })
  guests: number;

  @ApiProperty({
    example: 'Early check-in requested',
    description: 'Special requests or notes',
    required: false,
  })
  @IsOptional()
  @IsString()
  specialRequests?: string;
}
