import { IsString, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RedeemPointsDto {
  @ApiProperty({ description: 'Booking ID to apply redemption' })
  @IsString()
  bookingId: string;

  @ApiProperty({ description: 'Number of points to redeem', minimum: 1 })
  @IsInt()
  @Min(1)
  points: number;
}

export class CalculateRedemptionDto {
  @ApiProperty({ description: 'Booking amount in dollars' })
  @Min(0)
  bookingAmount: number;
}

export class AdjustPointsDto {
  @ApiProperty({ description: 'User ID to adjust points for' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Points to add (positive) or remove (negative)' })
  @IsInt()
  points: number;

  @ApiProperty({ description: 'Reason for adjustment' })
  @IsString()
  reason: string;
}
