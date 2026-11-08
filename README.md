# CROCAN POLLO — Menú digital

Menú digital de **Crocan Pollo** (pollo asado y apanado, Barrio Los Girasoles, Zona Rosa).
HTML5, CSS3 y JavaScript puro, sin frameworks ni CDN externos.

Misión **KZ-MENU-005**.

## Qué incluye

- Portada con el logotipo del cliente, el eslogan **«¡Nunca me vas a olvidar!»** y el horario.
- **Promoción destacada**: pollo completo (apanado o asado) + gaseosa de 1 litro gratis.
- Menú de **21 productos** en cinco categorías: cuarto asado, presas de pollo apanado, combos,
  consomés y jugos naturales.
- **Botón con stepper**: «+ Agregar» se convierte en `[ − ] [ n ] [ + ]` y vuelve a «+ Agregar»
  cuando la cantidad baja a 0.
- **Precios reales** con subtotal por línea y **TOTAL en negrita** en el mensaje de WhatsApp.
- Jugos con **presentación** (agua $4.000 / leche $6.000) y **sabor** (7 opciones).
- Carrito con observaciones por producto, notas del pedido y persistencia en el navegador.
- Campos **obligatorios**: sin nombre y sin dirección no se envía nada (se explica en pantalla).
- Ubicación exacta del volante y botón de Google Maps con esa misma dirección.
- Contacto `.vcf` y botón de compartir.
- Accesibilidad: foco visible, `aria-live` en los contadores, `prefers-reduced-motion`.

## Estructura

```
index.html                      la página
assets/css/estilos.css          diseño (base de Brosty Papas + paleta de Crocan)
assets/js/app.js                carrito, stepper y factura de WhatsApp
assets/img/marca/               logotipo, favicons y apple-touch-icon
assets/img/og/                  imagen para compartir (1200×630)
herramientas/                   generación de imágenes, verificador y pruebas
logocrocanpollo.jpeg            original entregado por el cliente
```

## Origen de los datos

Cada dato publicado sale del **volante del cliente** o del brief de la Dirección Técnica:

| Dato | Valor | Origen |
|---|---|---|
| Nombre y eslogan | Crocan Pollo · «¡Nunca me vas a olvidar!» · «Crujiente por fuera, irresistible por dentro» | Brief y volante |
| WhatsApp / domicilios | +57 310 742 0703 | Brief |
| Horario | Abierto las 24 horas | Perfil de WhatsApp Business del cliente |
| Ubicación | Barrio Los Girasoles, Zona Rosa (cerca a la Parroquia Jesús Nazareno, Cra 69 con Cl 28A) | Brief |
| Menú y precios | 21 productos, cinco categorías | Flyer de precios transcrito en el brief |
| Promoción | Pollo completo + gaseosa 1 L gratis; el entero lleva 4 papas cocidas, 4 arepas, 4 salsas, 4 mieles y 1 maduro | Flyer de la promoción |

**Nada de esto se inventó.** Lo que el cliente **no** entregó no se publica: no hay fotos de
producto (las tarjetas usan el icono del plato, 🍗 🍟 🍲 🥤), y las redes no tienen enlace directo
porque no se conocen las cuentas.

## Pendiente de confirmar con Darwin

1. **Publicación.** El sitio **no está publicado**. `og:url` y `og:image` usan la ruta prevista
   `https://konfiozinc.github.io/crocan-pollo/`; hay que confirmar que esa será la dirección real
   antes de publicar, o cambiarla.
2. **Imágenes del flyer.** Si Darwin sube `flyer-oferta.jpg` y `flyer-menu.jpg`, van en
   `assets/img/`. El código **no las referencia todavía** a propósito: una imagen referenciada y
   ausente se ve rota en la página.
3. **Redes sociales.** Los botones llevan a una búsqueda por «Crocan Pollo Los Girasoles» en cada
   red. Con las cuentas exactas se cambian por enlaces directos.
4. **Eslogan del título.** El brief de KZ-MENU-005 da «¡Nunca me vas a olvidar!» y se usó ese. Un
   mensaje anterior de la misma misión pedía «¡El sabor que provoca!» (que es el eslogan de Brosty
   Papas): si se prefiere ese, es cambiar `<title>`, `og:title` y el `<h1>`.
5. **Notas del pedido.** El brief menciona «Nombre, Dirección de entrega, Notas» como campos del
   cliente. Se exigen **nombre y dirección**; «Notas» queda opcional porque no todos los pedidos
   tienen nota. Si debe ser obligatoria, es una línea en `app.js`.

## Verificación

```bash
node herramientas/generar-imagenes.mjs      # derivados del logo (requiere ffmpeg)
node herramientas/insertar-icono.mjs        # icono oficial de WhatsApp (idempotente)
node herramientas/probar.mjs                # pruebas funcionales en Chromium real
node <repo card>/herramientas/verificar-calidad-html.js --raiz "<esta carpeta>"
```

---

Sitio construido por **KONFÍO ZINC** · konfiozinc@gmail.com · WhatsApp +57 320 641 1340
