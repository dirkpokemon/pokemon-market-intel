'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new home page
    router.replace('/home');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin text-6xl mb-4">⚡</div>
        <p className="text-gray-600">Redirecting to home...</p>
      </div>
    </div>
  );
}
