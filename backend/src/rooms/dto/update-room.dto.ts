import { PartialType } from '@nestjs/swagger';
import { CreateRoomDto } from './create-room.dto';
import { OmitType } from '@nestjs/swagger';

// Omit hotelId as it shouldn't be changed after creation
export class UpdateRoomDto extends PartialType(
  OmitType(CreateRoomDto, ['hotelId'] as const),
) {}
