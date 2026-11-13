import { useUserStore } from '../store/userStore';

export function useAuth() {
  const {
    user,
    token,
    isAuthenticated,
    isLoading,
    setUser,
    setToken,
    logout,
    loginAsDemoUser,
    updatePreferences,
    addEcoPoints,
  } = useUserStore();

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    setUser,
    setToken,
    logout,
    loginAsDemoUser,
    updatePreferences,
    addEcoPoints,
    isStudentDemo: user?.email.includes('student'),
    hasDisability: !!user?.preferences?.hasDisability,
  };
}
