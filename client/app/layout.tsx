import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lilo Search - B2B Ecommerce Search',
  description: 'Advanced search engine for B2B ecommerce with hybrid search and personalization',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

