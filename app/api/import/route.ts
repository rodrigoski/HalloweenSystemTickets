import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Read file content
    const text = await file.text()
    const lines = text.split("\n").filter((line) => line.trim())

    if (lines.length < 2) {
      return NextResponse.json({ error: "Invalid CSV file" }, { status: 400 })
    }

    // Skip header row
    const dataLines = lines.slice(1)

    let imported = 0
    let failed = 0

    // Process each row
    for (const line of dataLines) {
      try {
        // Parse CSV line (simple parsing, doesn't handle complex cases)
        const values = line.split(",")

        if (values.length < 11) {
          failed++
          continue
        }

        const qrCodeId = values[6].trim()
        const isUsed = values[9].trim().toUpperCase() === "TRUE"
        const usedAt = values[10].trim()

        // Only update if marked as used
        if (isUsed) {
          const { error: updateError } = await supabase
            .from("qr_codes")
            .update({
              is_used: true,
              used_at: usedAt || new Date().toISOString(),
              used_by: user.id,
            })
            .eq("id", qrCodeId)
            .eq("is_used", false) // Only update if not already used

          if (updateError) {
            console.error("Error updating QR code:", updateError)
            failed++
          } else {
            imported++
          }
        }
      } catch (error) {
        console.error("Error processing line:", error)
        failed++
      }
    }

    return NextResponse.json({
      message: `Import completed. ${imported} records updated, ${failed} failed.`,
      details: {
        imported,
        failed,
      },
    })
  } catch (error) {
    console.error("Error importing data:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
