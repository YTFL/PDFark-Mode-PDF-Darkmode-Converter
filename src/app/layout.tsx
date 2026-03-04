import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#000000',
};

export const metadata: Metadata = {
  title: 'PDFark Mode - Amoled PDF Dark Mode Converter',
  description: 'Convert your PDFs to a professional dark theme instantly and securely in your browser.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PDFark Mode',
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased selection:bg-primary selection:text-black">{children}</body>
    </html>
  );
}
