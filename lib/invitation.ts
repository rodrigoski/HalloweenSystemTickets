"use client"

/**
 * Configuración y renderizado de las invitaciones (QR + imagen de fondo).
 *
 * La imagen de fondo vive en `public/` y se usa en los tres canales:
 *  - Pantalla  -> `components/invitation-ticket.tsx` (CSS)
 *  - PDF       -> `renderTicketCanvas()` + `renderHeaderCanvas()`
 *  - PNG       -> `renderTicketCanvas()`
 *
 * El QR siempre se dibuja sobre un panel blanco opaco para que el fondo
 * (que es una imagen decorativa) no afecte la lectura del escáner.
 */

/** Ruta pública de la imagen de fondo de la invitación. */
export const INVITATION_BACKGROUND_SRC_GENERAL = "/qr_general.jpeg"
export const INVITATION_BACKGROUND_SRC_VIP = "/qr_vip.jpeg"
export const INVITATION_BACKGROUND_SRC = INVITATION_BACKGROUND_SRC_GENERAL

export function getInvitationBackgroundSrc(ticketType?: "general" | "vip") {
  return ticketType === "vip" ? INVITATION_BACKGROUND_SRC_VIP : INVITATION_BACKGROUND_SRC_GENERAL
}

/** Tamaño lógico del boleto (px) usado por los canvas de PDF y PNG. */
export const TICKET_WIDTH = 800
export const TICKET_HEIGHT = 1200

/** Encabezado dibujado en el PDF. */
export const HEADER_WIDTH = 1600
export const HEADER_HEIGHT = 420

/**
 * Recuadro del diseño donde va el QR (coordenadas en el espacio lógico 800x1200).
 * Si el QR no queda perfectamente centrado, ajusta estos valores.
 * Si el diseño VIP tiene el recuadro en otro lugar, cambia QR_BOX_VIP.
 */
export const QR_BOX_GENERAL = { x: 78, y: 806, w: 383, h: 322 }
export const QR_BOX_VIP = { x: 78, y: 806, w: 383, h: 322 }

export function getQrBox(ticketType?: "general" | "vip") {
  return ticketType === "vip" ? QR_BOX_VIP : QR_BOX_GENERAL
}

export const INVITATION_COLORS = {
  primary: "#f97316",
  primaryDark: "#c2410c",
  white: "#ffffff",
  panel: "#ffffff",
  overlay: "rgba(9, 5, 24, 0.58)",
  overlaySoft: "rgba(9, 5, 24, 0.34)",
  muted: "rgba(255, 255, 255, 0.72)",
  hashChip: "rgba(9, 5, 24, 0.72)",
  hashText: "#fde68a",
  accentText: "#fbbf24",
  used: "#dc2626",
} as const

export interface TicketRenderOptions {
  folio: string
  clientName: string
  personNumber: number
  personCount: number
  qrHash: string
  qrDataUrl: string
  isUsed?: boolean
  /** Multiplicador de resolución (2 = doble nitidez para el PDF). */
  scale?: number
  eventName?: string
  ticketType?: "general" | "vip"
}

export interface HeaderRenderOptions {
  folio: string
  qrCount: number
  title?: string
  subtitle?: string
  scale?: number
  ticketType?: "general" | "vip"
}

/**
 * Carga una imagen desde una URL (mismo origen) para poder dibujarla en canvas
 * sin tainted canvas. Devuelve null si la imagen no está disponible.
 */
export async function loadImage(src: string): Promise<HTMLImageElement | null> {
  if (typeof window === "undefined") return null

  try {
    const response = await fetch(src)
    if (!response.ok) return null

    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)

    try {
      const img = new Image()
      img.decoding = "async"
      img.src = objectUrl
      if (typeof img.decode === "function") {
        await img.decode()
      } else {
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve()
          img.onerror = () => reject(new Error("No se pudo cargar la imagen"))
        })
      }
      return img
    } finally {
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 5000)
    }
  } catch {
    return null
  }
}

/** Dibuja la imagen cubriendo por completo el rectángulo (object-cover). */
export function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const scale = Math.max(width / img.width, height / img.height)
  const drawWidth = img.width * scale
  const drawHeight = img.height * scale

  ctx.drawImage(img, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight)
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + width, y, x + width, y + height, r)
  ctx.arcTo(x + width, y + height, x, y + height, r)
  ctx.arcTo(x, y + height, x, y, r)
  ctx.arcTo(x, y, x + width, y, r)
  ctx.closePath()
}

/** Reduce el tamaño de fuente hasta que el texto quepa en `maxWidth`. */
function fitFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  baseSize: number,
  weight: string,
  family = "Segoe UI, Arial, sans-serif"
) {
  let size = baseSize
  while (size > 10) {
    ctx.font = `${weight} ${size}px ${family}`
    if (ctx.measureText(text).width <= maxWidth) break
    size -= 2
  }
  return size
}

/** Fondo: imagen de fondo + overlay. Si no hay imagen, gradiente naranja. */
async function paintBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  overlay: string,
  ticketType?: "general" | "vip"
) {
  const img = await loadImage(getInvitationBackgroundSrc(ticketType))

  if (img) {
    ctx.drawImage(img, 0, 0, width, height)
  } else {
    const fallback = ctx.createLinearGradient(0, 0, width, height)
    fallback.addColorStop(0, INVITATION_COLORS.primaryDark)
    fallback.addColorStop(0.55, "#3b0764")
    fallback.addColorStop(1, "#0b0416")
    ctx.fillStyle = fallback
    ctx.fillRect(0, 0, width, height)
  }

  ctx.fillStyle = overlay
  ctx.fillRect(0, 0, width, height)
}

/** Sello diagonal "USADO" para invitaciones ya canjeadas. */
function drawUsedStamp(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.save()
  ctx.translate(width / 2, height / 2)
  ctx.rotate(-Math.PI / 9)
  ctx.globalAlpha = 0.85
  ctx.fillStyle = INVITATION_COLORS.used
  ctx.fillRect(-260, -62, 520, 124)
  ctx.fillStyle = INVITATION_COLORS.white
  ctx.font = "bold 66px Segoe UI, Arial, sans-serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText("USADO", 0, 4)
  ctx.restore()
  ctx.globalAlpha = 1
  ctx.textAlign = "left"
  ctx.textBaseline = "alphabetic"
}

/**
 * Genera el boleto completo (fondo + datos + QR) en un canvas.
 * Se usa tanto para el PDF como para la descarga PNG individual.
 */
export async function renderTicketCanvas(options: TicketRenderOptions): Promise<HTMLCanvasElement> {
  const { clientName, personNumber, personCount, qrHash, qrDataUrl, isUsed = false } = options
  const scale = options.scale ?? 1

  const canvas = document.createElement("canvas")
  canvas.width = TICKET_WIDTH * scale
  canvas.height = TICKET_HEIGHT * scale

  const ctx = canvas.getContext("2d")
  if (!ctx) return canvas

  ctx.scale(scale, scale)
  ctx.textAlign = "left"
  ctx.textBaseline = "alphabetic"

  await paintBackground(ctx, TICKET_WIDTH, TICKET_HEIGHT, INVITATION_COLORS.overlay, options.ticketType)

  // Viñeta: overlay más fuerte del lado del texto para legibilidad.
  const topShade = ctx.createLinearGradient(0, 0, 0, TICKET_HEIGHT * 0.58)
  topShade.addColorStop(0, "rgba(9, 5, 24, 0.68)")
  topShade.addColorStop(1, "rgba(9, 5, 24, 0)")
  ctx.fillStyle = topShade
  ctx.fillRect(0, 0, TICKET_WIDTH, TICKET_HEIGHT * 0.58)

  // Marco del boleto
  ctx.strokeStyle = "rgba(255, 255, 255, 0.28)"
  ctx.lineWidth = 4
  roundRectPath(ctx, 2, 2, TICKET_WIDTH - 4, TICKET_HEIGHT - 4, 28)
  ctx.stroke()

  // ---------------------------------------------------------------- textos
  const textX = 48
  const textMaxWidth = TICKET_WIDTH - textX * 2

  ctx.fillStyle = INVITATION_COLORS.white
  ctx.font = "bold 44px Segoe UI, Arial, sans-serif"
  ctx.textAlign = "left"
  fitFontSize(ctx, clientName, TICKET_WIDTH - 340, 44, "bold")
  ctx.fillText(clientName, 40, 120)

  ctx.fillStyle = INVITATION_COLORS.accentText
  ctx.font = "bold 34px Segoe UI, Arial, sans-serif"
  ctx.textAlign = "center"
  ctx.fillText(`PERSONA ${personNumber} DE ${personCount}`, TICKET_WIDTH / 2, 448)

  // Chip con el hash del QR
  ctx.font = "bold 30px Consolas, 'Courier New', monospace"
  const chipPaddingX = 20
  const chipTextWidth = ctx.measureText(qrHash).width
  const chipWidth = Math.min(chipTextWidth + chipPaddingX * 2, textMaxWidth)
  const chipX = (TICKET_WIDTH - chipWidth) / 2
  ctx.fillStyle = INVITATION_COLORS.hashChip
  roundRectPath(ctx, chipX, 484, chipWidth, 56, 14)
  ctx.fill()
  ctx.fillStyle = INVITATION_COLORS.hashText
  ctx.textAlign = "center"
  ctx.fillText(qrHash, TICKET_WIDTH / 2, 522)

  // Texto de ayuda (centrado para que no se corte)
  ctx.fillStyle = INVITATION_COLORS.muted
  ctx.font = "22px Segoe UI, Arial, sans-serif"
  ctx.textAlign = "center"
  ctx.fillText("Presenta este código en la entrada. Un solo uso por persona.", TICKET_WIDTH / 2, 596)

  // ------------------------------------------------------------- QR dentro del recuadro del diseño
  const box = getQrBox(options.ticketType)
  const inset = 12 // margen entre el borde del recuadro y el panel blanco
  const panelSize = Math.min(box.w, box.h) - inset * 2 // cuadrado, cabe en el recuadro
  const panelX = box.x + (box.w - panelSize) / 2
  const panelY = box.y + (box.h - panelSize) / 2

  // Panel blanco opaco para que el escáner lea bien
  ctx.fillStyle = INVITATION_COLORS.panel
  roundRectPath(ctx, panelX, panelY, panelSize, panelSize, 16)
  ctx.fill()

  const qrPadding = 8
  const qrSize = panelSize - qrPadding * 2
  try {
    const qrImg = new Image()
    qrImg.src = qrDataUrl
    if (typeof qrImg.decode === "function") {
      await qrImg.decode()
    } else {
      await new Promise<void>((resolve, reject) => {
        qrImg.onload = () => resolve()
        qrImg.onerror = () => reject(new Error("No se pudo cargar el QR"))
      })
    }
    ctx.drawImage(qrImg, panelX + qrPadding, panelY + qrPadding, qrSize, qrSize)
  } catch {
    ctx.fillStyle = "#000000"
    ctx.font = "20px Segoe UI, Arial, sans-serif"
    ctx.textAlign = "left"
    ctx.fillText("Error al cargar el QR", panelX + 20, panelY + 60)
  }

  ctx.textAlign = "left"

  if (isUsed) drawUsedStamp(ctx, TICKET_WIDTH, TICKET_HEIGHT)

  return canvas
}

/** Encabezado con fondo para la portada del PDF. */
export async function renderHeaderCanvas(options: HeaderRenderOptions): Promise<HTMLCanvasElement> {
  const { folio, qrCount, scale = 1 } = options
  const title = options.title ?? "INVITACIÓN · CÓDIGOS DE ENTRADA"
  const subtitle = options.subtitle ?? `Folio ${folio} · ${qrCount} ${qrCount === 1 ? "código" : "códigos"} QR`

  const canvas = document.createElement("canvas")
  canvas.width = HEADER_WIDTH * scale
  canvas.height = HEADER_HEIGHT * scale

  const ctx = canvas.getContext("2d")
  if (!ctx) return canvas

  ctx.scale(scale, scale)
  ctx.textAlign = "left"
  ctx.textBaseline = "alphabetic"

  await paintBackground(ctx, HEADER_WIDTH, HEADER_HEIGHT, "rgba(9, 5, 24, 0.66)", options.ticketType)

  const gradient = ctx.createLinearGradient(0, 0, HEADER_WIDTH, HEADER_HEIGHT)
  gradient.addColorStop(0, "rgba(249, 115, 22, 0.35)")
  gradient.addColorStop(1, "rgba(9, 5, 24, 0.55)")
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, HEADER_WIDTH, HEADER_HEIGHT)

  ctx.fillStyle = INVITATION_COLORS.primary
  ctx.fillRect(72, 132, 96, 8)

  ctx.fillStyle = INVITATION_COLORS.white
  ctx.font = "bold 76px Segoe UI, Arial, sans-serif"
  fitFontSize(ctx, title, HEADER_WIDTH - 200, 76, "bold")
  ctx.fillText(title, 72, 250)

  ctx.fillStyle = INVITATION_COLORS.accentText
  ctx.font = "600 38px Segoe UI, Arial, sans-serif"
  ctx.fillText(subtitle, 72, 320)

  return canvas
}