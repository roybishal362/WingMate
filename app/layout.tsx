import type { Metadata } from "next";
import Link from "next/link";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display", weight: ["400", "600", "700"] });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Wingmate — agents that date for you",
  description: "Every person is represented by an AI agent. The agents read LinkedIn + Instagram, go on dates with each other, and rank who fits best.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-screen font-sans antialiased">
        <header className="sticky top-0 z-30 border-b border-line/70 bg-ink/80 backdrop-blur">
          <nav className="mx-auto flex max-w-6xl items-center gap-1 px-4 py-3 text-sm">
            <Link href="/" className="mr-4 flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-rose text-ink">♥</span>
              <span className="h-display text-xl font-semibold">Wingmate</span>
            </Link>
            <Link href="/" className="rounded-lg px-3 py-1.5 text-muted hover:text-cream">Live</Link>
            <Link href="/demo" className="rounded-lg px-3 py-1.5 text-muted hover:text-cream">Demo (25 people)</Link>
            <Link href="/dates" className="rounded-lg px-3 py-1.5 text-muted hover:text-cream">Dates</Link>
            <Link href="/rankings" className="rounded-lg px-3 py-1.5 text-muted hover:text-cream">Rankings</Link>
            <Link href="/how" className="ml-auto rounded-lg px-3 py-1.5 text-muted hover:text-cream">How it works</Link>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 pb-20 pt-8">{children}</main>
        <footer className="border-t border-line/70 py-8 text-center text-xs text-muted">
          Built from public LinkedIn + public Instagram data only (scraped with Apify) for an assessment demo. AI inferences can be wrong. Not affiliated with any person shown.
        </footer>
      </body>
    </html>
  );
}
