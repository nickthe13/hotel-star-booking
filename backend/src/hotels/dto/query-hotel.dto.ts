import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class QueryHotelDto {
  @ApiProperty({
    example: 'New York',
    description: 'Filter by city',
    required: false,
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({
    example: 'NY',
    description: 'Filter by state',
    required: false,
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({
    example: 'USA',
    description: 'Filter by country',
    required: false,
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({
    example: 'Grand Plaza',
    description: 'Search by hotel name',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    example: 4.0,
    description: 'Minimum rating filter',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  minRating?: number;

  @ApiProperty({
    example: 'WiFi',
    description: 'Filter by amenity',
    required: false,
  })
  @IsOptional()
  @IsString()
  amenity?: string;

  @ApiProperty({
    example: 1,
    description: 'Page number for pagination',
    required: false,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    example: 10,
    description: 'Number of results per page',
    required: false,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiProperty({
    example: 'rating',
    description: 'Sort by field (name, rating, createdAt)',
    required: false,
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiProperty({
    example: 'desc',
    description: 'Sort order (asc, desc)',
    required: false,
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
