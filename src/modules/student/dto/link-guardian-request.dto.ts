import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsUUID } from 'class-validator';
import { GuardianRelationshipType } from '../enums/guardian-relationship-type.enum';

export class LinkGuardianRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  guardianUserId!: string;

  @ApiProperty({ enum: GuardianRelationshipType })
  @IsEnum(GuardianRelationshipType)
  relationshipType!: GuardianRelationshipType;

  @ApiProperty({ example: true })
  @IsBoolean()
  @IsNotEmpty()
  isPrimary!: boolean;
}
