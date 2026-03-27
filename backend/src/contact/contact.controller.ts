import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, ContactMessageStatus } from '@prisma/client';

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

  @Get('admin/messages')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all contact messages (admin)' })
  @ApiResponse({ status: 200, description: 'Contact messages retrieved successfully' })
  async getAllMessages() {
    return this.contactService.getAllMessages();
  }

  @Patch('admin/messages/:id/status')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update contact message status (admin)' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async updateMessageStatus(
    @Param('id') id: string,
    @Body() body: { status: ContactMessageStatus },
  ) {
    return this.contactService.updateMessageStatus(id, body.status);
  }

  @Delete('admin/messages/:id')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a contact message (admin)' })
  @ApiResponse({ status: 200, description: 'Message deleted successfully' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async deleteMessage(@Param('id') id: string) {
    return this.contactService.deleteMessage(id);
  }
}
