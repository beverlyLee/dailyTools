import { getAllBlacklistedCompanies, searchBlacklistedCompanies, addSubscription } from '../data/repositories';
import type { BlacklistedCompany, SubscribeResponse } from '../../shared/types';

export function getBlacklist(): BlacklistedCompany[] {
  return getAllBlacklistedCompanies();
}

export function searchBlacklist(keyword: string): BlacklistedCompany[] {
  if (!keyword || keyword.trim().length === 0) {
    return getAllBlacklistedCompanies();
  }
  return searchBlacklistedCompanies(keyword.trim());
}

export function subscribe(email: string | undefined, phone: string | undefined, manufacturerIds: string[]): SubscribeResponse {
  if (!manufacturerIds || manufacturerIds.length === 0) {
    return {
      success: false,
      message: '请选择要订阅的企业'
    };
  }

  if (!email && !phone) {
    return {
      success: false,
      message: '请提供邮箱或手机号用于接收通知'
    };
  }

  const subscriptionId = addSubscription(email, phone, manufacturerIds);

  return {
    success: true,
    message: '订阅成功，我们将在企业信息更新时通知您',
    subscriptionId
  };
}
