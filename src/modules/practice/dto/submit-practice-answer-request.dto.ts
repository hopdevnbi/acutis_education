import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator';
import { MAX_OPTIONS } from '../../question-bank/constants/question-option.constants';

export class SubmitPracticeAnswerRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  clientAnswerId!: string;

  @ApiProperty({ type: [String], format: 'uuid', minItems: 1, maxItems: MAX_OPTIONS })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_OPTIONS)
  @IsUUID('4', { each: true })
  selectedOptionIds!: string[];
}
