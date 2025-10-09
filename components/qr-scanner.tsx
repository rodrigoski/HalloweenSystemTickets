"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Camera, CheckCircle2, XCircle, Loader2, ScanLine, X } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import jsQR from "jsqr"

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
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<number | null>(null)

  useEffect(() => {
    return () => stopCamera()
  }, [])

  useEffect(() => {
    if (isCameraOpen) startCamera()
    else stopCamera()
  }, [isCameraOpen])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: 640, height: 480 },
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play()
          setIsScanning(true)
          startQRScanning()
        }
      }
    } catch (error) {
      console.error("Error accessing camera:", error)
      alert("No se puede acceder a la cámara. Verifica permisos o usa entrada manual.")
      setIsCameraOpen(false)
    }
  }

  const startQRScanning = () => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current)

    const scan = () => {
      if (!videoRef.current || !canvasRef.current || !isScanning || isProcessing) return

      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")
      if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return

      // Canvas reducido para mejorar velocidad
      canvas.width = video.videoWidth / 2
      canvas.height = video.videoHeight / 2
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" })

      if (code && code.data) {
        console.log("QR detected:", code.data)
        setIsScanning(false)
        validateQRCode(code.data.trim().toUpperCase())
      }
    }

    scanIntervalRef.current = window.setInterval(scan, 200) // cada 200ms
  }

  const stopCamera = () => {
    setIsScanning(false)
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
  }

  const validateQRCode = async (qrHash: string) => {
    setIsProcessing(true)
    setScanResult(null)

    try {
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
        setIsCameraOpen(false)
        setTimeout(() => {
          setScanResult(null)
          setManualCode("")
        }, 5000)
      } else {
        setTimeout(() => {
          setIsScanning(true)
        }, 2000)
      }
    } catch (error) {
      console.error(error)
      setScanResult({ success: false, message: "Error al validar el QR. Intenta de nuevo." })
      setTimeout(() => setIsScanning(true), 2000)
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
          <Button onClick={() => setIsCameraOpen(true)} className="w-full" size="lg">
            <Camera className="mr-2 h-5 w-5" />
            Abrir Cámara
          </Button>
        </CardContent>
      </Card>

      <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl p-0 gap-0">
          <div className="relative bg-black">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white"
              onClick={() => setIsCameraOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
            <div className="relative aspect-video w-full">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <canvas ref={canvasRef} className="hidden" />
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
                        <span className="text-sm">
                          {new Date(scanResult.data.qr_code.used_at).toLocaleString("es-MX")}
                        </span>
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
