// app/dashboard/layout.tsx
'use client';

import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import ClinicLoadingAnimation from '@/components/ClinicLoadingAnimation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter();
  const { isAuthenticated, user, isLoading } = useAuthStore();
  const [initialized, setInitialized] = useState(false);
  
  useEffect(() => {
    if (!isLoading && !initialized) {
      if (!isAuthenticated) {
        router.push('/login');
      }
      setInitialized(true);
    }
  }, [isAuthenticated, router, isLoading, initialized]);

  if (isLoading || !initialized) {
    return (
      <div className="flex items-center justify-center h-screen">
        <ClinicLoadingAnimation/>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
