export interface SeedInfo {
  seedId: string;
  seedName: string;
  cropType: string;
  variety: string;
  registrationNumber: string;
  productionDate: string;
  netContent: string;
  manufacturer: string;
  manufacturerId: string;
  warning: string;
  quality: string;
}

export interface VerifyRequest {
  qrContent: string;
}

export interface VerifyResponse {
  success: boolean;
  message: string;
  seed?: SeedInfo;
  isRegistered: boolean;
}

export interface LabelCheckItem {
  name: string;
  required: boolean;
  present: boolean;
  value?: string;
}

export interface LabelCheckRequest {
  seedInfo?: Partial<SeedInfo>;
  qrContent?: string;
}

export interface LabelCheckResponse {
  compliant: boolean;
  checks: LabelCheckItem[];
  missingFields: string[];
  suggestions: string[];
}

export interface BlacklistedCompany {
  id: string;
  name: string;
  reason: string;
  dateAdded: string;
  status: string;
  licenseNumber?: string;
  address?: string;
  contact?: string;
}

export interface ReportGenerateRequest {
  seedInfo?: Partial<SeedInfo>;
  qrContent: string;
  verifyResult: VerifyResponse;
  labelCheckResult?: LabelCheckResponse;
}

export interface ReportLetter {
  title: string;
  content: string;
  timestamp: string;
  evidence: string[];
}

export interface SubscribeRequest {
  email?: string;
  phone?: string;
  manufacturerIds: string[];
}

export interface SubscribeResponse {
  success: boolean;
  message: string;
  subscriptionId?: string;
}
