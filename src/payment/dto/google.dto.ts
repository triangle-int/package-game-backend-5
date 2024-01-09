import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GooglePaymentDto {
  /**
   * The package name of the application for which this subscription was purchased (for example, 'com.some.thing').
   */
  @ApiProperty({
    example: 'com.some.thing',
    description: 'Package name string',
  })
  @IsString()
  @IsNotEmpty()
  packageName: string;

  /**
   * The token provided to the user's device when the subscription was purchased.
   */
  @ApiProperty({
    example: 'SOME_TOKEN_HERE',
    description: 'Token string',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  /**
   * The inapp product SKU (for example, 'com.some.thing.inapp1').
   */
  @ApiProperty({
    example: 'com.some.thing.inapp1',
    description: 'Product SKU string',
  })
  @IsString()
  @IsNotEmpty()
  productId: string;
}
