import React, { ReactElement } from 'react'
import { Route, Routes } from 'react-router-dom'
import DashboardLayout from './components/layout/DashboardLayout'
import RequireAuth from './components/RequireAuth'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import Servers from './pages/Servers'
import TelegramBot from './pages/TelegramBot'
import GivePremiumAccess from './pages/GivePremiumAccess'
import Login from './pages/Login'
import ChangePassword from './pages/ChangePassword'
import ComingSoon from './pages/ComingSoon'
import { AuthProvider } from './context/AuthContext'

const App = (): ReactElement => {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/change-password"
          element={
            <RequireAuth>
              <ChangePassword />
            </RequireAuth>
          }
        />
        <Route
          element={
            <RequireAuth>
              <DashboardLayout />
            </RequireAuth>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/users" element={<Users />} />
          <Route path="/servers" element={<Servers />} />
          <Route path="/telegram-bot" element={<TelegramBot />} />
          <Route path="/premium" element={<GivePremiumAccess />} />
          <Route path="*" element={<ComingSoon />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}

export default App
