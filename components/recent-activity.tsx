"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Activity } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface AuditLog {
  id: string
  action: string
  table_name: string
  created_at: string
  new_data: {
    client_name?: string
    folio?: string
    person_number?: number
    is_used?: boolean
  } | null
}

export function RecentActivity() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchLogs()

    const setupRealtimeSubscription = async () => {
      const { createBrowserClient } = await import("@supabase/ssr")
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )

      const channel = supabase
        .channel("audit-logs-changes")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "audit_logs",
          },
          () => {
            console.log("[v0] New audit log, refreshing...")
            fetchLogs()
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

  const fetchLogs = async () => {
    try {
      const response = await fetch("/api/audit-logs")
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs)
      }
    } catch (error) {
      console.error("Error fetching logs:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getActionBadge = (action: string) => {
    switch (action) {
      case "INSERT":
        return <Badge variant="default">Creado</Badge>
      case "UPDATE":
        return <Badge variant="secondary">Actualizado</Badge>
      case "DELETE":
        return <Badge variant="destructive">Eliminado</Badge>
      default:
        return <Badge variant="outline">{action}</Badge>
    }
  }

  const getActivityDescription = (log: AuditLog) => {
    if (log.table_name === "registrations" && log.action === "INSERT") {
      return `Nuevo registro: ${log.new_data?.client_name || "Desconocido"} (${log.new_data?.folio || ""})`
    }
    if (log.table_name === "qr_codes" && log.action === "UPDATE" && log.new_data?.is_used) {
      return `Código QR escaneado: Persona ${log.new_data?.person_number || ""}`
    }
    return `${log.action} en ${log.table_name}`
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Actividad Reciente</CardTitle>
            <CardDescription>Últimos eventos del sistema</CardDescription>
          </div>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : logs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No hay actividad reciente</p>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="flex flex-col gap-2 pb-4 border-b last:border-0">
                  <div className="flex items-start justify-between gap-2">
                    {getActionBadge(log.action)}
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleTimeString("es-MX")}
                    </span>
                  </div>
                  <p className="text-sm">{getActivityDescription(log)}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
