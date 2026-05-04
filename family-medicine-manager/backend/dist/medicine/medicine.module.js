"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MedicineModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const medicine_service_1 = require("./medicine.service");
const medicine_controller_1 = require("./medicine.controller");
const medicine_entity_1 = require("./entities/medicine.entity");
const medicine_log_entity_1 = require("./entities/medicine-log.entity");
const medicine_dictionary_entity_1 = require("./entities/medicine-dictionary.entity");
let MedicineModule = class MedicineModule {
};
exports.MedicineModule = MedicineModule;
exports.MedicineModule = MedicineModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([medicine_entity_1.Medicine, medicine_log_entity_1.MedicineLog, medicine_dictionary_entity_1.MedicineDictionary])],
        controllers: [medicine_controller_1.MedicineController],
        providers: [medicine_service_1.MedicineService],
        exports: [medicine_service_1.MedicineService, typeorm_1.TypeOrmModule],
    })
], MedicineModule);
//# sourceMappingURL=medicine.module.js.map