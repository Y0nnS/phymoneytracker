import type { Metadata } from 'next';
import { Space_Grotesk } from 'next/font/google';
import { Suspense } from 'react';
import './globals.css';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { FirebaseAnalytics } from '@/components/analytics/FirebaseAnalytics';
import { ToastProvider } from '@/components/ui/Toast';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Productivity Space',
  description: 'A personal workspace for tasks, notes, and finance in one place.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${spaceGrotesk.className} h-full bg-zinc-950 text-zinc-100 antialiased`}
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
