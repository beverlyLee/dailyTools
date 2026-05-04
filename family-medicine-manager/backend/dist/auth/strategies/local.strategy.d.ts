import { Strategy } from 'passport-local';
import { UserService } from '../../user/user.service';
declare const LocalStrategy_base: new (...args: any[]) => Strategy;
export declare class LocalStrategy extends LocalStrategy_base {
    private userService;
    constructor(userService: UserService);
    validate(username: string, password: string): Promise<any>;
}
export {};
