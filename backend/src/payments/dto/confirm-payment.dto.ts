import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfirmPaymentDto {
  @ApiProperty({
    description: 'Payment Intent ID from Stripe',
    example: 'pi_1234567890abcdef',
  })
  @IsNotEmpty()
  @IsString()
  paymentIntentId: string;

  @ApiProperty({
    description: 'Payment Method ID from Stripe',
    example: 'pm_1234567890abcdef',
  })
  @IsNotEmpty()
  @IsString()
  paymentMethodId: string;
}
