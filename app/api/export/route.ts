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
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    if (!isAdmin(user)) {
      return NextResponse.json({ error: "Se requiere rol de administrador" }, { status: 403 })
    }

    // Fetch all registrations with their QR codes
    const { data: registrations, error: regError } = await supabase
      .from("registrations")
      .select(
        `
        id,
        folio,
        client_name,
        person_count,
        amount_paid,
        created_at,
        qr_codes (
          id,
          qr_hash,
          person_number,
          is_used,
          used_at
        )
      `,
      )
      .order("created_at", { ascending: false })

    if (regError) {
      console.error("Error fetching registrations:", regError)
      return NextResponse.json({ error: "Error al obtener datos" }, { status: 500 })
    }

    const csvRows = []

    // Header row - each column separated by comma
    csvRows.push(
      "ID Registro;Folio;Nombre Cliente;Num Personas;Monto Pagado;Fecha Registro;ID Codigo QR;Hash QR;Num Persona;Usado;Fecha Uso"
    )

    // Data rows
    registrations?.forEach((reg) => {
      if (reg.qr_codes && Array.isArray(reg.qr_codes)) {
        reg.qr_codes.forEach((qr: any) => {
          // Properly format each field and join with commas
          const row = [
            reg.id,
            reg.folio,
            `"${reg.client_name.replace(/"/g, '""')}"`, // Escape quotes in names
            reg.person_count,
            reg.amount_paid,
            new Date(reg.created_at).toISOString(),
            qr.id,
            qr.qr_hash,
            qr.person_number,
            qr.is_used ? "SI" : "NO",
            qr.used_at ? new Date(qr.used_at).toISOString() : "",
          ]
          csvRows.push(row.join(";"))
        })
      }
    })

    const csvContent = csvRows.join("\n")

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="registros-halloween-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error("Error exporting data:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
