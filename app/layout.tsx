import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'IoU',
  description: 'Borrow from neighbors, build trust',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body style={{ margin: 0, padding: 0, background: '#fff' }}>
        {children}
      </body>
    </html>
  )
}