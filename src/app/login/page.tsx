'use client';

import { Suspense } from 'react';
import LoginPageClient from '@/components/auth/LoginPageClient';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageClient />
    </Suspense>
  );
}
