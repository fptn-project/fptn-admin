import React, {
  createContext,
  ReactElement,
  ReactNode,
  useContext,
  useState
} from 'react'

interface LayoutContextValue {
  collapsed: boolean
  toggleCollapsed: () => void
  mobileOpen: boolean
  openMobile: () => void
  closeMobile: () => void
}

const LayoutContext = createContext<LayoutContextValue | undefined>(undefined)

export const LayoutProvider = ({
  children
}: {
  children: ReactNode
}): ReactElement => {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const value: LayoutContextValue = {
    collapsed,
    toggleCollapsed: () => setCollapsed((prev) => !prev),
    mobileOpen,
    openMobile: () => setMobileOpen(true),
    closeMobile: () => setMobileOpen(false)
  }

  return (
    <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>
  )
}

export const useLayout = (): LayoutContextValue => {
  const ctx = useContext(LayoutContext)
  if (!ctx) throw new Error('useLayout must be used within a LayoutProvider')
  return ctx
}
