import Link from 'next/link';
import BrandMark from '@/components/BrandMark';
import SiteFooter from '@/components/SiteFooter';

/** Centered card used by the small auth pages (forgot/reset password). */
export default function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-8">
          <div className="mb-4">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Terug naar inloggen
            </Link>
          </div>
          <div className="flex justify-center mb-6">
            <BrandMark size={48} />
          </div>
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
            {subtitle && <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">{subtitle}</p>}
          </div>
          {children}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

export const authInputClass =
  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-gray-900 dark:focus:ring-indigo-500 focus:border-transparent text-sm disabled:opacity-60';

export const authButtonClass =
  'w-full bg-gray-900 dark:bg-indigo-600 text-white py-2.5 px-4 rounded-lg hover:bg-gray-800 dark:hover:bg-indigo-500 disabled:bg-gray-300 dark:disabled:bg-gray-700 dark:disabled:text-gray-400 disabled:cursor-not-allowed transition text-sm font-medium';

export function AuthError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 rounded-lg text-sm">
      {message}
    </div>
  );
}
