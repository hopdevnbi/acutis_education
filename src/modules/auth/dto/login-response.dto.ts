import { ApiProperty } from '@nestjs/swagger';

export class LoginResponseUserDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'teacher@parish.example' })
  email!: string;
}

export class LoginResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType!: string;

  @ApiProperty({ example: 900, description: 'Access token lifetime in seconds.' })
  expiresIn!: number;

  @ApiProperty({ type: LoginResponseUserDto })
  user!: LoginResponseUserDto;
}
