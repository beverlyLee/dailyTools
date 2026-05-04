import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { RegisterDto } from './dto/register.dto';
export declare class AuthService {
    private userService;
    private jwtService;
    constructor(userService: UserService, jwtService: JwtService);
    validateUser(username: string, password: string): Promise<any>;
    login(user: any): Promise<{
        access_token: string;
        user: {
            id: any;
            username: any;
            email: any;
            nickname: any;
            avatar: any;
            role: any;
        };
    }>;
    register(registerDto: RegisterDto): Promise<{
        id: string;
        username: string;
        email: string;
        nickname: string;
        avatar: string;
        role: string;
        createdAt: Date;
        updatedAt: Date;
        medicines: import("../medicine/entities/medicine.entity").Medicine[];
        reminders: import("../reminder/entities/reminder.entity").Reminder[];
    }>;
}
