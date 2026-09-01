import { TranslationResourceEntity } from '../modules/localization/entities/translation-resource.entity';
import { TranslationRevisionEntity } from '../modules/localization/entities/translation-revision.entity';

describe('Localization UUID generation', () => {
  it('assigns RFC UUID v4 ids to new localization entities', () => {
    const firstResource = new TranslationResourceEntity();
    const secondResource = new TranslationResourceEntity();
    const firstRevision = new TranslationRevisionEntity();
    const secondRevision = new TranslationRevisionEntity();

    expect(firstResource.id).not.toBe(secondResource.id);
    expect(firstRevision.id).not.toBe(secondRevision.id);
  });
});
