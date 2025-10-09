"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

export function RegistrationForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    clientName: "",
    personCount: "",
    amountPaid: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/registrations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_name: formData.clientName,
          person_count: Number.parseInt(formData.personCount),
          amount_paid: Number.parseFloat(formData.amountPaid),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al crear registro")
      }

      // Redirect to the registration detail page to view QR codes
      router.push(`/registrations/${data.registration.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Detalles del Registro</CardTitle>
        <CardDescription>Ingresa la información del cliente y detalles de pago</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="clientName">Nombre del Cliente</Label>
            <Input
              id="clientName"
              placeholder="Ingresa el nombre del cliente"
              required
              value={formData.clientName}
              onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="personCount">Número de Personas</Label>
            <Input
              id="personCount"
              type="number"
              min="1"
              placeholder="Ingresa el número de personas"
              required
              value={formData.personCount}
              onChange={(e) => setFormData({ ...formData, personCount: e.target.value })}
            />
            <p className="text-sm text-muted-foreground">Se generará un código QR por persona</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amountPaid">Monto Pagado</Label>
            <Input
              id="amountPaid"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              required
              value={formData.amountPaid}
              onChange={(e) => setFormData({ ...formData, amountPaid: e.target.value })}
            />
          </div>

          {error && <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">{error}</div>}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creando Registro...
              </>
            ) : (
              "Crear Registro"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
