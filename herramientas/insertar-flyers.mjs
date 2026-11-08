/* ═══════════════════════════════════════════════════════════════════════
   CROCAN POLLO · herramientas/insertar-flyers.mjs
   KZ-MENU-005 · monta los flyers del cliente en la página (no se publica)

   Espera estos dos archivos, que son los que entregó el negocio:
     assets/img/flyer-oferta.jpg   el volante de la promoción
     assets/img/flyer-menu.jpg     el volante del menú completo

   Qué hace
     1. Comprueba que los dos archivos existan y que sean imágenes válidas.
     2. Si alguno pesa más de 400 KB, avisa (no lo toca: primero se decide).
     3. Monta en `index.html`:
          · el flyer de la OFERTA dentro del bloque de la promoción,
          · el flyer del MENÚ como imagen grande pulsable debajo de la promoción.
        Los dos abren la imagen a tamaño completo en otra pestaña.
     4. Es idempotente: si ya están montados, no duplica nada.

   Regla que respeta: nunca se referencia una imagen que no exista. Si falta
   alguno de los dos, el script se detiene sin tocar la página.

   Uso:  node herramientas/insertar-flyers.mjs
   ═══════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..');
const PAGINA = path.join(RAIZ, 'index.html');
const IMG = path.join(RAIZ, 'assets', 'img');
const OFERTA = path.join(IMG, 'flyer-oferta.jpg');
const MENU = path.join(IMG, 'flyer-menu.jpg');
const LIMITE_KB = 400;

function kb(fichero) { return Math.round(fs.statSync(fichero).size / 1024); }

function esJpeg(fichero) {
  const b = fs.readFileSync(fichero).subarray(0, 3);
  return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
}

/* ─── comprobaciones previas: sin los dos archivos no se toca nada ─── */
const faltan = [OFERTA, MENU].filter((f) => !fs.existsSync(f));
if (faltan.length) {
  console.error('Faltan imágenes; no se toca la página:');
  faltan.forEach((f) => console.error('  · ' + path.relative(RAIZ, f)));
  console.error('');
  console.error('Déjalas en assets/img/ con esos nombres exactos (flyer-oferta.jpg y flyer-menu.jpg).');
  process.exit(1);
}
for (const f of [OFERTA, MENU]) {
  if (!esJpeg(f)) {
    console.error('No parece un JPEG válido: ' + path.relative(RAIZ, f));
    process.exit(1);
  }
}
for (const [f, nombre] of [[OFERTA, 'oferta'], [MENU, 'menú']]) {
  const peso = kb(f);
  console.log(`  flyer de ${nombre}: ${peso} KB` + (peso > LIMITE_KB ? '  ← pesa más de ' + LIMITE_KB + ' KB: conviene optimizarlo' : ''));
}

/* ─── piezas de HTML ─── */
const BLOQUE_OFERTA = `
        <a class="promo__flyer" href="assets/img/flyer-oferta.jpg" target="_blank" rel="noopener noreferrer"
           aria-label="Ver el volante de la promoción en tamaño completo">
          <img src="assets/img/flyer-oferta.jpg" alt="Volante de la promoción de Crocan Pollo: pollo completo con gaseosa de 1 litro gratis"
               width="640" height="900" loading="lazy" decoding="async">
        </a>`;

const BLOQUE_MENU = `
      <!-- Flyer del menú completo, pulsable para verlo en grande -->
      <a class="flyer" href="assets/img/flyer-menu.jpg" target="_blank" rel="noopener noreferrer"
         aria-label="Ver el menú completo en tamaño grande">
        <img src="assets/img/flyer-menu.jpg" alt="Menú completo de Crocan Pollo con todos los precios"
             width="900" height="1200" loading="lazy" decoding="async">
        <span class="flyer__pie">Toca para ver el menú en grande</span>
      </a>
`;

let html = fs.readFileSync(PAGINA, 'utf8');
let cambios = 0;

/* 1 · dentro del bloque de promoción: después del detalle del pollo entero */
const ANCLA_DETALLE = '4 mieles y 1 maduro.\n        </p>';
if (!html.includes('class="promo__flyer"')) {
  if (!html.includes(ANCLA_DETALLE)) {
    console.error('No se encontró el bloque de promoción esperado. No se toca la página.');
    process.exit(1);
  }
  html = html.replace(ANCLA_DETALLE, ANCLA_DETALLE + BLOQUE_OFERTA);
  cambios++;
}

/* 2 · debajo de la promoción: el flyer del menú, grande y pulsable */
const ANCLA_INSIGNIAS = '\n\n      <ul class="hero__insignias">';
if (!html.includes('class="flyer"')) {
  if (!html.includes(ANCLA_INSIGNIAS)) {
    console.error('No se encontró el punto de inserción del flyer del menú. No se toca la página.');
    process.exit(1);
  }
  html = html.replace(ANCLA_INSIGNIAS, '\n' + BLOQUE_MENU + ANCLA_INSIGNIAS.trimStart().replace(/^/, '\n'));
  cambios++;
}

if (!cambios) {
  console.log('Ya estaban montados: no se duplica nada.');
  process.exit(0);
}

fs.writeFileSync(PAGINA, html, 'utf8');
console.log('Listo: ' + cambios + ' bloque(s) montados en index.html');
