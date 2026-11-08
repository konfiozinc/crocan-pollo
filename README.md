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

## Decisiones cerradas con la Dirección Técnica (8-nov-2026)

1. **Eslogan.** El del flyer: **«¡Nunca me vas a olvidar!»**, con «Crujiente por fuera, irresistible
   por dentro» en la meta descripción y en `og:description`. (El «¡El sabor que provoca!» de un brief
   anterior era un cruce con Brosty Papas.)
2. **URL canónica.** Confirmada: `https://konfiozinc.github.io/crocan-pollo/`. Ya está aplicada en
   `og:url` y en `og:image`.

## Pendiente

1. **Publicación.** El sitio **no está publicado** y **no existe repositorio en GitHub**: hay repo
   local con un commit y **sin remoto**. Hace falta la autorización expresa de Darwin.
2. **Flyers.** `assets/img/flyer-oferta.jpg` y `assets/img/flyer-menu.jpg` **todavía no están en el
   equipo** (la carpeta `assets/` está vacía y no aparecen en ninguna carpeta del usuario). En cuanto
   estén, un solo comando los monta:
   ```bash
   node herramientas/insertar-flyers.mjs
   ```
   El flyer de la oferta entra dentro del bloque de promoción y el del menú queda como **imagen
   grande pulsable justo debajo**. El script **se niega a tocar la página** si falta alguno de los
   dos: nunca deja una imagen referenciada y ausente, que se vería rota.
3. **Redes sociales.** Los botones llevan a una búsqueda por «Crocan Pollo Los Girasoles» en cada
   red. Con las cuentas exactas se cambian por enlaces directos.
4. **Notas del pedido.** El brief menciona «Nombre, Dirección de entrega, Notas» como campos del
   cliente. Se exigen **nombre y dirección**; «Notas» queda opcional porque no todos los pedidos
   tienen nota. Si debe ser obligatoria, es una línea en `app.js`.

## Verificación

```bash
node herramientas/generar-imagenes.mjs      # derivados del logo (requiere ffmpeg)
node herramientas/insertar-icono.mjs        # icono oficial de WhatsApp (idempotente)
node herramientas/insertar-flyers.mjs       # monta los flyers cuando existan
node herramientas/probar.mjs                # 31 pruebas funcionales en Chromium real
node <repo card>/herramientas/verificar-calidad-html.js --raiz "<esta carpeta>"
```

---

Sitio construido por **KONFÍO ZINC** · konfiozinc@gmail.com · WhatsApp +57 320 641 1340
