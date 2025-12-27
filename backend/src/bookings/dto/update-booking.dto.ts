import { IsEnum, IsOptional, IsString } from 'class-validator';
import { BookingStatus } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateBookingDto {
  @ApiProperty({
    example: 'CONFIRMED',
    description: 'Booking status',
    enum: BookingStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(BookingStatus, { message: 'Invalid booking status' })
  status?: BookingStatus;

  @ApiProperty({
    example: 'Changed room preference',
    description: 'Special requests or notes',
    required: false,
  })
  @IsOptional()
  @IsString()
  specialRequests?: string;
}
