import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { QRCodeDisplay } from "@/components/qr-code-display"

export default async function RegistrationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Fetch registration details
  const { data: registration, error: regError } = await supabase.from("registrations").select("*").eq("id", id).single()

  if (regError || !registration) {
    redirect("/dashboard")
  }

  // Fetch QR codes for this registration
  const { data: qrCodes, error: qrError } = await supabase
    .from("qr_codes")
    .select("*")
    .eq("registration_id", id)
    .order("person_number", { ascending: true })

  if (qrError) {
    console.error("Error fetching QR codes:", qrError)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-purple-50">
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al Panel
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <QRCodeDisplay registration={registration} qrCodes={qrCodes || []} />
      </main>
    </div>
  )
}
