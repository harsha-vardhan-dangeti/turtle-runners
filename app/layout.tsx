import type { Metadata, Viewport } from 'next';
import { Anton, Space_Grotesk } from 'next/font/google';
import { ToastProvider } from '@/components/ui/Toast';
import { CLUB } from '@/lib/club';
import './globals.css';

const anton = Anton({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-anton',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-grotesk',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Turtle Runners — Hyderabad triathlon club',
    template: '%s · Turtle Runners',
  },
  description:
    "Hyderabad's friendliest triathlon club. One lake, three sports, zero ego. Swim, bike and run with the group at Durgam Cheruvu Lake Front Park.",
  keywords: ['triathlon', 'Hyderabad', 'running club', 'swimming', 'cycling', 'Durgam Cheruvu'],
  openGraph: {
    title: 'Turtle Runners — Hyderabad triathlon club',
    description:
      "One lake, three sports, zero ego. Swim, bike and run with Hyderabad's friendliest triathlon club.",
    type: 'website',
    locale: 'en_IN',
    siteName: CLUB.name,
  },
};

export const viewport: Viewport = {
  themeColor: '#12A150',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${anton.variable} ${spaceGrotesk.variable}`}>
      <body className="min-h-dvh">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-full focus:bg-ink focus:px-5 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to content
        </a>
        {/* Scroll reveals start hidden; without JS they would never show. */}
        <noscript>
          <style>{'.reveal{opacity:1 !important;transform:none !important}'}</style>
        </noscript>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
