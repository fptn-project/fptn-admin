import {
  ReactElement,
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState
} from 'react'
import {
  changePassword as changePasswordRequest,
  getCurrentAdmin,
  login as loginRequest,
  logout as logoutRequest
} from '../api/auth'
import {
  getMustChangePassword,
  getToken,
  setUnauthorizedHandler
} from '../api/client'

interface AuthContextValue {
  isAuthenticated: boolean
  mustChangePassword: boolean
  username: string | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  changePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<void>
  refreshProfile: () => Promise<void>
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
  const [username, setUsername] = useState<string | null>(null)

  const refreshProfile = async (): Promise<void> => {
    try {
      const profile = await getCurrentAdmin()
      setUsername(profile.username)
    } catch {
      setUsername(null)
    }
  }

  const login = async (username: string, password: string): Promise<void> => {
    const data = await loginRequest(username, password)
    setMustChangePasswordState(data.mustChangePassword)
    setIsAuthenticated(true)
  }

  const logout = (): void => {
    logoutRequest()
    setIsAuthenticated(false)
    setMustChangePasswordState(false)
    setUsername(null)
  }

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setIsAuthenticated(false)
      setMustChangePasswordState(false)
      setUsername(null)
    })
    return () => setUnauthorizedHandler(null)
  }, [])

  useEffect(() => {
    if (isAuthenticated) void refreshProfile()
  }, [isAuthenticated])

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
        username,
        login,
        logout,
        changePassword,
        refreshProfile
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
