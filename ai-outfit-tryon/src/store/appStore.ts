import { create } from 'zustand'

interface AppState {
  personImageUrl: string | null
  clothesImageUrl: string | null
  clothesOffsetX: number
  clothesOffsetY: number
  clothesScale: number
  clothesRotation: number
  setPersonImageUrl: (url: string | null) => void
  setClothesImageUrl: (url: string | null) => void
  setClothesOffsetX: (value: number) => void
  setClothesOffsetY: (value: number) => void
  setClothesScale: (value: number) => void
  setClothesRotation: (value: number) => void
  reset: () => void
}

export const useAppStore = create<AppState>((set) => ({
  personImageUrl: null,
  clothesImageUrl: null,
  clothesOffsetX: 0,
  clothesOffsetY: -0.15,
  clothesScale: 0.45,
  clothesRotation: 0,
  setPersonImageUrl: (url) => set({ personImageUrl: url }),
  setClothesImageUrl: (url) => set({ clothesImageUrl: url }),
  setClothesOffsetX: (value) => set({ clothesOffsetX: value }),
  setClothesOffsetY: (value) => set({ clothesOffsetY: value }),
  setClothesScale: (value) => set({ clothesScale: value }),
  setClothesRotation: (value) => set({ clothesRotation: value }),
  reset: () =>
    set({
      personImageUrl: null,
      clothesImageUrl: null,
      clothesOffsetX: 0,
      clothesOffsetY: -0.15,
      clothesScale: 0.45,
      clothesRotation: 0,
    }),
}))
