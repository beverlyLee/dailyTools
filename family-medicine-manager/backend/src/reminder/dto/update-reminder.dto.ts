import { PartialType } from '@nestjs/mapped-types';
import { CreateReminderDto } from './create-reminder.dto';
import { IsOptional, IsEnum } from 'class-validator';
import { ReminderStatus } from '../entities/reminder.entity';

export class UpdateReminderDto extends PartialType(CreateReminderDto) {
  @IsOptional()
  @IsEnum(ReminderStatus)
  status?: ReminderStatus;
}
