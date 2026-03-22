import { SignJWT, jwtVerify, createRemoteJWKSet } from "jose";

let _cachedSecret: Uint8Array | null = null;
function getJwtSecret(): Uint8Array {
  if (!_cachedSecret) {
    const raw = process.env.JWT_SECRET || "edtech-hub-dev-secret-change-in-production";
    _cachedSecret = new TextEncoder().encode(raw);
  }
  return _cachedSecret;
}

export interface TokenPayload {
  userId: number;
  email: string;
  role: string;
}

export async function createToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("4h")
    .sign(getJwtSecret());
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

export function getTokenFromHeaders(headers: Headers): string | null {
  const auth = headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

export async function getUserFromRequest(request: Request): Promise<TokenPayload | null> {
  const token = getTokenFromHeaders(request.headers);
  if (!token) return null;
  return verifyToken(token);
}

interface GoogleTokenPayload {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture: string;
}

const GOOGLE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs")
);

export async function verifyGoogleToken(idToken: string): Promise<GoogleTokenPayload | null> {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: clientId || undefined,
    });
    if (!payload.email_verified) return null;
    return {
      sub: payload.sub as string,
      email: payload.email as string,
      email_verified: payload.email_verified as boolean,
      name: payload.name as string,
      picture: payload.picture as string,
    };
  } catch {
    return null;
  }
}
