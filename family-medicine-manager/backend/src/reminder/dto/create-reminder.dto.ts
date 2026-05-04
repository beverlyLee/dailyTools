import { IsString, IsNotEmpty, IsOptional, IsDateString, IsEnum, IsNumber, IsArray, Min, IsInt } from 'class-validator';
import { ReminderType, RepeatFrequency } from '../entities/reminder.entity';

export class CreateReminderDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ReminderType)
  type?: ReminderType;

  @IsOptional()
  @IsEnum(RepeatFrequency)
  repeatFrequency?: RepeatFrequency;

  @IsOptional()
  @IsArray()
  repeatDays?: number[];

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsString()
  @IsNotEmpty()
  reminderTime: string;

  @IsOptional()
  @IsArray()
  additionalTimes?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  advanceNoticeMinutes?: number;

  @IsOptional()
  @IsString()
  medicineId?: string;

  @IsOptional()
  @IsArray()
  notificationChannels?: string[];
}
