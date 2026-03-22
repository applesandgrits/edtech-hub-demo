"use client";

import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface UserRow {
  id: number;
  email: string;
  name: string;
  role: string;
  ai_usage_microdollars: number;
  created_at: string;
}

export default function AdminPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      router.push("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!token) return;
    fetch("/api/admin/usage", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setUsers(data.users || []);
        setLoadingUsers(false);
      })
      .catch(() => setLoadingUsers(false));
  }, [token]);

  const resetUsage = async (userId: number) => {
    if (!token) return;
    await fetch("/api/admin/usage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ userId, action: "reset" }),
    });
    // Refresh
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, ai_usage_microdollars: 0 } : u))
    );
  };

  const resetAll = async () => {
    if (!token) return;
    await fetch("/api/admin/usage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action: "reset_all" }),
    });
    setUsers((prev) => prev.map((u) => ({ ...u, ai_usage_microdollars: 0 })));
  };

  if (loading || !user || user.role !== "admin") {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: "#DC3900", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2" style={{ color: "#11181C" }}>Admin Panel</h1>
      <p className="text-sm mb-8" style={{ color: "#71717A" }}>
        Manage users and AI usage. Signed in as {user.email}.
      </p>

      {/* Usage stats */}
      <div className="rounded-xl p-5 mb-6" style={{ background: "white", border: "1px solid rgba(0,0,0,0.08)" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold" style={{ color: "#11181C" }}>AI Usage by User</h2>
          <button
            onClick={resetAll}
            className="text-xs px-3 py-1.5 rounded-md transition-colors"
            style={{ background: "rgba(220,57,0,0.1)", color: "#DC3900" }}
          >
            Reset All
          </button>
        </div>

        {loadingUsers ? (
          <p className="text-sm" style={{ color: "#A1A1AA" }}>Loading...</p>
        ) : (
          <div className="space-y-3">
            {users.map((u) => {
              const pct = Math.min(100, Math.round((u.ai_usage_microdollars / 500_000) * 100));
              const dollars = (u.ai_usage_microdollars / 1_000_000).toFixed(3);
              return (
                <div key={u.id} className="flex items-center gap-3 py-2" style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "#11181C" }}>
                      {u.name || u.email}
                      {u.role === "admin" && (
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(220,57,0,0.1)", color: "#DC3900" }}>
                          admin
                        </span>
                      )}
                    </p>
                    <p className="text-xs" style={{ color: "#A1A1AA" }}>{u.email}</p>
                  </div>
                  <div className="w-32 shrink-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px]" style={{ color: "#71717A" }}>${dollars}</span>
                      <span className="text-[10px]" style={{ color: "#A1A1AA" }}>{pct}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "#EAE9E5" }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          background: pct > 80 ? "#DC3900" : pct > 50 ? "#F59E0B" : "#22C55E",
                        }}
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => resetUsage(u.id)}
                    className="text-[10px] px-2 py-1 rounded shrink-0 transition-colors hover:bg-gray-100"
                    style={{ color: "#71717A" }}
                  >
                    Reset
                  </button>
                </div>
              );
            })}
            {users.length === 0 && (
              <p className="text-sm" style={{ color: "#A1A1AA" }}>No users yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
