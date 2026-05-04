import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MedicineService } from './medicine.service';
import { MedicineController } from './medicine.controller';
import { Medicine } from './entities/medicine.entity';
import { MedicineLog } from './entities/medicine-log.entity';
import { MedicineDictionary } from './entities/medicine-dictionary.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Medicine, MedicineLog, MedicineDictionary])],
  controllers: [MedicineController],
  providers: [MedicineService],
  exports: [MedicineService, TypeOrmModule],
})
export class MedicineModule {}
