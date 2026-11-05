import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Inter } from 'next/font/google';
import { getCatalog } from '@/lib/api';
import { SITE_URL } from '@/lib/utils';
import { AddedNotice } from '@/components/cart/added-notice';
import { CartDrawer } from '@/components/cart/cart-drawer';
import { DeliverToDialog } from '@/components/layout/deliver-to';
import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { TabBar } from '@/components/layout/tab-bar';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const bricolage = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-bricolage', display: 'swap', weight: ['500', '600', '700'] });

export async function generateMetadata(): Promise<Metadata> {
  const { store } = await getCatalog();
  const description = store.tagline ?? 'Paper, stationery and art supplies, delivered across Bangladesh.';
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: `${store.name} Bangladesh | Stationery, Paper & Art Supplies`, template: `%s | ${store.name}` },
    description,
    openGraph: { siteName: `${store.name} Bangladesh`, type: 'website', locale: 'en_BD' },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = { themeColor: '#1d5b2c', width: 'device-width', initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const catalog = await getCatalog();
  return (
    <html lang="en" className={`${inter.variable} ${bricolage.variable}`}>
      <body className="font-sans">
        <Header catalog={catalog} />
        <main className="min-h-[60vh]">{children}</main>
        <Footer catalog={catalog} />
        <TabBar />
        <CartDrawer />
        <DeliverToDialog />
        <AddedNotice />
      </body>
    </html>
  );
}
