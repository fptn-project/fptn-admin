import {
  LayoutDashboard,
  Send,
  Server,
  Users,
  type LucideIcon
} from 'lucide-react'

export interface NavLink {
  type: 'link'
  id: string
  labelKey: string
  icon: LucideIcon
  href: string
}

export interface NavMenu {
  type: 'menu'
  id: string
  labelKey: string
  icon: LucideIcon
  children: { id: string; labelKey: string; href: string }[]
}

export interface NavCategory {
  type: 'category'
  labelKey: string
}

export type NavItem = NavLink | NavMenu | NavCategory

export const navigation: NavItem[] = [
  {
    type: 'link',
    id: 'dashboard',
    labelKey: 'nav.dashboard',
    icon: LayoutDashboard,
    href: '/'
  },
  {
    type: 'link',
    id: 'users',
    labelKey: 'nav.users',
    icon: Users,
    href: '/users'
  },
  {
    type: 'link',
    id: 'servers',
    labelKey: 'nav.servers',
    icon: Server,
    href: '/servers'
  },
  {
    type: 'link',
    id: 'telegramBot',
    labelKey: 'nav.telegramBot',
    icon: Send,
    href: '/telegram-bot'
  }
]
