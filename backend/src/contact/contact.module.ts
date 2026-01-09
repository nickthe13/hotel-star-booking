import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [ConfigModule, EmailModule],
  controllers: [ContactController],
  providers: [ContactService],
})
export class ContactModule {}
