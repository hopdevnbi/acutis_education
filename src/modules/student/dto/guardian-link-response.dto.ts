import { ApiProperty } from '@nestjs/swagger';
import { GuardianLinkStatus } from '../enums/guardian-link-status.enum';
import { GuardianRelationshipType } from '../enums/guardian-relationship-type.enum';

export class GuardianLinkResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  studentId!: string;

  @ApiProperty({ format: 'uuid' })
  guardianUserId!: string;

  @ApiProperty({ enum: GuardianRelationshipType })
  relationshipType!: GuardianRelationshipType;

  @ApiProperty()
  isPrimary!: boolean;

  @ApiProperty({ enum: GuardianLinkStatus })
  status!: GuardianLinkStatus;

  @ApiProperty({ type: String, format: 'date-time' })
  startsAt!: string;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  endsAt!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: string;
}
