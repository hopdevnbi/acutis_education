import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateReviewWrongSessionRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  clientRequestId!: string;
}
