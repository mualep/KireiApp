import { NextResponse, type NextRequest } from "next/server";
import { createProxyClient } from "@/lib/supabase/proxy";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Hanya periksa route admin (kecuali admin login dan asset static)
  const isAdminRoute = pathname.startsWith("/admin") && !pathname.startsWith("/admin/login");

  if (!isAdminRoute) {
    return NextResponse.next();
  }

  const { supabase, getResponse } = createProxyClient(request);

  // Refresh auth session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isAdminRoute) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return getResponse();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - brand (brand static images)
     */
    "/((?!_next/static|_next/image|favicon.ico|brand).*)",
  ],
};
