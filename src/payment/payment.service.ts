import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ApplePaymentDto } from './dto/apple.dto';
import { GooglePaymentDto } from './dto/google.dto';
import { IAPService } from '@jeremybarbet/nest-iap';
import { User } from '@prisma/client';
import { GameConfigService } from '../game-config/game-config.service';
import { UserService } from '../user/user.service';
import _ from 'lodash';

@Injectable({})
export class PaymentService {
  private readonly Logger = new Logger();

  constructor(
    private readonly iapService: IAPService,
    private gameConfig: GameConfigService,
    private userService: UserService,
  ) {}

  // Getting decoded inforation from Apple Receipt
  async getDecodedAppleInfo(receipt: ApplePaymentDto) {
    return await this.iapService.verifyAppleReceipt({
      transactionReceipt: receipt.transactionReceipt,
    });
  }

  // Getting purchse (gems, etc) from apple receipt information
  async purchaseByApple(receipt: ApplePaymentDto, user: User) {
    const decodedInfo = await this.getDecodedAppleInfo(receipt);

    if (this.isReceiptValid(decodedInfo) === false) {
      throw new ForbiddenException('receiptInvalid');
    }

    const gemsCount = this.getGemsCount(
      decodedInfo.data.receipt.in_app[0].product_id,
    );

    this.userService.addGems(user, gemsCount);
  }

  // Getting decoded information from Google Receipt
  async getDecodedGoogleInfo(receipt: GooglePaymentDto) {
    return await this.iapService.verifyGoogleReceipt({
      packageName: receipt.packageName,
      token: receipt.token,
      productId: receipt.productId,
    });
  }

  // Getting purchse (gems, etc) from google receipt information
  async purchaseByGoogle(receipt: GooglePaymentDto, user: User) {
    const decodedInfo = await this.getDecodedGoogleInfo(receipt);

    if (this.isReceiptValid(decodedInfo) === false) {
      throw new ForbiddenException('receiptInvalid');
    }

    const gemsCount = this.getGemsCount(receipt.productId);

    this.userService.addGems(user, gemsCount);
  }

  // Checking receipt for correct
  // TODO: Need to change any type to Apple or Google payment
  isReceiptValid(receipt: any): boolean {
    return receipt.valid;
  }

  // Getting gems count from game config where bundle_id are equal to packageName
  getGemsCount(packageName: string): number {
    const product = _.first(
      this.gameConfig.config.storeItems.gems.filter(
        ({ id }) => id === packageName,
      ),
    );

    if (product === undefined) throw new ForbiddenException('invalidProduct');

    return product.amount;
  }
}
