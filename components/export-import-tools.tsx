"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Download, Upload, Loader2, FileSpreadsheet, AlertCircle } from "lucide-react"

export function ExportImportTools() {
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importResult, setImportResult] = useState<{
    success: boolean
    message: string
    details?: { imported: number; failed: number }
  } | null>(null)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const response = await fetch("/api/export")
      if (!response.ok) throw new Error("Error al exportar datos")

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `registros-halloween-${new Date().toISOString().split("T")[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Error exporting data:", error)
      alert("Error al exportar datos. Por favor intenta de nuevo.")
    } finally {
      setIsExporting(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImportFile(file)
      setImportResult(null)
    }
  }

  const handleImport = async () => {
    if (!importFile) return

    setIsImporting(true)
    setImportResult(null)

    try {
      const formData = new FormData()
      formData.append("file", importFile)

      const response = await fetch("/api/import", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        setImportResult({
          success: false,
          message: data.error || "Error al importar datos",
        })
      } else {
        setImportResult({
          success: true,
          message: data.message || "Datos importados exitosamente",
          details: data.details,
        })
        setImportFile(null)
        // Reset file input
        const fileInput = document.getElementById("import-file") as HTMLInputElement
        if (fileInput) fileInput.value = ""
      }
    } catch (error) {
      console.error("Error importing data:", error)
      setImportResult({
        success: false,
        message: "Error al importar datos. Por favor intenta de nuevo.",
      })
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sincronización Offline</CardTitle>
        <CardDescription>Exporta e importa datos para uso sin conexión</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Export Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Exportar Datos</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Descarga todos los registros y códigos QR como archivo CSV para acceso offline.
            </p>
            <Button onClick={handleExport} disabled={isExporting} className="w-full">
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar a CSV
                </>
              )}
            </Button>
          </div>

          {/* Import Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Importar Datos</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Sube un archivo CSV para sincronizar cambios offline de vuelta al sistema.
            </p>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="import-file">Seleccionar Archivo CSV</Label>
                <Input id="import-file" type="file" accept=".csv" onChange={handleFileChange} disabled={isImporting} />
              </div>
              <Button onClick={handleImport} disabled={isImporting || !importFile} className="w-full">
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Importar desde CSV
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Import Result */}
        {importResult && (
          <Alert
            className={`mt-6 ${importResult.success ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}`}
          >
            <AlertCircle className={`h-4 w-4 ${importResult.success ? "text-green-600" : "text-red-600"}`} />
            <AlertDescription className={importResult.success ? "text-green-800" : "text-red-800"}>
              <strong>{importResult.success ? "¡Éxito!" : "Error"}</strong>
              <p className="mt-1">{importResult.message}</p>
              {importResult.details && (
                <p className="mt-2 text-sm">
                  Importados: {importResult.details.imported} | Fallidos: {importResult.details.failed}
                </p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Instructions */}
        <Alert className="mt-6">
          <AlertDescription>
            <strong>Cómo usar:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li>Exporta datos antes de trabajar sin conexión</li>
              <li>Realiza cambios al archivo CSV offline (marca códigos QR como usados)</li>
              <li>Importa el CSV modificado para sincronizar cambios al sistema</li>
              <li>El sistema actualizará el estado de uso de los códigos QR según los datos importados</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
