import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @Public()
  @ApiOperation({ summary: 'Submit contact form' })
  @ApiResponse({ status: 201, description: 'Contact form submitted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async submitContactForm(@Body() createContactDto: CreateContactDto) {
    return this.contactService.submitContactForm(createContactDto);
  }
}
