"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const jwt_1 = require("@nestjs/jwt");
const passport_1 = require("@nestjs/passport");
const auth_module_1 = require("./auth/auth.module");
const medicine_module_1 = require("./medicine/medicine.module");
const user_module_1 = require("./user/user.module");
const reminder_module_1 = require("./reminder/reminder.module");
const scanner_module_1 = require("./scanner/scanner.module");
const ocr_module_1 = require("./ocr/ocr.module");
const location_module_1 = require("./location/location.module");
const user_entity_1 = require("./user/entities/user.entity");
const medicine_entity_1 = require("./medicine/entities/medicine.entity");
const reminder_entity_1 = require("./reminder/entities/reminder.entity");
const medicine_log_entity_1 = require("./medicine/entities/medicine-log.entity");
const medicine_dictionary_entity_1 = require("./medicine/entities/medicine-dictionary.entity");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '.env',
            }),
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: (configService) => ({
                    type: 'sqlite',
                    database: configService.get('DATABASE_PATH', './data/family-medicine.sqlite'),
                    entities: [user_entity_1.User, medicine_entity_1.Medicine, reminder_entity_1.Reminder, medicine_log_entity_1.MedicineLog, medicine_dictionary_entity_1.MedicineDictionary],
                    synchronize: true,
                    logging: false,
                }),
                inject: [config_1.ConfigService],
            }),
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                useFactory: (configService) => ({
                    secret: configService.get('JWT_SECRET', 'default-secret'),
                    signOptions: {
                        expiresIn: configService.get('JWT_EXPIRES_IN', '7d'),
                    },
                }),
                inject: [config_1.ConfigService],
            }),
            passport_1.PassportModule.register({ defaultStrategy: 'jwt' }),
            auth_module_1.AuthModule,
            user_module_1.UserModule,
            medicine_module_1.MedicineModule,
            reminder_module_1.ReminderModule,
            scanner_module_1.ScannerModule,
            ocr_module_1.OcrModule,
            location_module_1.LocationModule,
        ],
        controllers: [],
        providers: [],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map