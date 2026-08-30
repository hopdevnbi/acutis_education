import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateParishRequestDto {
  @ApiProperty({ example: 'giao-xu-thanh-gia', maxLength: 32 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  code!: string;

  @ApiProperty({ example: 'Giáo xứ Thánh Gia', maxLength: 128 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  name!: string;
}
