import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Medicine } from '../../medicine/entities/medicine.entity';

export enum ReminderType {
  DOSAGE = 'dosage',
  EXPIRY = 'expiry',
  LOW_STOCK = 'low_stock',
  CUSTOM = 'custom',
}

export enum ReminderStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  TRIGGERED = 'triggered',
  DISMISSED = 'dismissed',
  DISABLED = 'disabled',
}

export enum RepeatFrequency {
  ONCE = 'once',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  CUSTOM = 'custom',
}

@Entity()
export class Reminder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'simple-enum',
    enum: ReminderType,
    default: ReminderType.DOSAGE,
  })
  type: ReminderType;

  @Column({
    type: 'simple-enum',
    enum: ReminderStatus,
    default: ReminderStatus.ACTIVE,
  })
  status: ReminderStatus;

  @Column({
    type: 'simple-enum',
    enum: RepeatFrequency,
    default: RepeatFrequency.ONCE,
  })
  repeatFrequency: RepeatFrequency;

  @Column({ type: 'simple-array', nullable: true })
  repeatDays: number[];

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate: Date;

  @Column({ type: 'time' })
  reminderTime: string;

  @Column({ type: 'json', nullable: true })
  additionalTimes: string[];

  @Column({ type: 'int', default: 0 })
  advanceNoticeMinutes: number;

  @Column({ type: 'simple-array', nullable: true })
  notificationChannels: string[];

  @Column({ type: 'json', nullable: true })
  payload: Record<string, any>;

  @Column({ type: 'datetime', nullable: true })
  lastTriggeredAt: Date;

  @Column({ type: 'datetime', nullable: true })
  nextTriggerAt: Date;

  @Column({ type: 'int', default: 0 })
  triggerCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.reminders, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => Medicine, (medicine) => medicine.reminders, { onDelete: 'CASCADE', nullable: true })
  medicine: Medicine;

  @Column({ nullable: true })
  medicineId: string;
}
