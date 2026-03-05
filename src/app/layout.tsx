import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Suspense } from 'react';
import './globals.css';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { FirebaseAnalytics } from '@/components/analytics/FirebaseAnalytics';
import { ToastProvider } from '@/components/ui/Toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MoneyTracker',
  description: 'Money management sederhana dengan Firebase',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className="h-full">
      <body
        className={`${inter.className} h-full bg-zinc-950 text-zinc-100 antialiased`}
      >
        <Suspense fallback={null}>
          <FirebaseAnalytics />
        </Suspense>
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
