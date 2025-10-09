import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { RegistrationsList } from "@/components/registrations-list"
import { DashboardStats } from "@/components/dashboard-stats"
import { RecentActivity } from "@/components/recent-activity"
import { ExportImportTools } from "@/components/export-import-tools"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-purple-50">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-orange-600">Registro Halloween</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Sistema de Gestión de Eventos</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-xs sm:text-sm text-muted-foreground truncate max-w-[150px] sm:max-w-none">
              {user.email}
            </span>
            <form action="/auth/signout" method="post">
              <Button variant="outline" type="submit" size="sm" className="whitespace-nowrap bg-transparent">
                Cerrar Sesión
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold">Panel de Control</h2>
            <p className="text-sm text-muted-foreground">Gestiona registros y escanea códigos QR</p>
          </div>
          <div className="flex gap-3 w-full sm:w-auto flex-col sm:flex-row">
            <Button asChild variant="outline" className="w-full sm:w-auto bg-transparent">
              <Link href="/scan">Escanear QR</Link>
            </Button>
            <Button asChild className="w-full sm:w-auto">
              <Link href="/register">Nuevo Registro</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-6 mb-6">
          <DashboardStats />
        </div>

        <div className="mb-6">
          <ExportImportTools />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 order-2 lg:order-1">
            <RegistrationsList />
          </div>
          <div className="order-1 lg:order-2">
            <RecentActivity />
          </div>
        </div>
      </main>
    </div>
  )
}
