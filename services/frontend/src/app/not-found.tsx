import Link from 'next/link';
import PublicHeader from '@/components/PublicHeader';
import SiteFooter from '@/components/SiteFooter';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <PublicHeader />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-md text-center">
          <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">404</p>
          <h1 className="text-2xl font-bold mb-2">Deze pagina bestaat niet</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            Misschien is de link oud of zit er een typfout in. Hiermee kom je verder:
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/" className="bg-gray-900 dark:bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-gray-800 dark:hover:bg-indigo-500 text-sm font-medium">
              Naar de startpagina
            </Link>
            <Link href="/prijscheck" className="px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-medium hover:bg-white dark:hover:bg-gray-900">
              Prijscheck
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
