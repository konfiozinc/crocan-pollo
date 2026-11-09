/* ═══════════════════════════════════════════════════════════════════════
   CROCAN POLLO · herramientas/verificar-en-vivo.mjs
   KZ-MENU-006 · verifica PRODUCCIÓN (no el archivo local)

   Abre https://konfiozinc.github.io/crocan-pollo/ en Chromium y comprueba lo
   que la misión exige en el sitio publicado: stepper sin controles duplicados,
   tarjetas sin desbordes, iconos de WhatsApp, contraste del horario, carrito,
   factura, precios, promoción y consola limpia, en los cinco anchos.

   Fuerza la descarga del CSS y del JS con un parámetro anti-caché: GitHub Pages
   los cachea 10 minutos y sin eso se mediría la versión anterior.

   Uso:  node herramientas/verificar-en-vivo.mjs
   Sale con 1 si algo falla.
   ═══════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const RAIZ = path.resolve(import.meta.dirname, '..');
const EVID = path.join(RAIZ, 'evidencias');
const SITIO = 'https://konfiozinc.github.io/crocan-pollo/';
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

let pasan = 0;
const fallos = [];
function ok(condicion, titulo, detalle) {
  if (condicion) { pasan++; console.log('  ✔ ' + titulo + (detalle ? '  (' + detalle + ')' : '')); }
  else { fallos.push(titulo + (detalle ? ' → ' + detalle : '')); console.log('  ✖ ' + titulo + (detalle ? '  (' + detalle + ')' : '')); }
}

fs.mkdirSync(EVID, { recursive: true });
const navegador = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
const errores = [];

async function nuevaPagina() {
  const contexto = await navegador.newContext({ deviceScaleFactor: 2 });
  const pagina = await contexto.newPage();
  pagina.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
  pagina.on('pageerror', (e) => errores.push('pageerror: ' + e.message));
  /* anti-caché solo para CSS y JS: el HTML se pide con marca de tiempo */
  await pagina.route('**/assets/**/*.css', (route) => {
    const u = new URL(route.request().url()); u.searchParams.set('kz', String(Date.now()));
    route.continue({ url: u.toString() });
  });
  await pagina.route('**/assets/**/*.js', (route) => {
    const u = new URL(route.request().url()); u.searchParams.set('kz', String(Date.now()));
    route.continue({ url: u.toString() });
  });
  return { contexto, pagina };
}

const medir = () => {
  const caja = (el) => el.getBoundingClientRect();
  const visible = (el) => { const b = caja(el); return b.width > 0 && b.height > 0; };
  const rgb = (t) => { const n = (String(t).match(/[\d.]+/g) || []).map(Number); return n.length >= 3 ? { r: n[0], g: n[1], b: n[2], a: n.length > 3 ? n[3] : 1 } : null; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const fondo = (el) => { let p = el; while (p) { const c = rgb(getComputedStyle(p).backgroundColor); if (c && c.a !== 0) return c; p = p.parentElement; } return { r: 255, g: 255, b: 255, a: 1 }; };
  const contraste = (sel) => {
    const el = document.querySelector(sel); if (!el) return null;
    const t = rgb(getComputedStyle(el).color); const f = fondo(el);
    const l1 = lum(t), l2 = lum(f);
    return +(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05))).toFixed(2);
  };
  const tarjetas = Array.prototype.slice.call(document.querySelectorAll('.platillo'));
  const fuera = [];
  let cuerpoMin = 9999, preciosCortados = 0;
  tarjetas.forEach((t) => {
    const ct = caja(t);
    Array.prototype.slice.call(t.querySelectorAll('.agregar, .stepper, .variante, select')).filter(visible).forEach((el) => {
      const b = caja(el);
      if (b.right > ct.right + 0.5 || b.left < ct.left - 0.5 || b.bottom > ct.bottom + 0.5) fuera.push(t.getAttribute('data-id'));
    });
    const cuerpo = t.querySelector('.platillo__cuerpo');
    if (cuerpo) cuerpoMin = Math.min(cuerpoMin, Math.round(caja(cuerpo).width));
    const precio = t.querySelector('.platillo__precio--cifra');
    if (precio && precio.scrollWidth > precio.clientWidth + 1) preciosCortados++;
  });
  return {
    desborde: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    tarjetas: tarjetas.length,
    fuera,
    cuerpoMin: cuerpoMin === 9999 ? 0 : cuerpoMin,
    preciosCortados,
    contrasteHorario: contraste('.insignia-horario'),
    iconos: Array.prototype.slice.call(document.querySelectorAll('.btn__icono, .quick__btn svg')).map((s) => Math.round(caja(s).width)),
    waEnlaces: Array.prototype.slice.call(document.querySelectorAll('a[href*="wa.me"]')).length,
    waCorrectos: Array.prototype.slice.call(document.querySelectorAll('a[href*="wa.me"]')).filter((a) => a.href.includes('573107420703')).length,
    promo: (document.body.textContent || '').includes('gaseosa de 1 litro'),
    precios: Array.prototype.slice.call(document.querySelectorAll('.platillo__precio--cifra')).map((p) => p.textContent.trim())
  };
};

try {
  /* A · los cinco anchos */
  for (const ancho of ANCHOS) {
    const { contexto, pagina } = await nuevaPagina();
    await pagina.setViewportSize({ width: ancho, height: 900 });
    await pagina.goto(SITIO + '?kz=' + Date.now(), { waitUntil: 'networkidle' });
    const m = await pagina.evaluate(medir);

    ok(m.desborde <= 0, ancho + ' px · sin desbordamiento horizontal', String(m.desborde));
    ok(m.fuera.length === 0, ancho + ' px · ningún control se sale de su tarjeta', m.fuera.slice(0, 4).join(', '));
    ok(m.cuerpoMin >= 150, ancho + ' px · columna de texto legible', m.cuerpoMin + ' px');
    ok(m.preciosCortados === 0, ancho + ' px · precios completos', String(m.preciosCortados));
    ok(m.contrasteHorario >= 4.5, ancho + ' px · contraste del horario AA', m.contrasteHorario + ':1');
    ok(m.iconos.length >= 2 && m.iconos.every((w) => w >= 12), ancho + ' px · iconos de WhatsApp dibujados', JSON.stringify(m.iconos));
    ok(m.waCorrectos === m.waEnlaces && m.waEnlaces >= 4, ancho + ' px · enlaces de WhatsApp al número del negocio', m.waCorrectos + '/' + m.waEnlaces);
    ok(m.promo === true, ancho + ' px · la promoción del volante está en la página');
    if (ancho === 375) {
      ok(m.tarjetas === 18, 'el menú publicado tiene las 18 tarjetas', String(m.tarjetas));
      ok(m.precios.includes('$45.000') && m.precios.includes('$4.000'), 'los precios del volante están publicados', m.precios.slice(0, 3).join(' '));
    }

    /* stepper: un solo control visible en cada estado */
    const estados = await pagina.evaluate(() => {
      const visible = (el) => { if (!el) return false; const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
      const t = document.querySelector('.platillo[data-id="asado-cuarto"]');
      const leer = () => {
        const agregar = t.querySelector('.agregar');
        const stepper = t.querySelector('.stepper');
        return {
          agregar: visible(agregar), stepper: visible(stepper),
          visibles: [agregar, stepper].filter(visible).length,
          cantidad: stepper ? stepper.querySelector('span').textContent.trim() : null,
          altoBotonStep: stepper ? Math.round(stepper.querySelector('button').getBoundingClientRect().height) : 0
        };
      };
      const cero = leer();
      t.querySelector('.agregar').click();
      const uno = leer();
      return { cero, uno };
    });
    ok(estados.cero.agregar === true && estados.cero.stepper === false && estados.cero.visibles === 1,
      ancho + ' px · a cantidad 0 solo se ve «+ Agregar»', JSON.stringify(estados.cero));
    ok(estados.uno.stepper === true && estados.uno.agregar === false && estados.uno.visibles === 1 && estados.uno.cantidad === '1',
      ancho + ' px · al agregar solo se ve el stepper', JSON.stringify(estados.uno));
    ok(estados.uno.altoBotonStep >= 44, ancho + ' px · botones del stepper de 44 px o más', String(estados.uno.altoBotonStep));

    if ([375, 1440].includes(ancho)) {
      await pagina.screenshot({ path: path.join(EVID, 'vivo-' + ancho + '.png'), fullPage: false });
    }
    await contexto.close();
  }

  /* B · carrito y factura, en la versión publicada */
  const { contexto, pagina } = await nuevaPagina();
  await pagina.setViewportSize({ width: 375, height: 900 });
  await pagina.goto(SITIO + '?kz=' + Date.now(), { waitUntil: 'networkidle' });
  const factura = await pagina.evaluate(() => {
    const jugo = document.querySelector('.platillo[data-id="jugo-natural"]');
    jugo.querySelector('.variante[data-variante="En leche"]').click();
    jugo.querySelector('select[data-sabor]').value = 'Mango';
    jugo.querySelector('select[data-sabor]').dispatchEvent(new Event('change', { bubbles: true }));
    jugo.querySelector('.agregar').click();
    const asado = document.querySelector('.platillo[data-id="asado-cuarto"]');
    asado.querySelector('.agregar').click();
    asado.querySelector('.stepper [data-accion="sumar"]').click();
    document.getElementById('abrir-carrito').click();
    window.CROCAN.pedido.nombre = 'Cliente de prueba';
    window.CROCAN.pedido.entrega = 'Los Girasoles, Cra 69 con Cl 28A';
    return {
      total: window.CROCAN.total(),
      textoTotal: document.getElementById('carrito-total').textContent.trim(),
      barra: document.getElementById('barra-total').textContent.trim(),
      lineas: document.querySelectorAll('.linea').length,
      precioLinea: (document.querySelector('.linea__precio') || {}).textContent || '',
      mensaje: window.CROCAN.armarMensaje(),
      cabecera: document.getElementById('cuenta-cabecera').textContent.trim()
    };
  });
  ok(factura.total === 2 * 12000 + 6000, 'carrito en vivo: total correcto', String(factura.total));
  ok(factura.textoTotal === '$30.000' && factura.barra === 'Total: $30.000', 'total visible en el carrito y en la barra', factura.textoTotal + ' / ' + factura.barra);
  ok(factura.lineas === 2 && factura.cabecera === '3', 'dos líneas y tres unidades en la cabecera', factura.lineas + ' líneas · ' + factura.cabecera);
  ok(/\$6\.000 c\/u · \$6\.000|\$6\.000/.test(factura.precioLinea), 'la línea muestra su importe', factura.precioLinea.trim());
  ok(factura.mensaje.includes('• 2× Cuarto asado — $24.000'), 'la factura lleva el subtotal de cada línea');
  ok(factura.mensaje.includes('• 1× Jugo natural (En leche) · Mango — $6.000'), 'la factura lleva presentación y sabor');
  ok(factura.mensaje.includes('*TOTAL: $30.000*'), 'el TOTAL va en negrita y cuadra');
  ok(factura.mensaje.includes('Nombre: Cliente de prueba') && factura.mensaje.includes('Dirección: Los Girasoles'), 'la factura lleva nombre y dirección');
  fs.writeFileSync(path.join(EVID, 'mensaje-whatsapp-vivo.txt'), factura.mensaje + '\n', 'utf8');
  await pagina.screenshot({ path: path.join(EVID, 'vivo-375-carrito.png'), fullPage: false });
  await contexto.close();

  ok(errores.length === 0, 'consola sin errores en todo el recorrido', errores.slice(0, 3).join(' | '));
} catch (e) {
  fallos.push('excepción: ' + e.message);
  console.log('  ✖ excepción: ' + e.message);
} finally {
  await navegador.close();
}

console.log('');
console.log('  comprobaciones: ' + (pasan + fallos.length) + ' · pasan: ' + pasan + ' · fallan: ' + fallos.length);
if (fallos.length) { console.log(''); fallos.forEach((f) => console.log('  ✖ ' + f)); process.exit(1); }
