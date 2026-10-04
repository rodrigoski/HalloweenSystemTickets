const fs = require('fs');
const p = 'C:/Users/IGNITER/Documents/Projects/HalloweenTicketSystem/lib/invitation.ts';
let s = fs.readFileSync(p, 'utf8');
// Replace text block from after stroke to before QR panel
const old =   ctx.stroke()

  // ---------------------------------------------------------------- textos
  const textX = 64
  const textMaxWidth = 520

  ctx.fillStyle = INVITATION_COLORS.primary
  ctx.font = "bold 30px Segoe UI, Arial, sans-serif"
  drawTrackedText(ctx, eventName, textX, 132, 3)

  ctx.fillStyle = INVITATION_COLORS.muted
  ctx.font = "600 22px Segoe UI, Arial, sans-serif"
  drawTrackedText(ctx, "FOLIO", textX, 196, 5)

  ctx.fillStyle = INVITATION_COLORS.white
  ctx.font = "bold 64px Segoe UI, Arial, sans-serif"
  fitFontSize(ctx, folio, textMaxWidth, 64, "bold")
  ctx.fillText(folio, textX, 258)

  ctx.fillStyle = INVITATION_COLORS.muted
  ctx.font = "600 22px Segoe UI, Arial, sans-serif"
  drawTrackedText(ctx, "TITULAR", textX, 318, 5)

  ctx.fillStyle = INVITATION_COLORS.white
  fitFontSize(ctx, clientName, textMaxWidth, 44, "bold")
  ctx.fillText(clientName, textX, 364)

  ctx.fillStyle = INVITATION_COLORS.accentText
  ctx.font = "bold 34px Segoe UI, Arial, sans-serif"
  ctx.fillText(\PERSONA \ DE \\, textX, 428)

  // Chip con el hash del QR
  ctx.font = "bold 32px Consolas, 'Courier New', monospace"
  const chipPaddingX = 20
  const chipWidth = Math.min(ctx.measureText(qrHash).width + chipPaddingX * 2, textMaxWidth)
  ctx.fillStyle = INVITATION_COLORS.hashChip
  roundRectPath(ctx, textX, 462, chipWidth, 56, 14)
  ctx.fill()
  ctx.fillStyle = INVITATION_COLORS.hashText
  ctx.fillText(qrHash, textX + chipPaddingX, 499)

  ctx.fillStyle = INVITATION_COLORS.muted
  ctx.font = "22px Segoe UI, Arial, sans-serif"
  ctx.fillText("Presenta este c\u00f3digo en la entrada. Un solo uso por persona.", textX, 596);
const nw =   ctx.stroke()

  // ---------------------------------------------------------------- textos
  const textX = 48
  const textMaxWidth = TICKET_WIDTH - textX * 2

  ctx.fillStyle = INVITATION_COLORS.primary
  ctx.font = "bold 30px Segoe UI, Arial, sans-serif"
  ctx.textAlign = "center"
  drawTrackedText(ctx, eventName, TICKET_WIDTH / 2, 150, 3)

  ctx.fillStyle = INVITATION_COLORS.muted
  ctx.font = "600 22px Segoe UI, Arial, sans-serif"
  drawTrackedText(ctx, "FOLIO", TICKET_WIDTH / 2, 214, 5)

  ctx.fillStyle = INVITATION_COLORS.white
  ctx.font = "bold 64px Segoe UI, Arial, sans-serif"
  fitFontSize(ctx, folio, textMaxWidth, 64, "bold")
  ctx.textAlign = "center"
  ctx.fillText(folio, TICKET_WIDTH / 2, 276)

  ctx.fillStyle = INVITATION_COLORS.muted
  ctx.font = "600 22px Segoe UI, Arial, sans-serif"
  drawTrackedText(ctx, "TITULAR", TICKET_WIDTH / 2, 336, 5)

  ctx.fillStyle = INVITATION_COLORS.white
  fitFontSize(ctx, clientName, textMaxWidth, 44, "bold")
  ctx.textAlign = "center"
  ctx.fillText(clientName, TICKET_WIDTH / 2, 384)

  ctx.fillStyle = INVITATION_COLORS.accentText
  ctx.font = "bold 34px Segoe UI, Arial, sans-serif"
  ctx.textAlign = "center"
  ctx.fillText(\PERSONA \ DE \\, TICKET_WIDTH / 2, 448)

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

  ctx.fillStyle = INVITATION_COLORS.muted
  ctx.font = "20px Segoe UI, Arial, sans-serif"
  ctx.textAlign = "center"
  const noteY = 580
  ctx.fillText("Presenta este c\u00f3digo en la entrada.", TICKET_WIDTH / 2, noteY)
  ctx.fillText("Un solo uso por persona.", TICKET_WIDTH / 2, noteY + 28);
if (s.indexOf(old) !== -1) {
  s = s.replace(old, nw);
} else {
  // try looser
}
fs.writeFileSync(p, s);
console.log('ok');
