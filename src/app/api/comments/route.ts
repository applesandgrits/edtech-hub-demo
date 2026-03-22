import { NextRequest, NextResponse } from "next/server";
import { eq, desc, asc, isNull } from "drizzle-orm";
import { db } from "@/lib/db/drizzle";
import { comments, users } from "@/lib/db/schema";
import { getUserFromRequest } from "@/lib/auth";

// GET /api/comments?documentId=XXX
export async function GET(request: NextRequest) {
  const documentId = request.nextUrl.searchParams.get("documentId");
  if (!documentId) {
    return NextResponse.json({ error: "documentId required" }, { status: 400 });
  }

  // Get all comments for this document with user info
  const rows = await db
    .select({
      id: comments.id,
      documentId: comments.documentId,
      userId: comments.userId,
      parentId: comments.parentId,
      body: comments.body,
      createdAt: comments.createdAt,
      userName: users.name,
      userEmail: users.email,
      userRole: users.role,
    })
    .from(comments)
    .innerJoin(users, eq(comments.userId, users.id))
    .where(eq(comments.documentId, documentId))
    .orderBy(asc(comments.createdAt));

  // Build threaded structure: top-level + replies
  const topLevel = rows.filter((r) => !r.parentId);
  const replies = rows.filter((r) => r.parentId);

  const threaded = topLevel.map((comment) => ({
    ...comment,
    replies: replies.filter((r) => r.parentId === comment.id),
  }));

  return NextResponse.json({ comments: threaded });
}

// POST /api/comments
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { documentId, body, parentId } = await request.json();

  if (!documentId || !body?.trim()) {
    return NextResponse.json({ error: "documentId and body required" }, { status: 400 });
  }

  const [newComment] = await db
    .insert(comments)
    .values({
      documentId,
      userId: user.userId,
      parentId: parentId || null,
      body: body.trim(),
    })
    .returning();

  // Get user info
  const [commentUser] = await db
    .select({ name: users.name, email: users.email, role: users.role })
    .from(users)
    .where(eq(users.id, user.userId));

  return NextResponse.json({
    comment: {
      ...newComment,
      userName: commentUser?.name,
      userEmail: commentUser?.email,
      userRole: commentUser?.role,
      replies: [],
    },
  });
}

// DELETE /api/comments?id=XXX
export async function DELETE(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  // Only allow deleting own comments or admin
  const [comment] = await db
    .select()
    .from(comments)
    .where(eq(comments.id, parseInt(id)));

  if (!comment) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  if (comment.userId !== user.userId && user.role !== "admin") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Delete replies first, then the comment
  await db.delete(comments).where(eq(comments.parentId, parseInt(id)));
  await db.delete(comments).where(eq(comments.id, parseInt(id)));

  return NextResponse.json({ message: "Deleted" });
}
