import type { ReportGenerateRequest, ReportLetter } from '../../shared/types';

export function generateReportLetter(request: ReportGenerateRequest): ReportLetter {
  const timestamp = new Date().toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const seedInfo = request.seedInfo;
  const verifyResult = request.verifyResult;
  const labelCheckResult = request.labelCheckResult;

  let content = `【举报信】

举报时间：${timestamp}
举报类型：涉嫌假劣种子

二维码内容：${request.qrContent}

核验结果：${verifyResult.message}
备案状态：${verifyResult.isRegistered ? '已备案' : '未查询到备案信息'}
`;

  if (seedInfo) {
    content += `
种子信息：
- 种子名称：${seedInfo.seedName || '未标注'}
- 作物种类：${seedInfo.cropType || '未标注'}
- 品种：${seedInfo.variety || '未标注'}
- 审定编号：${seedInfo.registrationNumber || '未标注'}
- 生产年月：${seedInfo.productionDate || '未标注'}
- 净含量：${seedInfo.netContent || '未标注'}
- 生产企业：${seedInfo.manufacturer || '未标注'}
- 质量标准：${seedInfo.quality || '未标注'}
- 警示说明：${seedInfo.warning || '未标注'}
`;
  }

  if (labelCheckResult && labelCheckResult.missingFields.length > 0) {
    content += `
标签合规性审查结果：
- 合规状态：${labelCheckResult.compliant ? '合规' : '不合规'}
- 缺失信息：${labelCheckResult.missingFields.join('、')}

审查建议：
${labelCheckResult.suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}
`;
  }

  content += `

【证据清单】
1. 二维码扫描截图
2. 核验结果页面截图
3. 标签照片（如有）

【举报说明】
本人确认以上信息真实有效，特向农业农村主管部门举报该涉嫌假劣种子问题，请求依法查处。

举报人：（请填写）
联系电话：（请填写）
举报日期：${timestamp}

---
本举报信由"种子标签合规性验证工具"自动生成，仅供参考。正式举报请向当地农业农村主管部门提交。
`;

  const evidence = [
    `二维码内容：${request.qrContent}`,
    `核验结果：${verifyResult.message}`,
    `扫描时间：${timestamp}`
  ];

  if (labelCheckResult && !labelCheckResult.compliant) {
    evidence.push(`标签缺失：${labelCheckResult.missingFields.join('、')}`);
  }

  return {
    title: `涉嫌假劣种子举报信 - ${timestamp}`,
    content,
    timestamp,
    evidence
  };
}
