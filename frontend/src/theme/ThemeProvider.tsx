import React, {
  createContext,
  ReactElement,
  ReactNode,
  useContext,
  useEffect,
  useState
} from 'react'

type Mode = 'light' | 'dark'

interface ThemeContextValue {
  mode: Mode
  toggleMode: () => void
  setMode: (mode: Mode) => void
}

const STORAGE_KEY = 'panel-mode'

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const getInitialMode = (): Mode => {
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export const ThemeProvider = ({
  children
}: {
  children: ReactNode
}): ReactElement => {
  const [mode, setModeState] = useState<Mode>(getInitialMode)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', mode === 'dark')
    window.localStorage.setItem(STORAGE_KEY, mode)
  }, [mode])

  const setMode = (next: Mode): void => setModeState(next)
  const toggleMode = (): void =>
    setModeState((prev) => (prev === 'dark' ? 'light' : 'dark'))

  return (
    <ThemeContext.Provider value={{ mode, toggleMode, setMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
