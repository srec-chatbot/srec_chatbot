import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthService } from '@/lib/auth';
import type { User } from '@shared/schema';

type AuthUser = Omit<User, 'password'>;

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: any) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = () => {
      if (AuthService.isAuthenticated()) {
        setUser(AuthService.getUser());
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (credentials: any) => {
    try {
      const authResponse = await AuthService.login(credentials);
      setUser(authResponse.user as AuthUser);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (userData: any) => {
    try {
      const authResponse = await AuthService.register(userData);
      setUser(authResponse.user as AuthUser);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const logout = () => {
    AuthService.logout();
    setUser(null);
  };

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
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
