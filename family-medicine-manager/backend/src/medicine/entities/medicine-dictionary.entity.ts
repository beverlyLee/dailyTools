import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class MedicineDictionary {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  barcode: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  genericName: string;

  @Column({ nullable: true })
  brand: string;

  @Column({ nullable: true })
  dosageForm: string;

  @Column({ nullable: true })
  strength: string;

  @Column({ nullable: true })
  manufacturer: string;

  @Column({ nullable: true })
  approvalNumber: string;

  @Column({ type: 'text', nullable: true })
  usageInstructions: string;

  @Column({ type: 'text', nullable: true })
  indications: string;

  @Column({ type: 'text', nullable: true })
  contraindications: string;

  @Column({ type: 'text', nullable: true })
  sideEffects: string;

  @Column({ type: 'text', nullable: true })
  precautions: string;

  @Column({ type: 'simple-array', nullable: true })
  categories: string[];

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ default: true })
  isVerified: boolean;

  @Column({ type: 'text', nullable: true })
  source: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
