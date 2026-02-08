
import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import { Footer } from '@/components/shared/Footer';

const fontBody = Inter({
  subsets: ['latin'],
  variable: '--font-body',
});

const fontHeadline = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-headline',
});

export const metadata: Metadata = {
  title: 'Club 7 Entertainments',
  description: 'The one-stop platform for booking and verifying event tickets.',
  icons: {
    icon: 'https://raw.githubusercontent.com/akhilmmani95/studio/main/src/WhatsApp_Image_2026-02-02_at_10.06.35_PM-removebg-preview.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn('h-full', fontBody.variable, fontHeadline.variable)}
      suppressHydrationWarning={true}
    >
      <head>
        <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
      </head>
      <body className={cn('antialiased font-body')} suppressHydrationWarning={true}>
        <FirebaseClientProvider>
          <div className="relative flex min-h-screen flex-col">
            {children}
            <Footer />
          </div>
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
