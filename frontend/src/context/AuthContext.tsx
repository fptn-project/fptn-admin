import {
  ReactElement,
  ReactNode,
  createContext,
  useContext,
  useState
} from 'react'
import {
  changePassword as changePasswordRequest,
  login as loginRequest,
  logout as logoutRequest
} from '../api/auth'
import { getMustChangePassword, getToken } from '../api/client'

interface AuthContextValue {
  isAuthenticated: boolean
  mustChangePassword: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  changePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const AuthProvider = ({
  children
}: {
  children: ReactNode
}): ReactElement => {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => getToken() !== null
  )
  const [mustChangePassword, setMustChangePasswordState] = useState(() =>
    getMustChangePassword()
  )

  const login = async (username: string, password: string): Promise<void> => {
    const data = await loginRequest(username, password)
    setMustChangePasswordState(data.mustChangePassword)
    setIsAuthenticated(true)
  }

  const logout = (): void => {
    logoutRequest()
    setIsAuthenticated(false)
    setMustChangePasswordState(false)
  }

  const changePassword = async (
    currentPassword: string,
    newPassword: string
  ): Promise<void> => {
    await changePasswordRequest({ currentPassword, newPassword })
    setMustChangePasswordState(false)
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        mustChangePassword,
        login,
        logout,
        changePassword
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
