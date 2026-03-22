"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";

export default function UserMenu() {
  const { user, logout, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (loading || !user) return null;

  const usagePercent = user.ai_usage.percent;
  const usageDollars = (user.ai_usage.used_microdollars / 1_000_000).toFixed(2);
  const capDollars = (user.ai_usage.cap_microdollars / 1_000_000).toFixed(2);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1 rounded-lg transition-colors hover:bg-white/10"
      >
        {/* Usage bar (mini) */}
        <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.2)" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${usagePercent}%`,
              background: usagePercent > 80 ? "#DC3900" : usagePercent > 50 ? "#F59E0B" : "#22C55E",
            }}
          />
        </div>
        {/* Avatar */}
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={user.name || user.email}
            className="w-7 h-7 rounded-full border border-white/20"
          />
        ) : (
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "#DC3900" }}>
            {(user.name || user.email)[0].toUpperCase()}
          </div>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-64 rounded-xl shadow-lg py-2 z-50"
          style={{ background: "white", border: "1px solid rgba(0,0,0,0.08)" }}
        >
          {/* User info */}
          <div className="px-4 py-2" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
            <p className="text-sm font-medium" style={{ color: "#11181C" }}>
              {user.name || user.email}
            </p>
            <p className="text-xs" style={{ color: "#A1A1AA" }}>{user.email}</p>
          </div>

          {/* Usage meter */}
          <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium" style={{ color: "#71717A" }}>AI Usage</span>
              <span className="text-xs" style={{ color: "#A1A1AA" }}>
                ${usageDollars} / ${capDollars}
              </span>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "#EAE9E5" }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${usagePercent}%`,
                  background: usagePercent > 80 ? "#DC3900" : usagePercent > 50 ? "#F59E0B" : "#22C55E",
                }}
              />
            </div>
            <p className="text-[10px] mt-1" style={{ color: "#A1A1AA" }}>
              {usagePercent}% of limit used
            </p>
          </div>

          {/* Admin link */}
          {user.role === "admin" && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm transition-colors hover:bg-gray-50"
              style={{ color: "#11181C" }}
            >
              Admin Panel
            </Link>
          )}

          {/* Logout */}
          <button
            onClick={() => { logout(); setOpen(false); }}
            className="w-full text-left px-4 py-2 text-sm transition-colors hover:bg-gray-50"
            style={{ color: "#DC3900" }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
