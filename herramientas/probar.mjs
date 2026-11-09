/* ═══════════════════════════════════════════════════════════════════════
   CROCAN POLLO · herramientas/probar.mjs
   KZ-MENU-005 · pruebas funcionales en un Chromium real (no se publica)

   Qué comprueba
     1. Que la página carga sin un solo error de consola y sin imágenes rotas.
     2. El botón con stepper: «+ Agregar» → [ − ] [ 1 ] [ + ] → … → vuelve a
        «+ Agregar» al llegar a 0, y que el carrito global cuadra.
     3. Los precios: subtotal por línea y TOTAL, con los números que dio el negocio.
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

  /* 2 · stepper. KZ-MENU-006: se mide lo que se VE, no solo el atributo `hidden`.
     El fallo que se corrigió era exactamente ese: con cantidad 0 se veían a la vez
     «+ Agregar» y el stepper vacío, porque `.stepper{display:inline-flex}` anulaba
     el atributo. Ahora se exige que haya UN solo control visible en todo momento. */
  const tarjeta = '.platillo[data-id="asado-cuarto"]';
  const estado = async () => pagina.$eval(tarjeta, (t) => {
    const visible = (el) => {
      if (!el) return false;
      const b = el.getBoundingClientRect();
      return b.width > 0 && b.height > 0;
    };
    const caja = (el) => (el ? el.getBoundingClientRect() : null);
    const agregar = t.querySelector('.agregar');
    const stepper = t.querySelector('.stepper');
    const botonStepper = stepper ? stepper.querySelector('button') : null;
    const variantes = Array.prototype.slice.call(t.querySelectorAll('.variante'));
    const ct = caja(t);
    const fuera = [agregar, stepper, botonStepper].concat(variantes).filter(visible).filter((el) => {
      const b = caja(el);
      return b.right > ct.right + 0.5 || b.left < ct.left - 0.5 || b.bottom > ct.bottom + 0.5;
    }).length;
    return {
      textoAgregar: agregar ? agregar.textContent.trim() : null,
      agregarVisible: visible(agregar),
      stepperVisible: visible(stepper),
      controlesVisibles: [agregar, stepper].filter(visible).length,
      cantidad: stepper ? stepper.querySelector('span').textContent.trim() : null,
      altoAgregar: agregar ? Math.round(caja(agregar).height) : null,
      ladoBotonStepper: botonStepper ? Math.round(caja(botonStepper).width) : null,
      altoVariante: variantes.length ? Math.round(caja(variantes[0]).height) : null,
      controlesFueraDeLaTarjeta: fuera,
      unidadesCabecera: document.getElementById('cuenta-cabecera').textContent.trim(),
      totalCarrito: document.getElementById('carrito-total').textContent.trim(),
      totalBarra: document.getElementById('barra-total').textContent.trim()
    };
  });

  let e = await estado();
  comprobar(e.textoAgregar === '+ Agregar' && e.agregarVisible === true && e.stepperVisible === false && e.controlesVisibles === 1,
    'a cantidad 0 se ve SOLO «+ Agregar» (el stepper está oculto de verdad)', JSON.stringify(e));
  comprobar(e.altoAgregar >= 44, 'el botón «+ Agregar» es un blanco táctil de 44 px o más', String(e.altoAgregar));

  await pagina.click(tarjeta + ' .agregar');
  e = await estado();
  comprobar(e.stepperVisible === true && e.agregarVisible === false && e.cantidad === '1' && e.controlesVisibles === 1,
    'al pulsar se ve SOLO [ − ] [ 1 ] [ + ]', JSON.stringify(e));
  comprobar(e.ladoBotonStepper >= 44, 'los botones del stepper miden 44 px o más', String(e.ladoBotonStepper));

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
  comprobar(e.cantidad === '0' && e.agregarVisible === true && e.stepperVisible === false && e.textoAgregar === '+ Agregar',
    'al llegar a 0 vuelve a «+ Agregar» y el stepper desaparece', JSON.stringify(e));
  comprobar(e.controlesFueraDeLaTarjeta === 0, 'ningún control se sale de su tarjeta', String(e.controlesFueraDeLaTarjeta));

  /* 3 · jugos: presentación y sabor */
  const jugo = '.platillo[data-id="jugo-natural"]';
  const precioVisible = () => pagina.$eval(jugo + ' [data-precio-visible]', (n) => n.textContent.trim());
  comprobar((await precioVisible()) === '$4.000', 'el jugo en agua muestra $4.000 de entrada', await precioVisible());

  await pagina.click(jugo + ' .variante[data-variante="En leche"]');
  comprobar((await precioVisible()) === '$6.000', 'al elegir «En leche» el precio visible pasa a $6.000', await precioVisible());

  /* KZ-MENU-006 · los controles del jugo deben poder tocarse con el dedo */
  const altoVariante = await pagina.$eval(jugo + ' .variante', (b) => Math.round(b.getBoundingClientRect().height));
  comprobar(altoVariante >= 44, 'los botones «En agua» / «En leche» son táctiles (44 px o más)', String(altoVariante));
  const cajaSelect = await pagina.$eval(jugo + ' select[data-sabor]', (s) => {
    const b = s.getBoundingClientRect();
    return { w: Math.round(b.width), h: Math.round(b.height), px: getComputedStyle(s).fontSize };
  });
  comprobar(cajaSelect.h >= 44 && cajaSelect.w >= 120,
    'el selector de sabor es legible y táctil', cajaSelect.w + '×' + cajaSelect.h + ' · ' + cajaSelect.px);

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

  /* 7 · las cinco categorías del menú están */
  const categorias = await pagina.$$eval('.categoria__titulo', (n) => n.map((x) => x.textContent.trim()));
  comprobar(categorias.length === 5, 'las cinco categorías del menú están en la página', categorias.join(' / '));

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

  /* 9 · los cinco anchos de la misión (KZ-MENU-006): desbordes, controles dentro
     de su tarjeta, texto sin comprimir y precios completos. Con el carrito lleno,
     así que los steppers están visibles, que es el caso peor. */
  for (const ancho of [375, 390, 768, 1024, 1440]) {
    await pagina.setViewportSize({ width: ancho, height: 900 });
    await pagina.reload({ waitUntil: 'networkidle' });
    const m = await pagina.evaluate(() => {
      const caja = (el) => el.getBoundingClientRect();
      const visible = (el) => { const b = caja(el); return b.width > 0 && b.height > 0; };
      const tarjetas = Array.prototype.slice.call(document.querySelectorAll('.platillo'));
      const fuera = [];
      let cuerpoMin = 9999;
      let preciosCortados = 0;
      tarjetas.forEach((t) => {
        const ct = caja(t);
        Array.prototype.slice.call(t.querySelectorAll('.agregar, .stepper, .variante, select')).filter(visible).forEach((el) => {
          const b = caja(el);
          if (b.right > ct.right + 0.5 || b.left < ct.left - 0.5 || b.bottom > ct.bottom + 0.5) {
            fuera.push(t.getAttribute('data-id') + ':' + (el.className || el.tagName));
          }
        });
        const cuerpo = t.querySelector('.platillo__cuerpo');
        if (cuerpo) cuerpoMin = Math.min(cuerpoMin, Math.round(caja(cuerpo).width));
        const precio = t.querySelector('.platillo__precio--cifra');
        if (precio && precio.scrollWidth > precio.clientWidth + 1) preciosCortados++;
      });
      return {
        desborde: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        fuera,
        cuerpoMin: cuerpoMin === 9999 ? 0 : cuerpoMin,
        preciosCortados,
        altoNombre: Math.round(caja(document.querySelector('.platillo__nombre')).height),
        iconos: Array.prototype.slice.call(document.querySelectorAll('.btn__icono, .quick__btn svg'))
          .map((s) => Math.round(caja(s).width)).filter((w) => w > 0)
      };
    });
    comprobar(m.desborde <= 0, ancho + ' px · sin desbordamiento horizontal', String(m.desborde));
    comprobar(m.fuera.length === 0, ancho + ' px · ningún control se sale de su tarjeta', m.fuera.slice(0, 4).join(', '));
    comprobar(m.cuerpoMin >= 150, ancho + ' px · la columna de texto no queda comprimida', m.cuerpoMin + ' px');
    comprobar(m.preciosCortados === 0, ancho + ' px · los precios se ven completos', String(m.preciosCortados));
    comprobar(m.iconos.length >= 2 && m.iconos.every((w) => w >= 12),
      ancho + ' px · los iconos de WhatsApp se dibujan', JSON.stringify(m.iconos));
    if ([375, 768, 1440].includes(ancho)) {
      await pagina.screenshot({ path: path.join(EVID, 'despues-' + ancho + '.png'), fullPage: false });
    }
  }

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
