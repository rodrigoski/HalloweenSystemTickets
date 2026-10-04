"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, Share2, Printer } from "lucide-react"
import type { Registration, QRCode } from "@/lib/types"
import { InvitationTicket } from "@/components/invitation-ticket"
import { renderHeaderCanvas, renderTicketCanvas } from "@/lib/invitation"
import { useRef } from "react"
import jsPDF from "jspdf"

interface QRCodeDisplayProps {
  registration: Registration
  qrCodes: QRCode[]
}

/** Genera el PNG del QR con corrección de errores alta (soporta el fondo). */
async function buildQRDataURL(qrHash: string) {
  const QRCodeLib = await import("qrcode")
  return QRCodeLib.toDataURL(qrHash, {
    width: 512,
    margin: 1,
    errorCorrectionLevel: "H",
    color: { dark: "#000000ff", light: "#ffffffff" },
  })
}

export function QRCodeDisplay({ registration, qrCodes }: QRCodeDisplayProps) {
  const printRef = useRef<HTMLDivElement>(null)

  const handleDownloadPDF = async () => {
    try {
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

      // Encabezado con la imagen de la invitación
      try {
        const headerCanvas = await renderHeaderCanvas({
          folio: registration.folio,
          qrCount: qrCodes.length,
        })
        const headerHeight = 45
        pdf.addImage(headerCanvas.toDataURL("image/png"), "PNG", margin, yPosition, contentWidth, headerHeight)
        yPosition += headerHeight + 10
      } catch (error) {
        console.error("Error generando encabezado:", error)
        pdf.setFontSize(18)
        pdf.setTextColor(249, 115, 22)
        pdf.setFont("helvetica", "bold")
        pdf.text("INVITACIÓN · CÓDIGOS DE ENTRADA", pageWidth / 2, yPosition + 8, { align: "center" })
        yPosition += 18
      }

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

      yPosition += 47

      // Invitaciones - 2 por fila (imagen de fondo + QR)
      const ticketWidth = (contentWidth - 10) / 2
      const ticketHeight = (ticketWidth * 1200) / 800

      for (let i = 0; i < qrCodes.length; i++) {
        const qr = qrCodes[i]
        const col = i % 2
        const xPosition = margin + col * (ticketWidth + 10)

        // Check if we need a new page
        if (yPosition + ticketHeight > pageHeight - margin && i > 0) {
          pdf.addPage()
          yPosition = margin
        }

        try {
          const qrDataURL = await buildQRDataURL(qr.qr_hash)
          const ticketCanvas = await renderTicketCanvas({
            folio: registration.folio,
            clientName: registration.client_name,
            personNumber: qr.person_number,
            personCount: registration.person_count,
            qrHash: qr.qr_hash,
            qrDataUrl: qrDataURL,
            isUsed: qr.is_used,
            scale: 2,
          })

          pdf.addImage(ticketCanvas.toDataURL("image/png"), "PNG", xPosition, yPosition, ticketWidth, ticketHeight)
        } catch (error) {
          console.error("Error generando invitación:", error)
        }

        // Move to next row after 2 QR codes
        if (col === 1 || i === qrCodes.length - 1) {
          yPosition += ticketHeight + 10
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
      const qrDataURL = await buildQRDataURL(qrCode.qr_hash)

      const ticketCanvas = await renderTicketCanvas({
        folio: registration.folio,
        clientName: registration.client_name,
        personNumber: qrCode.person_number,
        personCount: registration.person_count,
            qrHash: qrCode.qr_hash,
            qrDataUrl: qrDataURL,
            isUsed: qrCode.is_used,
            scale: 2,
            ticketType: (registration.ticket_type as any) || (qrCode.ticket_type as any),
          })

      ticketCanvas.toBlob((blob) => {
        if (blob) {
          const downloadUrl = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = downloadUrl
          a.download = `${registration.folio}-Invitacion-Persona-${qrCode.person_number}.png`
          document.body.appendChild(a)
          a.click()
          URL.revokeObjectURL(downloadUrl)
          document.body.removeChild(a)
        }
      }, "image/png")
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
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
          {registration.created_by_email && (
            <div className="mb-6 p-4 bg-accent/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Registrado por</p>
              <p className="text-sm font-medium break-all">{registration.created_by_email}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleDownloadPDF} className="flex-1">
              <Printer className="mr-2 h-4 w-4" />
              Descargar PDF
            </Button>
            {qrCodes[0] && (
              <Button
                variant="outline"
                className="flex-1 bg-transparent"
                onClick={() => handleDownloadIndividualQR(qrCodes[0])}
              >
                <Download className="mr-2 h-4 w-4" />
                Descargar Imagen
              </Button>
            )}
            <Button onClick={handleShareWhatsApp} variant="outline" className="flex-1 bg-transparent">
              <Share2 className="mr-2 h-4 w-4" />
              Compartir por WhatsApp
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invitaciones</CardTitle>
          <CardDescription>
            Una invitación por persona - cada código solo puede usarse una vez
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {qrCodes.map((qrCode) => (
              <InvitationTicket key={qrCode.id} registration={registration} qrCode={qrCode}>
                <div className="flex items-center gap-2">
                  <Badge variant={qrCode.is_used ? "destructive" : "secondary"}>
                    Persona {qrCode.person_number}
                  </Badge>
                  {!qrCode.is_used && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-auto bg-transparent"
                      onClick={() => handleDownloadIndividualQR(qrCode)}
                    >
                      <Download className="mr-2 h-3 w-3" />
                      Descargar invitación
                    </Button>
                  )}
                </div>
              </InvitationTicket>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}