import { IsNotEmpty, IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefundPaymentDto {
  @ApiProperty({
    description: 'Payment Intent ID to refund',
    example: 'pi_1234567890abcdef',
  })
  @IsNotEmpty()
  @IsString()
  paymentIntentId: string;

  @ApiProperty({
    description: 'Refund amount in cents (optional, defaults to full refund)',
    example: 5000,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  amount?: number;

  @ApiProperty({
    description: 'Reason for refund',
    example: 'Customer requested cancellation',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
