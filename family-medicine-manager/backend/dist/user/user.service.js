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
exports.UserService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = require("bcrypt");
const user_entity_1 = require("./entities/user.entity");
let UserService = class UserService {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }
    async create(createUserDto) {
        const existingUser = await this.userRepository.findOne({
            where: [
                { username: createUserDto.username },
                { email: createUserDto.email },
            ],
        });
        if (existingUser) {
            throw new common_1.ConflictException('用户名或邮箱已存在');
        }
        const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
        const user = this.userRepository.create({
            ...createUserDto,
            password: hashedPassword,
            nickname: createUserDto.nickname || createUserDto.username,
        });
        return this.userRepository.save(user);
    }
    async findAll() {
        return this.userRepository.find({
            select: ['id', 'username', 'email', 'nickname', 'avatar', 'role', 'createdAt', 'updatedAt'],
        });
    }
    async findOne(id) {
        const user = await this.userRepository.findOne({
            where: { id },
            select: ['id', 'username', 'email', 'nickname', 'avatar', 'role', 'createdAt', 'updatedAt'],
        });
        if (!user) {
            throw new common_1.NotFoundException(`用户ID ${id} 不存在`);
        }
        return user;
    }
    async findByUsername(username) {
        return this.userRepository.findOne({ where: { username } });
    }
    async findByEmail(email) {
        return this.userRepository.findOne({ where: { email } });
    }
    async update(id, updateUserDto) {
        const user = await this.findOne(id);
        if (updateUserDto.password) {
            updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
        }
        Object.assign(user, updateUserDto);
        return this.userRepository.save(user);
    }
    async remove(id) {
        const result = await this.userRepository.delete(id);
        if (result.affected === 0) {
            throw new common_1.NotFoundException(`用户ID ${id} 不存在`);
        }
    }
};
exports.UserService = UserService;
exports.UserService = UserService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], UserService);
//# sourceMappingURL=user.service.js.map