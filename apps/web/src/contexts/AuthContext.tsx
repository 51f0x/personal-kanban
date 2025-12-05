import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AuthUser } from '../services/auth';
import { isAuthenticated, getCurrentUser, verifySession, login as loginService, logout as logoutService, signup as signupService } from '../services/auth';
import type { LoginCredentials, SignUpCredentials } from '../services/auth';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthUser>;
  signup: (credentials: SignUpCredentials) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Initialize auth state
  useEffect(() => {
    async function initAuth() {
      setIsLoading(true);

      if (isAuthenticated()) {
        // Verify session is still valid
        const isValid = await verifySession();
        if (isValid) {
          const currentUser = getCurrentUser();
          setUser(currentUser);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }

      setIsLoading(false);
    }

    initAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const userData = await loginService(credentials);
      setUser(userData);
      return userData;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (credentials: SignUpCredentials) => {
    setIsLoading(true);
    try {
      const userData = await signupService(credentials);
      setUser(userData);
      return userData;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await logoutService();
      setUser(null);
      navigate('/login');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    const isValid = await verifySession();
    if (isValid) {
      const currentUser = getCurrentUser();
      setUser(currentUser);
    } else {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

