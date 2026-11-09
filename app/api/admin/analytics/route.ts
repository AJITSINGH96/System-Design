import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const ADMIN_ID = "128968c8-eea9-44f7-be54-2c32cab65e30";
export async function GET() {
  try {
    // 1. Verify the logged-in user.
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Verify that the user is an admin.
    if (user.id !== ADMIN_ID) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // 3. Create a server-only Supabase client.
    const adminSupabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // 4. Retrieve the total registered-user count.
    const { data, error } = await adminSupabase.rpc(
      "get_total_registered_users"
    );

    if (error) {
      console.error("User count error:", error);

      return NextResponse.json(
        { error: "Unable to retrieve user count" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      totalUsers: Number(data),
    });

  } catch (error) {
    console.error("Analytics API error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}