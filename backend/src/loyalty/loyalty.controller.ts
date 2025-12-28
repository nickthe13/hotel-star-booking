import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { LoyaltyService } from './loyalty.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import {
  RedeemPointsDto,
  CalculateRedemptionDto,
  AdjustPointsDto,
} from './dto';
import { TIER_CONFIG, POINTS_CONFIG } from './constants/tier-config';

@ApiTags('Loyalty')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get('account')
  @ApiOperation({ summary: 'Get current user loyalty account' })
  async getAccount(@CurrentUser() user: any) {
    return this.loyaltyService.getOrCreateAccount(user.id);
  }

  @Get('account/details')
  @ApiOperation({ summary: 'Get detailed loyalty account with tier progress' })
  async getAccountDetails(@CurrentUser() user: any) {
    return this.loyaltyService.getAccountWithDetails(user.id);
  }

  @Get('tier-progress')
  @ApiOperation({ summary: 'Get tier progress and next tier requirements' })
  async getTierProgress(@CurrentUser() user: any) {
    return this.loyaltyService.getTierProgress(user.id);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get loyalty transaction history' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getTransactions(
    @CurrentUser() user: any,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.loyaltyService.getTransactionHistory(
      user.id,
      Number(page),
      Number(limit),
    );
  }

  @Post('calculate-redemption')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Calculate maximum points redemption for booking' })
  async calculateRedemption(
    @CurrentUser() user: any,
    @Body() dto: CalculateRedemptionDto,
  ) {
    const account = await this.loyaltyService.getOrCreateAccount(user.id);
    return this.loyaltyService.calculateMaxRedeemablePoints(
      account.currentPoints,
      dto.bookingAmount,
    );
  }

  @Post('redeem')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Redeem points for a booking' })
  async redeemPoints(
    @CurrentUser() user: any,
    @Body() dto: RedeemPointsDto,
  ) {
    return this.loyaltyService.redeemPoints(
      user.id,
      dto.bookingId,
      dto.points,
    );
  }

  @Get('tiers')
  @ApiOperation({ summary: 'Get all tier information' })
  async getTiers() {
    return {
      tiers: TIER_CONFIG,
      pointsConfig: POINTS_CONFIG,
    };
  }

  // Admin endpoints
  @Post('admin/adjust')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually adjust user points (admin only)' })
  async adjustPoints(
    @CurrentUser() admin: any,
    @Body() dto: AdjustPointsDto,
  ) {
    return this.loyaltyService.adjustPoints(
      dto.userId,
      dto.points,
      dto.reason,
      admin.id,
    );
  }
}
