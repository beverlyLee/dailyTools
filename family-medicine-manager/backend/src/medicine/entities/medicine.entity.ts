import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Reminder } from '../../reminder/entities/reminder.entity';
import { MedicineLog } from './medicine-log.entity';

export enum MedicineStatus {
  IN_STOCK = 'in_stock',
  LOW_STOCK = 'low_stock',
  EXPIRED = 'expired',
  USED_UP = 'used_up',
}

export enum StorageCondition {
  ROOM_TEMP = 'room_temp',
  REFRIGERATED = 'refrigerated',
  FROZEN = 'frozen',
  DARK = 'dark',
}

@Entity()
export class Medicine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  genericName: string;

  @Column({ nullable: true })
  brand: string;

  @Column({ nullable: true })
  barcode: string;

  @Column({ nullable: true })
  dosageForm: string;

  @Column({ nullable: true })
  strength: string;

  @Column({ type: 'float', default: 1 })
  quantity: number;

  @Column({ default: '盒' })
  unit: string;

  @Column({ type: 'float', nullable: true })
  totalQuantity: number;

  @Column({ type: 'float', nullable: true })
  remainingQuantity: number;

  @Column({ type: 'date', nullable: true })
  productionDate: Date;

  @Column({ type: 'date', nullable: true })
  expiryDate: Date;

  @Column({ nullable: true })
  batchNumber: string;

  @Column({
    type: 'simple-enum',
    enum: StorageCondition,
    default: StorageCondition.ROOM_TEMP,
  })
  storageCondition: StorageCondition;

  @Column({
    type: 'simple-enum',
    enum: MedicineStatus,
    default: MedicineStatus.IN_STOCK,
  })
  status: MedicineStatus;

  @Column({ type: 'text', nullable: true })
  usageInstructions: string;

  @Column({ type: 'text', nullable: true })
  indications: string;

  @Column({ type: 'text', nullable: true })
  contraindications: string;

  @Column({ type: 'text', nullable: true })
  sideEffects: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ nullable: true })
  purchaseLocation: string;

  @Column({ type: 'date', nullable: true })
  purchaseDate: Date;

  @Column({ type: 'float', nullable: true })
  purchasePrice: number;

  @Column({ default: false })
  isPrescription: boolean;

  @Column({ nullable: true })
  prescribingDoctor: string;

  @Column({ type: 'text', nullable: true })
  prescriptionNumber: string;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ type: 'simple-array', nullable: true })
  images: string[];

  @Column({ default: false })
  isFavorite: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.medicines, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: string;

  @OneToMany(() => Reminder, (reminder) => reminder.medicine)
  reminders: Reminder[];

  @OneToMany(() => MedicineLog, (log) => log.medicine)
  logs: MedicineLog[];
}
