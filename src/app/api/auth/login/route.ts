import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/drizzle";
import { users } from "@/lib/db/schema";
import { createToken } from "@/lib/auth";
import { usagePercent, USAGE_CAP_MICRODOLLARS } from "@/lib/services/usage";

// Simple hardcoded credentials
const CREDENTIALS: Record<string, { password: string }> = {
  admin: { password: "edtech2026!" },
  demo: { password: "demo2026" },
};

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password required" }, { status: 400 });
    }

    const cred = CREDENTIALS[username.toLowerCase()];
    if (!cred || cred.password !== password) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }

    // Find user in DB
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, username.toLowerCase()));

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const token = await createToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: null,
        role: user.role,
        ai_usage: {
          used_microdollars: user.aiUsageMicrodollars,
          cap_microdollars: USAGE_CAP_MICRODOLLARS,
          percent: usagePercent(user.aiUsageMicrodollars),
        },
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
