import { findSeedByQrCode } from '../data/repositories';
import type { LabelCheckResponse, LabelCheckItem, SeedInfo } from '../../shared/types';

interface RequiredField {
  key: keyof SeedInfo | 'warning';
  name: string;
  required: boolean;
  validator?: (value: string) => boolean;
}

const REQUIRED_FIELDS: RequiredField[] = [
  {
    key: 'registrationNumber',
    name: '审定编号',
    required: true,
    validator: (v) => /^(国审|省审)[\u4e00-\u9fa5]+\d{8,}$/.test(v) || /^(国审|省审)[\u4e00-\u9fa5]+\d+$/.test(v)
  },
  {
    key: 'productionDate',
    name: '生产年月',
    required: true,
    validator: (v) => /^\d{4}-\d{2}$/.test(v) || /^\d{4}年\d{1,2}月$/.test(v)
  },
  {
    key: 'netContent',
    name: '净含量',
    required: true,
    validator: (v) => /^\d+(\.\d+)?\s*(g|kg|克|千克)$/i.test(v)
  },
  {
    key: 'warning',
    name: '警示标志',
    required: true,
    validator: (v) => v.length >= 2
  },
  {
    key: 'seedName',
    name: '种子名称',
    required: true,
    validator: (v) => v.length >= 2
  },
  {
    key: 'cropType',
    name: '作物种类',
    required: true,
    validator: (v) => v.length >= 2
  },
  {
    key: 'variety',
    name: '品种',
    required: false,
    validator: (v) => v.length >= 2
  },
  {
    key: 'manufacturer',
    name: '生产企业',
    required: true,
    validator: (v) => v.length >= 2
  },
  {
    key: 'quality',
    name: '质量标准',
    required: false,
    validator: (v) => /^GB/.test(v) || v.length >= 2
  }
];

export function checkLabelCompliance(qrContent?: string, seedInfo?: Partial<SeedInfo>): LabelCheckResponse {
  let seed: Partial<SeedInfo> | null = seedInfo || null;

  if (qrContent && !seed) {
    const foundSeed = findSeedByQrCode(qrContent.trim());
    if (foundSeed) {
      seed = foundSeed;
    }
  }

  const checks: LabelCheckItem[] = [];
  const missingFields: string[] = [];
  const suggestions: string[] = [];

  for (const field of REQUIRED_FIELDS) {
    const value = seed ? (seed[field.key as keyof SeedInfo] as string) : undefined;
    const present = !!value && (!field.validator || field.validator(value));
    
    checks.push({
      name: field.name,
      required: field.required,
      present,
      value
    });

    if (field.required && !present) {
      missingFields.push(field.name);
    }
  }

  if (missingFields.length > 0) {
    suggestions.push(`依据GB 20464-2006《农作物种子标签通则》，请补充以下必填信息：${missingFields.join('、')}`);
  }

  if (seed?.quality && !/^GB\d/.test(seed.quality)) {
    suggestions.push('建议标注国家强制执行标准编号（如GB4404.1-2008）');
  }

  if (seed?.registrationNumber) {
    const validFormat = /^(国审|省审)[\u4e00-\u9fa5]+\d+$/.test(seed.registrationNumber);
    if (!validFormat) {
      suggestions.push('审定编号格式应为"国审/省审+作物种类+年份+编号"');
    }
  }

  const compliant = missingFields.length === 0;

  if (compliant) {
    suggestions.push('标签信息完整，符合GB 20464-2006标准要求');
  }

  return {
    compliant,
    checks,
    missingFields,
    suggestions
  };
}
