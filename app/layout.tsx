import type { Metadata } from 'next'
import { Syne, DM_Sans } from 'next/font/google'
import './globals.css'

const syne = Syne({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-syne',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-dm-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Tamansourte High School — Event Registration',
  description: 'Register for the Tamansourte High School event and get your digital pass with QR code.',
  keywords: 'tamansourte, high school, event, registration',
  openGraph: {
    title: 'Tamansourte High School — Event Registration',
    description: 'Register and receive your digital pass.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${syne.variable} ${dmSans.variable}`}>
      <body className="bg-[#0a0a0f] text-[#f0f0ff] font-dm antialiased min-h-screen">
        {children}
      </body>
    </html>
  )
}
