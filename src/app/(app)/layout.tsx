import type { ReactNode } from 'react'

import { AdminBar } from '@/components/AdminBar'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { Providers } from '@/providers'
import { InitTheme } from '@/providers/Theme/InitTheme'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Ibarra_Real_Nova, Michroma, Outfit } from 'next/font/google'
import React from 'react'
import './globals.css'

// Editorial storefront type (from the Daily Hero 35 reference): Adieu is
// commercial, so Michroma stands in for the wide geometric display face.
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit', display: 'swap' })
const ibarra = Ibarra_Real_Nova({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-ibarra',
  display: 'swap',
})
const michroma = Michroma({ weight: '400', subsets: ['latin'], variable: '--font-michroma', display: 'swap' })

/* const { SITE_NAME, TWITTER_CREATOR, TWITTER_SITE } = process.env
const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL
  ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  : 'http://localhost:3000'
const twitterCreator = TWITTER_CREATOR ? ensureStartsWith(TWITTER_CREATOR, '@') : undefined
const twitterSite = TWITTER_SITE ? ensureStartsWith(TWITTER_SITE, 'https://') : undefined
 */
/* export const metadata = {
  metadataBase: new URL(baseUrl),
  robots: {
    follow: true,
    index: true,
  },
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  ...(twitterCreator &&
    twitterSite && {
      twitter: {
        card: 'summary_large_image',
        creator: twitterCreator,
        site: twitterSite,
      },
    }),
} */

export default async function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      className={[
        GeistSans.variable,
        GeistMono.variable,
        outfit.variable,
        ibarra.variable,
        michroma.variable,
      ]
        .filter(Boolean)
        .join(' ')}
      lang="en"
      suppressHydrationWarning
    >
      <head>
        <InitTheme />
        <link href="/favicon.ico" rel="icon" sizes="32x32" />
        <link href="/favicon.svg" rel="icon" type="image/svg+xml" />
      </head>
      <body>
        <Providers>
          <AdminBar />
          <LivePreviewListener />
          {children}
        </Providers>
      </body>
    </html>
  )
}
