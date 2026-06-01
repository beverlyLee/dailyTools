import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'

export function useLocalStorage<T>(
  key: string,
  initial: T,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw !== null) {
        return JSON.parse(raw) as T
      }
    } catch (e) {
      console.warn(`useLocalStorage: failed to read key ${key}`, e)
    }
    return initial
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (e) {
      console.warn(`useLocalStorage: failed to write key ${key}`, e)
    }
  }, [key, value])

  return [value, setValue]
}
