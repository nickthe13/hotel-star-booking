import { IsNotEmpty, IsNumber, IsString, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentIntentDto {
  @ApiProperty({
    description: 'Booking ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsString()
  bookingId: string;

  @ApiProperty({
    description: 'Amount in cents',
    example: 10000,
    minimum: 50,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(50)
  amount: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'usd',
    default: 'usd',
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({
    description: 'Save payment method for future use',
    example: false,
    required: false,
  })
  @IsOptional()
  savePaymentMethod?: boolean;
}
