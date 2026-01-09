import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateContactDto {
  @ApiProperty({ example: 'John Doe', description: 'Name of the person contacting' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'john@example.com', description: 'Email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Booking Inquiry', description: 'Subject of the message' })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  subject: string;

  @ApiProperty({ example: 'I would like to know more about...', description: 'Message content' })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(1000)
  message: string;
}
