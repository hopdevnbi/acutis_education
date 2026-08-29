import { BadRequestException } from '@nestjs/common';
import { IsString } from 'class-validator';
import { createValidationPipe } from './create-validation-pipe';

class SampleRequestDto {
  @IsString()
  name!: string;
}

describe('createValidationPipe', () => {
  const validationPipe = createValidationPipe();

  it('strips non-whitelisted properties from request payloads', async () => {
    await expect(
      validationPipe.transform(
        {
          name: 'catechism',
          unexpectedField: true,
        },
        {
          type: 'body',
          metatype: SampleRequestDto,
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('transforms valid DTO payloads', async () => {
    const transformedValue = (await validationPipe.transform(
      {
        name: 'catechism',
      },
      {
        type: 'body',
        metatype: SampleRequestDto,
      },
    )) as SampleRequestDto;

    expect(transformedValue).toEqual({ name: 'catechism' });
  });
});
