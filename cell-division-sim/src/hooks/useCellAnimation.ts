import { useRef, useCallback, useEffect } from 'react'
import gsap from 'gsap'

export function useCellAnimation() {
  const progressRef = useRef({ value: 0 })
  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const isAnimatingRef = useRef(false)

  const play = useCallback(() => {
    if (isAnimatingRef.current) return

    isAnimatingRef.current = true

    if (tlRef.current) {
      tlRef.current.kill()
    }

    const tl = gsap.timeline({
      onComplete: () => {
        isAnimatingRef.current = false
      },
    })

    tlRef.current = tl

    tl.to(progressRef.current, {
      value: 1,
      duration: 5,
      ease: 'none',
    })

    return tl
  }, [])

  const pause = useCallback(() => {
    if (tlRef.current) {
      tlRef.current.pause()
      isAnimatingRef.current = false
    }
  }, [])

  const resume = useCallback(() => {
    if (tlRef.current) {
      tlRef.current.resume()
      isAnimatingRef.current = true
    }
  }, [])

  const reset = useCallback(() => {
    if (tlRef.current) {
      tlRef.current.kill()
      tlRef.current = null
    }
    isAnimatingRef.current = false
    progressRef.current.value = 0
  }, [])

  useEffect(() => {
    return () => {
      if (tlRef.current) {
        tlRef.current.kill()
      }
    }
  }, [])

  return { progressRef, play, pause, resume, reset }
}