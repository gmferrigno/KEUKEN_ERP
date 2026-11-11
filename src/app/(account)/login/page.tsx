'use client';

import { useAuth } from '@/contexts/AuthContext';
import { ChangePasswordView, LoginView } from '@repo/login';

export default function Login() {
  const { login, changePassword, mustChangePassword, logout } = useAuth();

  if (mustChangePassword) {
    return (
      <ChangePasswordView
        onChangePassword={changePassword}
        onCancel={logout}
      />
    );
  }

  return <LoginView onLogin={login} />;
}
