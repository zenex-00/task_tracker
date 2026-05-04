import '@/app/globals.css';

import { Outfit } from 'next/font/google';
import { Toaster } from 'sonner';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const outfit = Outfit({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Daily Tracker',
  description: 'Minimal task and time tracking app with reports and analytics.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={outfit.className}>
        <div id="app">{children}</div>
        <Toaster duration={2800} position="bottom-right" />
      </body>
    </html>
  );
}
