'use client';

import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@repo/erp-services/userContext/auth.service';
import { ChangePasswordView, LoginView } from '@repo/login';
import type { RecoveryMethod } from '@repo/login';
import { useCallback } from 'react';

const supportContactNumber =
    process.env.PUBLIC_SUPPORT_CONTACT_NUMBER ||
    process.env.NEXT_PUBLIC_SUPPORT_CONTACT_NUMBER;

export default function Login() {
  const { login, changePassword, mustChangePassword, logout } = useAuth();

  const onRequestPasswordReset = useCallback(
    async (input: { login: string; channel: RecoveryMethod }) => {
      await authService.requestPasswordReset(input);
    },
    []
  );

  const onConfirmPasswordReset = useCallback(
    async (input: { login: string; code: string; newPassword: string }) => {
      await authService.confirmPasswordReset(input);
    },
    []
  );

  if (mustChangePassword) {
    return (
      <ChangePasswordView
        onChangePassword={changePassword}
        onCancel={logout}
      />
    );
  }

  return (
    <LoginView
      onLogin={login}
      supportContactNumber={supportContactNumber}
      onRequestPasswordReset={onRequestPasswordReset}
      onConfirmPasswordReset={onConfirmPasswordReset}
    />
  );
}
