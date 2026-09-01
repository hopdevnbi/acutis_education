import { ApiProperty } from '@nestjs/swagger';

export class AuthenticatedProfileResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'teacher@parish.example' })
  email!: string;

  @ApiProperty({ example: 'vi-VN', nullable: true })
  preferredLocale!: string | null;
}
