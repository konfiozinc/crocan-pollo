/* ═══════════════════════════════════════════════════════════════════════
   CROCAN POLLO · herramientas/medir-diseno.mjs
   KZ-MENU-006 · mide el diseño en Chromium y deja capturas (no se publica)

   No juzga "a ojo": mide lo que las capturas denuncian.
     · desbordamiento horizontal de la página
     · controles que se salen de su tarjeta
     · ancho real de la columna de texto de cada tarjeta
     · tamaño de los blancos táctiles (mínimo 44 px)
     · tamaño de letra de nombres, precios y textos del pie
     · contraste de texto sobre fondo (etiqueta de horario, chips, precios)

   Mide DOS estados por tarjeta, porque el problema aparece con el stepper:
     A) carrito vacío  → se ve «+ Agregar»
     B) con cantidad   → se ve [ − ] [ n ] [ + ]

   Uso:  node herramientas/medir-diseno.mjs [etiqueta]
     etiqueta  nombre de las capturas: «antes» (por omisión) o «despues»
   Deja evidencias/<etiqueta>-<ancho>.png y evidencias/medidas-<etiqueta>.json
   ═══════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';

const RAIZ = path.resolve(import.meta.dirname, '..');
const EVID = path.join(RAIZ, 'evidencias');
const PUERTO = 8152;
const ETIQUETA = (process.argv[2] || 'antes').replace(/[^a-z0-9_-]/gi, '');
const ANCHOS = [375, 390, 768, 1024, 1440];
const require = createRequire(import.meta.url);

const candidatos = [
  path.join(RAIZ, 'herramientas', 'node_modules', 'playwright'),
  path.join(RAIZ, '..', '..', '6-LANDING-PAGES', 'Konfio-Zinc-Web', 'herramientas', 'node_modules', 'playwright'),
  process.env.KZ_PLAYWRIGHT || ''
].filter(Boolean);
let chromium = null;
for (const c of candidatos) { if (chromium) break; try { ({ chromium } = require(c)); } catch { /* siguiente */ } }
if (!chromium) { console.error('Sin Playwright.'); process.exit(1); }

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const servidor = http.createServer((req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1:' + PUERTO);
    let rel = decodeURIComponent(url.pathname);
    if (rel === '/' || rel.endsWith('/')) rel += 'index.html';
    const fichero = path.join(RAIZ, rel);
    if (!fichero.startsWith(RAIZ)) throw new Error('fuera');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(rel).toLowerCase()] || 'application/octet-stream' });
    res.end(fs.readFileSync(fichero));
  } catch { res.writeHead(404); res.end('no'); }
});
await new Promise((r) => servidor.listen(PUERTO, '127.0.0.1', r));
fs.mkdirSync(EVID, { recursive: true });

/* ─── la medición que corre dentro de la página ─── */
function medirEnPagina() {
  const caja = (el) => {
    const b = el.getBoundingClientRect();
    return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1), der: +b.right.toFixed(1), abajo: +b.bottom.toFixed(1) };
  };
  const visible = (el) => {
    const b = el.getBoundingClientRect();
    return b.width > 0 && b.height > 0;
  };
  const rgb = (texto) => {
    const n = (texto.match(/[\d.]+/g) || []).map(Number);
    return n.length >= 3 ? { r: n[0], g: n[1], b: n[2], a: n.length > 3 ? n[3] : 1 } : null;
  };
  const lum = (c) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const fondoDe = (el) => {
    let p = el;
    while (p) {
      const c = rgb(getComputedStyle(p).backgroundColor);
      if (c && c.a !== 0) return c;
      p = p.parentElement;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  };
  const contraste = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const t = rgb(getComputedStyle(el).color);
    const f = fondoDe(el);
    if (!t) return null;
    const l1 = lum(t), l2 = lum(f);
    const razon = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    return { razon: +razon.toFixed(2), texto: getComputedStyle(el).color, fondo: 'rgb(' + f.r + ',' + f.g + ',' + f.b + ')' };
  };
  const selectorFuera = '.agregar, .stepper button, .stepper span, .variante, select';

  const tarjetas = Array.from(document.querySelectorAll('.platillo')).map((t) => {
    const c = caja(t);
    const cuerpo = t.querySelector('.platillo__cuerpo');
    const fuera = Array.from(t.querySelectorAll(selectorFuera)).filter(visible).filter((el) => {
      const b = caja(el);
      return b.der > c.der + 0.5 || b.x < c.x - 0.5 || b.abajo > c.abajo + 0.5 || b.y < c.y - 0.5;
    }).map((el) => ({ que: (el.className || el.tagName).toString(), caja: caja(el) }));
    const blancos = Array.from(t.querySelectorAll('.agregar, .stepper button, .variante')).filter(visible)
      .map((el) => ({ que: (el.className || el.tagName).toString(), w: caja(el).w, h: caja(el).h }))
      .filter((o) => o.h < 43.5 || o.w < 43.5);
    const nombre = t.querySelector('.platillo__nombre');
    const precio = t.querySelector('.platillo__precio--cifra');
    return {
      id: t.getAttribute('data-id'),
      tarjeta: c,
      cuerpoW: cuerpo ? caja(cuerpo).w : null,
      fuera,
      blancosPequenos: blancos,
      nombrePx: nombre ? getComputedStyle(nombre).fontSize : null,
      precioPx: precio ? getComputedStyle(precio).fontSize : null,
      precioCortado: precio ? precio.scrollWidth > precio.clientWidth + 1 : null
    };
  });

  const doc = {
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
    desborde: document.documentElement.scrollWidth - document.documentElement.clientWidth
  };

  const sospechosos = Array.from(document.querySelectorAll('body *')).filter((el) => {
    if (!visible(el)) return false;
    const b = el.getBoundingClientRect();
    return b.right > doc.clientW + 1;
  }).slice(0, 8).map((el) => ({ que: (el.className || el.tagName).toString(), der: +el.getBoundingClientRect().right.toFixed(1) }));

  const blancosGlobales = Array.from(document.querySelectorAll('.btn, .cabecera__carrito, .chip, .quick__btn, .carrito__cerrar, .linea__quitar, .linea__obs, .campo input'))
    .filter(visible)
    .map((el) => ({ que: (el.className || el.tagName).toString(), w: caja(el).w, h: caja(el).h }))
    .filter((o) => o.h < 43.5);

  return {
    doc,
    sospechosos,
    tarjetas,
    blancosGlobales,
    contraste: {
      horario: contraste('.insignia-horario'),
      chip: contraste('.chip'),
      precio: contraste('.platillo__precio--cifra'),
      notaMenu: contraste('.menu__nota')
    }
  };
}

const navegador = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
const contexto = await navegador.newContext({ deviceScaleFactor: 2 });
const pagina = await contexto.newPage();
const erroresConsola = [];
pagina.on('console', (m) => { if (m.type() === 'error') erroresConsola.push(m.text()); });
pagina.on('pageerror', (e) => erroresConsola.push('pageerror: ' + e.message));

const resultado = {};
for (const ancho of ANCHOS) {
  await pagina.setViewportSize({ width: ancho, height: 900 });
  await pagina.goto('http://127.0.0.1:' + PUERTO + '/', { waitUntil: 'networkidle' });
  await pagina.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await pagina.reload({ waitUntil: 'networkidle' });

  /* estado A: carrito vacío */
  const vacio = await pagina.evaluate(medirEnPagina);

  /* estado B: cada tarjeta con una unidad, para ver el stepper */
  const conStepper = await pagina.evaluate(() => {
    const caja = (el) => { const b = el.getBoundingClientRect(); return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1), der: +b.right.toFixed(1), abajo: +b.bottom.toFixed(1) }; };
    const visible = (el) => { const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
    const salida = [];
    document.querySelectorAll('.platillo').forEach((t) => {
      const agregar = t.querySelector('.agregar');
      if (agregar) agregar.click();
      const c = caja(t);
      const fuera = Array.from(t.querySelectorAll('.stepper button, .stepper span, .agregar, .variante, select')).filter(visible).filter((el) => {
        const b = caja(el);
        return b.der > c.der + 0.5 || b.x < c.x - 0.5 || b.abajo > c.abajo + 0.5;
      }).map((el) => (el.className || el.tagName).toString());
      const stepper = t.querySelector('.stepper');
      const restar = t.querySelector('.stepper [data-accion="restar"]');
      salida.push({ id: t.getAttribute('data-id'), fuera, stepperVisible: stepper ? visible(stepper) : false, stepperW: stepper ? caja(stepper).w : null });
      if (restar) restar.click();
    });
    return salida;
  });

  /* estado C: carrito abierto con líneas */
  await pagina.evaluate(() => {
    const jugo = document.querySelector('.platillo[data-id="jugo-natural"]');
    jugo.querySelector('.variante[data-variante="En leche"]').click();
    jugo.querySelector('.agregar').click();
    document.querySelector('.platillo[data-id="combo-asado-muslo-contra"] .agregar').click();
    document.getElementById('abrir-carrito').click();
  });
  await pagina.waitForTimeout(350);
  const carrito = await pagina.evaluate(() => {
    const caja = (el) => { const b = el.getBoundingClientRect(); return { w: +b.width.toFixed(1), h: +b.height.toFixed(1), der: +b.right.toFixed(1), abajo: +b.bottom.toFixed(1), x: +b.x.toFixed(1) }; };
    const panel = document.getElementById('carrito');
    const pr = panel.getBoundingClientRect();
    const fuera = Array.from(panel.querySelectorAll('input, button, .stepper')).filter((el) => {
      const b = el.getBoundingClientRect();
      if (b.width === 0) return false;
      return b.right > pr.right + 0.5 || b.left < pr.left - 0.5;
    }).map((el) => (el.className || el.tagName).toString());
    return { panelW: +pr.width.toFixed(1), fuera, lineas: document.querySelectorAll('.linea').length, apertura: panel.classList.contains('abierto') };
  });

  await pagina.evaluate(() => document.getElementById('cerrar-carrito').click());
  await pagina.waitForTimeout(150);
  await pagina.screenshot({ path: path.join(EVID, ETIQUETA + '-' + ancho + '.png'), fullPage: false });

  const sobreAncho = (m) => m.tarjetas.filter((t) => t.fuera.length > 0).length;
  const estrechas = (m) => m.tarjetas.filter((t) => t.cuerpoW !== null && t.cuerpoW < 150).length;
  const blancos = (m) => m.tarjetas.reduce((n, t) => n + t.blancosPequenos.length, 0);

  resultado[ancho] = { vacio, conStepper, carrito };
  console.log('── ' + ancho + ' px ' + '─'.repeat(30));
  console.log('  desborde horizontal: ' + vacio.doc.desborde + ' px' + (vacio.sospechosos.length ? ' · elementos fuera: ' + JSON.stringify(vacio.sospechosos) : ''));
  console.log('  tarjetas con controls fuera: ' + sobreAncho(vacio) + ' (vacío) · ' + conStepper.filter((t) => t.fuera.length > 0).length + ' (con stepper)');
  if (conStepper.some((t) => t.fuera.length)) console.log('    ' + JSON.stringify(conStepper.filter((t) => t.fuera.length).slice(0, 4)));
  const anchos = vacio.tarjetas.map((t) => t.cuerpoW).filter((v) => v !== null);
  console.log('  columna de texto: min ' + Math.min(...anchos).toFixed(1) + ' px · mediana ' + anchos.sort((a, b) => a - b)[Math.floor(anchos.length / 2)].toFixed(1) + ' px · tarjetas por debajo de 150 px: ' + estrechas(vacio));
  console.log('  blancos táctiles pequeños en tarjetas: ' + blancos(vacio) + ' · fuera de tarjetas: ' + vacio.blancosGlobales.length + (vacio.blancosGlobales.length ? ' ' + JSON.stringify(vacio.blancosGlobales.slice(0, 5)) : ''));
  console.log('  letras: nombre ' + (vacio.tarjetas[0].nombrePx || '?') + ' · precio ' + (vacio.tarjetas[0].precioPx || '?') + ' · precios cortados: ' + vacio.tarjetas.filter((t) => t.precioCortado).length);
  console.log('  contraste horario: ' + JSON.stringify(vacio.contraste.horario) + ' · precio: ' + JSON.stringify(vacio.contraste.precio));
  console.log('  carrito: ' + carrito.lineas + ' líneas · controles fuera del panel: ' + (carrito.fuera.length ? JSON.stringify(carrito.fuera) : '0'));
  console.log('');
}

console.log('consola: ' + (erroresConsola.length ? erroresConsola.join(' | ') : 'sin errores'));
fs.writeFileSync(path.join(EVID, 'medidas-' + ETIQUETA + '.json'), JSON.stringify({ etiqueta: ETIQUETA, cuando: new Date().toISOString(), resultado, erroresConsola }, null, 1), 'utf8');
console.log('capturas y medidas en evidencias/ (' + ETIQUETA + ')');

await navegador.close();
servidor.close();
