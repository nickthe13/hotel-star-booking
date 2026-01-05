import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  RawBodyRequest,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentIntentDto, ConfirmPaymentDto, RefundPaymentDto } from './dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Request } from 'express';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('create-intent')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create a payment intent for a booking' })
  @ApiResponse({
    status: 200,
    description: 'Payment intent created successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Booking not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Payment already exists for this booking',
  })
  async createPaymentIntent(
    @CurrentUser() user: any,
    @Body() dto: CreatePaymentIntentDto,
  ) {
    return this.paymentsService.createPaymentIntent(user.id, dto);
  }

  @Post('confirm')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm a payment after Stripe processing' })
  @ApiResponse({
    status: 200,
    description: 'Payment confirmed successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Payment not found',
  })
  async confirmPayment(
    @CurrentUser() user: any,
    @Body() dto: ConfirmPaymentDto,
  ) {
    return this.paymentsService.confirmPayment(user.id, dto);
  }

  @Post('refund')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refund a payment' })
  @ApiResponse({
    status: 200,
    description: 'Refund processed successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Payment not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Can only refund completed payments',
  })
  async refundPayment(
    @CurrentUser() user: any,
    @Body() dto: RefundPaymentDto,
  ) {
    return this.paymentsService.refundPayment(user.id, dto);
  }

  @Get('history')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment history for current user' })
  @ApiResponse({
    status: 200,
    description: 'Payment history retrieved successfully',
  })
  async getPaymentHistory(@CurrentUser() user: any) {
    return this.paymentsService.getPaymentHistory(user.id);
  }

  @Get('saved-methods')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get saved payment methods for current user' })
  @ApiResponse({
    status: 200,
    description: 'Saved payment methods retrieved successfully',
  })
  async getSavedPaymentMethods(@CurrentUser() user: any) {
    return this.paymentsService.getSavedPaymentMethods(user.id);
  }

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Webhook signature verification failed',
  })
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() request: RawBodyRequest<Request>,
  ) {
    if (!request.rawBody) {
      throw new Error('Raw body is required for webhook verification');
    }
    return this.paymentsService.handleWebhook(
      signature,
      request.rawBody,
    );
  }
}
