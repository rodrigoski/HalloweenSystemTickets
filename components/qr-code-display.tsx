"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, Share2, Printer } from "lucide-react"
import type { Registration, QRCode } from "@/lib/types"
import { QRCodeSVG } from "qrcode.react"
import { useRef } from "react"

interface QRCodeDisplayProps {
  registration: Registration
  qrCodes: QRCode[]
}

export function QRCodeDisplay({ registration, qrCodes }: QRCodeDisplayProps) {
  const printRef = useRef<HTMLDivElement>(null)

  const handleDownloadPDF = () => {
    const printWindow = window.open("", "_blank")
    if (!printWindow) {
      alert("Por favor permite las ventanas emergentes para generar el PDF")
      return
    }

    const qrCodesHTML = qrCodes
      .map(
        (qr) => `
      <div style="border: 2px solid #e5e7eb; padding: 20px; text-align: center; border-radius: 8px; page-break-inside: avoid; background: white; margin-bottom: 20px;">
        <h3 style="margin: 0 0 15px 0; color: #f97316; font-size: 18px;">Persona ${qr.person_number}</h3>
        <div style="display: flex; justify-content: center; margin-bottom: 15px;">
          <div id="qr-print-${qr.id}"></div>
        </div>
        <div style="font-size: 16px; font-weight: bold; color: #1f2937; font-family: 'Courier New', monospace; letter-spacing: 2px; margin-top: 10px;">${qr.qr_hash}</div>
      </div>
    `,
      )
      .join("")

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Códigos QR - ${registration.folio}</title>
          <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 30px; max-width: 900px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #f97316; padding-bottom: 20px; }
            .header h1 { color: #f97316; margin-bottom: 5px; font-size: 28px; }
            .header p { color: #666; font-size: 14px; }
            .info { background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 30px; border: 1px solid #e5e7eb; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; }
            .info-row:last-child { margin-bottom: 0; }
            .info-row strong { color: #374151; }
            .qr-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 25px; margin-bottom: 30px; }
            .footer { margin-top: 30px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 20px; }
            .footer p { margin-bottom: 5px; }
            @media print {
              body { padding: 15px; }
              .qr-item { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🎃 Evento Halloween</h1>
            <p>Códigos QR para Entrada</p>
          </div>
          
          <div class="info">
            <div class="info-row"><strong>Folio:</strong><span>${registration.folio}</span></div>
            <div class="info-row"><strong>Cliente:</strong><span>${registration.client_name}</span></div>
            <div class="info-row"><strong>Número de Personas:</strong><span>${registration.person_count}</span></div>
            <div class="info-row"><strong>Monto Pagado:</strong><span>$${registration.amount_paid.toFixed(2)}</span></div>
            <div class="info-row"><strong>Fecha:</strong><span>${new Date(registration.created_at).toLocaleDateString("es-MX")}</span></div>
          </div>

          <div class="qr-grid">${qrCodesHTML}</div>

          <div class="footer">
            <p><strong>Por favor presenta estos códigos QR en la entrada del evento.</strong></p>
            <p>Cada código QR solo puede usarse una vez.</p>
            <p>Guarda este documento para tu referencia.</p>
          </div>

          <script>
            window.onload = function() {
              ${qrCodes
                .map(
                  (qr) => `
                QRCode.toCanvas(document.createElement('canvas'), '${qr.qr_hash}', {
                  width: 250,
                  margin: 4,
                  errorCorrectionLevel: 'M'
                }, function(error, canvas) {
                  if (!error) {
                    document.getElementById('qr-print-${qr.id}').appendChild(canvas);
                  }
                });
              `,
                )
                .join("")}
              
              setTimeout(function() {
                window.print();
              }, 1000);
            };
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const handleDownloadIndividualQR = async (qrCode: QRCode) => {
    try {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      canvas.width = 400
      canvas.height = 500

      // White background
      ctx.fillStyle = "white"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw header text
      ctx.fillStyle = "black"
      ctx.font = "bold 20px Arial"
      ctx.textAlign = "center"
      ctx.fillText(`${registration.folio}`, canvas.width / 2, 30)
      ctx.font = "16px Arial"
      ctx.fillText(`Persona ${qrCode.person_number}`, canvas.width / 2, 55)

      // Get QR code SVG element
      const svgElement = document.querySelector(`#qr-${qrCode.id}`) as SVGElement
      if (svgElement) {
        const svgData = new XMLSerializer().serializeToString(svgElement)
        const img = new Image()
        const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" })
        const url = URL.createObjectURL(svgBlob)

        img.onload = () => {
          ctx.drawImage(img, 50, 70, 300, 300)
          URL.revokeObjectURL(url)

          // Add QR code text
          ctx.font = "bold 16px monospace"
          ctx.fillText(qrCode.qr_hash, canvas.width / 2, 400)
          ctx.font = "14px Arial"
          ctx.fillText(registration.client_name, canvas.width / 2, 430)

          // Download
          canvas.toBlob((blob) => {
            if (blob) {
              const downloadUrl = URL.createObjectURL(blob)
              const a = document.createElement("a")
              a.href = downloadUrl
              a.download = `${registration.folio}-Persona-${qrCode.person_number}.png`
              document.body.appendChild(a)
              a.click()
              URL.revokeObjectURL(downloadUrl)
              document.body.removeChild(a)
            }
          })
        }
        img.src = url
      }
    } catch (error) {
      console.error("Error downloading QR:", error)
      alert("Error al descargar el código QR.")
    }
  }

  const handleShareWhatsApp = async () => {
    const message = `✅ *Registro Confirmado*\n\n📋 *Folio:* ${registration.folio}\n👤 *Cliente:* ${registration.client_name}\n👥 *Personas:* ${registration.person_count}\n💰 *Monto:* $${registration.amount_paid.toFixed(2)}\n\n🎃 Por favor guarda tus códigos QR para la entrada.\n\n*Códigos:*\n${qrCodes.map((qr) => `Persona ${qr.person_number}: ${qr.qr_hash}`).join("\n")}`

    const url = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(url, "_blank")
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">{registration.client_name}</CardTitle>
              <CardDescription>Detalles del Registro</CardDescription>
            </div>
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {registration.folio}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-accent/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Número de Personas</p>
              <p className="text-2xl font-bold">{registration.person_count}</p>
            </div>
            <div className="p-4 bg-accent/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Monto Pagado</p>
              <p className="text-2xl font-bold">${registration.amount_paid.toFixed(2)}</p>
            </div>
            <div className="p-4 bg-accent/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Fecha de Registro</p>
              <p className="text-lg font-semibold">{new Date(registration.created_at).toLocaleDateString("es-MX")}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleDownloadPDF} className="flex-1">
              <Printer className="mr-2 h-4 w-4" />
              Imprimir/Guardar PDF
            </Button>
            <Button onClick={handleShareWhatsApp} variant="outline" className="flex-1 bg-transparent">
              <Share2 className="mr-2 h-4 w-4" />
              Compartir por WhatsApp
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Códigos QR</CardTitle>
          <CardDescription>Un código QR por persona - cada código solo puede usarse una vez</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {qrCodes.map((qrCode) => (
              <div key={qrCode.id} className="flex flex-col items-center p-6 border rounded-lg bg-white">
                <div className="mb-3">
                  <Badge variant={qrCode.is_used ? "secondary" : "default"}>Persona {qrCode.person_number}</Badge>
                </div>
                <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                  <QRCodeSVG id={`qr-${qrCode.id}`} value={qrCode.qr_hash} size={150} level="M" marginSize={4}/>
                </div>
                <p className="text-lg font-mono font-bold mt-3 text-center tracking-wider">{qrCode.qr_hash}</p>
                {qrCode.is_used && (
                  <Badge variant="destructive" className="mt-2">
                    Usado
                  </Badge>
                )}
                {!qrCode.is_used && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full bg-transparent"
                    onClick={() => handleDownloadIndividualQR(qrCode)}
                  >
                    <Download className="mr-2 h-3 w-3" />
                    Descargar
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
