"use client"

import { useState, useRef, useEffect } from "react"
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Camera, CheckCircle2, XCircle, Loader2, ScanLine, X } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"

interface ScanResult {
  success: boolean
  message: string
  data?: {
    registration: {
      folio: string
      client_name: string
      person_count: number
    }
    qr_code: {
      person_number: number
      is_used: boolean
      used_at: string | null
    }
  }
}

export function QRScanner() {
  const [manualCode, setManualCode] = useState("")
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isScanning, setIsScanning] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const controlsRef = useRef<IScannerControls | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Start / stop scanner when modal opens/closes
  useEffect(() => {
    if (isCameraOpen) startScanner()
    else stopScanner()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCameraOpen])

  const startScanner = async () => {
    try {
      if (!videoRef.current) return

      // Create reader if not exists
      if (!readerRef.current) readerRef.current = new BrowserMultiFormatReader()

      // Define constraints instead of passing null deviceId (avoids TS null issue)
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      }

      // decodeFromConstraints returns controls (IScannerControls) that tienen stop()
      const controls = await readerRef.current.decodeFromConstraints(
        constraints,
        videoRef.current,
        (result, error, controlsFromCallback) => {
          // Callback invocado continuamente mientras se detectan frame/resultado
          if (result) {
            // Evita lecturas dobles: detén el loop de detección inmediatamente
            try {
              controlsFromCallback?.stop?.()
            } catch (e) {
              // ignore
            }
            controlsRef.current = controlsFromCallback ?? controls
            const text = result.getText?.()
            if (text) {
              validateQRCode(text.trim().toUpperCase())
            }
          } else if (error) {
            // opcional: log errores menores
            // console.debug("ZXing error:", error)
          }
        },
      )

      // guarda controles y marca scanning
      controlsRef.current = controls
      setIsScanning(true)
    } catch (err) {
      console.error("Error al iniciar el scanner:", err)
      alert("No se pudo acceder a la cámara. Verifica permisos o usa entrada manual.")
      setIsCameraOpen(false)
    }
  }

  const stopScanner = () => {
    setIsScanning(false)

    // 1) Detén la API/loop de ZXing (si existe)
    try {
      controlsRef.current?.stop?.()
    } catch (e) {
      // ignore
    }
    controlsRef.current = null

    // 2) También intenta detener cualquier método específico del reader (por compatibilidad)
    try {
      // algunos readers pueden exponer métodos como stopAsyncDecode() o stopContinuousDecode()
      // @ts-ignore
      readerRef.current?.stopContinuousDecode?.()
    } catch (e) {
      // ignore
    }

    // 3) Detén las pistas del stream y limpia el video element
    try {
      const video = videoRef.current
      if (video && video.srcObject && (video.srcObject as MediaStream).getTracks) {
        const ms = video.srcObject as MediaStream
        ms.getTracks().forEach((t) => t.stop())
      }
      if (video) video.srcObject = null
    } catch (e) {
      // ignore
    }

    // No destruimos readerRef aquí por si quieres reusar la instancia; si prefieres recrearla:
    // readerRef.current = null
  }

  const validateQRCode = async (qrHash: string) => {
    if (isProcessing) return
    setIsProcessing(true)
    setScanResult(null)

    try {
      // Llamada a tu endpoint /api/scan
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qr_hash: qrHash }),
      })
      const data = await response.json()

      setScanResult({
        success: response.ok,
        message: data.message || data.error || "Error desconocido",
        data: data.data,
      })

      if (response.ok) {
        // Éxito: detén cámara y cierra modal
        stopScanner()
        setIsCameraOpen(false)
        // Limpia UI después de unos segundos
        setTimeout(() => {
          setScanResult(null)
          setManualCode("")
        }, 5000)
      } else {
        // Si fallo (ej. ya usado), vuelve a reactivar lector para intentar de nuevo
        setTimeout(() => {
          // reinicia el scanner si el modal sigue abierto
          if (isCameraOpen) startScanner()
        }, 1200)
      }
    } catch (error) {
      console.error("Error validando QR:", error)
      setScanResult({ success: false, message: "Error al validar el QR. Intenta de nuevo." })
      setTimeout(() => {
        if (isCameraOpen) startScanner()
      }, 1200)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualCode.trim()) validateQRCode(manualCode.trim().toUpperCase())
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Escáner de Cámara</CardTitle>
          <CardDescription>Usa la cámara para escanear códigos QR</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setIsCameraOpen(true)} className="w-full" size="lg" disabled={isProcessing}>
            <Camera className="mr-2 h-5 w-5" />
            Abrir Cámara
          </Button>
        </CardContent>
      </Card>

      <Dialog open={isCameraOpen} onOpenChange={(open) => setIsCameraOpen(open)}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl p-0 gap-0">
          <div className="relative bg-black">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white"
              onClick={() => {
                setIsCameraOpen(false)
                stopScanner()
              }}
            >
              <X className="h-4 w-4" />
            </Button>

            <div className="relative aspect-video w-full">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 sm:w-64 sm:h-64 border-4 border-orange-500 rounded-lg relative">
                  <ScanLine className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-orange-500 animate-pulse" />
                </div>
              </div>
            </div>

            <div className="p-4 bg-black/80 text-white text-center text-sm">
              {isProcessing ? "Validando código..." : isScanning ? "Escaneando..." : "Cámara lista"}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Entrada Manual</CardTitle>
          <CardDescription>Ingresa el código QR manualmente</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="qrCode">Código QR (8 caracteres)</Label>
              <Input
                id="qrCode"
                placeholder="Ej: A1B2C3D4"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                disabled={isProcessing}
                maxLength={8}
                className="uppercase font-mono text-lg"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isProcessing || !manualCode.trim()}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validando...
                </>
              ) : (
                <>
                  <ScanLine className="mr-2 h-4 w-4" />
                  Validar Código
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {scanResult && (
        <Card className={scanResult.success ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              {scanResult.success ? (
                <CheckCircle2 className="h-12 w-12 text-green-600 flex-shrink-0" />
              ) : (
                <XCircle className="h-12 w-12 text-red-600 flex-shrink-0" />
              )}
              <div className="flex-1">
                <h3 className={`text-xl font-bold mb-2 ${scanResult.success ? "text-green-900" : "text-red-900"}`}>
                  {scanResult.success ? "✅ Entrada Aprobada" : "❌ Entrada Denegada"}
                </h3>
                <p className={`mb-4 ${scanResult.success ? "text-green-800" : "text-red-800"}`}>{scanResult.message}</p>

                {scanResult.data && (
                  <div className="space-y-3 bg-white p-4 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Folio:</span>
                      <Badge variant="secondary">{scanResult.data.registration.folio}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Cliente:</span>
                      <span className="text-sm">{scanResult.data.registration.client_name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Persona:</span>
                      <span className="text-sm">
                        {scanResult.data.qr_code.person_number} de {scanResult.data.registration.person_count}
                      </span>
                    </div>
                    {scanResult.data.qr_code.is_used && scanResult.data.qr_code.used_at && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Usado previamente:</span>
                        <span className="text-sm">{new Date(scanResult.data.qr_code.used_at).toLocaleString("es-MX")}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
