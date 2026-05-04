import { PartialType } from '@nestjs/mapped-types';
import { CreateMedicineDto } from './create-medicine.dto';
import { IsOptional, IsNumber, Min } from 'class-validator';

export class UpdateMedicineDto extends PartialType(CreateMedicineDto) {
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  remainingQuantity?: number;
}
