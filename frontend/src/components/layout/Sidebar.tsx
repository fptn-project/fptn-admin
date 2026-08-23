import React, { ReactElement, useState } from 'react'
import { NavLink as RouterNavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { navigation, NavItem } from '../../data/navigation'
import { useLayout } from './LayoutContext'

const isChildActive = (
  children: { href: string }[],
  pathname: string
): boolean => children.some((child) => child.href === pathname)

const Sidebar = (): ReactElement => {
  const { collapsed, mobileOpen, closeMobile } = useLayout()
  const { pathname } = useLocation()
  const [openMenuId, setOpenMenuId] = useState<string | null>(() => {
    const activeMenu = navigation.find(
      (item) => item.type === 'menu' && isChildActive(item.children, pathname)
    )
    return activeMenu && activeMenu.type === 'menu' ? activeMenu.id : null
  })

  const width = collapsed ? 'lg:w-[72px]' : 'lg:w-[260px]'

  return (
    <>
      <div
        role="presentation"
        onClick={closeMobile}
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 lg:hidden ${
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        className={`sidebar fixed top-16 left-0 z-40 h-[calc(100vh-4rem)] w-[260px] overflow-y-auto overflow-x-visible border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300 ${width} ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <nav className="py-5">
          {navigation.map((item, index) => (
            <NavItemRow
              key={item.type === 'category' ? `category-${index}` : item.id}
              item={item}
              collapsed={collapsed}
              pathname={pathname}
              openMenuId={openMenuId}
              setOpenMenuId={setOpenMenuId}
              onNavigate={closeMobile}
            />
          ))}
        </nav>
      </aside>
    </>
  )
}

export default Sidebar

const NavItemRow = ({
  item,
  collapsed,
  pathname,
  openMenuId,
  setOpenMenuId,
  onNavigate
}: {
  item: NavItem
  collapsed: boolean
  pathname: string
  openMenuId: string | null
  setOpenMenuId: (id: string | null) => void
  onNavigate: () => void
}): ReactElement | null => {
  const { t } = useTranslation()

  if (item.type === 'category') {
    if (collapsed) return null
    return (
      <div className="mt-4 px-6 py-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
        {t(item.labelKey)}
      </div>
    )
  }

  if (item.type === 'link') {
    const Icon = item.icon
    const isActive = pathname === item.href
    return (
      <div className="relative">
        <RouterNavLink
          to={item.href}
          onClick={onNavigate}
          title={collapsed ? t(item.labelKey) : undefined}
          className={`group flex h-11 items-center px-6 transition-colors duration-200 ${
            isActive
              ? 'bg-sidebar-accent text-primary'
              : 'text-sidebar-foreground hover:bg-sidebar-accent'
          }`}
        >
          <Icon
            className={`h-5 w-5 flex-shrink-0 transition-colors ${
              isActive
                ? 'text-primary'
                : 'text-sidebar-foreground/50 group-hover:text-sidebar-foreground'
            }`}
          />
          {!collapsed && (
            <span className="ml-3 flex-1 truncate text-left text-sm font-medium">
              {t(item.labelKey)}
            </span>
          )}
        </RouterNavLink>
      </div>
    )
  }

  const Icon = item.icon
  const isOpen = openMenuId === item.id
  const hasActiveChild = isChildActive(item.children, pathname)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpenMenuId(isOpen ? null : item.id)}
        title={collapsed ? t(item.labelKey) : undefined}
        className="group flex h-11 w-full items-center px-6 text-sidebar-foreground transition-colors duration-200 hover:bg-sidebar-accent"
      >
        <Icon className="h-5 w-5 flex-shrink-0 text-sidebar-foreground/50 transition-colors group-hover:text-sidebar-foreground" />
        {!collapsed && (
          <>
            <span className="ml-3 flex-1 truncate text-left text-sm font-medium">
              {t(item.labelKey)}
            </span>
            <Plus
              className={`h-4 w-4 text-sidebar-foreground/50 transition-transform duration-300 ${
                isOpen || hasActiveChild ? 'rotate-45' : ''
              }`}
            />
          </>
        )}
      </button>
      {!collapsed && (
        <div
          className="overflow-hidden transition-all duration-300 ease-out"
          style={{ maxHeight: isOpen ? item.children.length * 40 + 16 : 0 }}
        >
          <div className="space-y-0.5 py-1 pl-10 pr-4">
            {item.children.map((child) => {
              const isActive = pathname === child.href
              return (
                <RouterNavLink
                  key={child.id}
                  to={child.href}
                  onClick={onNavigate}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-sidebar-accent font-medium text-primary'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  }`}
                >
                  {t(child.labelKey)}
                </RouterNavLink>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
