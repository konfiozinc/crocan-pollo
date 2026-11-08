/* ═══════════════════════════════════════════════════════════════════════
   CROCAN POLLO · herramientas/probar.mjs
   KZ-MENU-005 · pruebas funcionales en un Chromium real (no se publica)

   Qué comprueba
     1. Que la página carga sin un solo error de consola y sin imágenes rotas.
     2. El botón con stepper: «+ Agregar» → [ − ] [ 1 ] [ + ] → … → vuelve a
        «+ Agregar» al llegar a 0, y que el carrito global cuadra.
     3. Los precios: subtotal por línea y TOTAL, con los números del flyer.
     4. Los jugos: presentación (agua/leche) cambia el precio y el sabor crea
        una línea propia.
     5. La factura de WhatsApp: campos obligatorios y texto exacto.
     6. Sin desbordes en 375 px y persistencia al recargar.

   Uso:  node herramientas/probar.mjs
   Deja capturas y el mensaje exacto en `evidencias/`.
   ═══════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';

const RAIZ = path.resolve(import.meta.dirname, '..');
const EVID = path.join(RAIZ, 'evidencias');
const PUERTO = 8151;
const require = createRequire(import.meta.url);

/* Playwright se toma del repositorio `card`, que ya lo tiene instalado.
   No se instala una copia nueva: Regla de Oro del entorno. */
const candidatos = [
  path.join(RAIZ, 'herramientas', 'node_modules', 'playwright'),
  path.join(RAIZ, '..', '..', '6-LANDING-PAGES', 'Konfio-Zinc-Web', 'herramientas', 'node_modules', 'playwright'),
  process.env.KZ_PLAYWRIGHT || ''
].filter(Boolean);
let chromium = null;
for (const c of candidatos) {
  if (chromium) break;
  try { ({ chromium } = require(c)); } catch { /* siguiente */ }
}
if (!chromium) { console.error('Sin Playwright. Indica la ruta con KZ_PLAYWRIGHT.'); process.exit(1); }

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon', '.jpeg': 'image/jpeg'
};
const servidor = http.createServer((req, res) => {
  try {
    const url = new URL(req.url, `http://127.0.0.1:${PUERTO}`);
    let rel = decodeURIComponent(url.pathname);
    if (rel === '/' || rel.endsWith('/')) rel += 'index.html';
    const fichero = path.join(RAIZ, rel);
    if (!fichero.startsWith(RAIZ)) throw new Error('fuera');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(rel).toLowerCase()] || 'application/octet-stream' });
    res.end(fs.readFileSync(fichero));
  } catch { res.writeHead(404); res.end('no'); }
});
await new Promise((r) => servidor.listen(PUERTO, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${PUERTO}/`;

fs.mkdirSync(EVID, { recursive: true });

let pasan = 0;
const fallos = [];
function comprobar(ok, titulo, detalle) {
  if (ok) { pasan++; console.log('  ✔ ' + titulo); }
  else { fallos.push(titulo + (detalle ? ' → ' + detalle : '')); console.log('  ✖ ' + titulo + (detalle ? ' → ' + detalle : '')); }
}

const navegador = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
const contexto = await navegador.newContext({ viewport: { width: 375, height: 667 }, deviceScaleFactor: 2 });
const pagina = await contexto.newPage();

const errores = [];
pagina.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
pagina.on('pageerror', (e) => errores.push('pageerror: ' + e.message));

/* El envío abre WhatsApp con window.open: en la prueba se intercepta para
   poder leer la URL sin que se abra una pestaña de verdad. */
async function interceptarVentana() {
  await pagina.evaluate(() => {
    window.__abierta = null;
    window.open = (url) => { window.__abierta = url; return { closed: false, focus() {} }; };
  });
}

try {
  await pagina.goto(BASE, { waitUntil: 'networkidle' });

  /* 1 · carga limpia */
  comprobar(errores.length === 0, 'la página carga sin errores de consola', errores.join(' | '));

  /* Las imágenes del pie llevan loading="lazy": se fuerza su carga y se espera
     al decodificado antes de darlas por buenas. Si alguna no existe, aquí sale. */
  await pagina.evaluate(async () => {
    const imgs = Array.prototype.slice.call(document.images);
    imgs.forEach((i) => { i.loading = 'eager'; });
    window.scrollTo(0, document.body.scrollHeight);
    await Promise.all(imgs.map((i) => (i.decode ? i.decode().catch(() => null) : null)));
    window.scrollTo(0, 0);
  });
  const rotas = await pagina.$$eval('img', (imgs) => imgs.filter((i) => i.naturalWidth === 0).map((i) => i.getAttribute('src')));
  comprobar(rotas.length === 0, 'ninguna imagen rota', rotas.join(', '));
  const imagenes = await pagina.$$eval('img', (imgs) => imgs.length);
  comprobar(imagenes === 3, 'las tres imágenes del logotipo están declaradas', String(imagenes));

  const marca = await pagina.title();
  comprobar(marca === 'Crocan Pollo | ¡Nunca me vas a olvidar!', 'el título de la pestaña es el del cliente', marca);

  const productos = await pagina.$$eval('.platillo[data-precio]', (n) => n.length);
  comprobar(productos === 18, 'el menú declara 18 tarjetas con precio (19 importes: los jugos van en una tarjeta)', String(productos));

  /* 2 · stepper */
  const tarjeta = '.platillo[data-id="asado-cuarto"]';
  const estado = async () => pagina.$eval(tarjeta, (t) => {
    const agregar = t.querySelector('.agregar');
    const stepper = t.querySelector('.stepper');
    return {
      textoAgregar: agregar ? agregar.textContent.trim() : null,
      agregarOculto: agregar ? agregar.hidden : null,
      stepperOculto: stepper ? stepper.hidden : null,
      cantidad: stepper ? stepper.querySelector('span').textContent.trim() : null,
      unidadesCabecera: document.getElementById('cuenta-cabecera').textContent.trim(),
      totalCarrito: document.getElementById('carrito-total').textContent.trim(),
      totalBarra: document.getElementById('barra-total').textContent.trim()
    };
  });

  let e = await estado();
  comprobar(e.textoAgregar === '+ Agregar' && e.stepperOculto === true && e.agregarOculto === false,
    'de entrada el botón dice «+ Agregar» y no hay stepper', JSON.stringify(e));

  await pagina.click(tarjeta + ' .agregar');
  e = await estado();
  comprobar(e.stepperOculto === false && e.agregarOculto === true && e.cantidad === '1',
    'al pulsar, el botón muta a [ − ] [ 1 ] [ + ]', JSON.stringify(e));

  await pagina.click(tarjeta + ' .stepper [data-accion="sumar"]');
  e = await estado();
  comprobar(e.cantidad === '2' && e.unidadesCabecera === '2', 'el «+» del stepper suma', JSON.stringify(e));

  comprobar(e.totalCarrito === '$24.000' && e.totalBarra === 'Total: $24.000',
    '2 × Cuarto asado = $24.000 en el carrito y en la barra', JSON.stringify(e));

  await pagina.click(tarjeta + ' .stepper [data-accion="restar"]');
  e = await estado();
  comprobar(e.cantidad === '1' && e.unidadesCabecera === '1', 'el «−» del stepper resta', JSON.stringify(e));

  await pagina.click(tarjeta + ' .stepper [data-accion="restar"]');
  e = await estado();
  comprobar(e.cantidad === '0' && e.stepperOculto === true && e.agregarOculto === false && e.textoAgregar === '+ Agregar',
    'al llegar a 0 vuelve a «+ Agregar» y desaparece el stepper', JSON.stringify(e));

  /* 3 · jugos: presentación y sabor */
  const jugo = '.platillo[data-id="jugo-natural"]';
  const precioVisible = () => pagina.$eval(jugo + ' [data-precio-visible]', (n) => n.textContent.trim());
  comprobar((await precioVisible()) === '$4.000', 'el jugo en agua muestra $4.000 de entrada', await precioVisible());

  await pagina.click(jugo + ' .variante[data-variante="En leche"]');
  comprobar((await precioVisible()) === '$6.000', 'al elegir «En leche» el precio visible pasa a $6.000', await precioVisible());

  await pagina.selectOption(jugo + ' select[data-sabor]', 'Mango');
  await pagina.click(jugo + ' .agregar');
  let lineaJugo = await pagina.evaluate(() => window.CROCAN.pedido.lineas.filter((l) => l.id === 'jugo-natural'));
  comprobar(lineaJugo.length === 1 && lineaJugo[0].precio === 6000 && lineaJugo[0].sabor === 'Mango' && lineaJugo[0].variante === 'En leche',
    'el jugo entra con su precio, su presentación y su sabor', JSON.stringify(lineaJugo));

  await pagina.selectOption(jugo + ' select[data-sabor]', 'Mora');
  await pagina.click(jugo + ' .agregar');
  lineaJugo = await pagina.evaluate(() => window.CROCAN.pedido.lineas.filter((l) => l.id === 'jugo-natural'));
  comprobar(lineaJugo.length === 2, 'dos sabores distintos son dos líneas del carrito', String(lineaJugo.length));

  /* 4 · carrito global: se arma un pedido conocido y se comprueban las cifras.
     Antes de esta línea el cuarto asado quedó a 0 (se vació en la prueba del
     stepper), así que el carrito solo tiene los dos jugos. */
  await pagina.click(tarjeta + ' .agregar');
  await pagina.click(tarjeta + ' .stepper [data-accion="sumar"]');

  const total = await pagina.evaluate(() => window.CROCAN.total());
  const esperado = 2 * 12000 + 6000 + 6000;
  comprobar(total === esperado, 'el total suma 2 asados y 2 jugos = $36.000', 'total=' + total + ' esperado=' + esperado);

  const lineasEsperadas = await pagina.evaluate(() => window.CROCAN.pedido.lineas.length);
  comprobar(lineasEsperadas === 3, 'son tres líneas: un asado con 2 unidades y dos jugos', String(lineasEsperadas));

  /* 5 · campos obligatorios */
  await interceptarVentana();
  let r = await pagina.evaluate(() => window.CROCAN.enviar());
  comprobar(r.motivo === 'faltan-datos', 'sin nombre ni dirección no se envía el pedido', JSON.stringify({ motivo: r.motivo }));
  comprobar(await pagina.evaluate(() => window.__abierta === null), 'y no se abre WhatsApp');
  const errorVisible = await pagina.$eval('#e-nombre', (n) => !n.hidden);
  comprobar(errorVisible === true, 'se explica en pantalla qué falta', String(errorVisible));

  /* 6 · factura de WhatsApp */
  await pagina.fill('#f-nombre', 'Cliente de prueba');
  await pagina.fill('#f-entrega', 'Los Girasoles, Cra 69 con Cl 28A');
  await pagina.fill('#f-notas', 'Llamar al llegar');
  await interceptarVentana();
  r = await pagina.evaluate(() => window.CROCAN.enviar());

  comprobar(r.motivo === 'ok' && /^https:\/\/wa\.me\/573107420703\?text=/.test(r.url), 'el envío abre el WhatsApp del negocio', r.url ? r.url.slice(0, 40) : String(r.motivo));

  const texto = decodeURIComponent((r.url.split('?text=')[1] || '').replace(/\+/g, ' '));
  fs.writeFileSync(path.join(EVID, 'mensaje-whatsapp.txt'), texto + '\n', 'utf8');

  comprobar(texto.includes('• 2× Cuarto asado — $24.000'), 'el mensaje lleva el subtotal de cada línea', texto);
  comprobar(texto.includes('• 1× Jugo natural (En leche) · Mango — $6.000'), 'el mensaje lleva presentación y sabor del jugo');
  comprobar(texto.includes('*TOTAL: $36.000*'), 'el TOTAL va en negrita y bien sumado', texto);
  comprobar(texto.includes('Nombre: Cliente de prueba') && texto.includes('Dirección: Los Girasoles, Cra 69 con Cl 28A'),
    'el mensaje lleva nombre y dirección');
  comprobar(texto.includes('Notas: Llamar al llegar'), 'el mensaje lleva las notas del pedido');

  /* 7 · las cinco categorías del flyer están */
  const categorias = await pagina.$$eval('.categoria__titulo', (n) => n.map((x) => x.textContent.trim()));
  comprobar(categorias.length === 5, 'las cinco categorías del flyer están en la página', categorias.join(' / '));

  /* 8 · sin desbordes y persistencia */
  const desborde = await pagina.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  comprobar(desborde <= 0, 'en 375 px no hay desbordamiento horizontal', String(desborde));

  await pagina.screenshot({ path: path.join(EVID, '375-menu.png'), fullPage: false });
  await pagina.click('#abrir-carrito');
  await pagina.waitForTimeout(320);
  await pagina.screenshot({ path: path.join(EVID, '375-carrito.png'), fullPage: false });

  await pagina.reload({ waitUntil: 'networkidle' });
  const persistido = await pagina.evaluate(() => ({ lineas: window.CROCAN.pedido.lineas.length, nombre: window.CROCAN.pedido.nombre }));
  comprobar(persistido.lineas === 3 && persistido.nombre === 'Cliente de prueba',
    'el pedido y los datos siguen ahí al recargar', JSON.stringify(persistido));

  /* 9 · escritorio */
  await pagina.setViewportSize({ width: 1440, height: 900 });
  await pagina.waitForTimeout(200);
  const desborde1440 = await pagina.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  comprobar(desborde1440 <= 0, 'en 1440 px tampoco hay desbordamiento', String(desborde1440));
  await pagina.screenshot({ path: path.join(EVID, '1440-escritorio.png'), fullPage: false });

  comprobar(errores.length === 0, 'la consola sigue limpia al final del recorrido', errores.join(' | '));
} catch (error) {
  fallos.push('excepción: ' + error.message);
  console.log('  ✖ excepción: ' + error.message);
} finally {
  await navegador.close();
  servidor.close();
}

console.log('');
console.log('  pruebas: ' + (pasan + fallos.length) + ' · pasan: ' + pasan + ' · fallan: ' + fallos.length);
if (fallos.length) {
  console.log('');
  fallos.forEach((f) => console.log('  ✖ ' + f));
  process.exit(1);
}
