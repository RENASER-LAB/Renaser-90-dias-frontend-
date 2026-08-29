import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { FichaInicialData } from '../features/onboarding/types/onboarding.types';

export type User = {
  name: string;
  email: string;
};

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isOnboardingCompleted: boolean;
  fichaData: FichaInicialData | null;
  login: (email: string, pass: string) => Promise<boolean>;
  register: (name: string, email: string, pass: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  loginWithApple: () => Promise<boolean>;
  sendOtp: (email: string) => Promise<boolean>;
  verifyOtp: (name: string, email: string, otp: string) => Promise<boolean>;
  resetPassword: (email: string) => Promise<boolean>;
  completeOnboarding: (ficha?: FichaInicialData) => void;
  restartOnboarding: () => void;
  demoLogin: () => void;
  logout: () => void;
};

const AuthCtx = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean>(false);
  const [fichaData, setFichaData] = useState<FichaInicialData | null>(null);

  const login = useCallback(async (email: string, _pass: string) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    setUser({
      name: email.split('@')[0] || 'Miembro Renaser',
      email: email.trim(),
    });
    setIsOnboardingCompleted(true);
    return true;
  }, []);

  const loginWithGoogle = useCallback(async () => {
    await new Promise(resolve => setTimeout(resolve, 600));
    setUser({
      name: 'Usuario Google',
      email: 'usuario.google@gmail.com',
    });
    setIsOnboardingCompleted(false); // New Google account passes through Onboarding
    return true;
  }, []);

  const loginWithApple = useCallback(async () => {
    await new Promise(resolve => setTimeout(resolve, 600));
    setUser({
      name: 'Usuario Apple',
      email: 'usuario.apple@icloud.com',
    });
    setIsOnboardingCompleted(false); // New Apple account passes through Onboarding
    return true;
  }, []);

  const sendOtp = useCallback(async (_email: string) => {
    await new Promise(resolve => setTimeout(resolve, 600));
    return true;
  }, []);

  const verifyOtp = useCallback(async (name: string, email: string, otp: string) => {
    await new Promise(resolve => setTimeout(resolve, 600));
    if (otp.length === 6) {
      setUser({
        name: name.trim() || email.split('@')[0] || 'Miembro Renaser',
        email: email.trim(),
      });
      setIsOnboardingCompleted(false); // New account must complete Onboarding (Términos -> Pacto -> Ficha)
      return true;
    }
    throw new Error('Código OTP inválido');
  }, []);

  const resetPassword = useCallback(async (_email: string) => {
    await new Promise(resolve => setTimeout(resolve, 600));
    return true;
  }, []);

  const register = useCallback(async (name: string, email: string, _pass: string) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    setUser({
      name: name.trim() || 'Miembro Renaser',
      email: email.trim(),
    });
    setIsOnboardingCompleted(false);
    return true;
  }, []);

  const completeOnboarding = useCallback((data?: FichaInicialData) => {
    if (data) {
      setFichaData(data);
    }
    setIsOnboardingCompleted(true);
  }, []);

  const restartOnboarding = useCallback(() => {
    setIsOnboardingCompleted(false);
  }, []);

  const demoLogin = useCallback(() => {
    setUser({
      name: 'Sebastián Arango',
      email: 'sebastian@renaser.com',
    });
    setIsOnboardingCompleted(true);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setIsOnboardingCompleted(false);
    setFichaData(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isOnboardingCompleted,
      fichaData,
      login,
      register,
      loginWithGoogle,
      loginWithApple,
      sendOtp,
      verifyOtp,
      resetPassword,
      completeOnboarding,
      restartOnboarding,
      demoLogin,
      logout,
    }),
    [
      user,
      isOnboardingCompleted,
      fichaData,
      login,
      register,
      loginWithGoogle,
      loginWithApple,
      sendOtp,
      verifyOtp,
      resetPassword,
      completeOnboarding,
      restartOnboarding,
      demoLogin,
      logout,
    ]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const context = useContext(AuthCtx);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}
