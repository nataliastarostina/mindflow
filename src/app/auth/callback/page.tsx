'use client';

import { Suspense } from 'react';
import AuthCallbackClient from '@/components/auth/AuthCallbackClient';

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <AuthCallbackClient />
    </Suspense>
  );
}
