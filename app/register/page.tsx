import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { RegistrationForm } from "@/components/registration-form"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default async function RegisterPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
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

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Nuevo Registro</h1>
          <p className="text-muted-foreground">Registra un nuevo cliente para el evento Halloween</p>
        </div>

        <RegistrationForm />
      </main>
    </div>
  )
}
