import { ApiProperty } from '@nestjs/swagger';
import { IsBase64, IsNotEmpty } from 'class-validator';

export class ApplePaymentDto {
  @ApiProperty({
    example:
      'MIITuAYJKoZIhvcNAQcCoIITqTCCE6UCAQExCzAJBgUrDgMCGgUAMIIDWQYJKoZIhvcNAQcBoIIDSgSCA0YxggNCMAoCAQgCAQEEAhYAMAoCARQCAQEEAgwAMAsCAQECAQEEAwIBADALAgEDAgEBBAMMATMwCwIBCwIBAQQDAgEAMAsCAQ4CAQEEAwIBWjALAgEPAgEBBAMCAQAwCwIBEAIBAQQDAgEAMAsCARkCAQEEAwIBAzAMAgEKAgEBBAQWAjQrMA0CAQ0CAQEEBQIDAYfPMA0CARMCAQEEBQwDMS4wMA4CAQkCAQEEBgIEUDI1MDAYAgEEAgECBBA04jSbC9Zi5OwSemv9EK8kMBsCAQACAQEEEwwRUHJvZHVjdGlvblNhbmRib3gwHAIBAgIBAQQUDBJjb20uYmVsaXZlLmFwcC5pb3MwHAIBBQIBAQQUJzhO1BR1kxOVGrCEqQLkwvUuZP8wHgIBDAIBAQQWFhQyMDE4LTExLTEzVDE2OjQ2OjMxWjAeAgESAgEBBBYWFDIwMTMtMDgtMDFUMDc6MDA6MDBaMD0CAQcCAQEENedAPSDSwFz7IoNyAPZTI59czwFA1wkme6h1P',
    description: 'Transaction receipt string',
  })
  @IsBase64()
  @IsNotEmpty()
  transactionReceipt: string;
}
