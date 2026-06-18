import { getDb } from '../database.js'
import type { SoilData, SHIResult, TrackingRecord, SoilRecord, SHIScores } from '../../shared/types.js'

interface SoilRecordDbRow {
  id: number
  ph: number
  organic_matter: number
  total_nitrogen: number
  available_phosphorus: number
  available_potassium: number
  shi: number
  grade: string
  test_date: string
  ph_score: number
  om_score: number
  n_score: number
  p_score: number
  k_score: number
  created_at: string
}

interface TrackingDbRow {
  test_date: string
  shi: number
  grade: string
  ph_score: number
  om_score: number
  n_score: number
  p_score: number
  k_score: number
}

function buildDegradationTypes(ph: number, om: number, scores: SHIScores): string[] {
  const types: string[] = []
  if (ph < 6.5) types.push('酸化')
  if (ph > 8.0) types.push('碱化')
  if (om < 15) types.push('板结')
  if (scores.nitrogen < 50 && scores.phosphorus < 50 && scores.potassium < 50) {
    types.push('贫瘠')
  }
  if (types.length === 0) types.push('无明显退化')
  return types
}

function dbRowToSoilRecord(row: SoilRecordDbRow): SoilRecord {
  const scores: SHIScores = {
    ph: row.ph_score,
    organicMatter: row.om_score,
    nitrogen: row.n_score,
    phosphorus: row.p_score,
    potassium: row.k_score,
  }
  return {
    id: row.id,
    ph: row.ph,
    organicMatter: row.organic_matter,
    totalNitrogen: row.total_nitrogen,
    availablePhosphorus: row.available_phosphorus,
    availablePotassium: row.available_potassium,
    shi: row.shi,
    grade: row.grade,
    testDate: row.test_date,
    created_at: row.created_at,
    scores,
    degradationTypes: buildDegradationTypes(row.ph, row.organic_matter, scores),
  }
}

export function saveRecord(data: SoilData, result: SHIResult): number {
  const db = getDb()
  const stmt = db.prepare(`
    INSERT INTO soil_records (ph, organic_matter, total_nitrogen, available_phosphorus, available_potassium, shi, grade, test_date, ph_score, om_score, n_score, p_score, k_score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const info = stmt.run(
    data.ph,
    data.organicMatter,
    data.totalNitrogen,
    data.availablePhosphorus,
    data.availablePotassium,
    result.shi,
    result.grade,
    data.testDate,
    result.scores.ph,
    result.scores.organicMatter,
    result.scores.nitrogen,
    result.scores.phosphorus,
    result.scores.potassium
  )
  return info.lastInsertRowid as number
}

export function savePrescription(recordId: number, prescription: {
  limeDosage: number
  organicFertilizerDosage: number
  greenManureSuggestion: string
  details: object
}): void {
  const db = getDb()
  const stmt = db.prepare(`
    INSERT INTO prescription_records (soil_record_id, lime_dosage, organic_fertilizer_dosage, green_manure_suggestion, details_json)
    VALUES (?, ?, ?, ?, ?)
  `)
  stmt.run(
    recordId,
    prescription.limeDosage,
    prescription.organicFertilizerDosage,
    prescription.greenManureSuggestion,
    JSON.stringify(prescription.details)
  )
}

export function getAllRecords(): SoilRecord[] {
  const db = getDb()
  const rows = db.prepare(`
    SELECT * FROM soil_records ORDER BY test_date DESC
  `).all() as SoilRecordDbRow[]
  return rows.map(dbRowToSoilRecord)
}

export function getLatestRecord(): SoilRecord | null {
  const db = getDb()
  const row = db.prepare(`
    SELECT * FROM soil_records ORDER BY test_date DESC LIMIT 1
  `).get() as SoilRecordDbRow | undefined
  return row ? dbRowToSoilRecord(row) : null
}

export function getTrackingData(): TrackingRecord[] {
  const db = getDb()
  const rows = db.prepare(`
    SELECT test_date, shi, grade, ph_score, om_score, n_score, p_score, k_score
    FROM soil_records ORDER BY test_date ASC
  `).all() as TrackingDbRow[]

  return rows.map(row => ({
    testDate: row.test_date,
    shi: row.shi,
    grade: row.grade,
    scores: {
      ph: row.ph_score,
      organicMatter: row.om_score,
      nitrogen: row.n_score,
      phosphorus: row.p_score,
      potassium: row.k_score,
    },
  }))
}
