export const metadata = {
  title: 'NCAA Tournament Predictions v9',
  description: '2026 March Madness bracket predictions',
}
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  )
}
