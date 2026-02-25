import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AuthState, User } from '@/types';

// =============================================
// Auth Context
// =============================================

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: User };

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
      };
    case 'LOGOUT':
      return { ...initialState, isLoading: false };
    case 'UPDATE_USER':
      return { ...state, user: action.payload };
    default:
      return state;
  }
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for persisted session on mount
  useEffect(() => {
    const token = localStorage.getItem('cg_token');
    const userStr = localStorage.getItem('cg_user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as User;
        dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token } });
      } catch {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    } else {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  async function login(email: string, _password: string) {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      // TODO: Replace with real API call
      // const response = await api.post('/auth/login', { email, password });
      // Mocked for skeleton:
      await new Promise(r => setTimeout(r, 800));
      const mockUser: User = {
        id: '1',
        nombre: 'Admin',
        apellido: 'CanchaGremio',
        email,
        telefono: '3001234567',
        rol: email.includes('admin') ? 'admin' : 'cliente',
        createdAt: new Date().toISOString(),
      };
      const mockToken = 'mock-jwt-token';
      localStorage.setItem('cg_token', mockToken);
      localStorage.setItem('cg_user', JSON.stringify(mockUser));
      dispatch({ type: 'LOGIN_SUCCESS', payload: { user: mockUser, token: mockToken } });
    } catch (err) {
      dispatch({ type: 'SET_LOADING', payload: false });
      throw err;
    }
  }

  function logout() {
    localStorage.removeItem('cg_token');
    localStorage.removeItem('cg_user');
    dispatch({ type: 'LOGOUT' });
  }

  function updateUser(user: User) {
    localStorage.setItem('cg_user', JSON.stringify(user));
    dispatch({ type: 'UPDATE_USER', payload: user });
  }

  return (
    <AuthContext.Provider value={{ ...state, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
