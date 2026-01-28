//components/layout/dashboard-layout.tsx

'use client';

import ClinicLoadingAnimation from '@/components/ClinicLoadingAnimation';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter();
  const { isAuthenticated, user, isLoading } = useAuthStore();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!isLoading && !initialized) {
      // Only check when not loading
      if (!isAuthenticated) {
        router.push('/login');
      } else {
        setInitialized(true);
      }
    }
  }, [isAuthenticated, user, router, isLoading, initialized]);

  if (isLoading || !initialized) {
    return (
      <div className="flex items-center justify-center h-screen">
        <ClinicLoadingAnimation/>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="flex h-screen">
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-screen">
      <p>Redirecting...</p>
    </div>
  );
}
