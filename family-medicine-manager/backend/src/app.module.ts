import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthModule } from './auth/auth.module';
import { MedicineModule } from './medicine/medicine.module';
import { UserModule } from './user/user.module';
import { ReminderModule } from './reminder/reminder.module';
import { ScannerModule } from './scanner/scanner.module';
import { OcrModule } from './ocr/ocr.module';
import { LocationModule } from './location/location.module';
import { User } from './user/entities/user.entity';
import { Medicine } from './medicine/entities/medicine.entity';
import { Reminder } from './reminder/entities/reminder.entity';
import { MedicineLog } from './medicine/entities/medicine-log.entity';
import { MedicineDictionary } from './medicine/entities/medicine-dictionary.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'sqlite',
        database: configService.get<string>('DATABASE_PATH', './data/family-medicine.sqlite'),
        entities: [User, Medicine, Reminder, MedicineLog, MedicineDictionary],
        synchronize: true,
        logging: false,
      }),
      inject: [ConfigService],
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'default-secret'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '7d'),
        },
      }),
      inject: [ConfigService],
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    AuthModule,
    UserModule,
    MedicineModule,
    ReminderModule,
    ScannerModule,
    OcrModule,
    LocationModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
