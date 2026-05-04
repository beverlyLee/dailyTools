import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { MedicineService } from './medicine.service';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { UpdateMedicineDto } from './dto/update-medicine.dto';
import { DoseMedicineDto } from './dto/dose-medicine.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MedicineStatus } from './entities/medicine.entity';

@Controller('medicines')
@UseGuards(JwtAuthGuard)
export class MedicineController {
  constructor(private readonly medicineService: MedicineService) {}

  @Post()
  create(@Request() req, @Body() createMedicineDto: CreateMedicineDto) {
    return this.medicineService.create(req.user.id, createMedicineDto);
  }

  @Get()
  findAll(
    @Request() req,
    @Query('status') status?: MedicineStatus,
    @Query('isFavorite') isFavorite?: string,
    @Query('tag') tag?: string,
    @Query('search') search?: string,
  ) {
    return this.medicineService.findAll(req.user.id, {
      status,
      isFavorite: isFavorite !== undefined ? isFavorite === 'true' : undefined,
      tag,
      search,
    });
  }

  @Get('expiring')
  getExpiring(@Request() req, @Query('days') days: string = '7') {
    return this.medicineService.getExpiring(req.user.id, parseInt(days, 10));
  }

  @Get('low-stock')
  getLowStock(@Request() req, @Query('threshold') threshold: string = '0.3') {
    return this.medicineService.getLowStock(req.user.id, parseFloat(threshold));
  }

  @Get('expired')
  getExpired(@Request() req) {
    return this.medicineService.getExpired(req.user.id);
  }

  @Get('barcode/:barcode')
  findByBarcode(@Param('barcode') barcode: string, @Request() req) {
    return this.medicineService.findByBarcode(barcode, req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.medicineService.findOne(id, req.user.id);
  }

  @Get(':id/logs')
  getLogs(@Param('id') id: string, @Request() req, @Query('limit') limit: string = '20') {
    return this.medicineService.getLogs(id, req.user.id, parseInt(limit, 10));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Request() req, @Body() updateMedicineDto: UpdateMedicineDto) {
    return this.medicineService.update(id, req.user.id, updateMedicineDto);
  }

  @Post(':id/dose')
  dose(@Param('id') id: string, @Request() req, @Body() doseDto: DoseMedicineDto) {
    return this.medicineService.dose(id, req.user.id, doseDto);
  }

  @Post(':id/toggle-favorite')
  toggleFavorite(@Param('id') id: string, @Request() req) {
    return this.medicineService.toggleFavorite(id, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.medicineService.remove(id, req.user.id);
  }
}
