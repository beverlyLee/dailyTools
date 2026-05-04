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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const user_service_1 = require("../user/user.service");
let AuthService = class AuthService {
    constructor(userService, jwtService) {
        this.userService = userService;
        this.jwtService = jwtService;
    }
    async validateUser(username, password) {
        let user = await this.userService.findByUsername(username);
        if (!user) {
            user = await this.userService.findByEmail(username);
        }
        if (!user) {
            throw new common_1.UnauthorizedException('用户不存在');
        }
        const { password: _, ...result } = user;
        return result;
    }
    async login(user) {
        const payload = { username: user.username, sub: user.id, role: user.role };
        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                nickname: user.nickname,
                avatar: user.avatar,
                role: user.role,
            },
        };
    }
    async register(registerDto) {
        const existingUser = await this.userService.findByUsername(registerDto.username);
        if (existingUser) {
            throw new common_1.ConflictException('用户名已存在');
        }
        const existingEmail = await this.userService.findByEmail(registerDto.email);
        if (existingEmail) {
            throw new common_1.ConflictException('邮箱已被注册');
        }
        const user = await this.userService.create(registerDto);
        const { password: _, ...result } = user;
        return result;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [user_service_1.UserService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map