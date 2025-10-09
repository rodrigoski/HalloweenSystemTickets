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

    const { data: registrations, error } = await supabase
      .from("registrations")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching registrations:", error)
      return NextResponse.json({ error: "Failed to fetch registrations" }, { status: 500 })
    }

    return NextResponse.json({ registrations })
  } catch (error) {
    console.error("Error in GET /api/registrations:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { client_name, person_count, amount_paid } = body

    // Validate input
    if (!client_name || !person_count || amount_paid === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (person_count < 1) {
      return NextResponse.json({ error: "Person count must be at least 1" }, { status: 400 })
    }

    if (amount_paid < 0) {
      return NextResponse.json({ error: "Amount paid cannot be negative" }, { status: 400 })
    }

    // Generate folio
    const { data: folioData, error: folioError } = await supabase.rpc("generate_folio")

    if (folioError || !folioData) {
      console.error("Error generating folio:", folioError)
      return NextResponse.json({ error: "Failed to generate folio" }, { status: 500 })
    }

    // Create registration
    const { data: registration, error: regError } = await supabase
      .from("registrations")
      .insert({
        folio: folioData,
        client_name,
        person_count,
        amount_paid,
        created_by: user.id,
      })
      .select()
      .single()

    if (regError || !registration) {
      console.error("Error creating registration:", regError)
      return NextResponse.json({ error: "Failed to create registration" }, { status: 500 })
    }

    // Generate QR codes for each person
    const qrCodes = []
    for (let i = 1; i <= person_count; i++) {
      const { data: qrHash, error: hashError } = await supabase.rpc("generate_qr_hash", {
        p_registration_id: registration.id,
        p_person_number: i,
      })

      if (hashError || !qrHash) {
        console.error("Error generating QR hash:", hashError)
        continue
      }

      const { data: qrCode, error: qrError } = await supabase
        .from("qr_codes")
        .insert({
          registration_id: registration.id,
          qr_hash: qrHash,
          person_number: i,
        })
        .select()
        .single()

      if (!qrError && qrCode) {
        qrCodes.push(qrCode)
      }
    }

    return NextResponse.json({ registration, qrCodes })
  } catch (error) {
    console.error("Error in POST /api/registrations:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
