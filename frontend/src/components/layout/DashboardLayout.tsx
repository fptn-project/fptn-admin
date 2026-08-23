import React, { ReactElement } from 'react'
import { Outlet } from 'react-router-dom'
import { LayoutProvider, useLayout } from './LayoutContext'
import Header from './Header'
import Sidebar from './Sidebar'

const Shell = (): ReactElement => {
  const { collapsed } = useLayout()

  return (
    <div className="min-h-screen">
      <Header />
      <Sidebar />
      <main
        className={`min-h-screen pt-16 transition-all duration-300 ${
          collapsed ? 'lg:ml-[72px]' : 'lg:ml-[260px]'
        }`}
      >
        <div className="p-4 sm:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

const DashboardLayout = (): ReactElement => (
  <LayoutProvider>
    <Shell />
  </LayoutProvider>
)

export default DashboardLayout
