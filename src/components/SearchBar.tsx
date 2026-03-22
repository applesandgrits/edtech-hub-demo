"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SearchBar({
  initialQuery = "",
  large = false,
}: {
  initialQuery?: string;
  large?: boolean;
}) {
  const [query, setQuery] = useState(initialQuery);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask a question about education technology evidence..."
          className={`w-full rounded-xl bg-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#DC3900]/40 ${
            large ? "px-6 py-4 text-lg" : "px-4 py-3 text-sm"
          }`}
          style={{ color: "#11181C", border: "1px solid rgba(0,0,0,0.1)" }}
        />
        <button
          type="submit"
          className={`absolute right-2 text-white rounded-lg transition-colors ${
            large ? "top-2 px-6 py-2 text-base" : "top-1.5 px-4 py-1.5 text-sm"
          }`}
          style={{ background: "#DC3900" }}
          onMouseOver={(e) => (e.currentTarget.style.background = "#B83000")}
          onMouseOut={(e) => (e.currentTarget.style.background = "#DC3900")}
        >
          Search
        </button>
      </div>
    </form>
  );
}
