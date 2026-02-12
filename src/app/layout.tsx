import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { AppShell } from '@/components/app-shell';

export const metadata: Metadata = {
  title: 'Excellere Revive',
  description: 'A modern and fresh version of Excellere.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script src="https://www.google.com/recaptcha/api.js" async defer></script>
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
          <AppShell>{children}</AppShell>
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
