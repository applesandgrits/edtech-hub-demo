import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/drizzle";
import { users } from "@/lib/db/schema";
import { requireAdmin, isErrorResponse } from "@/lib/require-admin";

export async function GET(request: Request) {
  const result = await requireAdmin(request);
  if (isErrorResponse(result)) return result;

  const allUsers = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      aiUsageMicrodollars: users.aiUsageMicrodollars,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(users.createdAt);

  return NextResponse.json({
    users: allUsers.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      ai_usage_microdollars: u.aiUsageMicrodollars,
      created_at: u.createdAt,
    })),
  });
}

export async function POST(request: Request) {
  const result = await requireAdmin(request);
  if (isErrorResponse(result)) return result;

  const { userId, action } = await request.json();

  if (action === "reset_all") {
    await db.update(users).set({ aiUsageMicrodollars: 0 });
    return NextResponse.json({ message: "All usage reset" });
  }

  if (action === "reset" && userId) {
    await db
      .update(users)
      .set({ aiUsageMicrodollars: 0 })
      .where(eq(users.id, userId));
    return NextResponse.json({ message: `Usage reset for user ${userId}` });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
