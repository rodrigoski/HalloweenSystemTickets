import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { qr_hash } = body

    if (!qr_hash) {
      return NextResponse.json({ error: "El código QR es requerido" }, { status: 400 })
    }

    // Find the QR code
    const { data: qrCode, error: qrError } = await supabase
      .from("qr_codes")
      .select(
        `
        *,
        registrations (
          folio,
          client_name,
          person_count
        )
      `,
      )
      .eq("qr_hash", qr_hash.toUpperCase())
      .single()

    if (qrError || !qrCode) {
      return NextResponse.json(
        {
          error: "Código QR inválido",
          message: "Este código QR no es reconocido. Por favor verifica e intenta de nuevo.",
        },
        { status: 404 },
      )
    }

    // Check if already used
    if (qrCode.is_used) {
      return NextResponse.json(
        {
          error: "Código QR ya usado",
          message: "Este código QR ya fue usado para entrada.",
          data: {
            registration: qrCode.registrations,
            qr_code: {
              person_number: qrCode.person_number,
              is_used: qrCode.is_used,
              used_at: qrCode.used_at,
            },
          },
        },
        { status: 400 },
      )
    }

    // Mark as used
    const { error: updateError } = await supabase
      .from("qr_codes")
      .update({
        is_used: true,
        used_at: new Date().toISOString(),
        used_by: user.id,
      })
      .eq("id", qrCode.id)

    if (updateError) {
      console.error("Error updating QR code:", updateError)
      return NextResponse.json({ error: "Error al marcar el código QR como usado" }, { status: 500 })
    }

    return NextResponse.json({
      message: "¡Entrada aprobada! Bienvenido al evento.",
      data: {
        registration: qrCode.registrations,
        qr_code: {
          person_number: qrCode.person_number,
          is_used: true,
          used_at: new Date().toISOString(),
        },
      },
    })
  } catch (error) {
    console.error("Error in POST /api/scan:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
