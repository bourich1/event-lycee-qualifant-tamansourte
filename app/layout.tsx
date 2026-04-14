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
  title: 'Lycée Qualifiant Tamansourte — Inscription Événement',
  description:
    'Inscrivez-vous à l\'événement du Lycée Qualifiant Tamansourte et obtenez votre pass numérique avec QR code.',
  keywords: 'lycée, tamansourte, événement, inscription, scolaire',
  openGraph: {
    title: 'Lycée Qualifiant Tamansourte — Inscription Événement',
    description: 'Inscrivez-vous et recevez votre pass numérique.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className={`${syne.variable} ${dmSans.variable}`}>
      <body className="bg-[#0a0a0f] text-[#f0f0ff] font-dm antialiased min-h-screen">
        {children}
      </body>
    </html>
  )
}
