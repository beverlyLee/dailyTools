import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { OcrService } from './ocr.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('ocr')
@UseGuards(JwtAuthGuard)
export class OcrController {
  constructor(private readonly ocrService: OcrService) {}

  @Post('recognize')
  async recognize(@Body() body: { imageBase64: string }) {
    if (!body.imageBase64) {
      return {
        success: false,
        message: '请提供图片数据',
      };
    }

    return this.ocrService.extractTextFromImage(body.imageBase64);
  }

  @Post('parse-medicine')
  async parseMedicine(@Body() body: { text: string }) {
    if (!body.text) {
      return {
        success: false,
        message: '请提供文本内容',
      };
    }

    const info = this.ocrService.parseTextForMedicineInfo(body.text);

    return {
      success: true,
      data: info,
      message: '解析完成',
    };
  }

  @Post('recognize-and-parse')
  async recognizeAndParse(@Body() body: { imageBase64: string }) {
    if (!body.imageBase64) {
      return {
        success: false,
        message: '请提供图片数据',
      };
    }

    const ocrResult = await this.ocrService.extractTextFromImage(body.imageBase64);

    if (!ocrResult.success) {
      return ocrResult;
    }

    const medicineInfo = this.ocrService.parseTextForMedicineInfo(ocrResult.text);

    return {
      success: true,
      text: ocrResult.text,
      expiryDates: ocrResult.expiryDates,
      medicineInfo,
      message: '识别并解析完成',
    };
  }
}
