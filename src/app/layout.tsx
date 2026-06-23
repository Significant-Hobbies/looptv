import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { AnalyticsProvider } from '@/components/posthog-provider';
import { SaaSMakerFeedback } from '@/components/saasmaker-feedback';
import { VitalsReporter } from '@/components/VitalsReporter';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const siteUrl = 'https://looptv.pages.dev';

export const metadata: Metadata = {
  title: {
    default: 'LoopTV',
    template: '%s | LoopTV',
  },
  description:
    'Pick a station. Random clips from curated YouTube channels play nonstop. No account, no algorithm.',
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: 'LoopTV',
    description:
      'Pick a station. Random clips from curated YouTube channels play nonstop. No account, no algorithm.',
    url: siteUrl,
    siteName: 'LoopTV',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LoopTV',
    description:
      'Pick a station. Random clips from curated YouTube channels play nonstop. No account, no algorithm.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: '#000000',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={geistSans.variable}>
      <body className="bg-black">
        <AnalyticsProvider>
          {children}
          <SaaSMakerFeedback />
          <VitalsReporter />
        </AnalyticsProvider>
      </body>
    </html>
  );
}
