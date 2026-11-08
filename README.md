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
assets/img/marca/logocrocanpollo.jpeg   la ÚNICA imagen del proyecto (logo oficial)
```

## Origen de los datos

Cada dato publicado sale del **volante del cliente** o del brief de la Dirección Técnica:

| Dato | Valor | Origen |
|---|---|---|
| Nombre y eslogan | Crocan Pollo · «¡Nunca me vas a olvidar!» · «Crujiente por fuera, irresistible por dentro» | Brief y volante |
| WhatsApp / domicilios | +57 310 742 0703 | Brief |
| Horario | Abierto las 24 horas | Perfil de WhatsApp Business del cliente |
| Ubicación | Barrio Los Girasoles, Zona Rosa (cerca a la Parroquia Jesús Nazareno, Cra 69 con Cl 28A) | Brief |
| Menú y precios | 19 importes en cinco categorías | Carta de precios que entregó el negocio, transcrita en el brief |
| Promoción | Pollo completo + gaseosa 1 L gratis; el entero lleva 4 papas cocidas, 4 arepas, 4 salsas, 4 mieles y 1 maduro | Brief de la Dirección Técnica |

**Nada de esto se inventó.** Lo que el cliente **no** entregó no se publica: no hay fotos de
producto (las tarjetas usan el icono del plato, 🍗 🍟 🍲 🥤), y las redes no tienen enlace directo
porque no se conocen las cuentas.

**Los volantes del negocio no forman parte del sitio.** Se usaron **solo como fuente de información
comercial** (precios, promoción, ubicación, horario). No se copian, no se instalan y no se muestran:
la promoción se presenta con HTML y CSS, y la **única imagen del proyecto es el logotipo oficial**
`assets/img/marca/logocrocanpollo.jpeg`.

## Decisiones cerradas con la Dirección Técnica (8-nov-2026)

1. **Eslogan.** El de la carta de precios: **«¡Nunca me vas a olvidar!»**, con «Crujiente por fuera,
   irresistible por dentro» en la meta descripción y en `og:description`. (El «¡El sabor que provoca!»
   de un brief anterior era un cruce con Brosty Papas.)
2. **URL canónica.** Confirmada: `https://konfiozinc.github.io/crocan-pollo/`. Ya está aplicada en
   `og:url` y en `og:image`.
3. **Los volantes no se publican.** `flyer-oferta.jpg` y `flyer-menu.jpg` son **solo fuentes de
   información comercial**: no se copian, no se instalan y no se muestran en el menú digital. El
   script `herramientas/insertar-flyers.mjs` que los montaba fue **retirado** del proyecto. La
   promoción se presenta con HTML y CSS.
4. **Logo oficial.** `assets/img/marca/logocrocanpollo.jpeg` —el archivo original del cliente— es la
   **única imagen** del sitio y la fuente de los favicons y de la imagen de Open Graph.

## Pendiente

1. **Publicación.** El sitio **no está publicado** y **no existe repositorio en GitHub**: hay repo
   local con commits y **sin remoto**. Hace falta la autorización expresa de Darwin.
2. **Redes sociales.** Los botones llevan a una búsqueda por «Crocan Pollo Los Girasoles» en cada
   red. Con las cuentas exactas se cambian por enlaces directos.
3. **Notas del pedido.** El brief menciona «Nombre, Dirección de entrega, Notas» como campos del
   cliente. Se exigen **nombre y dirección**; «Notas» queda opcional porque no todos los pedidos
   tienen nota. Si debe ser obligatoria, es una línea en `app.js`.

## Verificación

```bash
node herramientas/generar-imagenes.mjs      # favicons y Open Graph desde el logo oficial
node herramientas/insertar-icono.mjs        # icono oficial de WhatsApp (idempotente)
node herramientas/probar.mjs                # 31 pruebas funcionales en Chromium real
node <repo card>/herramientas/verificar-calidad-html.js --raiz "<esta carpeta>"
```

---

Sitio construido por **KONFÍO ZINC** · konfiozinc@gmail.com · WhatsApp +57 320 641 1340
