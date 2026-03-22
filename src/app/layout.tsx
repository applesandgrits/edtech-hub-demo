import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const montserrat = Montserrat({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "EdTech Hub Evidence Library",
  description:
    "AI-powered evidence library for education technology research in low- and middle-income countries",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${montserrat.className} h-full antialiased`}>
      <body className="min-h-full flex flex-col" style={{ background: "#F4F2EE" }}>
        <nav className="sticky top-0 z-50 border-b" style={{ background: "#11181C", borderColor: "rgba(255,255,255,0.1)" }}>
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#5CACFD" }}>
                <span className="text-white font-bold text-sm">EH</span>
              </div>
              <span className="font-semibold text-white tracking-tight">
                Evidence Library
              </span>
            </Link>
            <div className="flex items-center gap-1 text-sm">
              <Link
                href="/search"
                className="px-3 py-1.5 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                Evidence Finder
              </Link>
              <Link
                href="/explore"
                className="px-3 py-1.5 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                Repository Explorer
              </Link>
              <Link
                href="/themes"
                className="px-3 py-1.5 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                Themes
              </Link>
              <a
                href="https://edtechhub.org"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                EdTech Hub
              </a>
            </div>
          </div>
        </nav>
        <main className="flex-1">{children}</main>
        <footer className="border-t mt-16" style={{ background: "#11181C", borderColor: "rgba(255,255,255,0.1)" }}>
          <div className="max-w-6xl mx-auto px-4 py-6 text-center text-sm text-white/40">
            <p>
              Demo prototype by sustainED. Powered by Next.js, Neon, and OpenAI.
            </p>
            <p className="mt-1">
              Data sourced from the{" "}
              <a
                href="https://docs.edtechhub.org/lib/"
                className="hover:underline"
                style={{ color: "#5CACFD" }}
              >
                EdTech Hub Evidence Library
              </a>{" "}
              under CC-BY 4.0.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
