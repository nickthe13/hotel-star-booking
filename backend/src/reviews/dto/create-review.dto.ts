import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Min, Max, IsOptional } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({
    description: 'Hotel ID',
    example: 'clx1234567890',
  })
  @IsNotEmpty()
  @IsString()
  hotelId: string;

  @ApiProperty({
    description: 'Rating from 1 to 5',
    example: 4.5,
    minimum: 1,
    maximum: 5,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({
    description: 'Review comment',
    example: 'Great hotel with excellent service!',
    required: false,
  })
  @IsOptional()
  @IsString()
  comment?: string;
}
