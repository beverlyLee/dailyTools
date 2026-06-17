import type { SoilData, Prescription, CalendarItem } from '../../shared/types.js'
import { calculateSHI } from './assessmentService.js'

function calcAcidification(ph: number): { needed: boolean; limeKgPerMu: number; method: string } {
  if (ph >= 6.5) {
    return { needed: false, limeKgPerMu: 0, method: '' }
  }
  let limeKgPerMu = 0
  let method = ''
  if (ph >= 5.5 && ph < 6.5) {
    limeKgPerMu = Math.round((6.5 - ph) * 75)
    method = '表面撒施石灰后浅翻混匀，深度15-20cm，施后适量灌溉促进反应'
  } else if (ph >= 4.5 && ph < 5.5) {
    limeKgPerMu = Math.round(75 + (5.5 - ph) * 75)
    method = '分两次施用石灰，间隔2-3周。首次施用量60%，深翻混匀20-25cm；第二次40%，浅翻混匀15cm'
  } else {
    limeKgPerMu = Math.round(150 + (4.5 - ph) * 50)
    method = '分三次施用石灰，每次间隔3-4周。首次50%，深翻30cm；后续25%逐步浅翻混匀。配合有机肥施用增强缓冲性能'
  }
  return { needed: true, limeKgPerMu, method }
}

function calcCompaction(om: number): { needed: boolean; organicFertilizerKgPerMu: number; method: string } {
  if (om >= 15) {
    return { needed: false, organicFertilizerKgPerMu: 0, method: '' }
  }
  let organicFertilizerKgPerMu = 0
  let method = ''
  if (om >= 10 && om < 15) {
    organicFertilizerKgPerMu = Math.round((15 - om) / 5 * 1000)
    method = '施用充分腐熟的有机肥，深翻混匀20-25cm，配合适量灌溉促进有机质分解'
  } else {
    organicFertilizerKgPerMu = Math.round(1500 + (10 - om) / 10 * 1000)
    method = '大量施用腐熟有机肥，深翻30cm以上打破犁底层，配合秸秆还田增加有机质输入'
  }
  return { needed: true, organicFertilizerKgPerMu, method }
}

function calcBarrenness(
  n: number, p: number, k: number, om: number
): { needed: boolean; npkSupplement: string; organicFertilizerKgPerMu: number } {
  const lowN = n < 0.5
  const lowP = p < 5
  const lowK = k < 50
  if (!lowN && !lowP && !lowK) {
    return { needed: false, npkSupplement: '', organicFertilizerKgPerMu: 0 }
  }
  const parts: string[] = []
  if (lowN) parts.push(`追施尿素10-15kg/亩补充氮素`)
  if (lowP) parts.push(`追施过磷酸钙15-20kg/亩补充磷素`)
  if (lowK) parts.push(`追施硫酸钾8-12kg/亩补充钾素`)
  const omFertKg = om < 15 ? Math.round((15 - om) / 10 * 1500) : 500
  return {
    needed: true,
    npkSupplement: parts.join('；'),
    organicFertilizerKgPerMu: omFertKg,
  }
}

function getGreenManureSuggestion(ph: number, om: number): string {
  if (ph < 6.0 && om < 15) {
    return '推荐种植耐酸绿肥作物：苕子（毛叶苕子）或箭筈豌豆，于秋季9-10月播种，翌年4月翻压还田，每亩鲜草产量可达1500-2000kg'
  }
  if (om < 15) {
    return '推荐种植绿肥作物：紫云英或苜蓿，于秋季播种，翌年春翻压还田，每亩鲜草产量可达1500-2500kg'
  }
  if (ph < 6.5) {
    return '可适当种植苕子等耐酸绿肥作物辅助调酸，秋季播种，翻压还田'
  }
  return '当前土壤条件良好，可种植三叶草等绿肥作物维持地力'
}

function buildCalendar(
  prescription: Prescription, data: SoilData
): CalendarItem[] {
  const calendar: CalendarItem[] = []
  const hasAcid = prescription.details.acidification.needed
  const hasCompaction = prescription.details.compaction.needed
  const hasBarren = prescription.details.barrenness.needed

  if (hasAcid) {
    calendar.push({ month: 3, action: '施用石灰（首次），深翻混匀' })
    if (data.ph < 5.5) {
      calendar.push({ month: 4, action: '施用石灰（第二次），浅翻混匀' })
    }
    if (data.ph < 4.5) {
      calendar.push({ month: 5, action: '施用石灰（第三次），浅翻混匀' })
    }
  }

  if (hasCompaction || hasBarren) {
    calendar.push({ month: 3, action: `施用有机肥${prescription.organicFertilizerDosage}kg/亩，深翻混匀` })
  }

  if (prescription.greenManureSuggestion.includes('秋季') ||
      prescription.greenManureSuggestion.includes('9-10月')) {
    calendar.push({ month: 9, action: '播种绿肥作物' })
    calendar.push({ month: 4, action: '绿肥翻压还田' })
  }

  if (hasBarren) {
    calendar.push({ month: 4, action: prescription.details.barrenness.npkSupplement.split('；')[0] || '' })
    if (prescription.details.barrenness.npkSupplement.split('；').length > 1) {
      calendar.push({ month: 5, action: prescription.details.barrenness.npkSupplement.split('；')[1] || '' })
    }
  }

  calendar.push({ month: 6, action: '采集土样进行中期检测，评估改良效果' })

  calendar.sort((a, b) => a.month - b.month)
  return calendar
}

export function generatePrescription(data: SoilData): Prescription {
  void calculateSHI(data)

  const acidification = calcAcidification(data.ph)
  const compaction = calcCompaction(data.organicMatter)
  const barrenness = calcBarrenness(
    data.totalNitrogen,
    data.availablePhosphorus,
    data.availablePotassium,
    data.organicMatter
  )

  const limeDosage = acidification.limeKgPerMu
  const organicFertilizerDosage = Math.max(
    compaction.organicFertilizerKgPerMu,
    barrenness.organicFertilizerKgPerMu
  )
  const greenManureSuggestion = getGreenManureSuggestion(data.ph, data.organicMatter)

  const prescription: Prescription = {
    limeDosage,
    organicFertilizerDosage,
    greenManureSuggestion,
    details: { acidification, compaction, barrenness },
    calendar: [],
  }

  prescription.calendar = buildCalendar(prescription, data)

  return prescription
}
