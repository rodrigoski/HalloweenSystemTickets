# Cambios: invitaciones con imagen de fondo

**Fecha:** 30 de septiembre de 2026
**Objetivo:** que los códigos QR ya no se generen solos, sino como *invitaciones* (boleto con imagen de fondo + QR) en los tres canales: pantalla, PDF y PNG individual.

---

## 1. Imagen de fondo

| | |
|---|---|
| Archivo | `public/image.png` |
| Tamaño | 1280 × 1280 px (cuadrada, 2.6 MB) |
| Ruta pública | `/image.png` |

La imagen ya estaba en `public/`, que es la carpeta correcta de Next.js para archivos estáticos: se sirve tal cual en `/image.png` y no requiere configuración en `next.config.mjs` (`images.unoptimized: true` ya está activo). **No hizo falta mover el archivo.**

> Sugerencia: 2.6 MB se descarga en cada invitación. Si baja de ~300 KB (comprimir a WebP o JPG quality 82) la pantalla cargará más rápido sin perder calidad visible.

---

## 2. Archivos nuevos

### `lib/invitation.ts` (nuevo)
Motor de render de las invitaciones en `<canvas>`. Es la fuente única de verdad del diseño: el PDF y el PNG usan exactamente la misma composición.

- `INVITATION_BACKGROUND_SRC = "/image.png"` — ruta de la imagen (cambiar aquí la imagen para todo el sistema).
- `TICKET_WIDTH / TICKET_HEIGHT = 1200 / 720` — proporción del boleto (5:3).
- `HEADER_WIDTH / HEADER_HEIGHT = 1600 / 420` — banner del PDF.
- `INVITATION_COLORS` — paleta (naranja `#f97316`, ámbar `#fbbf24`, violetas oscuros para los velos).
- `loadImage(src)` — carga la imagen con `fetch` + `blob` + `Image.decode()` para poder dibujarla en canvas **sin mancharlo** (`toDataURL` seguiría funcionando). Si la imagen no carga devuelve `null`.
- `drawImageCover(ctx, img, x, y, w, h)` — encuadre tipo `object-cover`.
- `renderTicketCanvas(options)` — dibuja el boleto completo (1200×720, `scale` para nitidez).
- `renderHeaderCanvas(options)` — banner del PDF con la misma imagen.

Composición del boleto (`renderTicketCanvas`):

1. Fondo `image.png` cubriendo todo el boleto + velo oscuro `rgba(9,5,24,0.58)`.
2. Gradiente extra del lado izquierdo para que el texto siempre se lea, sin importar qué tan clara sea la imagen.
3. Marco redondeado blanco translúcido.
4. Texts: `EVENTO DE HALLOWEEN`, **FOLIO** (auto-ajusta el tamaño de fuente para que no se corte), **TITULAR**, `PERSONA N DE M`, y el hash del QR en una "pastilla" oscura con texto ámbar.
5. Panel blanco redondeado a la derecha con el QR dentro y el texto `ESCANEA PARA INGRESAR`.
6. Si el QR ya se usó, se estampa un sello diagonal rojo `USADO`.
7. Fallback: si `image.png` no carga, se dibuja un gradiente naranja→morado para que el sistema nunca se rompa.

### `components/invitation-ticket.tsx` (nuevo)
Versión CSS del mismo boleto para la vista web (`next/image` con `fill` + `object-cover`, velos, panel blanco, QR). Recibe `registration`, `qrCode` y `children` (botones), por lo que el botón de descargar se mantiene por código.

---

## 3. Archivos modificados

### `components/qr-code-display.tsx`
- **Nuevo helper** `buildQRDataURL(qrHash)`: genera el QR con `qrcode` a 512 px, `errorCorrectionLevel: "H"` y colores blanco/negro explícitos. La corrección alta es necesaria porque ahora el QR va sobre una imagen de fondo.
- **`handleDownloadPDF`** reescrito en la parte visual:
  - Encabezado con `renderHeaderCanvas()` (imagen + título `INVITACIÓN · CÓDIGOS DE ENTRADA` + folio y cantidad de códigos). Si el canvas falla, cae a un título de texto para no romper la descarga.
  - Cada persona ya no dibuja "recuadro + texto + QR suelto": ahora se renderiza el boleto completo con `renderTicketCanvas()` a `scale: 2` y se pega en el PDF con `pdf.addImage(...)`.
  - Rejilla: 2 invitaciones por fila, `ticketWidth = (contentWidth - 10) / 2 = 85 mm`, `ticketHeight = 85 × (720/1200) = 51 mm`. El salto de página se calcula con la nueva altura (cabían ~8 por hoja antes; ahora ~6 por hoja, que es lo correcto porque cada invitación es un boleto completo).
  - Se conserva intacto el bloque de datos del folio (cliente, personas, monto, fecha), los margins, el salto de página y el pie de página.
- **`handleDownloadIndividualQR`** reescrito: ya no serializa el `<svg>` del DOM con `XMLSerializer` (fragilidad y resolución baja). Ahora usa el mismo `renderTicketCanvas()` a `scale: 2` y descarga con `canvas.toBlob`. Archivo renombrado a `{folio}-Invitacion-Persona-{n}.png` y ahora es 2400×1440 en lugar de 400×500.
- **Importaciones**: se quitó `QRCodeSVG` de este archivo (el QR en pantalla lo dibuja `InvitationTicket`) y se agregaron `InvitationTicket`, `renderHeaderCanvas` y `renderTicketCanvas`.
- **JSX**: la tarjeta "Códigos QR" pasó a "Invitaciones"; la rejilla es de 2 columnas (`grid-cols-1 lg:grid-cols-2`) porque cada boleto es horizontal. El botón ahora dice **Descargar invitación**.

### `README.md`
- Tabla de tecnologías: nuevas filas para invitaciones y `qrcode` (PDF/PNG).
- Estructura de carpetas: `components/invitation-ticket.tsx` y `lib/invitation.ts`.
- Descripción de `qr-code-display.tsx` actualizada.

---

## 4. Decisiones de diseño

| Tema | Decisión | Por qué |
|---|---|---|
| QR sobre imagen | Panel blanco 100 % opaco detrás del QR | Un QR sobre foto con degradado deja de leerse en muchos escáneres; el fondo queda como decoración alrededor |
| Corrección de errores | `errorCorrectionLevel: "H"` (antes `"M"`) | Tolera el contraste del fondo y da margen si alguien dobla el boleto |
| Resolución | `scale: 2` en PDF y PNG | 2400×1440 impreso a 85 mm ≈ 700 dpi, se ve nítido hasta en papel térmico |
| Implementación | Canvas en el cliente en vez de `html2canvas` (ya estaba en el proyecto) | Salida determinista, mismo resultado en PDF y PNG, sin depender del CSS del tema |
| Fallback sin imagen | Gradiente naranja→morado | Si se borra `public/image.png` el sistema sigue generando invitaciones |
| Dónde tocar para cambiar el diseño | `lib/invitation.ts` (color, textos, tamaños) y `components/invitation-ticket.tsx` (versión web) | Un solo lugar por canal |

---

## 5. Verificación

- `npx tsc --noEmit` → sin errores.
- `npm run build` → compila correctamente (16 páginas generadas).
- Pendiente de revisión visual: abrir `/registrations/{id}`, pulsar **Descargar PDF** y **Descargar invitación** para confirmar el escaneo con la app de cámara (el QR debe leerse con el fondo de por medio).

---

## 6. Si quieres ajustarlo

- **Cambiar la imagen**: reemplaza `public/image.png` (idealmente horizontal, 1920×1080 o 1280×720; si es muy alta se recorta con `object-cover`).
- **Cambiar textos/posición del QR**: `lib/invitation.ts`, funciones `renderTicketCanvas` (coordenadas en px sobre 1200×720) y `renderHeaderCanvas`.
- **Cambiar colores**: objeto `INVITATION_COLORS`.
- **Cambiar el nombre del evento o logo**: prop `eventName` de `TicketRenderOptions` y prop `title`/`subtitle` de `HeaderRenderOptions`.
- **Quitar el sello "USADO"**: no pasar `isUsed` a `renderTicketCanvas`.
- **Cambiar la vista web**: `components/invitation-ticket.tsx` (clases de Tailwind).