import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'VidBrief AI - Premium AI Video Summarizer & SaaS Content Generator',
  description: 'Convert any MP4 video or YouTube link into concise summaries, engaging articles, LinkedIn posts, Twitter threads, and timestamped chapters instantly using state-of-the-art AI.',
  keywords: ['AI Video Summarizer', 'YouTube transcription', 'Whisper speech to text', 'Gemini AI summaries', 'SaaS productivity', 'Content creation tools'],
  authors: [{ name: 'VidBrief AI Team' }],
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">
        {children}
      </body>
    </html>
  );
}
