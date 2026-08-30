import { ApiProperty } from '@nestjs/swagger';
import { GuardianLinkResponseDto } from './guardian-link-response.dto';

export class GuardianLinkListResponseDto {
  @ApiProperty({ type: [GuardianLinkResponseDto] })
  items!: GuardianLinkResponseDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}
