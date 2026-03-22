import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/drizzle";
import { users } from "@/lib/db/schema";
import { getUserFromRequest } from "@/lib/auth";
import { usagePercent, USAGE_CAP_MICRODOLLARS } from "@/lib/services/usage";

export async function GET(request: Request) {
  const tokenPayload = await getUserFromRequest(request);
  if (!tokenPayload) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, tokenPayload.userId));

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatarUrl,
      role: user.role,
      ai_usage: {
        used_microdollars: user.aiUsageMicrodollars,
        cap_microdollars: USAGE_CAP_MICRODOLLARS,
        percent: usagePercent(user.aiUsageMicrodollars),
      },
    },
  });
}
