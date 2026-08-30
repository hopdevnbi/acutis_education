import { Injectable, Logger } from '@nestjs/common';
import { AcademicYearStatus } from '../../modules/academic-structure/enums/academic-year-status.enum';
import {
  AcademicYearAlreadyExistsError,
  ActiveAcademicYearAlreadyExistsError,
} from '../../modules/academic-structure/errors/academic-year.errors';
import { AcademicYearService } from '../../modules/academic-structure/services/academic-year.service';
import { CatechismLevelCodeAlreadyExistsError } from '../../modules/academic-structure/errors/catechism-level.errors';
import { CatechismLevelService } from '../../modules/academic-structure/services/catechism-level.service';
import { ParishCodeAlreadyExistsError } from '../../modules/parish/errors/parish.errors';
import { ParishService } from '../../modules/parish/services/parish.service';
import {
  PARISH_ACADEMIC_SAMPLE_ACADEMIC_YEAR_END_DATE,
  PARISH_ACADEMIC_SAMPLE_ACADEMIC_YEAR_NAME,
  PARISH_ACADEMIC_SAMPLE_ACADEMIC_YEAR_START_DATE,
  PARISH_ACADEMIC_SAMPLE_PARISH_CODE,
  PARISH_ACADEMIC_SAMPLE_PARISH_NAME,
  PARISH_ACADEMIC_SEED_LEVELS,
} from './parish-academic.seed.constants';

export interface ParishAcademicSeedSummary {
  parishCreated: boolean;
  parishExisting: boolean;
  academicYearCreated: boolean;
  academicYearExisting: boolean;
  academicYearActivated: boolean;
  catechismLevelsCreated: number;
  catechismLevelsExisting: number;
}

@Injectable()
export class ParishAcademicSeedService {
  private readonly logger = new Logger(ParishAcademicSeedService.name);

  constructor(
    private readonly parishService: ParishService,
    private readonly academicYearService: AcademicYearService,
    private readonly catechismLevelService: CatechismLevelService,
  ) {}

  async run(): Promise<ParishAcademicSeedSummary> {
    const summary: ParishAcademicSeedSummary = {
      parishCreated: false,
      parishExisting: false,
      academicYearCreated: false,
      academicYearExisting: false,
      academicYearActivated: false,
      catechismLevelsCreated: 0,
      catechismLevelsExisting: 0,
    };

    const parishSnapshot = await this.ensureSampleParish(summary);
    const academicYearSnapshot = await this.ensureSampleAcademicYear(parishSnapshot.id, summary);

    if (academicYearSnapshot.status === AcademicYearStatus.Planned) {
      try {
        await this.academicYearService.updateAcademicYearStatus(
          academicYearSnapshot.id,
          AcademicYearStatus.Active,
        );
        summary.academicYearActivated = true;
        this.logger.log(
          `Activated demo academic year ${PARISH_ACADEMIC_SAMPLE_ACADEMIC_YEAR_NAME}.`,
        );
      } catch (error: unknown) {
        if (error instanceof ActiveAcademicYearAlreadyExistsError) {
          this.logger.log(
            `Demo academic year ${PARISH_ACADEMIC_SAMPLE_ACADEMIC_YEAR_NAME} remains planned because another active year exists.`,
          );
        } else {
          throw error;
        }
      }
    } else {
      this.logger.log(
        `Demo academic year ${PARISH_ACADEMIC_SAMPLE_ACADEMIC_YEAR_NAME} already in status ${academicYearSnapshot.status}; state unchanged.`,
      );
    }

    for (const levelDefinition of PARISH_ACADEMIC_SEED_LEVELS) {
      try {
        await this.catechismLevelService.createCatechismLevel(parishSnapshot.id, {
          code: levelDefinition.code,
          name: levelDefinition.name,
          sortOrder: levelDefinition.sortOrder,
        });
        summary.catechismLevelsCreated += 1;
        this.logger.log(`Created demo catechism level ${levelDefinition.code}.`);
      } catch (error: unknown) {
        if (error instanceof CatechismLevelCodeAlreadyExistsError) {
          summary.catechismLevelsExisting += 1;
          this.logger.log(`Demo catechism level ${levelDefinition.code} already exists.`);
          continue;
        }

        throw error;
      }
    }

    return summary;
  }

  private async ensureSampleParish(
    summary: ParishAcademicSeedSummary,
  ): Promise<Awaited<ReturnType<ParishService['getParishById']>>> {
    try {
      const createdParish = await this.parishService.createParish({
        code: PARISH_ACADEMIC_SAMPLE_PARISH_CODE,
        name: PARISH_ACADEMIC_SAMPLE_PARISH_NAME,
      });
      summary.parishCreated = true;
      this.logger.log(`Created demo parish ${PARISH_ACADEMIC_SAMPLE_PARISH_CODE}.`);

      return createdParish;
    } catch (error: unknown) {
      if (!(error instanceof ParishCodeAlreadyExistsError)) {
        throw error;
      }

      summary.parishExisting = true;
      this.logger.log(`Demo parish ${PARISH_ACADEMIC_SAMPLE_PARISH_CODE} already exists.`);

      const existingParish = await this.findParishByCode(PARISH_ACADEMIC_SAMPLE_PARISH_CODE);

      if (existingParish === null) {
        throw error;
      }

      return existingParish;
    }
  }

  private async ensureSampleAcademicYear(
    parishId: string,
    summary: ParishAcademicSeedSummary,
  ): Promise<Awaited<ReturnType<AcademicYearService['getAcademicYearById']>>> {
    try {
      const createdAcademicYear = await this.academicYearService.createAcademicYear(parishId, {
        name: PARISH_ACADEMIC_SAMPLE_ACADEMIC_YEAR_NAME,
        startDate: PARISH_ACADEMIC_SAMPLE_ACADEMIC_YEAR_START_DATE,
        endDate: PARISH_ACADEMIC_SAMPLE_ACADEMIC_YEAR_END_DATE,
      });
      summary.academicYearCreated = true;
      this.logger.log(`Created demo academic year ${PARISH_ACADEMIC_SAMPLE_ACADEMIC_YEAR_NAME}.`);

      return createdAcademicYear;
    } catch (error: unknown) {
      if (!(error instanceof AcademicYearAlreadyExistsError)) {
        throw error;
      }

      summary.academicYearExisting = true;
      this.logger.log(
        `Demo academic year ${PARISH_ACADEMIC_SAMPLE_ACADEMIC_YEAR_NAME} already exists.`,
      );

      const existingAcademicYear = await this.findAcademicYearByName(
        parishId,
        PARISH_ACADEMIC_SAMPLE_ACADEMIC_YEAR_NAME,
      );

      if (existingAcademicYear === null) {
        throw error;
      }

      return existingAcademicYear;
    }
  }

  private async findParishByCode(
    code: string,
  ): Promise<Awaited<ReturnType<ParishService['getParishById']>> | null> {
    const listResult = await this.parishService.listParishes({
      page: 1,
      limit: 20,
      sortBy: 'code',
      sort: 'ASC',
      search: code,
    });

    const exactMatch = listResult.items.find((snapshot) => snapshot.code === code);

    if (exactMatch === undefined) {
      return null;
    }

    return this.parishService.getParishById(exactMatch.id);
  }

  private async findAcademicYearByName(
    parishId: string,
    name: string,
  ): Promise<Awaited<ReturnType<AcademicYearService['getAcademicYearById']>> | null> {
    const listResult = await this.academicYearService.listAcademicYearsByParish(parishId, {
      page: 1,
      limit: 20,
      sortBy: 'name',
      sort: 'ASC',
      search: name,
    });

    const exactMatch = listResult.items.find((snapshot) => snapshot.name === name);

    if (exactMatch === undefined) {
      return null;
    }

    return this.academicYearService.getAcademicYearById(exactMatch.id);
  }
}
