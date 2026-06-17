import { getDb } from '../database.js'
import type { SoilData, SHIResult, TrackingRecord } from '../../shared/types.js'

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

export function getAllRecords(): any[] {
  const db = getDb()
  return db.prepare(`
    SELECT * FROM soil_records ORDER BY test_date DESC
  `).all()
}

export function getLatestRecord(): any | null {
  const db = getDb()
  return db.prepare(`
    SELECT * FROM soil_records ORDER BY test_date DESC LIMIT 1
  `).get() as any | null
}

export function getTrackingData(): TrackingRecord[] {
  const db = getDb()
  const rows = db.prepare(`
    SELECT test_date, shi, grade, ph_score, om_score, n_score, p_score, k_score
    FROM soil_records ORDER BY test_date ASC
  `).all() as any[]

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
