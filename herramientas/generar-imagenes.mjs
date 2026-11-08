/* ═══════════════════════════════════════════════════════════════════════
   CROCAN POLLO · herramientas/generar-imagenes.mjs
   KZ-MENU-005 · derivados del logotipo del cliente (no se publica)

   No hay fotos de producto ni material gráfico adicional: lo ÚNICO que el
   cliente entregó es `logocrocanpollo.jpeg` (640×640). Todo lo que se genera
   aquí sale de ese archivo y de la paleta que dio la Dirección Técnica
   (#b30000 rojo oscuro, #ffcc00 amarillo). No se inventa nada más.

   Genera:
     assets/img/marca/logo-crocan.jpg       copia normalizada del logotipo
     assets/img/marca/favicon-64.png        64×64
     assets/img/marca/favicon-32.png        32×32
     assets/img/marca/apple-touch-icon.png  180×180
     assets/img/marca/favicon.svg           SVG con el PNG incrustado (el
                                            verificador exige favicon SVG)
     assets/img/og/og-1200x630.png          imagen para compartir por WhatsApp

   Uso:  node herramientas/generar-imagenes.mjs
   Requiere ffmpeg en PATH (comprobado: 9.0.2 en este equipo).
   ═══════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ORIGEN = path.join(RAIZ, 'logocrocanpollo.jpeg');
const MARCA = path.join(RAIZ, 'assets', 'img', 'marca');
const OG = path.join(RAIZ, 'assets', 'img', 'og');
const ROJO = '0xd4020d'; // el rojo propio del logotipo, medido en sus cuatro esquinas

fs.mkdirSync(MARCA, { recursive: true });
fs.mkdirSync(OG, { recursive: true });

if (!fs.existsSync(ORIGEN)) {
  console.error('Falta el logotipo del cliente: ' + ORIGEN);
  process.exit(1);
}

function ffmpeg(args) {
  // stdio heredado: así el proceso hijo no depende de tuberías (sandbox).
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
}

// 1 · logotipo normalizado (jpg de calidad alta, mismo tamaño que el original)
ffmpeg(['-i', ORIGEN, '-vf', 'scale=640:640:flags=lanczos', '-q:v', '2', path.join(MARCA, 'logo-crocan.jpg')]);

// 2 · favicons e icono de iOS
for (const [tamano, nombre] of [[64, 'favicon-64.png'], [32, 'favicon-32.png'], [180, 'apple-touch-icon.png']]) {
  ffmpeg(['-i', ORIGEN, '-vf', `scale=${tamano}:${tamano}:flags=lanczos`, path.join(MARCA, nombre)]);
}

// 3 · favicon.svg: el PNG de 64 incrustado. Se hace así —y no dibujando un icono
//     nuevo— porque el cliente no ha entregado un símbolo vectorial y cualquier
//     trazo inventado dejaría de ser su marca.
const png64 = fs.readFileSync(path.join(MARCA, 'favicon-64.png')).toString('base64');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" role="img" aria-label="Crocan Pollo">
  <rect width="64" height="64" rx="12" fill="#d4020d"/>
  <image x="6" y="6" width="52" height="52" href="data:image/png;base64,${png64}"/>
</svg>
`;
fs.writeFileSync(path.join(MARCA, 'favicon.svg'), svg, 'utf8');

// 4 · imagen de Open Graph 1200×630: el logotipo centrado sobre el rojo de marca.
//     Sin texto añadido: el logotipo ya trae el nombre y no hay tipografía
//     licenciada del cliente para reproducir.
ffmpeg([
  '-f', 'lavfi', '-i', `color=c=${ROJO}:s=1200x630`,
  '-i', ORIGEN,
  '-filter_complex', '[1:v]scale=470:470:flags=lanczos[logo];[0:v][logo]overlay=(W-w)/2:(H-h)/2:format=auto',
  '-frames:v', '1', '-update', '1',
  path.join(OG, 'og-1200x630.png')
]);

for (const f of ['logo-crocan.jpg', 'favicon-64.png', 'favicon-32.png', 'apple-touch-icon.png', 'favicon.svg', path.join('..', 'og', 'og-1200x630.png')]) {
  const p = path.join(MARCA, f);
  console.log('  ' + path.relative(RAIZ, p) + '  ' + fs.statSync(p).size + ' bytes');
}
console.log('Listo: 6 archivos generados desde logocrocanpollo.jpeg');
