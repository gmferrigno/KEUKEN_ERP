'use client';

import { authService } from '@repo/erp-services/userContext/auth.service';
import { ActivateAccountView } from '@repo/login';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useMemo } from 'react';

function ActivateAccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const login = useMemo(
    () => (searchParams.get('login') || '').trim().toLowerCase(),
    [searchParams]
  );
  const linkToken = useMemo(
    () => searchParams.get('token')?.trim() || undefined,
    [searchParams]
  );

  const onActivate = useCallback(
    async (payload: {
      login: string;
      code: string;
      newPassword: string;
      linkToken?: string;
    }) => {
      await authService.activateConfirm(payload);
    },
    []
  );

  const onResend = useCallback(async (loginValue: string) => {
    await authService.activateResend(loginValue);
  }, []);

  const onBackToLogin = useCallback(() => {
    router.push('/login');
  }, [router]);

  if (!login) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary-950 px-6">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-bold text-main">Link incompleto</h1>
          <p className="mt-2 text-sm text-main/70">
            Falta el parámetro <code className="text-main">login</code> en la URL de
            activación.
          </p>
          <button
            type="button"
            onClick={onBackToLogin}
            className="mt-6 text-sm text-focus-300 hover:underline"
          >
            Ir al login
          </button>
        </div>
      </div>
    );
  }

  return (
    <ActivateAccountView
      login={login}
      linkToken={linkToken}
      onActivate={onActivate}
      onResend={onResend}
      onBackToLogin={onBackToLogin}
    />
  );
}

export default function ActivatePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-primary-950 text-main">
          Cargando…
        </div>
      }
    >
      <ActivateAccountContent />
    </Suspense>
  );
}
