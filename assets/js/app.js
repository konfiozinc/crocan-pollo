/* ═══════════════════════════════════════════════════════════════════════
   CROCAN POLLO · assets/js/app.js
   KZ-MENU-005 · carrito, botón con stepper y factura de WhatsApp

   BASE: `brosty-papas/assets/js/app.js` (KZ-BROSTY-001), que ya está en
   producción. Se conserva su estructura y se le añade lo que este menú
   necesita:

     1. PRECIOS REALES. El cliente dio el menú con cifras, así que cada
        línea lleva su importe y el pedido su TOTAL (en negrita al enviar).
        En Brosty no se publicaban precios y todo decía «Por confirmar».
     2. STEPPER. «+ Agregar» pasa a [ − ] [ n ] [ + ] y vuelve a «+ Agregar»
        cuando la cantidad llega a 0. Igual que en Brosty.
     3. VARIANTES CON PRECIO PROPIO. Un jugo en agua cuesta $4.000 y en leche
        $6.000: el botón de variante puede traer su propio `data-precio`.
     4. SABOR. Los jugos llevan un `<select>`; el sabor forma parte de la
        línea del carrito (dos jugos de sabores distintos son dos líneas).
     5. CAMPOS OBLIGATORIOS. Sin nombre y sin dirección no se abre WhatsApp:
        se marca el campo, se explica y no se envía nada.

   Nada sale del navegador: el pedido solo viaja si la persona pulsa
   «Enviar pedido» y confirma en WhatsApp.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var WHATSAPP = '573107420703';
  var CLAVE = 'crocan-pollo-pedido-v1';

  var $ = function (sel, raiz) { return (raiz || document).querySelector(sel); };
  var $$ = function (sel, raiz) { return Array.prototype.slice.call((raiz || document).querySelectorAll(sel)); };

  /* ───────── estado ───────── */
  var pedido = { lineas: [], nombre: '', entrega: '', notas: '' };

  function leer() {
    try {
      var bruto = window.localStorage.getItem(CLAVE);
      if (!bruto) return;
      var datos = JSON.parse(bruto);
      if (datos && Array.isArray(datos.lineas)) {
        pedido.lineas = datos.lineas.filter(function (l) {
          return l && typeof l.id === 'string' && typeof l.nombre === 'string' && l.cantidad > 0;
        }).map(function (l) {
          return {
            clave: String(l.clave || l.id),
            id: l.id,
            nombre: l.nombre,
            variante: typeof l.variante === 'string' ? l.variante : '',
            sabor: typeof l.sabor === 'string' ? l.sabor : '',
            precio: Math.max(parseInt(l.precio, 10) || 0, 0),
            cantidad: Math.min(Math.max(parseInt(l.cantidad, 10) || 1, 1), 99),
            obs: typeof l.obs === 'string' ? l.obs.slice(0, 140) : ''
          };
        });
        pedido.nombre = typeof datos.nombre === 'string' ? datos.nombre.slice(0, 60) : '';
        pedido.entrega = typeof datos.entrega === 'string' ? datos.entrega.slice(0, 120) : '';
        pedido.notas = typeof datos.notas === 'string' ? datos.notas.slice(0, 200) : '';
      }
    } catch (e) {
      /* modo privado o dato corrupto: se empieza vacío, sin ruido */
    }
  }

  function guardar() {
    try {
      window.localStorage.setItem(CLAVE, JSON.stringify(pedido));
    } catch (e) {
      /* si no se puede guardar, el pedido sigue vivo en esta sesión */
    }
  }

  function esc(texto) {
    return String(texto == null ? '' : texto)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* Precio en pesos: 12000 → «$12.000» */
  function formato(valor) {
    var n = Math.max(parseInt(valor, 10) || 0, 0);
    try { return '$' + n.toLocaleString('es-CO'); } catch (e) { return '$' + n; }
  }

  function unidades() {
    return pedido.lineas.reduce(function (total, l) { return total + l.cantidad; }, 0);
  }

  function totalPedido() {
    return pedido.lineas.reduce(function (total, l) { return total + l.precio * l.cantidad; }, 0);
  }

  /* ───────── referencias del DOM ───────── */
  var carrito = $('#carrito');
  var velo = $('#velo');
  var botonAbrir = $('#abrir-carrito');
  var botonCerrar = $('#cerrar-carrito');
  var barraVer = $('#barra-ver');
  var barra = $('#barra-pedido');
  var barraResumen = $('#barra-resumen');
  var barraTotal = $('#barra-total');
  var cuentaCabecera = $('#cuenta-cabecera');
  var contenedorLineas = $('#carrito-lineas');
  var vacio = $('#carrito-vacio');
  var datos = $('#carrito-datos');
  var campoNombre = $('#f-nombre');
  var campoEntrega = $('#f-entrega');
  var campoNotas = $('#f-notas');
  var errorNombre = $('#e-nombre');
  var errorEntrega = $('#e-entrega');
  var botonEnviar = $('#enviar-pedido');
  var toast = $('#toast');

  /* ───────── aviso flotante ───────── */
  var temporizadorToast = null;
  function avisar(mensaje) {
    if (!toast) return;
    toast.textContent = mensaje;
    toast.classList.add('visible');
    window.clearTimeout(temporizadorToast);
    temporizadorToast = window.setTimeout(function () { toast.classList.remove('visible'); }, 2600);
  }

  /* ───────── carrito: abrir y cerrar ───────── */
  var ultimoFoco = null;

  function abierto() {
    return carrito && carrito.classList.contains('abierto');
  }

  function abrirCarrito() {
    if (!carrito) return;
    ultimoFoco = document.activeElement;
    carrito.classList.add('abierto');
    if (velo) { velo.classList.add('abierto'); velo.removeAttribute('tabindex'); }
    carrito.setAttribute('aria-hidden', 'false');
    if (botonAbrir) botonAbrir.setAttribute('aria-expanded', 'true');
    if (botonCerrar) botonCerrar.focus();
    document.body.style.overflow = 'hidden';
  }

  function cerrarCarrito() {
    if (!carrito) return;
    carrito.classList.remove('abierto');
    if (velo) { velo.classList.remove('abierto'); velo.setAttribute('tabindex', '-1'); }
    carrito.setAttribute('aria-hidden', 'true');
    if (botonAbrir) botonAbrir.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    if (ultimoFoco && typeof ultimoFoco.focus === 'function') {
      try { ultimoFoco.focus({ preventScroll: true }); } catch (e) { ultimoFoco.focus(); }
    }
  }

  if (botonAbrir) botonAbrir.addEventListener('click', abrirCarrito);
  if (barraVer) barraVer.addEventListener('click', abrirCarrito);
  if (botonCerrar) botonCerrar.addEventListener('click', cerrarCarrito);
  if (velo) velo.addEventListener('click', cerrarCarrito);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && abierto()) cerrarCarrito();
  });

  /* ───────── carrito: operaciones ───────── */
  function buscar(clave) {
    for (var i = 0; i < pedido.lineas.length; i++) {
      if (pedido.lineas[i].clave === clave) return pedido.lineas[i];
    }
    return null;
  }

  function sumar(id, nombre, variante, sabor, precio) {
    var clave = id + '|' + (variante || '') + '|' + (sabor || '');
    var linea = buscar(clave);
    if (linea) {
      linea.cantidad = Math.min(linea.cantidad + 1, 99);
      linea.precio = precio || linea.precio;
    } else {
      pedido.lineas.push({
        clave: clave, id: id, nombre: nombre,
        variante: variante || '', sabor: sabor || '',
        precio: parseInt(precio, 10) || 0,
        cantidad: 1, obs: ''
      });
    }
    guardar();
    pintar();
  }

  function restar(clave) {
    var linea = buscar(clave);
    if (!linea) return;
    linea.cantidad -= 1;
    if (linea.cantidad <= 0) eliminar(clave);
    else { guardar(); pintar(); }
  }

  function eliminar(clave) {
    pedido.lineas = pedido.lineas.filter(function (l) { return l.clave !== clave; });
    guardar();
    pintar();
  }

  function vaciar() {
    pedido.lineas = [];
    guardar();
    pintar();
  }

  /* ───────── tarjetas del menú ───────── */
  var tarjetas = $$('.platillo');

  function varianteBoton(tarjeta) {
    return $('.variante[aria-pressed="true"]', tarjeta);
  }

  function varianteElegida(tarjeta) {
    var boton = varianteBoton(tarjeta);
    return boton ? boton.getAttribute('data-variante') : '';
  }

  function saborElegido(tarjeta) {
    var combo = $('select[data-sabor]', tarjeta);
    return combo ? combo.value : '';
  }

  /* Precio unitario: manda el de la variante si lo trae; si no, el del plato. */
  function precioDe(tarjeta) {
    var boton = varianteBoton(tarjeta);
    var propio = boton ? boton.getAttribute('data-precio') : null;
    if (propio != null && propio !== '') return parseInt(propio, 10) || 0;
    return parseInt(tarjeta.getAttribute('data-precio'), 10) || 0;
  }

  function claveDe(tarjeta) {
    return tarjeta.getAttribute('data-id') + '|' + varianteElegida(tarjeta) + '|' + saborElegido(tarjeta);
  }

  /* Muestra el precio que corresponde a la variante elegida. */
  function refrescarPrecioVisible(tarjeta) {
    var etiqueta = $('[data-precio-visible]', tarjeta);
    if (!etiqueta) return;
    etiqueta.textContent = formato(precioDe(tarjeta));
  }

  function accionDe(tarjeta) {
    var celda = $('.platillo__accion', tarjeta);
    if (!celda) return null;
    var agregar = $('.agregar', celda);
    var stepper = $('.stepper', celda);
    if (!stepper) {
      stepper = document.createElement('span');
      stepper.className = 'stepper';
      stepper.hidden = true;
      stepper.innerHTML =
        '<button type="button" data-accion="restar" aria-label="Quitar uno">−</button>' +
        '<span aria-live="polite">0</span>' +
        '<button type="button" data-accion="sumar" aria-label="Agregar otro">+</button>';
      celda.appendChild(stepper);
    }
    return { agregar: agregar, stepper: stepper, celda: celda };
  }

  function pintarTarjetas() {
    tarjetas.forEach(function (tarjeta) {
      var piezas = accionDe(tarjeta);
      if (!piezas) return;
      var linea = buscar(claveDe(tarjeta));
      var cantidad = linea ? linea.cantidad : 0;

      if (piezas.agregar) {
        piezas.agregar.hidden = cantidad > 0;
        piezas.agregar.textContent = cantidad > 0 ? 'Agregado' : '+ Agregar';
      }
      piezas.stepper.hidden = cantidad === 0;
      var numero = $('span', piezas.stepper);
      if (numero) numero.textContent = String(cantidad);

      var nombre = tarjeta.getAttribute('data-nombre') +
        (varianteElegida(tarjeta) ? ' (' + varianteElegida(tarjeta) + ')' : '') +
        (saborElegido(tarjeta) ? ' · ' + saborElegido(tarjeta) : '');
      var restarBtn = $('[data-accion="restar"]', piezas.stepper);
      var sumarBtn = $('[data-accion="sumar"]', piezas.stepper);
      if (restarBtn) restarBtn.setAttribute('aria-label', 'Quitar uno de ' + nombre);
      if (sumarBtn) sumarBtn.setAttribute('aria-label', 'Agregar otro ' + nombre);
    });
  }

  tarjetas.forEach(function (tarjeta) {
    var id = tarjeta.getAttribute('data-id');
    var nombre = tarjeta.getAttribute('data-nombre');

    var agregarBtn = $('.agregar', tarjeta);
    if (agregarBtn) {
      agregarBtn.addEventListener('click', function () {
        sumar(id, nombre, varianteElegida(tarjeta), saborElegido(tarjeta), precioDe(tarjeta));
        avisar('Agregado: ' + nombre);
      });
    }

    $$('.variante', tarjeta).forEach(function (boton) {
      boton.addEventListener('click', function () {
        $$('.variante', tarjeta).forEach(function (otro) {
          otro.setAttribute('aria-pressed', String(otro === boton));
        });
        refrescarPrecioVisible(tarjeta);
        pintarTarjetas();
      });
    });

    var combo = $('select[data-sabor]', tarjeta);
    if (combo) combo.addEventListener('change', pintarTarjetas);

    var celda = $('.platillo__accion', tarjeta);
    if (celda) {
      celda.addEventListener('click', function (e) {
        var boton = e.target.closest ? e.target.closest('[data-accion]') : null;
        if (!boton || !celda.contains(boton)) return;
        if (boton.getAttribute('data-accion') === 'sumar') {
          sumar(id, nombre, varianteElegida(tarjeta), saborElegido(tarjeta), precioDe(tarjeta));
        } else {
          restar(claveDe(tarjeta));
        }
      });
    }
  });

  /* ───────── pintar el carrito ───────── */
  function pintar() {
    var n = unidades();
    var total = totalPedido();

    if (cuentaCabecera) cuentaCabecera.textContent = String(n);
    if (barraResumen) barraResumen.textContent = n === 1 ? '1 producto' : n + ' productos';
    if (barraTotal) barraTotal.textContent = 'Total: ' + formato(total);
    if (barra) barra.classList.toggle('visible', n > 0);
    if (botonEnviar) botonEnviar.disabled = n === 0;
    if (vacio) vacio.hidden = n > 0;
    if (datos) datos.hidden = n === 0;

    if (contenedorLineas) {
      contenedorLineas.innerHTML = pedido.lineas.map(function (l) {
        var detalle = l.nombre +
          (l.variante ? ' · ' + l.variante : '') +
          (l.sabor ? ' · ' + l.sabor : '');
        var nombre = esc(detalle);
        return '' +
          '<div class="linea" data-clave="' + esc(l.clave) + '">' +
            '<div>' +
              '<p class="linea__nombre">' + l.cantidad + '× ' + nombre + '</p>' +
              '<p class="linea__precio">' + formato(l.precio) + ' c/u · <strong>' + formato(l.precio * l.cantidad) + '</strong></p>' +
              '<span class="stepper" style="margin-top:.45rem">' +
                '<button type="button" data-accion="restar" aria-label="Quitar uno de ' + nombre + '">−</button>' +
                '<span>' + l.cantidad + '</span>' +
                '<button type="button" data-accion="sumar" aria-label="Agregar otro ' + nombre + '">+</button>' +
              '</span>' +
            '</div>' +
            '<button class="linea__quitar" type="button" data-accion="eliminar" aria-label="Eliminar ' + nombre + ' del pedido">🗑</button>' +
            '<input class="linea__obs" type="text" maxlength="140" value="' + esc(l.obs) + '" ' +
              'placeholder="Observaciones: sin salsa, bien asado…" aria-label="Observaciones para ' + nombre + '">' +
          '</div>';
      }).join('');
    }

    var etiqueta = $('#carrito-total');
    if (etiqueta) etiqueta.textContent = formato(total);

    if (campoNombre && campoNombre.value !== pedido.nombre) campoNombre.value = pedido.nombre;
    if (campoEntrega && campoEntrega.value !== pedido.entrega) campoEntrega.value = pedido.entrega;
    if (campoNotas && campoNotas.value !== pedido.notas) campoNotas.value = pedido.notas;

    pintarTarjetas();
  }

  /* ───────── eventos del carrito ───────── */
  if (contenedorLineas) {
    contenedorLineas.addEventListener('click', function (e) {
      var boton = e.target.closest ? e.target.closest('[data-accion]') : null;
      if (!boton) return;
      var fila = boton.closest('.linea');
      if (!fila) return;
      var clave = fila.getAttribute('data-clave');
      var accion = boton.getAttribute('data-accion');
      if (accion === 'sumar') {
        var linea = buscar(clave);
        if (linea) sumar(linea.id, linea.nombre, linea.variante, linea.sabor, linea.precio);
      } else if (accion === 'restar') {
        restar(clave);
      } else if (accion === 'eliminar') {
        eliminar(clave);
        avisar('Producto eliminado del pedido');
      }
    });

    contenedorLineas.addEventListener('input', function (e) {
      var campo = e.target;
      if (!campo || !campo.classList || !campo.classList.contains('linea__obs')) return;
      var fila = campo.closest('.linea');
      if (!fila) return;
      var linea = buscar(fila.getAttribute('data-clave'));
      if (linea) {
        linea.obs = campo.value.slice(0, 140);
        guardar();
      }
    });
  }

  if (campoNombre) {
    campoNombre.addEventListener('input', function () {
      pedido.nombre = campoNombre.value.slice(0, 60);
      if (pedido.nombre.trim()) marcarError(campoNombre, errorNombre, false);
      guardar();
    });
  }
  if (campoEntrega) {
    campoEntrega.addEventListener('input', function () {
      pedido.entrega = campoEntrega.value.slice(0, 120);
      if (pedido.entrega.trim()) marcarError(campoEntrega, errorEntrega, false);
      guardar();
    });
  }
  if (campoNotas) {
    campoNotas.addEventListener('input', function () {
      pedido.notas = campoNotas.value.slice(0, 200);
      guardar();
    });
  }

  /* ───────── mensaje y envío por WhatsApp ───────── */
  function armarMensaje() {
    var lineas = ['Hola CROCAN POLLO 🍗, quiero hacer este pedido:', ''];
    pedido.lineas.forEach(function (l) {
      var detalle = l.nombre +
        (l.variante ? ' (' + l.variante + ')' : '') +
        (l.sabor ? ' · ' + l.sabor : '');
      lineas.push('• ' + l.cantidad + '× ' + detalle + ' — ' + formato(l.precio * l.cantidad));
      if (l.obs.trim()) lineas.push('   Obs: ' + l.obs.trim());
    });
    lineas.push('');
    lineas.push('*TOTAL: ' + formato(totalPedido()) + '*');
    lineas.push('');
    if (pedido.nombre.trim()) lineas.push('Nombre: ' + pedido.nombre.trim());
    if (pedido.entrega.trim()) lineas.push('Dirección: ' + pedido.entrega.trim());
    if (pedido.notas.trim()) lineas.push('Notas: ' + pedido.notas.trim());
    lineas.push('');
    lineas.push('¿Me confirman el domicilio, por favor?');
    return lineas.join('\n');
  }

  function marcarError(campo, etiqueta, activo) {
    if (campo) campo.setAttribute('aria-invalid', activo ? 'true' : 'false');
    if (etiqueta) etiqueta.hidden = !activo;
  }

  /* Sin nombre y sin dirección no hay pedido: se avisa y no se abre nada. */
  function validar() {
    var faltaNombre = !pedido.nombre.trim();
    var faltaEntrega = !pedido.entrega.trim();
    marcarError(campoNombre, errorNombre, faltaNombre);
    marcarError(campoEntrega, errorEntrega, faltaEntrega);
    if (faltaNombre) { if (campoNombre) campoNombre.focus(); return false; }
    if (faltaEntrega) { if (campoEntrega) campoEntrega.focus(); return false; }
    return true;
  }

  function enviar() {
    if (unidades() === 0) return { texto: '', url: '', abierto: false, motivo: 'vacio' };
    if (!validar()) {
      avisar('Faltan datos: escribe tu nombre y la dirección de entrega.');
      return { texto: '', url: '', abierto: false, motivo: 'faltan-datos' };
    }
    var texto = armarMensaje();
    var url = 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(texto);
    var ventana = null;
    try { ventana = window.open(url, '_blank', 'noopener'); } catch (e) { ventana = null; }
    if (ventana) {
      cerrarCarrito();
      avisar('Se abrió WhatsApp con tu pedido. Envíalo para que lo reciban.');
    } else {
      avisar('El navegador bloqueó la ventana: abre WhatsApp desde el botón flotante.');
    }
    return { texto: texto, url: url, abierto: !!ventana, motivo: 'ok' };
  }

  if (botonEnviar) botonEnviar.addEventListener('click', enviar);

  var vaciarBtn = $('#vaciar-pedido');
  if (vaciarBtn) {
    vaciarBtn.addEventListener('click', function () {
      if (!pedido.lineas.length) { avisar('El pedido ya está vacío'); return; }
      vaciar();
      avisar('Pedido vaciado');
    });
  }

  /* Expuesto para las pruebas automáticas (no lo usa la página). */
  window.CROCAN = {
    pedido: pedido,
    armarMensaje: armarMensaje,
    enviar: enviar,
    sumar: sumar,
    restar: restar,
    eliminar: eliminar,
    vaciar: vaciar,
    abrir: abrirCarrito,
    cerrar: cerrarCarrito,
    guardar: guardar,
    pintar: pintar,
    formato: formato,
    total: totalPedido,
    unidades: unidades,
    clave: CLAVE,
    whatsapp: WHATSAPP
  };

  /* ───────── acciones rápidas: contacto y compartir ───────── */
  var guardarBtn = $('#guardar-contacto');
  if (guardarBtn) {
    guardarBtn.addEventListener('click', function () {
      var vcf = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        'FN:Crocan Pollo - Pollo Asado y Apanado',
        'ORG:Crocan Pollo',
        'TEL;TYPE=CELL:+' + WHATSAPP,
        'NOTE:Pollo asado y apanado. Abierto las 24 horas. Barrio Los Girasoles, Zona Rosa (Cra 69 con Cl 28A). Domicilios al 310 742 0703.',
        'END:VCARD'
      ].join('\r\n');
      try {
        var blob = new Blob([vcf], { type: 'text/vcard;charset=utf-8' });
        var enlace = document.createElement('a');
        enlace.href = URL.createObjectURL(blob);
        enlace.download = 'crocan-pollo.vcf';
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
        window.setTimeout(function () { URL.revokeObjectURL(enlace.href); }, 4000);
        avisar('Descargaste crocan-pollo.vcf: ábrelo y tendrás el contacto guardado.');
      } catch (e) {
        avisar('Tu navegador no permitió descargar el contacto.');
      }
    });
  }

  var compartirBtn = $('#compartir');
  if (compartirBtn) {
    compartirBtn.addEventListener('click', function () {
      var url = window.location.href.split('#')[0];
      if (navigator.share) {
        navigator.share({ title: 'Crocan Pollo', text: '¡Nunca me vas a olvidar! Crujiente por fuera, irresistible por dentro.', url: url })
          .then(function () { avisar('Gracias por compartir 🍗'); })
          .catch(function () { /* cancelado: sin ruido */ });
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () {
          avisar('Enlace copiado. Pégalo donde quieras compartirlo.');
        }, function () {
          avisar('No se pudo copiar. El enlace es: ' + url);
        });
      } else {
        avisar('El enlace es: ' + url);
      }
    });
  }

  /* ───────── chips de categoría: marcar el que se está viendo ───────── */
  var chips = $$('.chip');
  if (chips.length && 'IntersectionObserver' in window) {
    var observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (!entrada.isIntersecting) return;
        var id = entrada.target.getAttribute('id');
        chips.forEach(function (chip) {
          chip.setAttribute('aria-current', String(chip.getAttribute('href') === '#' + id));
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('.categoria').forEach(function (seccion) { observador.observe(seccion); });
  }

  /* ───────── arranque ───────── */
  leer();
  tarjetas.forEach(refrescarPrecioVisible);
  pintar();
})();
