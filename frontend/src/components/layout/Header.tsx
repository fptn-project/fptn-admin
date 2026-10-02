import React, { ReactElement, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sparkles,
  Sun
} from 'lucide-react'
import { useLayout } from './LayoutContext'
import { useTheme } from '../../theme/ThemeProvider'
import { useAuth } from '../../context/AuthContext'
import Button from '../ui/Button'
import LanguageSwitcher from './LanguageSwitcher'

const Header = (): ReactElement => {
  const { t } = useTranslation()
  const { collapsed, toggleCollapsed, openMobile } = useLayout()
  const { mode, toggleMode } = useTheme()
  const { logout, username } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isUsersPage = location.pathname === '/users'
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const initials = username ? username.slice(0, 2).toUpperCase() : '··'

  const handleLogout = (): void => {
    setUserMenuOpen(false)
    logout()
    navigate('/login', { replace: true })
  }

  const handleOpenProfileSettings = (): void => {
    setUserMenuOpen(false)
    navigate('/profile')
  }

  useEffect(() => {
    const onClickOutside = (event: MouseEvent): void => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <header className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center border-b border-border bg-card">
      <div
        className={`hidden h-full flex-shrink-0 items-center border-r border-border px-5 transition-all duration-300 lg:flex ${
          collapsed ? 'w-[72px] px-0 justify-center' : 'w-[260px]'
        }`}
      >
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            F
          </span>
          {!collapsed && (
            <span className="text-lg font-semibold text-foreground">
              FPTNPanel
            </span>
          )}
        </Link>
      </div>

      <div className="flex min-w-0 items-center px-4 lg:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={openMobile}
          className="mr-2 flex-shrink-0 text-muted-foreground hover:text-foreground"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            F
          </span>
          <span className="hidden truncate whitespace-nowrap text-lg font-semibold text-foreground sm:inline">
            FPTN panel
          </span>
        </Link>
      </div>

      <div className="flex h-full flex-1 items-center px-4 lg:px-5">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleCollapsed}
          className="hidden text-muted-foreground hover:text-foreground lg:flex"
        >
          {collapsed ? (
            <PanelLeftOpen className="h-5 w-5" />
          ) : (
            <PanelLeftClose className="h-5 w-5" />
          )}
        </Button>

        <div className="ml-auto flex flex-shrink-0 items-center gap-1 sm:gap-2">
          {isUsersPage && (
            <Button
              size="sm"
              onClick={() => navigate('/premium')}
              title={t('header.givePremiumAccess')}
            >
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">
                {t('header.givePremiumAccess')}
              </span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMode}
            title={t('header.toggleTheme')}
            className="text-muted-foreground hover:text-foreground"
          >
            {mode === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
          <LanguageSwitcher />

          <div className="relative ml-1 sm:ml-2" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setUserMenuOpen((prev) => !prev)}
              className="h-9 w-9 overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-rose-500 ring-2 ring-background"
            >
              <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-white">
                {initials}
              </span>
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-xl">
                <div className="border-b border-border p-4">
                  <p className="font-semibold">{username ?? '…'}</p>
                </div>
                <div className="py-2">
                  <button
                    type="button"
                    onClick={handleOpenProfileSettings}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Settings className="h-4 w-4" />
                    <span>{t('header.profileSettings')}</span>
                  </button>
                </div>
                <div className="border-t border-border p-3">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {t('header.logOut')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
