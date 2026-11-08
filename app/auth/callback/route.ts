
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);

  const code = requestUrl.searchParams.get("code");
  const authError = requestUrl.searchParams.get("error");
  const errorCode = requestUrl.searchParams.get("error_code");

  // Handle errors returned directly by Supabase.
  if (authError || !code) {
    const errorType =
      errorCode === "otp_expired"
        ? "link_expired"
        : "confirmation_failed";

    return NextResponse.redirect(
      new URL(`/signup?error=${errorType}`, requestUrl.origin)
    );
  }

  const requestedNext = requestUrl.searchParams.get("next");

  const next =
    requestedNext?.startsWith("/") &&
    !requestedNext.startsWith("//")
      ? requestedNext
      : "/";

  const response = NextResponse.redirect(
    new URL(next, requestUrl.origin)
  );

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { error } =
    await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("Email confirmation error:", error);

    return NextResponse.redirect(
      new URL(
        "/signup?error=confirmation_failed",
        requestUrl.origin
      )
    );
  }

  return response;
}
