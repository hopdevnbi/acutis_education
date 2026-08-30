import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginRequestDto {
  @ApiProperty({ example: 'teacher@parish.example' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(320)
  email!: string;

  @ApiProperty({ format: 'password', example: 'SecurePassword123!' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password!: string;
}
