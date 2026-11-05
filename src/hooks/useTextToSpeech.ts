import { useCallback, useEffect, useRef, useState } from 'react'

export interface TextToSpeechOptions {
  rate?: number
  pitch?: number
  lang?: string
  voiceIndex?: number
  onStart?: () => void
  onEnd?: () => void
  onError?: (error: string) => void
}

export function useTextToSpeech(options: TextToSpeechOptions = {}) {
  const [isSupported, setIsSupported] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [rate, setRate] = useState(options.rate ?? 1)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null)

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const optionsRef = useRef(options)
  optionsRef.current = options

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true)

      const updateVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices()
        setVoices(availableVoices)
        if (availableVoices.length > 0 && !selectedVoice) {
          // Default to system language or first matching voice
          const systemLang = navigator.language || 'en-US'
          const matching =
            availableVoices.find((v) => v.lang === systemLang) ||
            availableVoices.find((v) => v.lang.startsWith(systemLang.slice(0, 2))) ||
            availableVoices[0]
          setSelectedVoice(matching)
        }
      }

      updateVoices()
      window.speechSynthesis.addEventListener('voiceschanged', updateVoices)

      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', updateVoices)
      }
    }
  }, [selectedVoice])

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setIsPlaying(false)
    setIsPaused(false)
  }, [])

  const pause = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && isPlaying && !isPaused) {
      window.speechSynthesis.pause()
      setIsPaused(true)
    }
  }, [isPlaying, isPaused])

  const resume = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && isPlaying && isPaused) {
      window.speechSynthesis.resume()
      setIsPaused(false)
    }
  }, [isPlaying, isPaused])

  const speak = useCallback(
    (text: string, customOptions?: TextToSpeechOptions) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        optionsRef.current.onError?.('Text-to-Speech is not supported in this browser.')
        return
      }

      const cleanText = text.trim()
      if (!cleanText) {
        optionsRef.current.onError?.('No text to read aloud.')
        return
      }

      // Always cancel any existing playback first
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(cleanText)
      utteranceRef.current = utterance // Prevent Chrome garbage collection bug

      utterance.rate = customOptions?.rate ?? rate
      utterance.pitch = customOptions?.pitch ?? optionsRef.current.pitch ?? 1
      utterance.lang = customOptions?.lang ?? optionsRef.current.lang ?? (navigator.language || 'en-US')

      if (selectedVoice) {
        utterance.voice = selectedVoice
      }

      utterance.onstart = () => {
        setIsPlaying(true)
        setIsPaused(false)
        optionsRef.current.onStart?.()
      }

      utterance.onend = () => {
        setIsPlaying(false)
        setIsPaused(false)
        optionsRef.current.onEnd?.()
      }

      utterance.onerror = (e) => {
        if (e.error !== 'canceled' && e.error !== 'interrupted') {
          console.warn('SpeechSynthesis error:', e.error)
          optionsRef.current.onError?.(`Speech error: ${e.error}`)
        }
        setIsPlaying(false)
        setIsPaused(false)
      }

      window.speechSynthesis.speak(utterance)
    },
    [rate, selectedVoice],
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  return {
    isSupported,
    isPlaying,
    isPaused,
    rate,
    setRate,
    voices,
    selectedVoice,
    setSelectedVoice,
    speak,
    pause,
    resume,
    stop,
  }
}
