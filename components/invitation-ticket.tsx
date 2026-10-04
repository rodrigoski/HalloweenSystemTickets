"use client"

import Image from "next/image"
import { QRCodeSVG } from "qrcode.react"
import { getInvitationBackgroundSrc } from "@/lib/invitation"
import type { QRCode, Registration } from "@/lib/types"

interface InvitationTicketProps {
  registration: Registration
  qrCode: QRCode
  children?: React.ReactNode
}

/**
 * Versión en pantalla (CSS) del boleto: misma composición que el canvas de
 * `lib/invitation.ts` (fondo + panel blanco con el QR) para que lo que ve el
 * cliente coincida con el PDF y con el PNG descargado.
 */
export function InvitationTicket({ registration, qrCode, children }: InvitationTicketProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/30 shadow-lg">
      <Image
        src={getInvitationBackgroundSrc(registration.ticket_type || qrCode.ticket_type)}
        alt=""
        fill
        priority={false}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-[#090518]/60" />
      <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-[#090518]/70 to-transparent" />

      <div className="relative p-8 h-full min-h-[480px] sm:min-h-[560px]">
        <h2 className="absolute top-8 left-8 right-8 text-2xl font-bold text-white sm:text-3xl break-words">
          {registration.client_name}
        </h2>
        <div className="absolute bottom-6 left-6 rounded-2xl bg-[#090518]/95 p-2.5 shadow-xl ring-2 ring-white/25">
          <QRCodeSVG
            id={`qr-${qrCode.id}`}
            value={qrCode.qr_hash}
            size={160}
            level="H"
            marginSize={0}
            bgColor="#090518"
            fgColor="#ffffff"
          />
        </div>
      </div>

      {qrCode.is_used && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/35">
          <div className="-rotate-12 rounded-lg bg-red-600 px-8 py-3 text-3xl font-bold uppercase text-white shadow-xl">
            Usado
          </div>
        </div>
      )}

      {children && <div className="relative border-t border-white/20 p-3">{children}</div>}
    </div>
  )
}