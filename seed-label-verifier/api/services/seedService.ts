import { findSeedByQrCode, isManufacturerBlacklisted } from '../data/repositories';
import type { VerifyResponse } from '../../shared/types';

export function verifySeed(qrContent: string): VerifyResponse {
  if (!qrContent || qrContent.trim().length === 0) {
    return {
      success: false,
      message: '二维码内容不能为空',
      isRegistered: false
    };
  }

  const seed = findSeedByQrCode(qrContent.trim());

  if (!seed) {
    return {
      success: true,
      message: '未查询到备案信息，谨防假冒',
      isRegistered: false
    };
  }

  const isBlacklisted = isManufacturerBlacklisted(seed.manufacturerId);
  
  if (isBlacklisted) {
    return {
      success: true,
      message: '该种子生产企业已被列入黑名单，请勿购买',
      seed,
      isRegistered: true
    };
  }

  return {
    success: true,
    message: '备案信息验证通过，为正规备案种子',
    seed,
    isRegistered: true
  };
}
