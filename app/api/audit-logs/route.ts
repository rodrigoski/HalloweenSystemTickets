import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: logs, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20)

    if (error) {
      console.error("Error fetching audit logs:", error)
      return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 })
    }

    return NextResponse.json({ logs })
  } catch (error) {
    console.error("Error in GET /api/audit-logs:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
