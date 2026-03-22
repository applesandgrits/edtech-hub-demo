"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { user, login, loading } = useAuth();
  const router = useRouter();
  const buttonRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (user) {
      router.push("/");
      return;
    }
  }, [user, router]);

  useEffect(() => {
    if (initialized.current || loading) return;
    initialized.current = true;

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => {
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      if (!clientId || !window.google) return;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: { credential: string }) => {
          try {
            await login(response.credential);
          } catch (err) {
            console.error("Login failed:", err);
          }
        },
      });

      if (buttonRef.current) {
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          text: "signin_with",
          shape: "rectangular",
          width: 300,
        });
      }
    };
    document.head.appendChild(script);
  }, [login, loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: "calc(100vh - 49px)" }}>
        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#DC3900", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center" style={{ height: "calc(100vh - 49px)" }}>
      <div className="text-center max-w-md px-6">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: "#DC3900" }}>
          <span className="text-white font-bold text-2xl">EH</span>
        </div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: "#11181C" }}>
          EdTech Hub Evidence Library
        </h1>
        <p className="text-sm mb-8" style={{ color: "#71717A" }}>
          AI-powered search and discovery across education technology research
          for low- and middle-income countries.
        </p>
        <div className="flex justify-center mb-4">
          <div ref={buttonRef} />
        </div>
        <p className="text-xs" style={{ color: "#A1A1AA" }}>
          Sign in with your Google account to access the evidence library.
        </p>
      </div>
    </div>
  );
}

// Type declaration for Google Identity Services
declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement, config: any) => void;
          prompt: () => void;
        };
      };
    };
  }
}
