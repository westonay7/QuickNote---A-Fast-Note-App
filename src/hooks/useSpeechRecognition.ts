import { useEffect, useRef, useState, useCallback } from 'react'

export interface UseSpeechRecognitionOptions {
  onTranscript?: (text: string) => void
  lang?: string
}

export function useSpeechRecognition({ onTranscript, lang }: UseSpeechRecognitionOptions = {}) {
  const [isListening, setIsListening] = useState(false)
  const [interimText, setInterimText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSupported, setIsSupported] = useState(false)

  // Web Speech API recognition instance
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const onTranscriptRef = useRef(onTranscript)
  onTranscriptRef.current = onTranscript

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      setIsSupported(Boolean(SpeechRecognition))
    }
  }, [])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        /* ignore already stopped errors */
      }
    }
    setIsListening(false)
    setInterimText('')
  }, [])

  const startListening = useCallback(() => {
    setError(null)
    if (typeof window === 'undefined') return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      setError('Web Speech API is not supported in this browser.')
      return
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }

      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = lang || (typeof navigator !== 'undefined' ? navigator.language : 'en-US') || 'en-US'

      recognition.onstart = () => {
        setIsListening(true)
        setError(null)
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        let interim = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          const transcript = result[0]?.transcript ?? ''
          if (result.isFinal) {
            const cleaned = transcript.trim()
            if (cleaned && onTranscriptRef.current) {
              onTranscriptRef.current(cleaned)
            }
          } else {
            interim += transcript
          }
        }
        setInterimText(interim)
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setError('Microphone permission was denied. Please allow microphone access in your browser.')
          setIsListening(false)
        } else if (event.error === 'no-speech') {
          // Expected when silent for a moment; don't terminate immediately
        } else if (event.error === 'network') {
          setError('Network error during speech recognition.')
          setIsListening(false)
        } else if (event.error !== 'aborted') {
          setError(`Speech recognition: ${event.error}`)
          setIsListening(false)
        }
      }

      recognition.onend = () => {
        setIsListening(false)
        setInterimText('')
      }

      recognitionRef.current = recognition
      recognition.start()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start speech recognition')
      setIsListening(false)
    }
  }, [lang])

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }, [isListening, startListening, stopListening])

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch {
          /* ignore */
        }
      }
    }
  }, [])

  return {
    isSupported,
    isListening,
    interimText,
    error,
    startListening,
    stopListening,
    toggleListening,
  }
}
