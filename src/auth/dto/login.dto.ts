import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'manager@acmelogistics.com' })
  email!: string;

  @ApiProperty({ example: 'manager-password', format: 'password' })
  password!: string;
}
