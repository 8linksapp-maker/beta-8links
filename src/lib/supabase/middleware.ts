import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Public routes
  const publicPaths = ["/", "/pricing", "/checkout", "/login", "/register", "/forgot-password", "/reset-password", "/verificar-nicho"];
  const isPublicPath = publicPaths.some((path) => pathname === path) || pathname.startsWith("/report/");
  const isApiPath = pathname.startsWith("/api/");
  const isAuthCallback = pathname.startsWith("/auth/callback");
  const isOnboarding = pathname === "/onboarding";

  // Not logged in → redirect to login
  if (!user && !isPublicPath && !isApiPath && !isAuthCallback) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Logged in → redirect away from auth pages
  if (user && (pathname === "/login" || pathname === "/register")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // For authenticated dashboard routes: single query for role + onboarding
  if (user && !isPublicPath && !isApiPath && !isAuthCallback) {
    // Use service role to bypass RLS for admin check
    const { createClient } = await import("@supabase/supabase-js");
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("role, onboarding_completed")
      .eq("id", user.id)
      .single();

    // Admin check
    if (pathname.startsWith("/admin")) {
      console.log("[Middleware] Admin check:", { userId: user.id, role: profile?.role, pathname });
      if (!profile || profile.role !== "admin") {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
    }

    // Onboarding check — redirect to onboarding if not completed
    // Skip if already on onboarding page or admin
    if (profile && !profile.onboarding_completed && !isOnboarding && !pathname.startsWith("/admin")) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
