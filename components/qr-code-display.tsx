"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, Share2, Printer } from "lucide-react"
import type { Registration, QRCode } from "@/lib/types"
import { QRCodeSVG } from "qrcode.react"
import { useRef } from "react"
import jsPDF from "jspdf"

interface QRCodeDisplayProps {
  registration: Registration
  qrCodes: QRCode[]
}

export function QRCodeDisplay({ registration, qrCodes }: QRCodeDisplayProps) {
  const printRef = useRef<HTMLDivElement>(null)

  const handleDownloadPDF = async () => {
    try {
      const QRCodeLib = await import("qrcode")
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      })

      const pageWidth = 210
      const pageHeight = 297
      const margin = 15
      const contentWidth = pageWidth - 2 * margin

      let yPosition = margin

      // Header


      // Info box
      pdf.setFillColor(249, 250, 251) // #f9fafb - Light gray background
      pdf.setDrawColor(229, 231, 235) // #e5e7eb - Border
      pdf.roundedRect(margin, yPosition, contentWidth, 35, 2, 2, "FD")

      const infoStartY = yPosition + 6
      pdf.setFontSize(10)
      pdf.setTextColor(55, 65, 81) // #374151

      pdf.setFont("helvetica", "bold")
      pdf.text("Folio:", margin + 5, infoStartY)
      pdf.setFont("helvetica", "normal")
      pdf.setTextColor(0, 0, 0)
      pdf.text(registration.folio, margin + 50, infoStartY)

      pdf.setTextColor(55, 65, 81)
      pdf.setFont("helvetica", "bold")
      pdf.text("Cliente:", margin + 5, infoStartY + 6)
      pdf.setFont("helvetica", "normal")
      pdf.setTextColor(0, 0, 0)
      pdf.text(registration.client_name, margin + 50, infoStartY + 6)

      pdf.setTextColor(55, 65, 81)
      pdf.setFont("helvetica", "bold")
      pdf.text("Número de Personas:", margin + 5, infoStartY + 12)
      pdf.setFont("helvetica", "normal")
      pdf.setTextColor(0, 0, 0)
      pdf.text(registration.person_count.toString(), margin + 50, infoStartY + 12)

      pdf.setTextColor(55, 65, 81)
      pdf.setFont("helvetica", "bold")
      pdf.text("Monto Pagado:", margin + 5, infoStartY + 18)
      pdf.setFont("helvetica", "normal")
      pdf.setTextColor(0, 0, 0)
      pdf.text(`$${registration.amount_paid.toFixed(2)}`, margin + 50, infoStartY + 18)

      pdf.setTextColor(55, 65, 81)
      pdf.setFont("helvetica", "bold")
      pdf.text("Fecha:", margin + 5, infoStartY + 24)
      pdf.setFont("helvetica", "normal")
      pdf.setTextColor(0, 0, 0)
      pdf.text(new Date(registration.created_at).toLocaleDateString("es-MX"), margin + 50, infoStartY + 24)

      yPosition += 45

      // QR Codes - 2 por fila
      const qrSize = 50 // mm
      const qrBoxWidth = (contentWidth - 10) / 2
      const qrBoxHeight = 75

      for (let i = 0; i < qrCodes.length; i++) {
        const qr = qrCodes[i]
        const col = i % 2
        const xPosition = margin + col * (qrBoxWidth + 10)

        // Check if we need a new page
        if (yPosition + qrBoxHeight > pageHeight - margin && i > 0) {
          pdf.addPage()
          yPosition = margin
        }

        // QR Box
        pdf.setDrawColor(229, 231, 235) // #e5e7eb
        pdf.setLineWidth(0.5)
        pdf.roundedRect(xPosition, yPosition, qrBoxWidth, qrBoxHeight, 2, 2, "D")

        // Person number
        pdf.setFontSize(14)
        pdf.setTextColor(249, 115, 22) // Orange
        pdf.setFont("helvetica", "bold")
        pdf.text(`Persona ${qr.person_number}`, xPosition + qrBoxWidth / 2, yPosition + 8, {
          align: "center",
        })

        // Generate and add QR code
        try {
          const qrDataURL = await QRCodeLib.toDataURL(qr.qr_hash, {
            width: 250,
            margin: 1,
            errorCorrectionLevel: "M",
          })

          const qrX = xPosition + (qrBoxWidth - qrSize) / 2
          const qrY = yPosition + 12

          pdf.addImage(qrDataURL, "PNG", qrX, qrY, qrSize, qrSize)
        } catch (error) {
          console.error("Error generating QR:", error)
        }

        // QR Hash text
        pdf.setFontSize(9)
        pdf.setTextColor(31, 41, 55) // #1f2937
        pdf.setFont("courier", "bold")
        const hashY = yPosition + 12 + qrSize + 5
        pdf.text(qr.qr_hash, xPosition + qrBoxWidth / 2, hashY, { align: "center" })

        // Move to next row after 2 QR codes
        if (col === 1 || i === qrCodes.length - 1) {
          yPosition += qrBoxHeight + 10
        }
      }

      // Footer
      if (yPosition + 25 > pageHeight - margin) {
        pdf.addPage()
        yPosition = margin
      }

      pdf.setDrawColor(229, 231, 235)
      pdf.line(margin, yPosition, pageWidth - margin, yPosition)
      yPosition += 8

      pdf.setFontSize(9)
      pdf.setTextColor(107, 114, 128) // #6b7280
      pdf.setFont("helvetica", "bold")
      pdf.text(
        "Por favor presenta estos códigos QR en la entrada del evento.",
        pageWidth / 2,
        yPosition,
        { align: "center" }
      )
      yPosition += 5

      pdf.setFont("helvetica", "normal")
      pdf.text("Cada código QR solo puede usarse una vez.", pageWidth / 2, yPosition, {
        align: "center",
      })
      yPosition += 5

      pdf.text("Guarda este documento para tu referencia.", pageWidth / 2, yPosition, {
        align: "center",
      })

      // Save PDF
      pdf.save(`QR-Codes-${registration.folio}.pdf`)
    } catch (error) {
      console.error("Error generando PDF:", error)
      alert("Error al generar el PDF. Por favor intenta de nuevo.")
    }
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
              <p className="text-lg font-semibold">
                {new Date(registration.created_at).toLocaleDateString("es-MX")}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleDownloadPDF} className="flex-1">
              <Printer className="mr-2 h-4 w-4" />
              Descargar PDF
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
          <CardDescription>
            Un código QR por persona - cada código solo puede usarse una vez
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {qrCodes.map((qrCode) => (
              <div
                key={qrCode.id}
                className="flex flex-col items-center p-6 border rounded-lg bg-white"
              >
                <div className="mb-3">
                  <Badge variant={qrCode.is_used ? "secondary" : "default"}>
                    Persona {qrCode.person_number}
                  </Badge>
                </div>
                <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                  <QRCodeSVG
                    id={`qr-${qrCode.id}`}
                    value={qrCode.qr_hash}
                    size={150}
                    level="M"
                    marginSize={4}
                  />
                </div>
                <p className="text-lg font-mono font-bold mt-3 text-center tracking-wider">
                  {qrCode.qr_hash}
                </p>
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