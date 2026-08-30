import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class TransferEnrollmentRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  targetClassId!: string;
}
