import { Controller, Get, Post, Body, UseGuards, Param } from '@nestjs/common';
import { ScannerService } from './scanner.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('scanner')
@UseGuards(JwtAuthGuard)
export class ScannerController {
  constructor(private readonly scannerService: ScannerService) {}

  @Get('barcode/:barcode')
  async queryByBarcode(@Param('barcode') barcode: string) {
    return this.scannerService.queryByBarcode(barcode);
  }

  @Get('validate/:barcode')
  validateBarcode(@Param('barcode') barcode: string) {
    const isValid = this.scannerService.validateBarcode(barcode);
    return {
      success: true,
      isValid,
      message: isValid ? '条码格式有效' : '条码格式无效',
    };
  }

  @Post('recognize')
  async recognizeBarcode(@Body() body: { imageBase64?: string; barcode?: string }) {
    if (body.barcode) {
      return this.scannerService.queryByBarcode(body.barcode);
    }

    if (body.imageBase64) {
      return {
        success: false,
        message: '图片识别请在前端使用ZXing库完成，后端仅支持条码字符串查询',
      };
    }

    return {
      success: false,
      message: '请提供条码或图片数据',
    };
  }
}
