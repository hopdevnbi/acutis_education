import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { parseLocale } from '../../../common/locale';
import { isUuidV4, normalizeUuid } from '../../../database/uuid-v4.util';
import { TranslationResourceEntity } from '../entities/translation-resource.entity';
import { TranslationResourceType } from '../enums/translation-resource-type.enum';
import {
  InvalidTranslationResourceIdError,
  InvalidTranslationResourceTypeError,
  TranslationResourceBindingConflictError,
  TranslationResourceNotFoundError,
} from '../errors/localization.errors';
import type {
  GetOrCreateTranslationResourceInput,
  TranslationResourceRef,
  TranslationResourceSnapshot,
} from '../interfaces/localization.interface';
import { toTranslationResourceSnapshot } from '../mappers/localization.mapper';
import { normalizeOptionalUuid } from '../utils/localization-validation.util';

@Injectable()
export class TranslationResourceService {
  constructor(
    @InjectRepository(TranslationResourceEntity)
    private readonly translationResourceRepository: Repository<TranslationResourceEntity>,
  ) {}

  async getOrCreateResource(
    input: GetOrCreateTranslationResourceInput,
  ): Promise<TranslationResourceSnapshot> {
    this.assertResourceType(input.resourceType);
    const resourceId = this.parseResourceId(input.resourceId);
    const parishId = normalizeOptionalUuid(input.parishId);
    const sourceLocale = parseLocale(input.sourceLocale);

    const existing = await this.translationResourceRepository.findOne({
      where: {
        resourceType: input.resourceType,
        resourceId,
      },
    });

    if (existing !== null) {
      this.assertBindingCompatible(existing, parishId, sourceLocale);

      return toTranslationResourceSnapshot(existing);
    }

    const created = this.translationResourceRepository.create({
      resourceType: input.resourceType,
      resourceId,
      parishId,
      sourceLocale,
    });

    const saved = await this.translationResourceRepository.save(created);

    return toTranslationResourceSnapshot(saved);
  }

  async getResourceByRef(ref: TranslationResourceRef): Promise<TranslationResourceSnapshot> {
    const resource = await this.findResourceEntityByRef(ref);

    if (resource === null) {
      throw new TranslationResourceNotFoundError();
    }

    return toTranslationResourceSnapshot(resource);
  }

  async findResourceByRef(
    ref: TranslationResourceRef,
  ): Promise<TranslationResourceSnapshot | null> {
    const resource = await this.findResourceEntityByRef(ref);

    if (resource === null) {
      return null;
    }

    return toTranslationResourceSnapshot(resource);
  }

  async findResourcesByRefs(
    refs: readonly TranslationResourceRef[],
  ): Promise<Map<string, TranslationResourceSnapshot>> {
    const normalizedRefs = refs.map((ref) => ({
      resourceType: ref.resourceType,
      resourceId: this.parseResourceId(ref.resourceId),
    }));
    const uniqueRefs = new Map<string, TranslationResourceRef>();

    for (const ref of normalizedRefs) {
      uniqueRefs.set(`${ref.resourceType}:${ref.resourceId}`, ref);
    }

    if (uniqueRefs.size === 0) {
      return new Map();
    }

    const resources = await this.translationResourceRepository
      .createQueryBuilder('resource')
      .where(
        normalizedRefs
          .map(
            (_ref, index) =>
              `(resource.resourceType = :resourceType${index} AND resource.resourceId = :resourceId${index})`,
          )
          .join(' OR '),
        Object.fromEntries(
          normalizedRefs.flatMap((ref, index) => [
            [`resourceType${index}`, ref.resourceType],
            [`resourceId${index}`, ref.resourceId],
          ]),
        ),
      )
      .getMany();

    const result = new Map<string, TranslationResourceSnapshot>();

    for (const resource of resources) {
      result.set(
        `${resource.resourceType}:${normalizeUuid(resource.resourceId)}`,
        toTranslationResourceSnapshot(resource),
      );
    }

    return result;
  }

  async getResourceById(translationResourceId: string): Promise<TranslationResourceSnapshot> {
    if (!isUuidV4(translationResourceId)) {
      throw new TranslationResourceNotFoundError();
    }

    const resource = await this.translationResourceRepository.findOne({
      where: { id: normalizeUuid(translationResourceId) },
    });

    if (resource === null) {
      throw new TranslationResourceNotFoundError();
    }

    return toTranslationResourceSnapshot(resource);
  }

  private assertResourceType(resourceType: TranslationResourceType): void {
    if (!Object.values(TranslationResourceType).includes(resourceType)) {
      throw new InvalidTranslationResourceTypeError();
    }
  }

  private parseResourceId(rawResourceId: string): string {
    if (!isUuidV4(rawResourceId)) {
      throw new InvalidTranslationResourceIdError();
    }

    return normalizeUuid(rawResourceId);
  }

  private async findResourceEntityByRef(
    ref: TranslationResourceRef,
  ): Promise<TranslationResourceEntity | null> {
    this.assertResourceType(ref.resourceType);
    const resourceId = this.parseResourceId(ref.resourceId);

    return this.translationResourceRepository.findOne({
      where: {
        resourceType: ref.resourceType,
        resourceId,
      },
    });
  }

  private assertBindingCompatible(
    existing: TranslationResourceEntity,
    parishId: string | null,
    sourceLocale: string,
  ): void {
    const existingParishId = existing.parishId === null ? null : normalizeUuid(existing.parishId);

    if (existingParishId !== parishId || existing.sourceLocale !== sourceLocale) {
      throw new TranslationResourceBindingConflictError();
    }
  }
}
