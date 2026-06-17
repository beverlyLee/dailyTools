import { create } from 'zustand'
import type { SHIResult, Prescription, SoilData } from '@shared/types'

interface SoilState {
  currentData: SoilData | null
  shiResult: SHIResult | null
  prescription: Prescription | null
  recordId: number | null
  setCurrentData: (data: SoilData) => void
  setShiResult: (result: SHIResult) => void
  setPrescription: (prescription: Prescription) => void
  setRecordId: (id: number) => void
  reset: () => void
}

export const useSoilStore = create<SoilState>((set) => ({
  currentData: null,
  shiResult: null,
  prescription: null,
  recordId: null,
  setCurrentData: (data) => set({ currentData: data }),
  setShiResult: (result) => set({ shiResult: result }),
  setPrescription: (prescription) => set({ prescription }),
  setRecordId: (id) => set({ recordId: id }),
  reset: () => set({ currentData: null, shiResult: null, prescription: null, recordId: null }),
}))
