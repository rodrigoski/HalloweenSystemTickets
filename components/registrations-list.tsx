"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { Eye, Loader2, Search } from "lucide-react"
import type { Registration } from "@/lib/types"

export function RegistrationsList() {
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [filteredRegistrations, setFilteredRegistrations] = useState<Registration[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchRegistrations()

    // Setup real-time subscription
    const setupRealtimeSubscription = async () => {
      const { createBrowserClient } = await import("@supabase/ssr")
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )

      const channel = supabase
        .channel("registrations-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "registrations",
          },
          () => {
            console.log("[v0] Registration changed, refreshing...")
            fetchRegistrations()
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
            console.log("[v0] QR code changed, refreshing...")
            fetchRegistrations()
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

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredRegistrations(registrations)
    } else {
      const filtered = registrations.filter(
        (reg) =>
          reg.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          reg.folio.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      setFilteredRegistrations(filtered)
    }
  }, [searchTerm, registrations])

  const fetchRegistrations = async () => {
    try {
      const response = await fetch("/api/registrations")
      if (!response.ok) {
        throw new Error("Error al obtener registros")
      }
      const data = await response.json()
      setRegistrations(data.registrations)
      setFilteredRegistrations(data.registrations)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-center text-red-500">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registros</CardTitle>
        <CardDescription>Ver y administrar todos los registros del evento</CardDescription>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o folio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent>
        {filteredRegistrations.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {searchTerm
              ? "No se encontraron registros que coincidan con tu búsqueda."
              : "No hay registros aún. ¡Crea tu primer registro!"}
          </p>
        ) : (
          <div className="space-y-3">
            {filteredRegistrations.map((registration) => (
              <div
                key={registration.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold">{registration.client_name}</h3>
                    <Badge variant="secondary">{registration.folio}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                    <span>{registration.person_count} personas</span>
                    <span>${registration.amount_paid.toFixed(2)}</span>
                    <span>
                      {new Date(registration.created_at).toLocaleString("es-MX", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                  {registration.created_by_email && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Registrado por <span className="font-medium">{registration.created_by_email}</span>
                    </p>
                  )}
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/registrations/${registration.id}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    Ver Códigos QR
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
