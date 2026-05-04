import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { RegisterDto } from './dto/register.dto';
import { User } from '../user/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    let user = await this.userService.findByUsername(username);
    if (!user) {
      user = await this.userService.findByEmail(username);
    }
    
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }
    
    const { password: _, ...result } = user;
    return result;
  }

  async login(user: any) {
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

  async register(registerDto: RegisterDto) {
    const existingUser = await this.userService.findByUsername(registerDto.username);
    if (existingUser) {
      throw new ConflictException('用户名已存在');
    }

    const existingEmail = await this.userService.findByEmail(registerDto.email);
    if (existingEmail) {
      throw new ConflictException('邮箱已被注册');
    }

    const user = await this.userService.create(registerDto);
    const { password: _, ...result } = user;
    return result;
  }
}
