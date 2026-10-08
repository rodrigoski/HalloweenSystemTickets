import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { isAdmin } from "@/lib/auth"

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!isAdmin(user)) {
      return NextResponse.json({ error: "Se requiere rol de administrador" }, { status: 403 })
    }

    // Get total registrations
    const { count: totalRegistrations } = await supabase
      .from("registrations")
      .select("*", { count: "exact", head: true })

    // Get total people and revenue
    const { data: registrations } = await supabase.from("registrations").select("person_count, amount_paid")

    const totalPeople = registrations?.reduce((sum, reg) => sum + reg.person_count, 0) || 0
    const totalRevenue = registrations?.reduce((sum, reg) => sum + Number(reg.amount_paid), 0) || 0

    // Get QR code usage
    const { count: totalQRCodes } = await supabase.from("qr_codes").select("*", { count: "exact", head: true })

    const { count: usedQRCodes } = await supabase
      .from("qr_codes")
      .select("*", { count: "exact", head: true })
      .eq("is_used", true)

    return NextResponse.json({
      stats: {
        total_registrations: totalRegistrations || 0,
        total_people: totalPeople,
        total_revenue: totalRevenue,
        qr_codes_used: usedQRCodes || 0,
        qr_codes_total: totalQRCodes || 0,
      },
    })
  } catch (error) {
    console.error("Error fetching stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
