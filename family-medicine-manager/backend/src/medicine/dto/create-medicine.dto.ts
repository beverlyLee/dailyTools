import { IsString, IsNotEmpty, IsNumber, IsOptional, IsDateString, IsEnum, IsBoolean, IsArray, Min } from 'class-validator';
import { StorageCondition } from '../entities/medicine.entity';

export class CreateMedicineDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  genericName?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsString()
  dosageForm?: string;

  @IsOptional()
  @IsString()
  strength?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalQuantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  remainingQuantity?: number;

  @IsOptional()
  @IsDateString()
  productionDate?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsString()
  batchNumber?: string;

  @IsOptional()
  @IsEnum(StorageCondition)
  storageCondition?: StorageCondition;

  @IsOptional()
  @IsString()
  usageInstructions?: string;

  @IsOptional()
  @IsString()
  indications?: string;

  @IsOptional()
  @IsString()
  contraindications?: string;

  @IsOptional()
  @IsString()
  sideEffects?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  purchaseLocation?: string;

  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @IsOptional()
  @IsNumber()
  purchasePrice?: number;

  @IsOptional()
  @IsBoolean()
  isPrescription?: boolean;

  @IsOptional()
  @IsString()
  prescribingDoctor?: string;

  @IsOptional()
  @IsString()
  prescriptionNumber?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsArray()
  images?: string[];

  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;
}
