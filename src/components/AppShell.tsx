"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import UserMenu from "./UserMenu";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <>
      <nav className="sticky top-0 z-50 border-b" style={{ background: "#11181C", borderColor: "rgba(255,255,255,0.1)" }}>
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#DC3900" }}>
              <span className="text-white font-bold text-sm">EH</span>
            </div>
            <span className="font-semibold text-white tracking-tight">
              Evidence Library
            </span>
          </Link>
          <div className="flex items-center gap-1 text-sm">
            <Link href="/search" className="px-3 py-1.5 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors">
              Evidence Finder
            </Link>
            <Link href="/explore" className="px-3 py-1.5 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors">
              Repository Explorer
            </Link>
            <Link href="/themes" className="px-3 py-1.5 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors">
              Themes
            </Link>
            <div className="w-px h-5 mx-1" style={{ background: "rgba(255,255,255,0.15)" }} />
            <UserMenu />
          </div>
        </div>
      </nav>
      <main className="flex-1">{children}</main>
      <footer className="border-t mt-16" style={{ background: "#11181C", borderColor: "rgba(255,255,255,0.1)" }}>
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-sm text-white/40">
          <p>Demo prototype by sustainED. Powered by Next.js, Neon, and OpenAI.</p>
          <p className="mt-1">
            Data sourced from the{" "}
            <a href="https://docs.edtechhub.org/lib/" className="hover:underline" style={{ color: "#DC3900" }}>
              EdTech Hub Evidence Library
            </a>{" "}
            under CC-BY 4.0.
          </p>
        </div>
      </footer>
    </>
  );
}
