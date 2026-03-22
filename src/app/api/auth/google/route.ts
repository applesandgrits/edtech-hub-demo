import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/drizzle";
import { users } from "@/lib/db/schema";
import { verifyGoogleToken, createToken } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-emails";
import { usagePercent, USAGE_CAP_MICRODOLLARS } from "@/lib/services/usage";

export async function POST(request: Request) {
  try {
    const { id_token } = await request.json();
    if (!id_token) {
      return NextResponse.json({ error: "Missing id_token" }, { status: 400 });
    }

    const googleUser = await verifyGoogleToken(id_token);
    if (!googleUser) {
      return NextResponse.json({ error: "Invalid Google token" }, { status: 401 });
    }

    // Find or create user
    let existingUser = await db
      .select()
      .from(users)
      .where(eq(users.googleId, googleUser.sub))
      .then((rows) => rows[0] ?? null);

    if (!existingUser) {
      existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, googleUser.email))
        .then((rows) => rows[0] ?? null);
    }

    let user;

    if (existingUser) {
      const updates: Record<string, string> = {};
      if (!existingUser.googleId) updates.googleId = googleUser.sub;
      if (!existingUser.avatarUrl && googleUser.picture) updates.avatarUrl = googleUser.picture;
      if (!existingUser.name && googleUser.name) updates.name = googleUser.name;

      if (existingUser.role !== "admin" && isAdminEmail(existingUser.email)) {
        updates.role = "admin";
      }

      if (Object.keys(updates).length > 0) {
        await db.update(users).set(updates).where(eq(users.id, existingUser.id));
      }
      user = { ...existingUser, ...updates };
    } else {
      const role = isAdminEmail(googleUser.email) ? "admin" : "member";
      const [newUser] = await db
        .insert(users)
        .values({
          email: googleUser.email,
          googleId: googleUser.sub,
          name: googleUser.name,
          avatarUrl: googleUser.picture,
          role,
        })
        .returning();
      user = newUser;
    }

    const token = await createToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const aiMicrodollars = user.aiUsageMicrodollars ?? 0;

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatarUrl,
        role: user.role,
        ai_usage: {
          used_microdollars: aiMicrodollars,
          cap_microdollars: USAGE_CAP_MICRODOLLARS,
          percent: usagePercent(aiMicrodollars),
        },
      },
    });
  } catch (error) {
    console.error("Google auth error:", error);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}
