import { ForbiddenException } from '@nestjs/common';
import type { User } from '@prisma/client';
import { PaymentService } from './payment.service';

jest.mock('../user/user.service', () => ({ UserService: class {} }));
jest.mock('@jeremybarbet/nest-iap', () => ({ IAPService: class {} }));

const user = { id: 7 } as User;

function setup() {
  const iap = {
    verifyAppleReceipt: jest.fn().mockResolvedValue({
      valid: true,
      data: { receipt: { in_app: [{ product_id: 'gems.small' }] } },
    }),
    verifyGoogleReceipt: jest.fn().mockResolvedValue({ valid: true }),
  };
  const config = {
    config: {
      storeItems: { gems: [{ id: 'gems.small', amount: 50 }] },
    },
  };
  const users = { addGems: jest.fn().mockResolvedValue(undefined) };
  const service = new PaymentService(iap as any, config as any, users as any);
  return { service, iap, users };
}

describe('PaymentService receipt and gem rules', () => {
  it('rejects an invalid Apple receipt without crediting gems', async () => {
    const { service, iap, users } = setup();
    iap.verifyAppleReceipt.mockResolvedValue({ valid: false });
    await expect(
      service.purchaseByApple({ transactionReceipt: 'bad' }, user),
    ).rejects.toThrow(new ForbiddenException('receiptInvalid'));
    expect(users.addGems).not.toHaveBeenCalled();
  });

  it('credits the configured gems for a verified Apple purchase', async () => {
    const { service, iap, users } = setup();
    await service.purchaseByApple({ transactionReceipt: 'signed' }, user);
    expect(iap.verifyAppleReceipt).toHaveBeenCalledWith({
      transactionReceipt: 'signed',
    });
    expect(users.addGems).toHaveBeenCalledWith(user, 50);
  });

  it('verifies the full Google purchase identity before crediting gems', async () => {
    const { service, iap, users } = setup();
    const receipt = {
      packageName: 'package.game',
      token: 'signed-token',
      productId: 'gems.small',
    };
    await service.purchaseByGoogle(receipt, user);
    expect(iap.verifyGoogleReceipt).toHaveBeenCalledWith(receipt);
    expect(users.addGems).toHaveBeenCalledWith(user, 50);
  });

  it('rejects an unknown store product even if the receipt is valid', async () => {
    const { service, users } = setup();
    await expect(
      service.purchaseByGoogle(
        { packageName: 'package.game', token: 'signed', productId: 'unknown' },
        user,
      ),
    ).rejects.toThrow(new ForbiddenException('invalidProduct'));
    expect(users.addGems).not.toHaveBeenCalled();
  });
});
