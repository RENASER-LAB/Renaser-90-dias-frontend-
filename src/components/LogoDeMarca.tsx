import React from 'react';
import { View } from 'react-native';
import Svg, { ClipPath, Defs, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useTheme } from '../theme/ThemeContext';
import type { ModoDeTema } from '../theme/modoDeTema';

/**
 * Logos de marcas de terceros, tal como los publica svgl.
 *
 * Pedido del dueño (2026-10-05): «Ayúdame con el diseño para el tema de íconos:
 * https://github.com/pheralb/svgl utiliza esta parte». svgl es una colección de LOGOS de marcas, no un
 * set de íconos de interfaz: por eso esto vive aparte de `Icon`.
 *
 * **`LogoDeMarca` no es `Icon`.** `Icon` son íconos de línea dibujados a mano que toman el color del
 * tema. Un logo de marca lleva SUS colores y no se recolorea (las guías de Google, Apple y Zoom lo
 * piden así), así que acá no hay prop `color`. Para la variante sobre fondo oscuro se usa la que
 * publica svgl —hoy solo Apple tiene una, blanca—; el resto se ve igual en los dos temas.
 *
 * **De dónde sale cada uno.** De `static/library/` de svgl, commit `f9b726c` (2026-10-05):
 * `google.svg` (la «G» con degradado que Google estrenó en 2025), `apple.svg` y `apple_dark.svg`,
 * `google-meet.svg`, `zoom.svg` y `drive.svg`. Los trazos, los colores y los degradados son los
 * de ese archivo, sin redibujar nada.
 *
 * **Qué se tocó del SVG original, y por qué no cambia lo que se ve:**
 * - Fuera los metadatos y atributos de la raíz (`xmlns`, `xml:space`, `width`/`height`): el tamaño
 *   lo pone `size`.
 * - Los degradados de Google que heredaban sus colores con `xlink:href` llevan los `<Stop>`
 *   copiados adentro: `react-native-svg` no sigue ese `href`.
 * - Las posiciones de los `<Stop>` van como número (`.231` → `0.231`, `19.11%` → `0.1911`): en
 *   Android e iOS `react-native-svg` solo lee texto que EMPIECE con un dígito, y `".231"` caía a 0.
 * - Los ids llevan el nombre de la marca (`logoGoogle-j`): en la web los ids son de toda la página,
 *   y un `id="a"` suelto chocaría con el de otro SVG.
 * - **Google: sin sus dos filtros `feGaussianBlur`.** Suavizan el borde entre las manchas del
 *   degradado. Medido en Chromium a 3× contra el archivo de svgl: a 20 px cambian 4 de 3 600
 *   píxeles, con una diferencia máxima de 13 sobre 255; a 24 px, 1 píxel. No se ve, y los filtros
 *   son la parte de `react-native-svg` con más diferencias entre Android, iOS y la web.
 *
 * **Licencia.** El repositorio de svgl es MIT (Copyright (c) 2022 Pablo Hdez). Los logos NO son de
 * svgl: son marcas registradas de Google LLC, Apple Inc. y Zoom Communications, y se usan solo
 * para identificar el servicio al que lleva algo (entrar con Google, un evento por Meet), nunca
 * como adorno, deformados ni recoloreados.
 */

export type MarcaConLogo = 'google' | 'apple' | 'googleMeet' | 'zoom' | 'googleDrive';

type Logo = { nombre: string; viewBox: string; dibujo: (modo: ModoDeTema) => React.ReactElement };

const LOGOS: Record<MarcaConLogo, Logo> = {
  google: { nombre: 'Google', viewBox: '0 0 268.152 273.883', dibujo: () => <DibujoGoogle /> },
  apple: { nombre: 'Apple', viewBox: '0 0 814 1000', dibujo: modo => <DibujoApple modo={modo} /> },
  googleMeet: { nombre: 'Google Meet', viewBox: '0 0 622 512', dibujo: () => <DibujoGoogleMeet /> },
  zoom: { nombre: 'Zoom', viewBox: '0 0 256 256', dibujo: () => <DibujoZoom /> },
  googleDrive: { nombre: 'Google Drive', viewBox: '0 0 87.3 78', dibujo: () => <DibujoGoogleDrive /> },
};

/** Si hay logo para esa marca. Para datos que llegan de afuera (un texto del servidor, un link). */
export function esMarcaConLogo(valor: string): valor is MarcaConLogo {
  return Object.prototype.hasOwnProperty.call(LOGOS, valor);
}

type Props = {
  marca: MarcaConLogo;
  /** Lado del cuadrado, en px. El logo se centra adentro sin deformarse (Apple es más alto que ancho). */
  size?: number;
  /** Fuerza la variante clara u oscura. Sin esto, sigue al tema de la app. */
  modo?: ModoDeTema;
  /**
   * `true` cuando al lado ya está ESCRITO el nombre de la marca («Google Meet», «Continuar con
   * Google»): el lector de pantalla no lo repite. Sin eso, el logo se anuncia como imagen con el
   * nombre de la marca.
   */
  decorativo?: boolean;
};

/** `<LogoDeMarca marca="google" size={20} />`. Una marca que no está en la lista no dibuja nada. */
export function LogoDeMarca({ marca, size = 20, modo, decorativo = false }: Props) {
  const { mode } = useTheme();
  if (!esMarcaConLogo(marca)) return null;
  const logo = LOGOS[marca];
  const accesibilidad = decorativo
    ? { 'aria-hidden': true }
    : { accessible: true, accessibilityRole: 'image' as const, accessibilityLabel: logo.nombre };
  return (
    <View style={{ width: size, height: size }} {...accesibilidad}>
      <Svg width={size} height={size} viewBox={logo.viewBox}>
        {logo.dibujo(modo ?? mode)}
      </Svg>
    </View>
  );
}

function DibujoGoogle() {
  return (
    <>
      <Defs>
        <LinearGradient id="logoGoogle-s" x1={219.7} x2={254.467} y1={329.535} y2={329.535} gradientUnits="userSpaceOnUse">
          <Stop offset={0} stopColor="#0fbc5c" />
          <Stop offset={1} stopColor="#0cba65" />
        </LinearGradient>
        <RadialGradient id="logoGoogle-m" cx={109.627} cy={135.862} r={71.46} fx={109.627} fy={135.862} gradientTransform="matrix(-1.93688 1.043 1.45573 2.55542 290.525 -400.634)" gradientUnits="userSpaceOnUse">
          <Stop offset={0.231} stopColor="#ff4541" />
          <Stop offset={0.312} stopColor="#ff4540" />
          <Stop offset={0.458} stopColor="#ff4640" />
          <Stop offset={0.54} stopColor="#ff473f" />
          <Stop offset={0.699} stopColor="#ff5138" />
          <Stop offset={0.771} stopColor="#ff5b33" />
          <Stop offset={0.861} stopColor="#ff6c29" />
          <Stop offset={1} stopColor="#ff8c18" />
        </RadialGradient>
        <RadialGradient id="logoGoogle-n" cx={45.259} cy={279.274} r={71.46} fx={45.259} fy={279.274} gradientTransform="matrix(-3.5126 -4.45809 -1.69255 1.26062 870.8 191.554)" gradientUnits="userSpaceOnUse">
          <Stop offset={0.132} stopColor="#0cba65" />
          <Stop offset={0.21} stopColor="#0bb86d" />
          <Stop offset={0.297} stopColor="#09b479" />
          <Stop offset={0.396} stopColor="#08ad93" />
          <Stop offset={0.477} stopColor="#0aa6a9" />
          <Stop offset={0.568} stopColor="#0d9cc6" />
          <Stop offset={0.667} stopColor="#1893dd" />
          <Stop offset={0.769} stopColor="#258bf1" />
          <Stop offset={0.859} stopColor="#3086ff" />
        </RadialGradient>
        <RadialGradient id="logoGoogle-l" cx={304.017} cy={118.009} r={47.854} fx={304.017} fy={118.009} gradientTransform="matrix(2.06435 0 0 2.59204 -297.679 -151.747)" gradientUnits="userSpaceOnUse">
          <Stop offset={0.408} stopColor="#fb4e5a" />
          <Stop offset={1} stopColor="#ff4540" />
        </RadialGradient>
        <RadialGradient id="logoGoogle-o" cx={181.001} cy={177.201} r={71.46} fx={181.001} fy={177.201} gradientTransform="matrix(-.24858 2.08314 2.96249 .33417 -255.146 -331.164)" gradientUnits="userSpaceOnUse">
          <Stop offset={0.366} stopColor="#ff4e3a" />
          <Stop offset={0.458} stopColor="#ff8a1b" />
          <Stop offset={0.54} stopColor="#ffa312" />
          <Stop offset={0.616} stopColor="#ffb60c" />
          <Stop offset={0.771} stopColor="#ffcd0a" />
          <Stop offset={0.861} stopColor="#fecf0a" />
          <Stop offset={0.915} stopColor="#fecf08" />
          <Stop offset={1} stopColor="#fdcd01" />
        </RadialGradient>
        <RadialGradient id="logoGoogle-p" cx={207.673} cy={108.097} r={41.102} fx={207.673} fy={108.097} gradientTransform="matrix(-1.2492 1.34326 -3.89684 -3.4257 880.501 194.905)" gradientUnits="userSpaceOnUse">
          <Stop offset={0.316} stopColor="#ff4c3c" />
          <Stop offset={0.604} stopColor="#ff692c" />
          <Stop offset={0.727} stopColor="#ff7825" />
          <Stop offset={0.885} stopColor="#ff8d1b" />
          <Stop offset={1} stopColor="#ff9f13" />
        </RadialGradient>
        <RadialGradient id="logoGoogle-r" cx={109.627} cy={135.862} r={71.46} fx={109.627} fy={135.862} gradientTransform="matrix(-1.93688 -1.043 1.45573 -2.55542 290.525 838.683)" gradientUnits="userSpaceOnUse">
          <Stop offset={0.231} stopColor="#0fbc5f" />
          <Stop offset={0.312} stopColor="#0fbc5f" />
          <Stop offset={0.366} stopColor="#0fbc5e" />
          <Stop offset={0.458} stopColor="#0fbc5d" />
          <Stop offset={0.54} stopColor="#12bc58" />
          <Stop offset={0.699} stopColor="#28bf3c" />
          <Stop offset={0.771} stopColor="#38c02b" />
          <Stop offset={0.861} stopColor="#52c218" />
          <Stop offset={0.915} stopColor="#67c30f" />
          <Stop offset={1} stopColor="#86c504" />
        </RadialGradient>
        <RadialGradient id="logoGoogle-j" cx={154.87} cy={145.969} r={71.46} fx={154.87} fy={145.969} gradientTransform="matrix(-.0814 -1.93722 2.92674 -.11625 -215.135 632.86)" gradientUnits="userSpaceOnUse">
          <Stop offset={0.142} stopColor="#1abd4d" />
          <Stop offset={0.248} stopColor="#6ec30d" />
          <Stop offset={0.312} stopColor="#8ac502" />
          <Stop offset={0.366} stopColor="#a2c600" />
          <Stop offset={0.446} stopColor="#c8c903" />
          <Stop offset={0.54} stopColor="#ebcb03" />
          <Stop offset={0.616} stopColor="#f7cd07" />
          <Stop offset={0.699} stopColor="#fdcd04" />
          <Stop offset={0.771} stopColor="#fdce05" />
          <Stop offset={0.861} stopColor="#ffce0a" />
        </RadialGradient>
        <ClipPath id="logoGoogle-i">
          <Path d="M371.378 193.24H237.083v53.438h77.167c-1.241 7.563-4.026 15.003-8.105 21.786-4.674 7.773-10.451 13.69-16.373 18.196-17.74 13.498-38.42 16.258-52.783 16.258-36.283 0-67.283-23.286-79.285-54.928-.484-1.149-.805-2.335-1.197-3.507a81.115 81.115 0 0 1-4.101-25.448c0-9.226 1.569-18.057 4.43-26.398 11.285-32.897 42.985-57.467 80.179-57.467 7.481 0 14.685.884 21.517 2.648a77.668 77.668 0 0 1 33.425 18.25l40.834-39.712c-24.839-22.616-57.219-36.32-95.844-36.32-30.878 0-59.386 9.553-82.748 25.7-18.945 13.093-34.483 30.625-44.97 50.985-9.753 18.879-15.094 39.8-15.094 62.294 0 22.495 5.35 43.633 15.103 62.337v.126c10.302 19.857 25.368 36.954 43.678 49.988 15.997 11.386 44.68 26.551 84.031 26.551 22.63 0 42.687-4.051 60.375-11.644 12.76-5.478 24.065-12.622 34.301-21.804 13.525-12.132 24.117-27.139 31.347-44.404 7.23-17.265 11.097-36.79 11.097-57.957 0-9.858-.998-19.87-2.689-28.968Z" />
        </ClipPath>
      </Defs>
      <G clipPath="url(#logoGoogle-i)" transform="matrix(.95792 0 0 .98525 -90.174 -78.856)">
        <Path fill="url(#logoGoogle-j)" d="M92.076 219.958c.148 22.14 6.501 44.983 16.117 63.424v.127c6.949 13.392 16.445 23.97 27.26 34.452l65.327-23.67c-12.36-6.235-14.246-10.055-23.105-17.026-9.054-9.066-15.802-19.473-20.004-31.677h-.17l.17-.127c-2.765-8.058-3.037-16.613-3.14-25.503Z" />
        <Path fill="url(#logoGoogle-l)" d="M237.083 79.025c-6.456 22.526-3.988 44.421 0 57.161 7.457.006 14.64.888 21.45 2.647a77.662 77.662 0 0 1 33.424 18.25l41.88-40.726c-24.81-22.59-54.667-37.297-96.754-37.332Z" />
        <Path fill="url(#logoGoogle-m)" d="M236.943 78.847c-31.67 0-60.91 9.798-84.871 26.359a145.533 145.533 0 0 0-24.332 21.15c-1.904 17.744 14.257 39.551 46.262 39.37 15.528-17.936 38.495-29.542 64.056-29.542l.07.002-1.044-57.335c-.048 0-.093-.004-.14-.004Z" />
        <Path fill="url(#logoGoogle-n)" d="m341.475 226.379-28.268 19.285c-1.24 7.562-4.028 15.002-8.107 21.786-4.674 7.772-10.45 13.69-16.373 18.196-17.702 13.47-38.328 16.244-52.687 16.255-14.842 25.102-17.444 37.675 1.043 57.934 22.877-.016 43.157-4.117 61.046-11.796 12.931-5.551 24.388-12.792 34.761-22.097 13.706-12.295 24.442-27.503 31.769-45 7.327-17.497 11.245-37.282 11.245-58.734Z" />
        <Path fill="#3086ff" d="M234.996 191.21v57.498h136.006c1.196-7.874 5.152-18.064 5.152-26.5 0-9.858-.996-21.899-2.687-30.998Z" />
        <Path fill="url(#logoGoogle-o)" d="M128.39 124.327c-8.394 9.119-15.564 19.326-21.249 30.364-9.753 18.879-15.094 41.83-15.094 64.324 0 .317.026.627.029.944 4.32 8.224 59.666 6.649 62.456 0-.004-.31-.039-.613-.039-.924 0-9.226 1.57-16.026 4.43-24.367 3.53-10.289 9.056-19.763 16.123-27.926 1.602-2.031 5.875-6.397 7.121-9.016.475-.997-.862-1.557-.937-1.908-.083-.393-1.876-.077-2.277-.37-1.275-.929-3.8-1.414-5.334-1.845-3.277-.921-8.708-2.953-11.725-5.06-9.536-6.658-24.417-14.612-33.505-24.216Z" />
        <Path fill="url(#logoGoogle-p)" d="M162.099 155.857c22.112 13.301 28.471-6.714 43.173-12.977l-25.574-52.664a144.74 144.74 0 0 0-26.543 14.504c-12.316 8.512-23.192 18.9-32.176 30.72Z" />
        <Path fill="url(#logoGoogle-r)" d="M171.099 290.222c-29.683 10.641-34.33 11.023-37.062 29.29a144.806 144.806 0 0 0 16.792 13.984c15.996 11.386 46.766 26.551 86.118 26.551.046 0 .09-.004.137-.004v-59.157l-.094.002c-14.736 0-26.512-3.843-38.585-10.527-2.977-1.648-8.378 2.777-11.123.799-3.786-2.729-12.9 2.35-16.183-.938Z" />
        <Path fill="url(#logoGoogle-s)" d="M219.7 299.023v59.996c5.506.64 11.236 1.028 17.247 1.028 6.026 0 11.855-.307 17.52-.872v-59.748a105.119 105.119 0 0 1-17.477 1.461c-5.932 0-11.7-.686-17.29-1.865Z" opacity={0.5} />
      </G>
    </>
  );
}

/** svgl publica dos archivos con el mismo trazo: negro (`apple.svg`) y blanco (`apple_dark.svg`). */
function DibujoApple({ modo }: { modo: ModoDeTema }) {
  return (
    <Path
      fill={modo === 'dark' ? '#fff' : '#000'}
      d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"
    />
  );
}

function DibujoGoogleMeet() {
  return (
    <>
      <Defs>
        <ClipPath id="logoMeet-recorte">
          <Rect width={621.2} height={512} fill="white" />
        </ClipPath>
      </Defs>
      <G clipPath="url(#logoMeet-recorte)">
        <Path d="M351.419 255.568L411.978 324.79L493.418 376.827L507.584 256.005L493.418 137.908L410.418 183.621L351.419 255.568Z" fill="#00832D" />
        <Path d="M0.00283051 365.583V468.541C0.00283051 492.049 19.0851 511.136 42.5983 511.136H145.556L166.876 433.344L145.556 365.583L74.9198 344.263L0.00283051 365.583Z" fill="#0066DA" />
        <Path d="M145.556 -7.62939e-06L0.00283051 145.554L74.9247 166.822L145.556 145.554L166.488 78.7145L145.556 -7.62939e-06Z" fill="#E94235" />
        <Path d="M0.00526047 365.629H145.556V145.551H0.00526047V365.629Z" fill="#2684FC" />
        <Path d="M586.398 61.6293L493.416 137.91V376.827L586.782 453.404C600.758 464.352 621.204 454.374 621.204 436.607V78.0861C621.204 60.1224 600.271 50.193 586.396 61.6317" fill="#00AC47" />
        <Path d="M351.419 255.568V365.583H145.556V511.136H450.825C474.338 511.136 493.418 492.049 493.418 468.541V376.827L351.419 255.568Z" fill="#00AC47" />
        <Path d="M450.825 -7.62939e-06H145.556V145.554H351.419V255.568L493.42 137.905V42.5979C493.42 19.0847 474.338 0.00241891 450.825 0.00241891" fill="#FFBA00" />
      </G>
    </>
  );
}

function DibujoZoom() {
  return (
    <>
      <Defs>
        <LinearGradient id="logoZoom-a" x1="23.666%" x2="76.334%" y1="95.6118%" y2="4.3882%">
          <Stop offset={0.0000006} stopColor="#0845BF" />
          <Stop offset={0.1911} stopColor="#0950DE" />
          <Stop offset={0.3823} stopColor="#0B59F6" />
          <Stop offset={0.5} stopColor="#0B5CFF" />
          <Stop offset={0.6732} stopColor="#0E5EFE" />
          <Stop offset={0.7774} stopColor="#1665FC" />
          <Stop offset={0.8633} stopColor="#246FF9" />
          <Stop offset={0.9388} stopColor="#387FF4" />
          <Stop offset={1} stopColor="#4F90EE" />
        </LinearGradient>
      </Defs>
      <Path fill="url(#logoZoom-a)" d="M256 128c0 13.568-1.024 27.136-3.328 40.192-6.912 43.264-41.216 77.568-84.48 84.48C155.136 254.976 141.568 256 128 256c-13.568 0-27.136-1.024-40.192-3.328-43.264-6.912-77.568-41.216-84.48-84.48C1.024 155.136 0 141.568 0 128c0-13.568 1.024-27.136 3.328-40.192 6.912-43.264 41.216-77.568 84.48-84.48C100.864 1.024 114.432 0 128 0c13.568 0 27.136 1.024 40.192 3.328 43.264 6.912 77.568 41.216 84.48 84.48C254.976 100.864 256 114.432 256 128Z" />
      <Path fill="#FFF" d="M204.032 207.872H75.008c-8.448 0-16.64-4.608-20.48-12.032-4.608-8.704-2.816-19.2 4.096-26.112l89.856-89.856H83.968c-17.664 0-32-14.336-32-32h118.784c8.448 0 16.64 4.608 20.48 12.032 4.608 8.704 2.816 19.2-4.096 26.112l-89.6 90.112h74.496c17.664 0 32 14.08 32 31.744Z" />
    </>
  );
}

function DibujoGoogleDrive() {
  return (
    <>
      <Path fill="#0066da" d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3L27.5 53H0c0 1.55.4 3.1 1.2 4.5z" />
      <Path fill="#00ac47" d="M43.65 25 29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44A9.06 9.06 0 0 0 0 53h27.5z" />
      <Path fill="#ea4335" d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75L86.1 57.5c.8-1.4 1.2-2.95 1.2-4.5H59.798l5.852 11.5z" />
      <Path fill="#00832d" d="M43.65 25 57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.45-4.5 1.2z" />
      <Path fill="#2684fc" d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" />
      <Path fill="#ffba00" d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25 59.8 53h27.45c0-1.55-.4-3.1-1.2-4.5z" />
    </>
  );
}
