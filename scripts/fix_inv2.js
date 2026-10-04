const fs = require('fs');
const p = 'C:/Users/IGNITER/Documents/Projects/HalloweenTicketSystem/lib/invitation.ts';
let s = fs.readFileSync(p, 'utf8');
// Replace text block
const old = '  ctx.fillText(PERSONA  DE , textX, 428)';
const old2 = '  ctx.fillText(PERSONA  DE , TICKET_WIDTH / 2, 448)'; // if already partial
if (s.includes(old)) {
  s = s.replace(old, '  ctx.textAlign = "center"\n  ctx.fillText(PERSONA  DE , TICKET_WIDTH / 2, 448)');
} else if (s.includes('PERSONA  DE ')) {
  s = s.replace(/ctx\.fillText\(PERSONA \$\{personNumber\} DE \$\{personCount\}.*\)/, '  ctx.textAlign = "center"\n  ctx.fillText(PERSONA  DE , TICKET_WIDTH / 2, 448)');
}
fs.writeFileSync(p, s);
console.log('ok');
