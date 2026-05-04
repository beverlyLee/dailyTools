import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    login(req: any): Promise<{
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
    getProfile(req: any): any;
}
