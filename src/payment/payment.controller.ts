import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiResponse } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { GetUser } from '../auth/decorator/get-user.decorator';
import { ApplePaymentDto } from './dto/apple.dto';
import { GooglePaymentDto } from './dto/google.dto';
import { PaymentService } from './payment.service';

@Controller('payment')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @UseGuards(AuthGuard('firebase'))
  @Post('check-apple-receipt')
  @ApiResponse({
    status: 200,
    description: 'Receipt have correct value',
  })
  @ApiResponse({
    status: 403,
    description:
      'Receipt have incorrect type (only Android or Apple receipt support)',
  })
  checkAppleInvoice(@Body() receipt: ApplePaymentDto, @GetUser() user: User) {
    return this.paymentService.purchaseByApple(receipt, user);
  }

  @UseGuards(AuthGuard('firebase'))
  @Post('check-android-receipt')
  @ApiResponse({
    status: 200,
    description: 'Receipt have correct value',
  })
  @ApiResponse({
    status: 403,
    description:
      'Receipt have incorrect type (only Android or Apple receipt support)',
  })
  checkAndroidInvoice(
    @Body() receipt: GooglePaymentDto,
    @GetUser() user: User,
  ) {
    return this.paymentService.purchaseByGoogle(receipt, user);
  }
}
