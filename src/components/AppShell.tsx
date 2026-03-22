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
      <nav className="sticky top-0 z-50 border-b overflow-x-auto" style={{ background: "#11181C", borderColor: "rgba(255,255,255,0.1)" }}>
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 min-w-0">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center" style={{ background: "#DC3900" }}>
              <span className="text-white font-bold text-xs sm:text-sm">EH</span>
            </div>
            <span className="font-semibold text-white tracking-tight text-sm hidden sm:inline">
              Evidence Library
            </span>
          </Link>
          <div className="flex items-center gap-0.5 sm:gap-1 text-xs sm:text-sm overflow-x-auto">
            <Link href="/" className={`px-2 sm:px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${pathname === "/" ? "text-white bg-white/10" : "text-white/70 hover:text-white hover:bg-white/10"}`}>
              Browse
            </Link>
            <Link href="/search" className={`px-2 sm:px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${pathname === "/search" ? "text-white bg-white/10" : "text-white/70 hover:text-white hover:bg-white/10"}`}>
              Finder
            </Link>
            <Link href="/explore" className={`px-2 sm:px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${pathname === "/explore" ? "text-white bg-white/10" : "text-white/70 hover:text-white hover:bg-white/10"}`}>
              Explorer
            </Link>
            <Link href="/themes" className={`px-2 sm:px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${pathname === "/themes" ? "text-white bg-white/10" : "text-white/70 hover:text-white hover:bg-white/10"}`}>
              Themes
            </Link>
            <div className="w-px h-5 mx-0.5 sm:mx-1 shrink-0" style={{ background: "rgba(255,255,255,0.15)" }} />
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
