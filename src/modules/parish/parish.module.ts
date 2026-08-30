import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParishEntity } from './entities/parish.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ParishEntity])],
})
export class ParishModule {}
