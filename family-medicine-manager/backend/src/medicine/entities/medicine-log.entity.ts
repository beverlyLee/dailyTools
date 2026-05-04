import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { Medicine } from './medicine.entity';
import { User } from '../../user/entities/user.entity';

export enum LogAction {
  CREATED = 'created',
  UPDATED = 'updated',
  DELETED = 'deleted',
  DOSED = 'dosed',
  RETURNED = 'returned',
  EXPIRED = 'expired',
  LOW_STOCK = 'low_stock',
}

@Entity()
export class MedicineLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'simple-enum',
    enum: LogAction,
  })
  action: LogAction;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'float', nullable: true })
  quantityChanged: number;

  @Column({ type: 'json', nullable: true })
  previousState: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  newState: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Medicine, (medicine) => medicine.logs, { onDelete: 'CASCADE' })
  medicine: Medicine;

  @Column()
  medicineId: string;

  @ManyToOne(() => User)
  user: User;

  @Column()
  userId: string;
}
