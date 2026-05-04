"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MedicineService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const medicine_entity_1 = require("./entities/medicine.entity");
const medicine_log_entity_1 = require("./entities/medicine-log.entity");
const medicine_dictionary_entity_1 = require("./entities/medicine-dictionary.entity");
let MedicineService = class MedicineService {
    constructor(medicineRepository, medicineLogRepository, medicineDictionaryRepository) {
        this.medicineRepository = medicineRepository;
        this.medicineLogRepository = medicineLogRepository;
        this.medicineDictionaryRepository = medicineDictionaryRepository;
    }
    calculateStatus(medicine) {
        const today = new Date();
        if (medicine.expiryDate && new Date(medicine.expiryDate) < today) {
            return medicine_entity_1.MedicineStatus.EXPIRED;
        }
        if (medicine.remainingQuantity !== undefined && medicine.remainingQuantity <= 0) {
            return medicine_entity_1.MedicineStatus.USED_UP;
        }
        if (medicine.quantity <= 0.2 || (medicine.remainingQuantity !== undefined && medicine.remainingQuantity <= 0.2)) {
            return medicine_entity_1.MedicineStatus.LOW_STOCK;
        }
        return medicine_entity_1.MedicineStatus.IN_STOCK;
    }
    async logAction(medicine, userId, action, description, quantityChanged, previousState) {
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
    async create(userId, createMedicineDto) {
        const medicine = this.medicineRepository.create({
            ...createMedicineDto,
            userId,
            remainingQuantity: createMedicineDto.remainingQuantity ?? createMedicineDto.totalQuantity ?? createMedicineDto.quantity,
        });
        medicine.status = this.calculateStatus(medicine);
        const saved = await this.medicineRepository.save(medicine);
        await this.logAction(saved, userId, medicine_log_entity_1.LogAction.CREATED, `创建药品: ${medicine.name}`);
        return saved;
    }
    async findAll(userId, filters) {
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
            query.andWhere('(medicine.name LIKE :search OR medicine.brand LIKE :search OR medicine.genericName LIKE :search)', { search: `%${filters.search}%` });
        }
        query.orderBy('medicine.createdAt', 'DESC');
        return query.getMany();
    }
    async findOne(id, userId) {
        const medicine = await this.medicineRepository.findOne({
            where: { id, userId },
            relations: ['reminders', 'logs'],
        });
        if (!medicine) {
            throw new common_1.NotFoundException(`药品ID ${id} 不存在`);
        }
        return medicine;
    }
    async findByBarcode(barcode, userId) {
        return this.medicineRepository.find({
            where: { barcode, userId },
        });
    }
    async update(id, userId, updateMedicineDto) {
        const medicine = await this.findOne(id, userId);
        const previousState = { ...medicine };
        Object.assign(medicine, updateMedicineDto);
        medicine.status = this.calculateStatus(medicine);
        const saved = await this.medicineRepository.save(medicine);
        await this.logAction(saved, userId, medicine_log_entity_1.LogAction.UPDATED, `更新药品: ${medicine.name}`, undefined, previousState);
        return saved;
    }
    async remove(id, userId) {
        const medicine = await this.findOne(id, userId);
        await this.logAction(medicine, userId, medicine_log_entity_1.LogAction.DELETED, `删除药品: ${medicine.name}`);
        const result = await this.medicineRepository.delete(id);
        if (result.affected === 0) {
            throw new common_1.NotFoundException(`药品ID ${id} 不存在`);
        }
    }
    async dose(id, userId, doseDto) {
        const medicine = await this.findOne(id, userId);
        const previousState = { ...medicine };
        if (medicine.remainingQuantity !== undefined) {
            if (medicine.remainingQuantity < doseDto.quantity) {
                throw new common_1.BadRequestException('剩余数量不足');
            }
            medicine.remainingQuantity -= doseDto.quantity;
        }
        if (medicine.totalQuantity !== undefined) {
            medicine.totalQuantity -= doseDto.quantity;
        }
        medicine.quantity = medicine.remainingQuantity ?? medicine.quantity;
        medicine.status = this.calculateStatus(medicine);
        const saved = await this.medicineRepository.save(medicine);
        await this.logAction(saved, userId, medicine_log_entity_1.LogAction.DOSED, `用药: ${medicine.name}, 用量: ${doseDto.quantity}${medicine.unit}`, doseDto.quantity, previousState);
        return saved;
    }
    async toggleFavorite(id, userId) {
        const medicine = await this.findOne(id, userId);
        medicine.isFavorite = !medicine.isFavorite;
        return this.medicineRepository.save(medicine);
    }
    async getExpiring(userId, daysAhead = 7) {
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + daysAhead);
        return this.medicineRepository
            .createQueryBuilder('medicine')
            .where('medicine.userId = :userId', { userId })
            .andWhere('medicine.expiryDate IS NOT NULL')
            .andWhere('medicine.expiryDate >= :today', { today })
            .andWhere('medicine.expiryDate <= :futureDate', { futureDate })
            .andWhere('medicine.status != :expired', { expired: medicine_entity_1.MedicineStatus.EXPIRED })
            .orderBy('medicine.expiryDate', 'ASC')
            .getMany();
    }
    async getLowStock(userId, threshold = 0.3) {
        return this.medicineRepository
            .createQueryBuilder('medicine')
            .where('medicine.userId = :userId', { userId })
            .andWhere('(medicine.remainingQuantity <= :threshold OR medicine.quantity <= :threshold)', { threshold })
            .andWhere('medicine.status != :usedUp', { usedUp: medicine_entity_1.MedicineStatus.USED_UP })
            .getMany();
    }
    async getExpired(userId) {
        return this.medicineRepository.find({
            where: { userId, status: medicine_entity_1.MedicineStatus.EXPIRED },
        });
    }
    async getLogs(medicineId, userId, limit = 20) {
        const medicine = await this.findOne(medicineId, userId);
        return this.medicineLogRepository.find({
            where: { medicineId: medicine.id, userId },
            order: { createdAt: 'DESC' },
            take: limit,
        });
    }
    async findDictionaryByBarcode(barcode) {
        return this.medicineDictionaryRepository.findOne({
            where: { barcode },
        });
    }
    async createDictionaryItem(data) {
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
};
exports.MedicineService = MedicineService;
exports.MedicineService = MedicineService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(medicine_entity_1.Medicine)),
    __param(1, (0, typeorm_1.InjectRepository)(medicine_log_entity_1.MedicineLog)),
    __param(2, (0, typeorm_1.InjectRepository)(medicine_dictionary_entity_1.MedicineDictionary)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], MedicineService);
//# sourceMappingURL=medicine.service.js.map