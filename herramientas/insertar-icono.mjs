/* ═══════════════════════════════════════════════════════════════════════
   CROCAN POLLO · herramientas/insertar-icono.mjs
   KZ-MENU-005 · inyecta el icono oficial de WhatsApp (no se publica)

   El icono de WhatsApp es una traza larguísima. En vez de reescribirla a
   mano —donde un carácter cambiado rompe el dibujo— se toma tal cual del
   menú de BROSTY PAPAS, que ya está en producción y usa el icono oficial de
   simple-icons. Así los dos menús usan exactamente el mismo trazo.

   Sustituye el marcador `__WA_PATH__` del index.html por la traza real.
   Es idempotente: si ya está aplicado, no hace nada.

   Uso:  node herramientas/insertar-icono.mjs
   ═══════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ORIGEN = path.resolve(RAIZ, '..', 'brosty-papas', 'index.html');
const DESTINO = path.join(RAIZ, 'index.html');
const MARCADOR = '__WA_PATH__';

if (!fs.existsSync(ORIGEN)) {
  console.error('No se encuentra el menú de referencia: ' + ORIGEN);
  process.exit(1);
}

const origen = fs.readFileSync(ORIGEN, 'utf8');
/* La traza oficial empieza por M12.04 (contorno del globo de WhatsApp). */
const encontrada = origen.match(/<path d="(M12\.04[^"]{400,})"/);
if (!encontrada) {
  console.error('No se encontró la traza del icono en el menú de referencia.');
  process.exit(1);
}

let destino = fs.readFileSync(DESTINO, 'utf8');
if (!destino.includes(MARCADOR)) {
  const yaTiene = /<path d="M12\.04[^"]{400,}"\/>/.test(destino);
  console.log(yaTiene ? 'Ya estaba aplicado: no se toca nada.' : 'Aviso: no hay marcador ni icono; revisa el index.html.');
  process.exit(0);
}

destino = destino.replace(MARCADOR, encontrada[1]);
fs.writeFileSync(DESTINO, destino, 'utf8');
console.log('Icono insertado: ' + encontrada[1].length + ' caracteres de traza en index.html');
