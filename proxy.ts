import { NextResponse, type NextRequest } from "next/server";

import {
  canAccessAdminContent,
  canAccessAdminDashboard,
  getStaffRedirectPath,
} from "@/lib/auth/redirects";
import { parseStaffTier } from "@/lib/auth/tiers";
import { copyProxyCookies, createProxyClient } from "@/lib/supabase/proxy";

const ADMIN_ROOT_PATH = "/admin";
const LOGIN_PATH = "/admin/login";
const DASHBOARD_PATH = "/admin/dashboard";
const CONTENT_PATH = "/admin/content";
const PROFILE_PATH = "/admin/profile";
const GENERIC_AUTH_ERROR = "auth";

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isLoginPath = pathname === LOGIN_PATH;
  const isAdminRootPath = pathname === ADMIN_ROOT_PATH;

  const { supabase, getResponse } = createProxyClient(request);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    if (isLoginPath) {
      return getResponse();
    }

    return copyProxyCookies(
      getResponse(),
      NextResponse.redirect(getLoginUrl(request, `${pathname}${search}`)),
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("tier, is_deleted")
    .eq("id", user.id)
    .maybeSingle();
  const tier = parseStaffTier(profile?.tier);

  if (profileError || !profile || profile.is_deleted || !tier) {
    await supabase.auth.signOut();

    return copyProxyCookies(
      getResponse(),
      NextResponse.redirect(getLoginUrl(request, null, GENERIC_AUTH_ERROR)),
    );
  }

  if (isLoginPath || isAdminRootPath) {
    return copyProxyCookies(
      getResponse(),
      NextResponse.redirect(new URL(getStaffRedirectPath(tier), request.url)),
    );
  }

  if (isPathOrChild(pathname, DASHBOARD_PATH) && !canAccessAdminDashboard(tier)) {
    return copyProxyCookies(
      getResponse(),
      NextResponse.redirect(new URL(PROFILE_PATH, request.url)),
    );
  }

  if (isPathOrChild(pathname, CONTENT_PATH) && !canAccessAdminContent(tier)) {
    return copyProxyCookies(
      getResponse(),
      NextResponse.redirect(new URL(PROFILE_PATH, request.url)),
    );
  }

  return getResponse();
}

function isPathOrChild(pathname: string, path: string): boolean {
  return pathname === path || pathname.startsWith(`${path}/`);
}

function getLoginUrl(
  request: NextRequest,
  redirectPath: string | null,
  error?: string,
): URL {
  const url = new URL(LOGIN_PATH, request.url);

  if (redirectPath) {
    url.searchParams.set("redirect", redirectPath);
  }

  if (error) {
    url.searchParams.set("error", error);
  }

  return url;
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
