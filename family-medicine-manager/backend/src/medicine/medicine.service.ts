import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Medicine, MedicineStatus } from './entities/medicine.entity';
import { MedicineLog, LogAction } from './entities/medicine-log.entity';
import { MedicineDictionary } from './entities/medicine-dictionary.entity';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { UpdateMedicineDto } from './dto/update-medicine.dto';
import { DoseMedicineDto } from './dto/dose-medicine.dto';

@Injectable()
export class MedicineService {
  constructor(
    @InjectRepository(Medicine)
    private readonly medicineRepository: Repository<Medicine>,
    @InjectRepository(MedicineLog)
    private readonly medicineLogRepository: Repository<MedicineLog>,
    @InjectRepository(MedicineDictionary)
    private readonly medicineDictionaryRepository: Repository<MedicineDictionary>,
  ) {}

  private calculateStatus(medicine: Medicine): MedicineStatus {
    const today = new Date();
    if (medicine.expiryDate && new Date(medicine.expiryDate) < today) {
      return MedicineStatus.EXPIRED;
    }
    if (medicine.remainingQuantity !== undefined && medicine.remainingQuantity <= 0) {
      return MedicineStatus.USED_UP;
    }
    if (medicine.quantity <= 0.2 || (medicine.remainingQuantity !== undefined && medicine.remainingQuantity <= 0.2)) {
      return MedicineStatus.LOW_STOCK;
    }
    return MedicineStatus.IN_STOCK;
  }

  private async logAction(
    medicine: Medicine,
    userId: string,
    action: LogAction,
    description: string,
    quantityChanged?: number,
    previousState?: Record<string, any>,
  ): Promise<MedicineLog> {
    const log = this.medicineLogRepository.create({
      action,
      description,
      quantityChanged,
      previousState,
      newState: { ...medicine },
      medicineId: medicine.id,
      userId,
    });
    return this.medicineLogRepository.save(log);
  }

  async create(userId: string, createMedicineDto: CreateMedicineDto): Promise<Medicine> {
    const medicine = this.medicineRepository.create({
      ...createMedicineDto,
      userId,
      remainingQuantity: createMedicineDto.remainingQuantity ?? createMedicineDto.totalQuantity ?? createMedicineDto.quantity,
    });

    medicine.status = this.calculateStatus(medicine);
    const saved = await this.medicineRepository.save(medicine);
    
    await this.logAction(saved, userId, LogAction.CREATED, `创建药品: ${medicine.name}`);
    
    return saved;
  }

  async findAll(userId: string, filters?: {
    status?: MedicineStatus;
    isFavorite?: boolean;
    tag?: string;
    search?: string;
  }): Promise<Medicine[]> {
    const query = this.medicineRepository
      .createQueryBuilder('medicine')
      .where('medicine.userId = :userId', { userId });

    if (filters?.status) {
      query.andWhere('medicine.status = :status', { status: filters.status });
    }

    if (filters?.isFavorite !== undefined) {
      query.andWhere('medicine.isFavorite = :isFavorite', { isFavorite: filters.isFavorite });
    }

    if (filters?.tag) {
      query.andWhere(':tag MEMBER OF medicine.tags', { tag: filters.tag });
    }

    if (filters?.search) {
      query.andWhere(
        '(medicine.name LIKE :search OR medicine.brand LIKE :search OR medicine.genericName LIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    query.orderBy('medicine.createdAt', 'DESC');
    
    return query.getMany();
  }

  async findOne(id: string, userId: string): Promise<Medicine> {
    const medicine = await this.medicineRepository.findOne({
      where: { id, userId },
      relations: ['reminders', 'logs'],
    });
    if (!medicine) {
      throw new NotFoundException(`药品ID ${id} 不存在`);
    }
    return medicine;
  }

  async findByBarcode(barcode: string, userId: string): Promise<Medicine[]> {
    return this.medicineRepository.find({
      where: { barcode, userId },
    });
  }

  async update(id: string, userId: string, updateMedicineDto: UpdateMedicineDto): Promise<Medicine> {
    const medicine = await this.findOne(id, userId);
    const previousState = { ...medicine };

    Object.assign(medicine, updateMedicineDto);
    medicine.status = this.calculateStatus(medicine);

    const saved = await this.medicineRepository.save(medicine);
    
    await this.logAction(
      saved,
      userId,
      LogAction.UPDATED,
      `更新药品: ${medicine.name}`,
      undefined,
      previousState,
    );

    return saved;
  }

  async remove(id: string, userId: string): Promise<void> {
    const medicine = await this.findOne(id, userId);
    
    await this.logAction(medicine, userId, LogAction.DELETED, `删除药品: ${medicine.name}`);
    
    const result = await this.medicineRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`药品ID ${id} 不存在`);
    }
  }

  async dose(id: string, userId: string, doseDto: DoseMedicineDto): Promise<Medicine> {
    const medicine = await this.findOne(id, userId);
    const previousState = { ...medicine };

    if (medicine.remainingQuantity !== undefined) {
      if (medicine.remainingQuantity < doseDto.quantity) {
        throw new BadRequestException('剩余数量不足');
      }
      medicine.remainingQuantity -= doseDto.quantity;
    }

    if (medicine.totalQuantity !== undefined) {
      medicine.totalQuantity -= doseDto.quantity;
    }

    medicine.quantity = medicine.remainingQuantity ?? medicine.quantity;
    medicine.status = this.calculateStatus(medicine);

    const saved = await this.medicineRepository.save(medicine);
    
    await this.logAction(
      saved,
      userId,
      LogAction.DOSED,
      `用药: ${medicine.name}, 用量: ${doseDto.quantity}${medicine.unit}`,
      doseDto.quantity,
      previousState,
    );

    return saved;
  }

  async toggleFavorite(id: string, userId: string): Promise<Medicine> {
    const medicine = await this.findOne(id, userId);
    medicine.isFavorite = !medicine.isFavorite;
    return this.medicineRepository.save(medicine);
  }

  async getExpiring(userId: string, daysAhead: number = 7): Promise<Medicine[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysAhead);

    return this.medicineRepository
      .createQueryBuilder('medicine')
      .where('medicine.userId = :userId', { userId })
      .andWhere('medicine.expiryDate IS NOT NULL')
      .andWhere('medicine.expiryDate >= :today', { today })
      .andWhere('medicine.expiryDate <= :futureDate', { futureDate })
      .andWhere('medicine.status != :expired', { expired: MedicineStatus.EXPIRED })
      .orderBy('medicine.expiryDate', 'ASC')
      .getMany();
  }

  async getLowStock(userId: string, threshold: number = 0.3): Promise<Medicine[]> {
    return this.medicineRepository
      .createQueryBuilder('medicine')
      .where('medicine.userId = :userId', { userId })
      .andWhere('(medicine.remainingQuantity <= :threshold OR medicine.quantity <= :threshold)', { threshold })
      .andWhere('medicine.status != :usedUp', { usedUp: MedicineStatus.USED_UP })
      .getMany();
  }

  async getExpired(userId: string): Promise<Medicine[]> {
    return this.medicineRepository.find({
      where: { userId, status: MedicineStatus.EXPIRED },
    });
  }

  async getLogs(medicineId: string, userId: string, limit: number = 20): Promise<MedicineLog[]> {
    const medicine = await this.findOne(medicineId, userId);
    
    return this.medicineLogRepository.find({
      where: { medicineId: medicine.id, userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async findDictionaryByBarcode(barcode: string): Promise<MedicineDictionary | null> {
    return this.medicineDictionaryRepository.findOne({
      where: { barcode },
    });
  }

  async createDictionaryItem(data: Partial<MedicineDictionary>): Promise<MedicineDictionary> {
    const existing = await this.medicineDictionaryRepository.findOne({
      where: { barcode: data.barcode },
    });
    
    if (existing) {
      Object.assign(existing, data);
      return this.medicineDictionaryRepository.save(existing);
    }
    
    const item = this.medicineDictionaryRepository.create(data);
    return this.medicineDictionaryRepository.save(item);
  }
}
