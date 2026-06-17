export interface SoilData {
  id?: number
  ph: number
  organicMatter: number
  totalNitrogen: number
  availablePhosphorus: number
  availablePotassium: number
  testDate: string
}

export interface SHIScores {
  ph: number
  organicMatter: number
  nitrogen: number
  phosphorus: number
  potassium: number
}

export interface SHIResult {
  shi: number
  grade: '优' | '良' | '中' | '差'
  scores: SHIScores
  degradationTypes: string[]
}

export interface AcidificationDetail {
  needed: boolean
  limeKgPerMu: number
  method: string
}

export interface CompactionDetail {
  needed: boolean
  organicFertilizerKgPerMu: number
  method: string
}

export interface BarrennessDetail {
  needed: boolean
  npkSupplement: string
  organicFertilizerKgPerMu: number
}

export interface PrescriptionDetails {
  acidification: AcidificationDetail
  compaction: CompactionDetail
  barrenness: BarrennessDetail
}

export interface CalendarItem {
  month: number
  action: string
}

export interface Prescription {
  limeDosage: number
  organicFertilizerDosage: number
  greenManureSuggestion: string
  details: PrescriptionDetails
  calendar: CalendarItem[]
}

export interface SoilRecord extends SoilData {
  shi: number
  grade: string
  created_at: string
}

export interface TrackingRecord {
  testDate: string
  shi: number
  grade: string
  scores: SHIScores
}
