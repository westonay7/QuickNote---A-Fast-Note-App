import { Volume2, VolumeX, Play, Pause, Square, FastForward } from 'lucide-react'

interface TextToSpeechPlayerProps {
  title?: string
  isPlaying: boolean
  isPaused: boolean
  rate: number
  onPlayPause: () => void
  onStop: () => void
  onChangeRate: (rate: number) => void
}

const SPEED_OPTIONS = [0.8, 1, 1.25, 1.5, 2]

export function TextToSpeechPlayer({
  title,
  isPlaying,
  isPaused,
  rate,
  onPlayPause,
  onStop,
  onChangeRate,
}: TextToSpeechPlayerProps) {
  if (!isPlaying && !isPaused) {
    return null
  }

  const cycleRate = () => {
    const currentIndex = SPEED_OPTIONS.indexOf(rate)
    const nextIndex = (currentIndex + 1) % SPEED_OPTIONS.length
    onChangeRate(SPEED_OPTIONS[nextIndex])
  }

  return (
    <div
      role="region"
      aria-label="Text to speech player"
      className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-200 bg-brand-50/95 p-3.5 shadow-raised backdrop-blur-md animate-slide-up dark:border-brand-800 dark:bg-brand-950/90"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-soft">
          {isPlaying && !isPaused ? (
            <span className="relative flex h-3.5 w-3.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-60" />
              <Volume2 className="relative h-3.5 w-3.5" aria-hidden />
            </span>
          ) : (
            <VolumeX className="h-3.5 w-3.5" aria-hidden />
          )}
        </div>

        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-brand-900 dark:text-brand-200">
            <span>{isPaused ? 'Playback paused' : 'Reading aloud…'}</span>
            <span className="rounded bg-brand-200/70 px-1.5 py-0.2 text-[0.68rem] font-bold text-brand-800 dark:bg-brand-900 dark:text-brand-300">
              {rate}x
            </span>
          </p>
          <p className="truncate text-xs text-zinc-600 dark:text-zinc-400">
            {title ? `“${title}”` : 'Current note'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={onPlayPause}
          aria-label={isPaused ? 'Resume reading' : 'Pause reading'}
          title={isPaused ? 'Resume reading' : 'Pause reading'}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-xs font-semibold text-white shadow-soft transition hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 active:scale-95"
        >
          {isPaused ? (
            <>
              <Play className="h-3.5 w-3.5 fill-current" aria-hidden />
              <span>Resume</span>
            </>
          ) : (
            <>
              <Pause className="h-3.5 w-3.5 fill-current" aria-hidden />
              <span>Pause</span>
            </>
          )}
        </button>

        {/* Speed button */}
        <button
          type="button"
          onClick={cycleRate}
          title="Change reading speed"
          aria-label={`Reading speed: ${rate}x. Click to change.`}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-brand-200 bg-white px-2.5 text-xs font-semibold text-zinc-700 shadow-soft transition hover:bg-zinc-50 dark:border-white/10 dark:bg-surface-dark dark:text-zinc-200 dark:hover:bg-white/10"
        >
          <FastForward className="h-3 w-3" aria-hidden />
          <span>{rate}x</span>
        </button>

        {/* Stop Button */}
        <button
          type="button"
          onClick={onStop}
          aria-label="Stop reading"
          title="Stop reading"
          className="inline-flex h-8 items-center justify-center rounded-lg border border-brand-200 bg-white px-2.5 text-xs font-medium text-zinc-600 shadow-soft transition hover:bg-zinc-50 hover:text-zinc-900 dark:border-white/10 dark:bg-surface-dark dark:text-zinc-300 dark:hover:bg-white/10"
        >
          <Square className="h-3.5 w-3.5 fill-current" aria-hidden />
          <span className="ml-1 sm:inline">Stop</span>
        </button>
      </div>
    </div>
  )
}
