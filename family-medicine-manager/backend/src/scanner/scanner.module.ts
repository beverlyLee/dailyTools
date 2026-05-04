import { Module, forwardRef } from '@nestjs/common';
import { ScannerService } from './scanner.service';
import { ScannerController } from './scanner.controller';
import { MedicineModule } from '../medicine/medicine.module';

@Module({
  imports: [forwardRef(() => MedicineModule)],
  controllers: [ScannerController],
  providers: [ScannerService],
  exports: [ScannerService],
})
export class ScannerModule {}
