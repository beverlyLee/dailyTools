import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReminderService } from './reminder.service';
import { ReminderController } from './reminder.controller';
import { Reminder } from './entities/reminder.entity';
import { Medicine } from '../medicine/entities/medicine.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Reminder, Medicine])],
  controllers: [ReminderController],
  providers: [ReminderService],
  exports: [ReminderService],
})
export class ReminderModule {}
