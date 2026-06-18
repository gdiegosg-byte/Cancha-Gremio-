import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AuthState, User } from '@/types';

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
      return { ...state, user: action.payload.user, token: action.payload.token, isAuthenticated: true, isLoading: false };
    case 'LOGOUT':
      return { ...initialState, isLoading: false };
    case 'UPDATE_USER':
      return { ...state, user: action.payload };
    default:
      return state;
  }
}

const AuthContext = createContext<AuthContextType | null>(null);

const API_URL = import.meta.env.VITE_API_URL || '';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

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

  async function login(email: string, password: string) {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: email, password: password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Error al iniciar sesión');
      }

      const user: User = {
        id: String(data.usuario.id_usuario),
        nombre: data.usuario.nombre,
        apellido: '',
        email: data.usuario.correo,
        telefono: data.usuario.telefono || '',
        rol: data.usuario.nombre_rol === 'admin' ? 'admin' : 'cliente',
        createdAt: new Date().toISOString(),
      };

      localStorage.setItem('cg_token', data.token);
      localStorage.setItem('cg_user', JSON.stringify(user));
      dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token: data.token } });
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