"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    router.push("/");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        setSubmitting(false);
        return;
      }

      localStorage.setItem("token", data.token);
      window.location.href = "/";
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: "#11181C" }}>
      <div className="w-full max-w-sm px-6">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "#DC3900" }}
          >
            <span className="text-white font-bold text-2xl">EH</span>
          </div>
          <h1 className="text-xl font-bold text-white">
            Evidence Library
          </h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
            Sign in to access the evidence library
          </p>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin or demo"
                className="w-full px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#DC3900]/40"
                style={{ background: "white", border: "1px solid rgba(0,0,0,0.1)", color: "#11181C" }}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#DC3900]/40"
                style={{ background: "white", border: "1px solid rgba(0,0,0,0.1)", color: "#11181C" }}
              />
            </div>
          </div>

          {error && (
            <p className="text-xs mt-3 px-3 py-2 rounded-lg" style={{ background: "rgba(220,57,0,0.08)", color: "#DC3900" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !username || !password}
            className="w-full mt-4 py-2.5 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
            style={{ background: "#DC3900" }}
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="text-center text-[10px] mt-6" style={{ color: "rgba(255,255,255,0.3)" }}>
          Contact your administrator for access credentials.
        </p>
      </div>
    </div>
  );
}
