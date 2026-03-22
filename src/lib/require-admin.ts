import { NextResponse } from "next/server";
import { getUserFromRequest, type TokenPayload } from "./auth";

export async function requireAdmin(request: Request): Promise<TokenPayload | NextResponse> {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }
  return user;
}

export function isErrorResponse(result: TokenPayload | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}
