import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsString, MaxLength, MinLength, Validate } from 'class-validator';
import {
  MANUAL_ADJUSTMENT_REASON_MAX_LENGTH,
  POINT_ADJUSTMENT_MAX_ABS_DELTA,
} from '../constants/gamification.constants';
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'nonZeroBoundedDelta', async: false })
class NonZeroBoundedDeltaConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return (
      typeof value === 'number' &&
      Number.isInteger(value) &&
      value !== 0 &&
      Math.abs(value) <= POINT_ADJUSTMENT_MAX_ABS_DELTA
    );
  }

  defaultMessage(_args: ValidationArguments): string {
    return `delta must be a non-zero integer with abs(delta) <= ${POINT_ADJUSTMENT_MAX_ABS_DELTA}`;
  }
}

export class ManualPointAdjustmentDto {
  @ApiProperty({ example: 10, description: 'Signed integer delta; not zero; abs <= 1000' })
  @IsInt()
  @Validate(NonZeroBoundedDeltaConstraint)
  delta!: number;

  @ApiProperty({ minLength: 1, maxLength: MANUAL_ADJUSTMENT_REASON_MAX_LENGTH })
  @IsString()
  @MinLength(1)
  @MaxLength(MANUAL_ADJUSTMENT_REASON_MAX_LENGTH)
  reason!: string;
}
