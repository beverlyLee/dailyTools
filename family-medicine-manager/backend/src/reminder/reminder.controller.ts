import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { ReminderService } from './reminder.service';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { UpdateReminderDto } from './dto/update-reminder.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReminderStatus, ReminderType } from './entities/reminder.entity';

@Controller('reminders')
@UseGuards(JwtAuthGuard)
export class ReminderController {
  constructor(private readonly reminderService: ReminderService) {}

  @Post()
  create(@Request() req, @Body() createReminderDto: CreateReminderDto) {
    return this.reminderService.create(req.user.id, createReminderDto);
  }

  @Get()
  findAll(
    @Request() req,
    @Query('status') status?: ReminderStatus,
    @Query('type') type?: ReminderType,
    @Query('medicineId') medicineId?: string,
  ) {
    return this.reminderService.findAll(req.user.id, { status, type, medicineId });
  }

  @Get('upcoming')
  getUpcoming(@Request() req, @Query('limit') limit: string = '10') {
    return this.reminderService.getUpcoming(req.user.id, parseInt(limit, 10));
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.reminderService.findOne(id, req.user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Request() req, @Body() updateReminderDto: UpdateReminderDto) {
    return this.reminderService.update(id, req.user.id, updateReminderDto);
  }

  @Post(':id/dismiss')
  dismiss(@Param('id') id: string, @Request() req) {
    return this.reminderService.dismiss(id, req.user.id);
  }

  @Post(':id/toggle')
  toggle(@Param('id') id: string, @Request() req) {
    return this.reminderService.toggle(id, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.reminderService.remove(id, req.user.id);
  }
}
