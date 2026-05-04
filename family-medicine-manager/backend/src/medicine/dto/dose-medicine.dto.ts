import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class DoseMedicineDto {
  @IsNumber()
  @Min(0)
  quantity: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
