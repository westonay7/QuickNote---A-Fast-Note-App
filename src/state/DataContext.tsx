import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

interface DataApi {
  /** Bumped after any note/folder/tag mutation so lists refetch automatically. */
  version: number
  bump: () => void
}

const DataContext = createContext<DataApi | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0)
  const bump = useCallback(() => setVersion((v) => v + 1), [])
  const value = useMemo(() => ({ version, bump }), [version, bump])
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData(): DataApi {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used inside DataProvider')
  return ctx
}
