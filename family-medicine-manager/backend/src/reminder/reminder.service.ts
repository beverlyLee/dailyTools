import { Injectable, NotFoundException, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as schedule from 'node-schedule';
import { Reminder, ReminderStatus, ReminderType, RepeatFrequency } from './entities/reminder.entity';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { UpdateReminderDto } from './dto/update-reminder.dto';
import { Medicine } from '../medicine/entities/medicine.entity';

@Injectable()
export class ReminderService implements OnModuleInit {
  private readonly logger = new Logger(ReminderService.name);
  private scheduledJobs = new Map<string, schedule.Job>();

  constructor(
    @InjectRepository(Reminder)
    private readonly reminderRepository: Repository<Reminder>,
    @InjectRepository(Medicine)
    private readonly medicineRepository: Repository<Medicine>,
  ) {}

  async onModuleInit() {
    this.logger.log('ReminderService initialized, loading active reminders...');
    await this.loadActiveReminders();
  }

  private async loadActiveReminders() {
    const activeReminders = await this.reminderRepository.find({
      where: { status: ReminderStatus.ACTIVE },
    });

    for (const reminder of activeReminders) {
      this.scheduleReminder(reminder);
    }
  }

  private scheduleReminder(reminder: Reminder) {
    const jobId = `reminder-${reminder.id}`;
    
    if (this.scheduledJobs.has(jobId)) {
      this.scheduledJobs.get(jobId).cancel();
    }

    const rule = this.buildScheduleRule(reminder);
    
    const job = schedule.scheduleJob(jobId, rule, () => {
      this.triggerReminder(reminder);
    });

    if (job) {
      this.scheduledJobs.set(jobId, job);
      this.logger.log(`Scheduled reminder: ${reminder.title} (${reminder.id})`);
    }
  }

  private buildScheduleRule(reminder: Reminder): schedule.RecurrenceRule | Date {
    const rule = new schedule.RecurrenceRule();
    const [hours, minutes] = reminder.reminderTime.split(':').map(Number);
    
    rule.hour = hours;
    rule.minute = minutes;
    rule.second = 0;

    switch (reminder.repeatFrequency) {
      case RepeatFrequency.DAILY:
        return rule;
      
      case RepeatFrequency.WEEKLY:
        rule.dayOfWeek = reminder.repeatDays || [0, 1, 2, 3, 4, 5, 6];
        return rule;
      
      case RepeatFrequency.MONTHLY:
        rule.date = new Date(reminder.startDate).getDate();
        return rule;
      
      case RepeatFrequency.ONCE:
      default:
        const triggerDate = new Date(reminder.startDate);
        triggerDate.setHours(hours, minutes, 0, 0);
        return triggerDate;
    }
  }

  private async triggerReminder(reminder: Reminder) {
    this.logger.log(`Triggering reminder: ${reminder.title} (${reminder.id})`);

    reminder.lastTriggeredAt = new Date();
    reminder.triggerCount += 1;
    reminder.status = ReminderStatus.TRIGGERED;
    await this.reminderRepository.save(reminder);

    if (reminder.repeatFrequency === RepeatFrequency.ONCE) {
      const jobId = `reminder-${reminder.id}`;
      if (this.scheduledJobs.has(jobId)) {
        this.scheduledJobs.get(jobId).cancel();
        this.scheduledJobs.delete(jobId);
      }
    } else {
      reminder.status = ReminderStatus.ACTIVE;
      reminder.nextTriggerAt = this.calculateNextTrigger(reminder);
      await this.reminderRepository.save(reminder);
    }
  }

  private calculateNextTrigger(reminder: {
    reminderTime: string;
    repeatFrequency: RepeatFrequency;
    repeatDays?: number[];
  }): Date {
    const now = new Date();
    const [hours, minutes] = reminder.reminderTime.split(':').map(Number);
    
    const nextTrigger = new Date(now);
    nextTrigger.setHours(hours, minutes, 0, 0);

    if (nextTrigger <= now) {
      nextTrigger.setDate(nextTrigger.getDate() + 1);
    }

    if (reminder.repeatFrequency === RepeatFrequency.WEEKLY && reminder.repeatDays?.length > 0) {
      const currentDay = nextTrigger.getDay();
      const sortedDays = [...reminder.repeatDays].sort((a, b) => a - b);
      
      let nextDay = sortedDays.find(d => d >= currentDay);
      if (nextDay === undefined) {
        nextDay = sortedDays[0];
        nextTrigger.setDate(nextTrigger.getDate() + ((nextDay + 7 - currentDay) % 7));
      } else if (nextDay !== currentDay) {
        nextTrigger.setDate(nextTrigger.getDate() + (nextDay - currentDay));
      }
    }

    return nextTrigger;
  }

  async create(userId: string, createReminderDto: CreateReminderDto): Promise<Reminder> {
    const repeatFrequency = createReminderDto.repeatFrequency ?? RepeatFrequency.ONCE;
    
    const reminder = this.reminderRepository.create({
      ...createReminderDto,
      userId,
      status: ReminderStatus.ACTIVE,
      nextTriggerAt: this.calculateNextTrigger({
        reminderTime: createReminderDto.reminderTime,
        repeatFrequency,
        repeatDays: createReminderDto.repeatDays,
      }),
    });

    if (createReminderDto.medicineId) {
      const medicine = await this.medicineRepository.findOne({
        where: { id: createReminderDto.medicineId, userId },
      });
      if (medicine) {
        reminder.medicine = medicine;
      }
    }

    const saved = await this.reminderRepository.save(reminder);
    this.scheduleReminder(saved);
    
    return saved;
  }

  async findAll(userId: string, filters?: {
    status?: ReminderStatus;
    type?: ReminderType;
    medicineId?: string;
  }): Promise<Reminder[]> {
    const query = this.reminderRepository
      .createQueryBuilder('reminder')
      .where('reminder.userId = :userId', { userId })
      .leftJoinAndSelect('reminder.medicine', 'medicine');

    if (filters?.status) {
      query.andWhere('reminder.status = :status', { status: filters.status });
    }

    if (filters?.type) {
      query.andWhere('reminder.type = :type', { type: filters.type });
    }

    if (filters?.medicineId) {
      query.andWhere('reminder.medicineId = :medicineId', { medicineId: filters.medicineId });
    }

    query.orderBy('reminder.nextTriggerAt', 'ASC');

    return query.getMany();
  }

  async findOne(id: string, userId: string): Promise<Reminder> {
    const reminder = await this.reminderRepository.findOne({
      where: { id, userId },
      relations: ['medicine'],
    });
    if (!reminder) {
      throw new NotFoundException(`提醒ID ${id} 不存在`);
    }
    return reminder;
  }

  async update(id: string, userId: string, updateReminderDto: UpdateReminderDto): Promise<Reminder> {
    const reminder = await this.findOne(id, userId);
    
    Object.assign(reminder, updateReminderDto);
    
    if (updateReminderDto.status === ReminderStatus.DISABLED || updateReminderDto.status === ReminderStatus.DISMISSED) {
      const jobId = `reminder-${reminder.id}`;
      if (this.scheduledJobs.has(jobId)) {
        this.scheduledJobs.get(jobId).cancel();
        this.scheduledJobs.delete(jobId);
      }
    } else if (updateReminderDto.status === ReminderStatus.ACTIVE) {
      this.scheduleReminder(reminder);
    }

    return this.reminderRepository.save(reminder);
  }

  async remove(id: string, userId: string): Promise<void> {
    const reminder = await this.findOne(id, userId);
    
    const jobId = `reminder-${reminder.id}`;
    if (this.scheduledJobs.has(jobId)) {
      this.scheduledJobs.get(jobId).cancel();
      this.scheduledJobs.delete(jobId);
    }

    const result = await this.reminderRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`提醒ID ${id} 不存在`);
    }
  }

  async createMedicineExpiryReminder(userId: string, medicine: Medicine, daysBefore: number = 7): Promise<Reminder> {
    const expiryDate = new Date(medicine.expiryDate);
    expiryDate.setDate(expiryDate.getDate() - daysBefore);
    
    const now = new Date();
    if (expiryDate < now) {
      expiryDate.setDate(now.getDate() + 1);
    }

    return this.create(userId, {
      title: `${medicine.name} 即将过期提醒`,
      description: `药品 ${medicine.name} 将在 ${daysBefore} 天后过期`,
      type: ReminderType.EXPIRY,
      repeatFrequency: RepeatFrequency.ONCE,
      startDate: expiryDate.toISOString(),
      reminderTime: '09:00',
      medicineId: medicine.id,
      advanceNoticeMinutes: 0,
      notificationChannels: ['push'],
    });
  }

  async createLowStockReminder(userId: string, medicine: Medicine): Promise<Reminder> {
    const now = new Date();
    now.setDate(now.getDate() + 1);

    return this.create(userId, {
      title: `${medicine.name} 库存不足提醒`,
      description: `药品 ${medicine.name} 库存不足，请及时补充`,
      type: ReminderType.LOW_STOCK,
      repeatFrequency: RepeatFrequency.WEEKLY,
      repeatDays: [1, 3, 5],
      startDate: now.toISOString(),
      reminderTime: '10:00',
      medicineId: medicine.id,
      advanceNoticeMinutes: 0,
      notificationChannels: ['push'],
    });
  }

  async dismiss(id: string, userId: string): Promise<Reminder> {
    return this.update(id, userId, { status: ReminderStatus.DISMISSED });
  }

  async toggle(id: string, userId: string): Promise<Reminder> {
    const reminder = await this.findOne(id, userId);
    const newStatus = reminder.status === ReminderStatus.ACTIVE 
      ? ReminderStatus.DISABLED 
      : ReminderStatus.ACTIVE;
    
    return this.update(id, userId, { status: newStatus });
  }

  getUpcoming(userId: string, limit: number = 10): Promise<Reminder[]> {
    return this.reminderRepository.find({
      where: { userId, status: ReminderStatus.ACTIVE },
      order: { nextTriggerAt: 'ASC' },
      take: limit,
      relations: ['medicine'],
    });
  }
}
