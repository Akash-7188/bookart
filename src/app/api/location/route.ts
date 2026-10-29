import { NextResponse } from "next/server";
import { LOCATION_COOKIE } from "@/lib/session";

/**
 * Persists the browser/GPS location so Server Components can run the radius
 * query with the same origin the client is showing.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as {
    city?: string;
    pincode?: string;
    latitude?: number;
    longitude?: number;
    label?: string;
    source?: string;
  };

  if (typeof body.latitude !== "number" || typeof body.longitude !== "number") {
    return NextResponse.json({ ok: false, error: "latitude/longitude required" }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(LOCATION_COOKIE, encodeURIComponent(JSON.stringify(body)), {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
  return response;
}
