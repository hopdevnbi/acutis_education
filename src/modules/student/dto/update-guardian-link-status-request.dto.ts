import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { GuardianLinkStatus } from '../enums/guardian-link-status.enum';

export class UpdateGuardianLinkStatusRequestDto {
  @ApiProperty({ enum: [GuardianLinkStatus.Ended] })
  @IsIn([GuardianLinkStatus.Ended])
  status!: GuardianLinkStatus.Ended;
}
