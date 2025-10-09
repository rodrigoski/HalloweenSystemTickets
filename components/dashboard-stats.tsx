"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Ticket, CheckCircle2, DollarSign, Loader2 } from "lucide-react"

interface Stats {
  total_registrations: number
  total_people: number
  total_revenue: number
  qr_codes_used: number
  qr_codes_total: number
}

export function DashboardStats() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchStats()

    const setupRealtimeSubscription = async () => {
      const { createBrowserClient } = await import("@supabase/ssr")
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )

      const channel = supabase
        .channel("stats-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "registrations",
          },
          () => {
            console.log("[v0] Stats changed, refreshing...")
            fetchStats()
          },
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "qr_codes",
          },
          () => {
            console.log("[v0] QR codes changed, refreshing stats...")
            fetchStats()
          },
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }

    const cleanup = setupRealtimeSubscription()
    return () => {
      cleanup.then((fn) => fn && fn())
    }
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/stats")
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!stats) return null

  const usagePercentage = stats.qr_codes_total > 0 ? (stats.qr_codes_used / stats.qr_codes_total) * 100 : 0

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Registros</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_registrations}</div>
          <p className="text-xs text-muted-foreground">Registros activos</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Personas</CardTitle>
          <Ticket className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_people}</div>
          <p className="text-xs text-muted-foreground">Asistentes esperados</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Entradas Validadas</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.qr_codes_used} / {stats.qr_codes_total}
          </div>
          <p className="text-xs text-muted-foreground">{usagePercentage.toFixed(1)}% registrados</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${stats.total_revenue.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">De todos los registros</p>
        </CardContent>
      </Card>
    </div>
  )
}
