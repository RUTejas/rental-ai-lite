import { NextResponse, type NextRequest } from "next/server";

const portalCookie = "rentwise_master_portal";
async function digest(value: string) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function middleware(request: NextRequest) {
  const supplied = request.nextUrl.searchParams.get("key");
  if (!supplied) return NextResponse.next();
  const expected = process.env.MASTER_ADMIN_SECRET_KEY;
  if (!expected || await digest(supplied) !== await digest(expected)) return NextResponse.next();
  const cleanUrl = request.nextUrl.clone(); cleanUrl.searchParams.delete("key");
  const response = NextResponse.redirect(cleanUrl);
  response.cookies.set(portalCookie, await digest(`${expected}:${process.env.SESSION_SECRET || ""}`), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 15 * 60
  });
  return response;
}

export const config = { matcher: ["/master-admin-login"] };
