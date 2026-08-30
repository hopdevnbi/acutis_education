import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateClassRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  academicYearId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  catechismLevelId!: string;

  @ApiProperty({ example: 'khai-tam-a', maxLength: 32 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  code!: string;

  @ApiProperty({ example: 'Lớp Khai Tâm A', maxLength: 128 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  name!: string;
}
